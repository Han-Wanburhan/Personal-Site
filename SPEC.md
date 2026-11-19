# Passbook (Personal-Site) — Specification

> เอกสารนี้อธิบายระบบ **ตามที่มีอยู่จริงในโค้ด** ณ commit `9233915` (2026-11-19)
> ใช้เป็นจุดอ้างอิงเวลาให้ AI หรือคนพัฒนาฟีเจอร์ใหม่ ส่วน "Open Questions" ท้ายไฟล์คือสิ่งที่ยังต้องตัดสินใจ

---

## 1. Overview

**Passbook** คือเว็บบันทึกรายรับ-รายจ่ายส่วนตัว ที่มาแทนไฟล์ Excel (`import/finance.xlsx`) ที่เคยใช้
หน้าตาและตัวเลขต้องตรงกับชีตเดิม: แต่ละปีมีตาราง 12 เดือน แยกเป็น รายรับ / รายจ่าย / เงินออม / การลงทุน

| | |
|---|---|
| ผู้ใช้ | เจ้าของคนเดียว (มีระบบ register แต่ปิดได้ด้วย `ALLOW_REGISTER`) |
| ภาษา UI | อังกฤษ |
| สกุลเงิน | บาท (฿) เท่านั้น |
| Timezone | `Asia/Bangkok` (+07:00) ทั้ง DB และ DSN |
| Monorepo | `back/` (Go API), `front/` (React SPA), `deploy/`, `ops/` |

### Goals
- บันทึกรายการได้เร็ว ทั้งบนเดสก์ท็อปและมือถือ
- ตัวเลขสรุปรายปีตรงกับ Excel เดิม 100%
- เงินเป็นค่า exact เสมอ (ไม่มี float ระหว่างทาง)
- Deploy เองบน VM ที่บ้าน ผ่าน Jenkins + Docker Compose

### Non-goals (ตอนนี้)
- หลายสกุลเงิน, หลายผู้ใช้แชร์บัญชีกัน, เชื่อมธนาคารอัตโนมัติ

---

## 2. Tech Stack

| Layer | ใช้อะไร |
|---|---|
| Backend | Go 1.26, Fiber v2, GORM (MySQL driver), golang-jwt v5, shopspring/decimal, excelize v2, go-playground/validator, caarlos0/env |
| Database | MySQL 8.4, utf8mb4, migrations ด้วย golang-migrate (SQL เขียนเอง ไม่ใช้ AutoMigrate) |
| Frontend | Vite 8, React 19, TypeScript 6, React Router 8, TanStack Query 5, CSS ล้วน (ไม่มี Tailwind), oxlint |
| Web server | Caddy (serve static + reverse proxy `/api` → api, HTTPS อัตโนมัติ) |
| CI | GitHub Actions (lint/build/test + docker build) |
| CD | Jenkins: test VM `192.168.1.43` → manual approve → prod VM `192.168.1.42` |
| Monitoring | Uptime Kuma (`/api/health`), Prometheus + node-exporter + cAdvisor, Grafana (`ops/`) |

---

## 3. Domain Model

```
users 1──* categories 1──* items 1──* transactions
users 1──* password_reset_otps   (ตารางมีแล้ว แต่ยังไม่มีโค้ดใช้)
```

### Category types (4 แบบ)
| type | ความหมาย | amount |
|---|---|---|
| `income` | รายรับ | ต้อง > 0 |
| `expense` | รายจ่าย | ต้อง > 0 |
| `saving` | โอนเข้าบัญชีออม (ยังเป็นเงินเรา) | ≠ 0, ติดลบ = ถอน |
| `investment` | ซื้อกองทุน/หุ้น (ยังเป็นเงินเรา) | ≠ 0, ติดลบ = ขาย |

กฎ "เฉพาะ saving/investment ติดลบได้" ตรวจใน Go service (`model.AllowsWithdrawal`) เพราะ CHECK constraint มองข้ามตารางไม่ได้

### Tables (สรุปจาก `back/migrations/`)
- **users**: `email`, `username`, `phone` (unique ทั้งสาม), `password_hash` (bcrypt), `token_version` (เพิ่มค่า = logout ทุกเครื่อง)
- **categories**: `user_id`, `name`, `type`, `is_active` — unique `(user_id, type, name)`
- **items**: `category_id`, `name`, `is_active` — unique `(category_id, name)`, FK `RESTRICT` (ห้ามลบ ให้ซ่อนแทน)
- **transactions**: `item_id`, `amount DECIMAL(12,2)`, `txn_date DATE`, `note`, `is_paid` — FK `RESTRICT`
- ความเป็นเจ้าของของ transaction/item ตรวจผ่าน `categories.user_id` เสมอ

