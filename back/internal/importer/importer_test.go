package importer

import (
	"strings"
	"testing"
)

// A cut-down copy of the real sheet layout.
func sampleRows() [][]string {
	return [][]string{
		{"รายรับ-รายจ่าย 2026"},
		{},
		{"หมวด", "รายการ", "ม.ค.", "ก.พ.", "มี.ค."},
		{"รายรับ", "เงินเดือน / Salary", "36408", "36408", ""},
		{"รายรับ", "รายได้จาก Grab", "0", "5000"},
		{"รวมรายรับ", "", "36408", "41408", "0"},
		{},
		{"ที่พัก", "ค่าไฟ", "799.5", "  812.25 ", "0"},
		{"อาหาร", "อาหาร/เครื่องดื่ม", "5000", "4999.999999999"},
		{"รวมที่พัก", "", "799.5", "812.25"},
		{"รวมรายจ่าย", "", "5799.5", "5812.25", "0"},
		{"💰  เงินออม", "", "30608.5", "35595.75"},
	}
}

func TestParse(t *testing.T) {
	s, err := Parse(sampleRows())
	if err != nil {
		t.Fatal(err)
	}
	if len(s.Rows) != 4 {
		t.Fatalf("got %d rows, want 4 (subtotals and savings skipped)", len(s.Rows))
	}
	if s.Rows[0].Type != "income" || s.Rows[2].Type != "expense" {
		t.Errorf("types = %s, %s", s.Rows[0].Type, s.Rows[2].Type)
	}
	if got := s.Rows[2].Amounts[1].StringFixed(2); got != "812.25" {
		t.Errorf("trimmed amount = %s", got)
	}
	if got := s.Rows[3].Amounts[1].StringFixed(2); got != "5000.00" {
		t.Errorf("rounded amount = %s, want 5000.00", got)
	}
	if !s.Rows[0].Amounts[2].IsZero() || s.Rows[0].Line != 4 {
		t.Errorf("empty cell or line number wrong: %v line %d", s.Rows[0].Amounts[2], s.Rows[0].Line)
	}
	if err := s.Check(); err != nil {
		t.Errorf("Check: %v", err)
	}
}

func TestCheckMismatch(t *testing.T) {
	rows := sampleRows()
	rows[5][2] = "99999" // รวมรายรับ Jan no longer matches
	s, err := Parse(rows)
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Check(); err == nil || !strings.Contains(err.Error(), "month 1") {
		t.Errorf("want month 1 mismatch, got %v", err)
	}
}

func TestParseErrors(t *testing.T) {
	cases := map[string]func(r [][]string) [][]string{
		"no header":  func(r [][]string) [][]string { return r[3:] },
		"bad number": func(r [][]string) [][]string { r[3][3] = "abc"; return r },
		"negative":   func(r [][]string) [][]string { r[3][3] = "-5"; return r },
		"duplicate":  func(r [][]string) [][]string { r[4][1] = "เงินเดือน / Salary"; return r },
	}
	for name, edit := range cases {
		t.Run(name, func(t *testing.T) {
			if _, err := Parse(edit(sampleRows())); err == nil {
				t.Error("want an error")
			}
		})
	}
}

func TestParseDays(t *testing.T) {
	in := bom + "# pay days\n25 เงินเดือน / Salary\n\nlast ค่าไฟ\n31 อาหาร/เครื่องดื่ม\n"
	d, err := ParseDays(strings.NewReader(in))
	if err != nil {
		t.Fatal(err)
	}
	if d["เงินเดือน / Salary"] != 25 || d["ค่าไฟ"] != Last || d["อาหาร/เครื่องดื่ม"] != 31 {
		t.Errorf("got %v", d)
	}

	s, _ := Parse(sampleRows())
	if err := d.CheckItems(s); err != nil {
		t.Errorf("CheckItems: %v", err)
	}
	d["ค่าน้ำมัน typo"] = 1
	if err := d.CheckItems(s); err == nil {
		t.Error("want unknown item error")
	}

	for _, bad := range []string{"32 x", "0 x", "abc x", "25", "1 x\n2 x"} {
		if _, err := ParseDays(strings.NewReader(bad)); err == nil {
			t.Errorf("%q: want an error", bad)
		}
	}
}

func TestDate(t *testing.T) {
	cases := []struct {
		year, month, day int
		want             string
	}{
		{2026, 6, Last, "2026-06-30"},
		{2026, 6, 25, "2026-06-25"},
		{2026, 6, 31, "2026-06-30"}, // June has 30 days
		{2026, 2, 30, "2026-02-28"},
		{2028, 2, Last, "2028-02-29"}, // leap year
		{2026, 12, Last, "2026-12-31"},
	}
	for _, c := range cases {
		if got := Date(c.year, c.month, c.day).Format("2006-01-02"); got != c.want {
			t.Errorf("Date(%d,%d,%d) = %s, want %s", c.year, c.month, c.day, got, c.want)
		}
	}
}

func TestGuessYear(t *testing.T) {
	cases := map[string]int{
		"รายรับ-รายจ่าย 2026": 2026,
		"Budget 2027 ": 2027,
		"สินทรัพย์-หนี้สิน": 0,
		"Sheet 1999": 0, // outside 2000-2100
		"2026 plan":  0, // year must be at the end
	}
	for name, want := range cases {
		if got := GuessYear(name); got != want {
			t.Errorf("GuessYear(%q) = %d, want %d", name, got, want)
		}
	}
}
