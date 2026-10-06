package dto

import (
	"time"

	"github.com/shopspring/decimal"

	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

// DateLayout is the only date format the API accepts and returns: 2026-10-06.
const DateLayout = "2006-01-02"

// ---------- Requests (JSON in) ----------
// amount may be a JSON number (125.5) or a string ("125.50"). Always positive:
// whether money comes in or goes out depends on the item's category type.

type CreateTransactionRequest struct {
	ItemID  uint            `json:"item_id" validate:"required"`
	Amount  decimal.Decimal `json:"amount"`
	TxnDate string          `json:"txn_date" validate:"required,datetime=2006-01-02"`
	Note    string          `json:"note" validate:"max=255"`
}

// Pointers = optional. Send "note": "" to clear the note.
type UpdateTransactionRequest struct {
	ItemID  *uint            `json:"item_id" validate:"omitempty,gt=0"`
	Amount  *decimal.Decimal `json:"amount"`
	TxnDate *string          `json:"txn_date" validate:"omitempty,datetime=2006-01-02"`
	Note    *string          `json:"note" validate:"omitempty,max=255"`
}

// ---------- Responses (JSON out) ----------

type TransactionResponse struct {
	ID           uint      `json:"id"`
	ItemID       uint      `json:"item_id"`
	ItemName     string    `json:"item_name"`
	CategoryID   uint      `json:"category_id"`
	CategoryName string    `json:"category_name"`
	Type         string    `json:"type"`   // income | expense
	Amount       string    `json:"amount"` // "1284.50": a string, so no float rounding in JSON
	TxnDate      string    `json:"txn_date"`
	Note         string    `json:"note"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func NewTransactionResponse(v *repository.TransactionView) TransactionResponse {
	note := ""
	if v.Note != nil {
		note = *v.Note
	}
	return TransactionResponse{
		ID:           v.ID,
		ItemID:       v.ItemID,
		ItemName:     v.ItemName,
		CategoryID:   v.CategoryID,
		CategoryName: v.CategoryName,
		Type:         v.CategoryType,
		Amount:       v.Amount.StringFixed(2),
		TxnDate:      v.TxnDate.Format(DateLayout),
		Note:         note,
		CreatedAt:    v.CreatedAt,
		UpdatedAt:    v.UpdatedAt,
	}
}