### Business rules
- Item ย้าย category ไม่ได้ (ไม่งั้น type ของรายการเก่าจะเปลี่ยน)
- ไม่มีการลบ category/item — ใช้ `is_active=false` (ซ่อนจาก picker แต่รายการเก่ายังอยู่)
- รายการใหม่เริ่มที่ `is_paid=false`; รายการก่อน migration 7 ถูกตั้งเป็น paid ทั้งหมด
- **Summary ต่อเดือน**
  - `left_over = income − expense − saving − investment`
  - `savings_rate = (saving + investment) / income × 100` (null ถ้าไม่มีรายรับ)
- เงินส่งใน JSON เป็น **string** (`"13800.00"`), ฝั่งหน้าบ้านคำนวณเป็น satang (integer)

---

## 4. API

Base: `/api` · Auth: `Authorization: Bearer <JWT>` · Date format: `YYYY-MM-DD`
Error body: `{"error": "...", "details"?: {"field": "rule"}}`

| Method | Path | Auth | หน้าที่ |
|---|---|---|---|
| GET | `/health`, `/api/health` | – | ping DB (Uptime Kuma) |
| POST | `/auth/register` | – | สมัคร (ถ้า `ALLOW_REGISTER=true`) |
| POST | `/auth/login` | – | `identifier` = email / username / phone |
| GET | `/me` | ✔ | ข้อมูลผู้ใช้ปัจจุบัน |
| GET/POST | `/categories` | ✔ | list / create |
| PUT | `/categories/:id` | ✔ | rename, active on/off |
| GET/POST | `/categories/:id/items` | ✔ | list / create item ในหมวด |
| GET | `/items` | ✔ | ทุก item (พร้อมชื่อหมวด + type) |
| PUT | `/items/:id` | ✔ | rename, active on/off |
| GET | `/transactions?from=&to=` | ✔ | ตามช่วงวันที่ (ใหม่สุดก่อน) |
| POST | `/transactions` | ✔ | สร้าง 1 รายการ |
| POST | `/transactions/batch` | ✔ | สร้างหลายรายการ (1–120) แบบ all-or-nothing |
| PUT | `/transactions/:id` | ✔ | แก้บางฟิลด์ (pointer = optional) รวมถึงติ๊ก `is_paid` |
| DELETE | `/transactions/:id` | ✔ | ลบ |
| GET | `/summary?year=` | ✔ | 12 เดือน + total แยก 4 type |
| GET | `/summary/items?year=` | ✔ | ตารางแบบ Excel: item × 12 เดือน |
| POST | `/import/sheets` | ✔ | upload xlsx → รายชื่อชีต + เดาปี |
| POST | `/import` | ✔ | preview (`applied=false`) / นำเข้าจริง |

JWT: TTL ตั้งด้วย `JWT_TTL` (default 24h), claim มี `ver` เทียบกับ `users.token_version`

---

## 5. Frontend

### Routes
| Path | หน้า | เนื้อหา |
|---|---|---|
| `/login`, `/register` | Auth | "Keep me signed in" → localStorage, ไม่งั้น sessionStorage |
| `/` | Home | ทักทาย, ตัวเลขเดือนนี้เทียบเดือนก่อน, ตารางรายเดือนของปี, ฟอร์มเพิ่ม, 5 รายการล่าสุด |
| `/transactions?month=&item=` | Transactions | รายการรายเดือนจัดกลุ่มตามวัน, แก้ไข inline, กรอง "Not paid", ยอด to pay / to receive, **Copy from last month** |
| `/year` | Year grid | ตาราง item × เดือน เหมือน Excel, คลิกเซลล์ไปหน้า transactions ที่กรองแล้ว |
| `/import` | Import | อัปโหลด xlsx, เลือกชีต/ช่วงเดือน, preview แล้วค่อย apply |

### UI ทั่วไป
- Theme: 6 palettes (Neutral, Minimal, Earth, Sage, Ocean, Rose) × light/dark
- Mobile: bottom tab bar + ปุ่ม `+` (AddFab), ตารางย่อให้พอดีจอ
- Toast แจ้งผลหลังบันทึก
- Server state ทั้งหมดผ่าน TanStack Query (`features/ledger/api.ts`, `summary.ts`)

---

## 6. Configuration

`.env` (โหลดจาก `../.env` ตอนรัน `go run ./cmd/api` ใน `back/`)

| Key | หมายเหตุ |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | required |
| `MYSQL_ROOT_PASSWORD` | ใช้โดย docker compose |
| `JWT_SECRET` | required, ≥ 32 ตัวอักษร |
| `JWT_TTL` | default `24h` |
| `ALLOW_REGISTER` | default `false` |
| `APP_PORT` | default `8080` |
| `SITE_ADDRESS` | Caddy (prod) |

---

## 7. Running locally

```bash
docker compose up -d db                 # MySQL ที่ 127.0.0.1:${DB_PORT}
docker compose run --rm migrate up      # migrations
cd back && go run ./cmd/api             # API :8080
cd front && npm install && npm run dev  # Vite (proxy /api → :8080)
```

