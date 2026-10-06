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
	Type  string          // income | expense
	Total decimal.Decimal // SUM(amount)
	Count int             // number of transactions
}

type SummaryRepository interface {
	MonthlyTotals(ctx context.Context, userID uint, year int) ([]MonthTypeTotal, error)
}

type summaryRepository struct {
	db *gorm.DB
}

func NewSummaryRepository(db *gorm.DB) SummaryRepository {
	return &summaryRepository{db: db}
}

// MonthlyTotals adds up the user's transactions per month and type in the database,
// so the API never has to load a whole year of rows.
func (r *summaryRepository) MonthlyTotals(ctx context.Context, userID uint, year int) ([]MonthTypeTotal, error) {
	var rows []MonthTypeTotal
	err := r.db.WithContext(ctx).
		Table("transactions").
		Select(`MONTH(transactions.txn_date) AS month,
			categories.type AS type,
			SUM(transactions.amount) AS total,
			COUNT(*) AS count`).
		Joins("JOIN items ON items.id = transactions.item_id").
		Joins("JOIN categories ON categories.id = items.category_id").
		Where("categories.user_id = ?", userID).
		Where("transactions.txn_date >= ? AND transactions.txn_date < ?",
			fmt.Sprintf("%d-01-01", year), fmt.Sprintf("%d-01-01", year+1)).
		Group("month, categories.type").
		Scan(&rows).Error
	return rows, err
}
