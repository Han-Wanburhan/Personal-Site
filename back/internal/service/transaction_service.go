package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/model"
	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

// Bangkok has no daylight saving, so a fixed +07:00 zone is exact and needs no tz database.
var bangkok = time.FixedZone("ICT", 7*60*60)

// maxAmount matches DECIMAL(12,2): at most 10 digits before the point.
var maxAmount = decimal.RequireFromString("9999999999.99")

type TransactionService interface {
	List(ctx context.Context, userID uint, from, to *time.Time) ([]repository.TransactionView, error)
	Create(ctx context.Context, userID uint, req dto.CreateTransactionRequest) (*repository.TransactionView, error)
	Update(ctx context.Context, userID, id uint, req dto.UpdateTransactionRequest) (*repository.TransactionView, error)
	Delete(ctx context.Context, userID, id uint) error
}

type transactionService struct {
	txns  repository.TransactionRepository
	items repository.ItemRepository
}

func NewTransactionService(txns repository.TransactionRepository, items repository.ItemRepository) TransactionService {
	return &transactionService{txns: txns, items: items}
}

// Now is the current time in Bangkok (the app's calendar).
func Now() time.Time {
	return time.Now().In(bangkok)
}

// ParseDate reads a YYYY-MM-DD date as a Bangkok calendar day.
func ParseDate(s string) (time.Time, error) {
	return time.ParseInLocation(dto.DateLayout, s, bangkok)
}

// checkAmount: not zero, at most 2 decimals, fits DECIMAL(12,2).
// Negative (a withdrawal) only for savings and investments.
func checkAmount(a decimal.Decimal, catType string) error {
	if a.IsZero() || !a.Equal(a.Round(2)) || a.Abs().GreaterThan(maxAmount) {
		return ErrInvalidAmount
	}
	if a.IsNegative() && !model.AllowsWithdrawal(catType) {
		return ErrNegativeAmount
	}
	return nil
}

// noteOrNil trims the note and stores NULL instead of an empty string.
func noteOrNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

// ownItem makes sure the item exists and belongs to the user (through its category).
// The returned view carries the category type, which decides if the amount may be negative.
func (s *transactionService) ownItem(ctx context.Context, userID, itemID uint) (*repository.ItemView, error) {
	item, err := s.items.FindByIDForUser(ctx, itemID, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrItemNotFound
	}
	return item, err
}

func (s *transactionService) List(ctx context.Context, userID uint, from, to *time.Time) ([]repository.TransactionView, error) {
	return s.txns.ListByUser(ctx, userID, from, to)
}

func (s *transactionService) Create(ctx context.Context, userID uint, req dto.CreateTransactionRequest) (*repository.TransactionView, error) {
	item, err := s.ownItem(ctx, userID, req.ItemID)
	if err != nil {
		return nil, err
	}
	if err := checkAmount(req.Amount, item.CategoryType); err != nil {
		return nil, err
	}
	date, err := ParseDate(req.TxnDate) // format already checked by the validator
	if err != nil {
		return nil, err
	}

	t := &model.Transaction{
		ItemID:  req.ItemID,
		Amount:  req.Amount,
		TxnDate: date,
		Note:    noteOrNil(req.Note),
		IsPaid:  req.IsPaid,
	}
	if err := s.txns.Create(ctx, t); err != nil {
		return nil, err
	}
	return s.txns.FindByIDForUser(ctx, t.ID, userID)
}

func (s *transactionService) find(ctx context.Context, userID, id uint) (*repository.TransactionView, error) {
	view, err := s.txns.FindByIDForUser(ctx, id, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrTransactionNotFound
	}
	return view, err
}

func (s *transactionService) Update(ctx context.Context, userID, id uint, req dto.UpdateTransactionRequest) (*repository.TransactionView, error) {
	view, err := s.find(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	t := view.Transaction // plain row, without the joined columns
	catType := view.CategoryType
	if req.ItemID != nil {
		item, err := s.ownItem(ctx, userID, *req.ItemID)
		if err != nil {
			return nil, err
		}
		t.ItemID = *req.ItemID
		catType = item.CategoryType
	}
	if req.Amount != nil {
		t.Amount = *req.Amount
	}
	// Checked on every update: moving a withdrawal (negative) to an expense item must fail too.
	if err := checkAmount(t.Amount, catType); err != nil {
		return nil, err
	}
	if req.TxnDate != nil {
		date, err := ParseDate(*req.TxnDate)
		if err != nil {
			return nil, err
		}
		t.TxnDate = date
	}
	if req.Note != nil {
		t.Note = noteOrNil(*req.Note)
	}
	if req.IsPaid != nil {
		t.IsPaid = *req.IsPaid
	}

	if err := s.txns.Update(ctx, &t); err != nil {
		return nil, err
	}
	return s.txns.FindByIDForUser(ctx, id, userID)
}

func (s *transactionService) Delete(ctx context.Context, userID, id uint) error {
	if _, err := s.find(ctx, userID, id); err != nil {
		return err // not found, or not this user's
	}
	return s.txns.Delete(ctx, id)
}
