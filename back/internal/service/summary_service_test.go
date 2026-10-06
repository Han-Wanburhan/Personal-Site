package service

import (
	"context"
	"errors"
	"testing"

	"github.com/shopspring/decimal"

	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

// fakeSummaryRepo stands in for the database: it returns fixed rows
// and remembers what it was asked for.
type fakeSummaryRepo struct {
	rows      []repository.MonthTypeTotal
	err       error
	gotUserID uint
	gotYear   int
	calls     int
}

func (f *fakeSummaryRepo) MonthlyTotals(_ context.Context, userID uint, year int) ([]repository.MonthTypeTotal, error) {
	f.calls++
	f.gotUserID, f.gotYear = userID, year
	return f.rows, f.err
}

func d(s string) decimal.Decimal { return decimal.RequireFromString(s) }

func row(month int, typ, total string, count int) repository.MonthTypeTotal {
	return repository.MonthTypeTotal{Month: month, Type: typ, Total: d(total), Count: count}
}

func assertDec(t *testing.T, what string, got decimal.Decimal, want string) {
	t.Helper()
	if !got.Equal(d(want)) {
		t.Errorf("%s = %s, want %s", what, got.StringFixed(2), want)
	}
}

func assertRate(t *testing.T, what string, got *decimal.Decimal, want string) {
	t.Helper()
	if want == "" {
		if got != nil {
			t.Errorf("%s = %s, want nil (no income)", what, got.String())
		}
		return
	}
	if got == nil {
		t.Fatalf("%s = nil, want %s", what, want)
	}
	if !got.Equal(d(want)) {
		t.Errorf("%s = %s, want %s", what, got.String(), want)
	}
}

func TestYearSummary_TotalsAndRates(t *testing.T) {
	repo := &fakeSummaryRepo{rows: []repository.MonthTypeTotal{
		row(1, "income", "45000.00", 1),
		row(1, "expense", "31200.00", 40),
		row(3, "expense", "500.50", 2), // a month with spending but no income
		row(9, "income", "51200.00", 2),
		row(9, "expense", "30950.25", 55),
	}}
	ys, err := NewSummaryService(repo).Year(context.Background(), 7, 2026)
	if err != nil {
		t.Fatal(err)
	}

	if repo.gotUserID != 7 || repo.gotYear != 2026 {
		t.Errorf("repository asked for user %d year %d, want user 7 year 2026", repo.gotUserID, repo.gotYear)
	}
	if ys.Year != 2026 {
		t.Errorf("Year = %d, want 2026", ys.Year)
	}
	for i, m := range ys.Months {
		if m.Month != i+1 {
			t.Fatalf("Months[%d].Month = %d, want %d", i, m.Month, i+1)
		}
	}

	jan := ys.Months[0]
	assertDec(t, "Jan income", jan.Income, "45000")
	assertDec(t, "Jan expense", jan.Expense, "31200")
	assertDec(t, "Jan saved", jan.Saved, "13800")
	assertRate(t, "Jan rate", jan.SavingsRate, "30.7") // 13800 / 45000 = 30.666… → 30.7
	if jan.Count != 41 {
		t.Errorf("Jan count = %d, want 41", jan.Count)
	}

	mar := ys.Months[2]
	assertDec(t, "Mar saved", mar.Saved, "-500.50") // spent more than earned
	assertRate(t, "Mar rate", mar.SavingsRate, "")  // no income → no rate

	feb := ys.Months[1]
	assertDec(t, "Feb income", feb.Income, "0")
	assertRate(t, "Feb rate", feb.SavingsRate, "")
	if feb.Count != 0 {
		t.Errorf("Feb count = %d, want 0", feb.Count)
	}

	sep := ys.Months[8]
	assertDec(t, "Sep saved", sep.Saved, "20249.75") // exact decimals, no float drift
	assertRate(t, "Sep rate", sep.SavingsRate, "39.6") // 20249.75 / 51200 = 39.550… → 39.6

	assertDec(t, "Total income", ys.Total.Income, "96200")
	assertDec(t, "Total expense", ys.Total.Expense, "62650.75")
	assertDec(t, "Total saved", ys.Total.Saved, "33549.25")
	assertRate(t, "Total rate", ys.Total.SavingsRate, "34.9") // 33549.25 / 96200 = 34.874… → 34.9
	if ys.Total.Count != 100 {
		t.Errorf("Total count = %d, want 100", ys.Total.Count)
	}
}

func TestYearSummary_EmptyYear(t *testing.T) {
	ys, err := NewSummaryService(&fakeSummaryRepo{}).Year(context.Background(), 1, 2026)
	if err != nil {
		t.Fatal(err)
	}
	assertDec(t, "Total income", ys.Total.Income, "0")
	assertDec(t, "Total saved", ys.Total.Saved, "0")
	assertRate(t, "Total rate", ys.Total.SavingsRate, "")
}

func TestYearSummary_InvalidYear(t *testing.T) {
	for _, year := range []int{1999, 2101, 0, -5} {
		repo := &fakeSummaryRepo{}
		_, err := NewSummaryService(repo).Year(context.Background(), 1, year)
		if !errors.Is(err, ErrInvalidYear) {
			t.Errorf("year %d: err = %v, want ErrInvalidYear", year, err)
		}
		if repo.calls != 0 {
			t.Errorf("year %d: repository was called, should be rejected first", year)
		}
	}
}

func TestYearSummary_RepositoryError(t *testing.T) {
	boom := errors.New("db down")
	_, err := NewSummaryService(&fakeSummaryRepo{err: boom}).Year(context.Background(), 1, 2026)
	if !errors.Is(err, boom) {
		t.Errorf("err = %v, want the repository error", err)
	}
}

func TestBuildYearSummary_IgnoresBadRows(t *testing.T) {
	ys := BuildYearSummary(2026, []repository.MonthTypeTotal{
		row(0, "income", "1", 1),    // no month 0
		row(13, "income", "1", 1),   // no month 13
		row(5, "transfer", "99", 1), // unknown type
		row(5, "income", "100", 1),  // the only valid row
	})
	assertDec(t, "Total income", ys.Total.Income, "100")
	if ys.Total.Count != 1 {
		t.Errorf("Total count = %d, want 1", ys.Total.Count)
	}
}
