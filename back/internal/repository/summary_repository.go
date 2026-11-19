package repository

import (
	"context"
	"fmt"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// MonthTypeTotal is one row of the yearly summary: the sum for one month and one type.
type MonthTypeTotal struct {
	Month int             // 1-12
	Type  string          // income | expense | saving | investment
	Total decimal.Decimal // SUM(amount)
	Count int             // number of transactions
}

// ItemMonthTotal is one cell of the yearly grid: one item in one month.
type ItemMonthTotal struct {
	ItemID       uint
	ItemName     string
	CategoryID   uint
	CategoryName string
	Type         string
	Month        int // 1-12
	Total        decimal.Decimal
}

type SummaryRepository interface {
	MonthlyTotals(ctx context.Context, userID uint, year int) ([]MonthTypeTotal, error)
	ItemMonthlyTotals(ctx context.Context, userID uint, year int) ([]ItemMonthTotal, error)
}

type summaryRepository struct {
	db *gorm.DB
}

func NewSummaryRepository(db *gorm.DB) SummaryRepository {
	return &summaryRepository{db: db}
}

// yearQuery: the user's transactions in one calendar year, joined to item and category.
func (r *summaryRepository) yearQuery(ctx context.Context, userID uint, year int) *gorm.DB {
	return r.db.WithContext(ctx).
		Table("transactions").
		Joins("JOIN items ON items.id = transactions.item_id").
		Joins("JOIN categories ON categories.id = items.category_id").
		Where("categories.user_id = ?", userID).
		Where("transactions.txn_date >= ? AND transactions.txn_date < ?",
			fmt.Sprintf("%d-01-01", year), fmt.Sprintf("%d-01-01", year+1))
}

// MonthlyTotals adds up the user's transactions per month and type in the database,
// so the API never has to load a whole year of rows.
func (r *summaryRepository) MonthlyTotals(ctx context.Context, userID uint, year int) ([]MonthTypeTotal, error) {
	var rows []MonthTypeTotal
	err := r.yearQuery(ctx, userID, year).
		Select(`MONTH(transactions.txn_date) AS month,
			categories.type AS type,
			SUM(transactions.amount) AS total,
			COUNT(*) AS count`).
		Group("month, categories.type").
		Scan(&rows).Error
	return rows, err
}

// ItemMonthlyTotals adds up per item and month: the cells of the yearly grid.
// Ordered like the grid: type (enum order), category, item, month.
func (r *summaryRepository) ItemMonthlyTotals(ctx context.Context, userID uint, year int) ([]ItemMonthTotal, error) {
	var rows []ItemMonthTotal
	err := r.yearQuery(ctx, userID, year).
		Select(`items.id AS item_id,
			items.name AS item_name,
			categories.id AS category_id,
			categories.name AS category_name,
			categories.type AS type,
			MONTH(transactions.txn_date) AS month,
			SUM(transactions.amount) AS total`).
		Group("items.id, items.name, categories.id, categories.name, categories.type, month").
		Order("categories.type, categories.name, items.name, month").
		Scan(&rows).Error
	return rows, err
}
