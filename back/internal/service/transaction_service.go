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

// validAmount: positive, at most 2 decimals, fits DECIMAL(12,2).
func validAmount(a decimal.Decimal) bool {
	return a.IsPositive() && a.Equal(a.Round(2)) && a.LessThanOrEqual(maxAmount)
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
func (s *transactionService) ownItem(ctx context.Context, userID, itemID uint) error {
	_, err := s.items.FindByIDForUser(ctx, itemID, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrItemNotFound
	}
	return err
}

func (s *transactionService) List(ctx context.Context, userID uint, from, to *time.Time) ([]repository.TransactionView, error) {
	return s.txns.ListByUser(ctx, userID, from, to)
}

func (s *transactionService) Create(ctx context.Context, userID uint, req dto.CreateTransactionRequest) (*repository.TransactionView, error) {
	if err := s.ownItem(ctx, userID, req.ItemID); err != nil {
		return nil, err
	}
	if !validAmount(req.Amount) {
		return nil, ErrInvalidAmount
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
	if req.ItemID != nil {
		if err := s.ownItem(ctx, userID, *req.ItemID); err != nil {
			return nil, err
		}
		t.ItemID = *req.ItemID
	}
	if req.Amount != nil {
		if !validAmount(*req.Amount) {
			return nil, ErrInvalidAmount
		}
		t.Amount = *req.Amount
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
