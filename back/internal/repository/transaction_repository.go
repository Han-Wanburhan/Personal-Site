package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

// TransactionView is a transaction plus its item and category (one JOIN query).
type TransactionView struct {
	model.Transaction
	ItemName     string
	CategoryID   uint
	CategoryName string
	CategoryType string
}

// maxList caps one list response, so a huge date range can't load everything at once.
const maxList = 1000

type TransactionRepository interface {
	// ListByUser returns the user's transactions between from and to (inclusive dates).
	// A nil from/to means "no limit on that side". Newest first.
	ListByUser(ctx context.Context, userID uint, from, to *time.Time) ([]TransactionView, error)
	FindByIDForUser(ctx context.Context, id, userID uint) (*TransactionView, error)
	Create(ctx context.Context, t *model.Transaction) error
	Update(ctx context.Context, t *model.Transaction) error
	Delete(ctx context.Context, id uint) error
}

type transactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) TransactionRepository {
	return &transactionRepository{db: db}
}

// transactions → items → categories: ownership goes through the category's user_id.
func (r *transactionRepository) viewQuery(ctx context.Context, userID uint) *gorm.DB {
	return r.db.WithContext(ctx).
		Table("transactions").
		Select(`transactions.*,
			items.name AS item_name,
			categories.id AS category_id,
			categories.name AS category_name,
			categories.type AS category_type`).
		Joins("JOIN items ON items.id = transactions.item_id").
		Joins("JOIN categories ON categories.id = items.category_id").
		Where("categories.user_id = ?", userID)
}

func (r *transactionRepository) ListByUser(ctx context.Context, userID uint, from, to *time.Time) ([]TransactionView, error) {
	q := r.viewQuery(ctx, userID)
	if from != nil {
		q = q.Where("transactions.txn_date >= ?", from.Format("2006-01-02"))
	}
	if to != nil {
		q = q.Where("transactions.txn_date <= ?", to.Format("2006-01-02"))
	}
	var list []TransactionView
	err := q.Order("transactions.txn_date DESC, transactions.id DESC").Limit(maxList).Scan(&list).Error
	return list, err
}

func (r *transactionRepository) FindByIDForUser(ctx context.Context, id, userID uint) (*TransactionView, error) {
	var list []TransactionView
	err := r.viewQuery(ctx, userID).Where("transactions.id = ?", id).Limit(1).Scan(&list).Error
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, ErrNotFound
	}
	return &list[0], nil
}

func (r *transactionRepository) Create(ctx context.Context, t *model.Transaction) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *transactionRepository) Update(ctx context.Context, t *model.Transaction) error {
	return r.db.WithContext(ctx).Save(t).Error
}

// Delete removes a row by id. The service checks ownership first.
func (r *transactionRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.Transaction{}, id).Error
}