CLI import: `go run ./cmd/import` (อ่าน `import/finance.xlsx` + `import/days.txt`, รองรับ `-sheet`)

---

## 8. Quality gates

- `front`: `npm run lint` (oxlint), `npm run build` (tsc + vite)
- `back`: `go vet`, `go build`, `go test` — มี test ที่ `auth_service`, `summary_service`, `importer`
- Jenkins smoke test: `GET /` ต้อง 200, `GET /api/me` ต้อง 401

---

## 9. Known gaps (เจอจากการอ่านโค้ด)

1. ~~ไม่มีหน้าจัดการ Category / Item~~ → ดู Feature F1
2. **Password reset** — มีตาราง `password_reset_otps` แต่ไม่มี endpoint / UI
3. **Logout ทุกเครื่อง** — มี `token_version` แต่ไม่มี endpoint ให้ bump
4. **ไม่มีกราฟ** — Guide-Line Phase 4 วางไว้ว่า "กราฟใส่ทีหลัง"
5. **API ไม่มี `/metrics`** — Prometheus เก็บแค่ระดับ VM/container ยังไม่เห็น latency/error ของ API
6. **Backup DB** — มีโฟลเดอร์ `backups/` แต่ dump ทำมือ ยังไม่มีตั้งเวลา
7. **README** ยังเป็นของเก่า (ยังบอกว่า body ใช้ `"Email"` ตัวใหญ่ และไม่พูดถึงหน้าบ้าน)

---

## 10. Features

### F1 — Category management page (`/categories`)

**Goal**: จัดระเบียบหมวดและรายการได้จากหน้าเว็บ โดยไม่ต้องเข้าไปแก้ DB

**User stories**
- ในฐานะเจ้าของบัญชี ผมอยากเปลี่ยนชื่อหมวดหรือรายการที่พิมพ์ผิด แล้วชื่อในรายการเก่าและตารางสรุปต้องเปลี่ยนตามด้วย
- ผมอยากซ่อนหมวดหรือรายการที่เลิกใช้แล้ว ให้หายไปจาก picker ในฟอร์มเพิ่ม แต่ตัวเลขในอดีตยังอยู่ครบ
- ผมอยากเปิดหมวดหรือรายการที่ซ่อนไว้กลับมาใช้ได้
- ผมอยากเพิ่มหมวดหรือรายการล่วงหน้า โดยไม่ต้องสร้างผ่านฟอร์มบันทึกรายการ

**API**: ไม่ต้องเพิ่มอะไร ใช้ endpoint ที่มีอยู่แล้ว
`GET/POST /categories`, `PUT /categories/:id`, `GET /items`, `POST /categories/:id/items`, `PUT /items/:id`

**UI**
- เมนู "Categories" อยู่ใน top nav และใน bottom tab bar บนมือถือ (รวมเป็น 5 แท็บ)
- แท็บแยกตาม type: Expense / Income / Saving / Invest แต่ละแท็บแสดงจำนวนหมวด
- สวิตช์ "Show hidden" (ปิดไว้เป็นค่าเริ่มต้น)
- การ์ดหนึ่งใบต่อหนึ่งหมวด แสดงรายการข้างใน ทั้งหมวดและรายการมีปุ่ม **Rename** (แก้ inline: Enter = บันทึก, Esc = ยกเลิก) และปุ่ม **Hide/Show**
- ช่อง "Add item" อยู่ท้ายการ์ดแต่ละใบ และมีฟอร์ม "New category" ที่แผงด้านข้าง (บนมือถืออยู่บนสุด)
- ถ้าชื่อซ้ำ ให้แสดง error ที่ API ส่งกลับมา (409)

**Out of scope (F1)**: เรียงลำดับเอง, merge หมวด, ย้าย item ข้ามหมวด, ลบถาวร

**Acceptance criteria**
- [ ] เปลี่ยนชื่อแล้ว หน้า Transactions และ Year grid แสดงชื่อใหม่โดยไม่ต้อง reload
- [ ] ซ่อนหมวดแล้ว หมวดนั้นไม่โผล่ใน NewTransactionForm แต่ยอดเดิมยังอยู่ใน summary
- [ ] ตั้งชื่อซ้ำในหมวด/type เดียวกันไม่ได้ และมีข้อความบอกเหตุผล
- [ ] ใช้งานได้ที่ความกว้าง 375px
- [ ] `npm run lint` และ `npm run build` ผ่าน

---

## 11. Open Questions / Feature Ideas

ดูคำถามในแชต — เมื่อเลือกแล้วให้ย้ายคำตอบมาเป็น section ใหม่ของ spec นี้ (หนึ่งฟีเจอร์ต่อหนึ่ง section: Goal, User story, API, UI, Acceptance criteria)
