package service

import (
	"context"
	"errors"

	"github.com/shopspring/decimal"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

var ErrInvalidYear = errors.New("year must be between 2000 and 2100")

var hundred = decimal.NewFromInt(100)

// MonthSummary holds the figures for one month (or the whole year in YearSummary.Total).
type MonthSummary struct {
	Month       int // 1-12, or 0 for the year total
	Income      decimal.Decimal
	Expense     decimal.Decimal
	Saved       decimal.Decimal  // income - expense (negative if you spent more)
	SavingsRate *decimal.Decimal // saved / income * 100, 1 decimal; nil when there is no income
	Count       int
}

type YearSummary struct {
	Year   int
	Months [12]MonthSummary // January..December, always all 12
	Total  MonthSummary
}

type SummaryService interface {
	Year(ctx context.Context, userID uint, year int) (*YearSummary, error)
}

type summaryService struct {
	summary repository.SummaryRepository
}

func NewSummaryService(summary repository.SummaryRepository) SummaryService {
	return &summaryService{summary: summary}
}

func (s *summaryService) Year(ctx context.Context, userID uint, year int) (*YearSummary, error) {
	if year < 2000 || year > 2100 {
		return nil, ErrInvalidYear
	}
	rows, err := s.summary.MonthlyTotals(ctx, userID, year)
	if err != nil {
		return nil, err
	}
	return BuildYearSummary(year, rows), nil
}

// BuildYearSummary turns per-month, per-type totals into a full year.
// It is a pure function (no database), which makes it easy to unit test.
func BuildYearSummary(year int, rows []repository.MonthTypeTotal) *YearSummary {
	ys := &YearSummary{Year: year}
	for i := range ys.Months {
		ys.Months[i].Month = i + 1
	}

	for _, r := range rows {
		if r.Month < 1 || r.Month > 12 {
			continue
		}
		m := &ys.Months[r.Month-1]
		switch r.Type {
		case model.CategoryIncome:
			m.Income = m.Income.Add(r.Total)
		case model.CategoryExpense:
			m.Expense = m.Expense.Add(r.Total)
		default:
			continue
		}
		m.Count += r.Count
	}

	for i := range ys.Months {
		m := &ys.Months[i]
		finish(m)
		ys.Total.Income = ys.Total.Income.Add(m.Income)
		ys.Total.Expense = ys.Total.Expense.Add(m.Expense)
		ys.Total.Count += m.Count
	}
	finish(&ys.Total)
	return ys
}

// finish fills Saved and SavingsRate from Income and Expense.
func finish(m *MonthSummary) {
	m.Saved = m.Income.Sub(m.Expense)
	m.SavingsRate = nil
	if m.Income.IsPositive() {
		rate := m.Saved.Div(m.Income).Mul(hundred).Round(1)
		m.SavingsRate = &rate
	}
}
