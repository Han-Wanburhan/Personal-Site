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
		row(1, "saving", "5000.00", 1),
		row(1, "investment", "3000.00", 1),
		row(3, "expense", "500.50", 2),  // a month with spending but no income...
		row(3, "saving", "-2000.00", 1), // ...paid from savings (a withdrawal)
		row(9, "income", "51200.00", 2),
		row(9, "expense", "30950.25", 55),
		row(9, "saving", "10000.00", 2),
		row(9, "investment", "-1500.50", 1), // sold more than bought
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
	assertDec(t, "Jan saving", jan.Saving, "5000")
	assertDec(t, "Jan investment", jan.Investment, "3000")
	assertDec(t, "Jan left over", jan.LeftOver, "5800") // 45000 - 31200 - 5000 - 3000
	assertRate(t, "Jan rate", jan.SavingsRate, "17.8")  // 8000 / 45000 = 17.77… → 17.8
	if jan.Count != 43 {
		t.Errorf("Jan count = %d, want 43", jan.Count)
	}

	mar := ys.Months[2]
	assertDec(t, "Mar saving", mar.Saving, "-2000")        // net withdrawal
	assertDec(t, "Mar left over", mar.LeftOver, "1499.50") // 0 - 500.50 - (-2000)
	assertRate(t, "Mar rate", mar.SavingsRate, "")         // no income → no rate

	feb := ys.Months[1]
	assertDec(t, "Feb income", feb.Income, "0")
	assertDec(t, "Feb left over", feb.LeftOver, "0")
	assertRate(t, "Feb rate", feb.SavingsRate, "")
	if feb.Count != 0 {
		t.Errorf("Feb count = %d, want 0", feb.Count)
	}

	sep := ys.Months[8]
	assertDec(t, "Sep investment", sep.Investment, "-1500.50")
	assertDec(t, "Sep left over", sep.LeftOver, "11750.25") // exact decimals, no float drift
	assertRate(t, "Sep rate", sep.SavingsRate, "16.6")      // 8499.50 / 51200 = 16.60… → 16.6

	assertDec(t, "Total income", ys.Total.Income, "96200")
	assertDec(t, "Total expense", ys.Total.Expense, "62650.75")
	assertDec(t, "Total saving", ys.Total.Saving, "13000")
	assertDec(t, "Total investment", ys.Total.Investment, "1499.50")
	assertDec(t, "Total left over", ys.Total.LeftOver, "19049.75")
	assertRate(t, "Total rate", ys.Total.SavingsRate, "15.1") // 14499.50 / 96200 = 15.07… → 15.1
	if ys.Total.Count != 106 {
		t.Errorf("Total count = %d, want 106", ys.Total.Count)
	}
}

func TestYearSummary_IncomeAndExpenseOnly(t *testing.T) {
	// Nothing put aside: everything not spent is left over, and the rate is 0.
	ys := BuildYearSummary(2026, []repository.MonthTypeTotal{
		row(6, "income", "47868.00", 3),
		row(6, "expense", "53823.00", 15),
	})
	jun := ys.Months[5]
	assertDec(t, "Jun left over", jun.LeftOver, "-5955") // spent more than earned
	assertRate(t, "Jun rate", jun.SavingsRate, "0")
}

func TestYearSummary_EmptyYear(t *testing.T) {
	ys, err := NewSummaryService(&fakeSummaryRepo{}).Year(context.Background(), 1, 2026)
	if err != nil {
		t.Fatal(err)
	}
	assertDec(t, "Total income", ys.Total.Income, "0")
	assertDec(t, "Total left over", ys.Total.LeftOver, "0")
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
