package importer

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

// Note is put on every imported transaction so they are easy to find later.
const Note = "Imported from Excel"

// Same zone as service (Asia/Bangkok, no DST). Not imported from service
// because dto imports this package and service imports dto (import cycle).
var bangkok = time.FixedZone("ICT", 7*60*60)

// Range is the months to import: From..To of Year, both inclusive.
type Range struct {
	Year, From, To int
}

func (r Range) Validate() error {
	if r.Year < 2000 || r.Year > 2100 {
		return fmt.Errorf("year %d out of range", r.Year)
	}
	if r.From < 1 || r.To > 12 || r.From > r.To {
		return fmt.Errorf("months must satisfy 1 <= from <= to <= 12, got %d..%d", r.From, r.To)
	}
	return nil
}

// Date returns the transaction date for a month: the given day, or the last
// day of the month when day is Last or larger than the month.
func Date(year, month, day int) time.Time {
	first := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, bangkok)
	last := first.AddDate(0, 1, -1)
	if day == Last || day > last.Day() {
		return last
	}
	return first.AddDate(0, 0, day-1)
}

type MonthTotal struct {
	Income, Expense decimal.Decimal
	Count           int
}

type Result struct {
	CategoriesCreated, ItemsCreated int
	Transactions                    int
	Months                          map[int]*MonthTotal // month -> what was imported
}

const dateLayout = "2006-01-02"

var errDryRun = errors.New("dry run")

// ErrAlreadyImported: the user has transactions in the months being imported.
var ErrAlreadyImported = errors.New("transactions already exist in these months")

// Import writes the sheet for userID inside one DB transaction.
// With dryRun everything runs the same, then is rolled back, so the counts
// shown are exactly what -apply would do.
// It refuses when the user already has transactions in the range.
func Import(ctx context.Context, db *gorm.DB, userID uint, s *Sheet, days Days, rg Range, dryRun bool) (*Result, error) {
	if err := rg.Validate(); err != nil {
		return nil, err
	}
	res := &Result{Months: map[int]*MonthTotal{}}
	for m := rg.From; m <= rg.To; m++ {
		res.Months[m] = &MonthTotal{}
	}
	from, to := Date(rg.Year, rg.From, 1), Date(rg.Year, rg.To, Last)
	note := Note

	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing int64
		err := tx.Table("transactions").
			Joins("JOIN items ON items.id = transactions.item_id").
			Joins("JOIN categories ON categories.id = items.category_id").
			Where("categories.user_id = ?", userID).
			Where("transactions.txn_date BETWEEN ? AND ?", from.Format(dateLayout), to.Format(dateLayout)).
			Count(&existing).Error
		if err != nil {
			return err
		}
		if existing > 0 {
			return fmt.Errorf("%w: you already have %d between %s and %s; delete them first or choose other months",
				ErrAlreadyImported, existing, from.Format(dateLayout), to.Format(dateLayout))
		}

		for _, r := range s.Rows {
			cat, created, err := findOrCreateCategory(tx, userID, r.Category, r.Type)
			if err != nil {
				return fmt.Errorf("row %d category %q: %w", r.Line, r.Category, err)
			}
			if created {
				res.CategoriesCreated++
			}
			item, created, err := findOrCreateItem(tx, cat.ID, r.Item)
			if err != nil {
				return fmt.Errorf("row %d item %q: %w", r.Line, r.Item, err)
			}
			if created {
				res.ItemsCreated++
			}

			for m := rg.From; m <= rg.To; m++ {
				amount := r.Amounts[m-1]
				if amount.IsZero() {
					continue
				}
				t := model.Transaction{ItemID: item.ID, Amount: amount, TxnDate: Date(rg.Year, m, days[r.Item]), Note: &note}
				if err := tx.Create(&t).Error; err != nil {
					return fmt.Errorf("row %d month %d: %w", r.Line, m, err)
				}
				res.Transactions++
				mt := res.Months[m]
				mt.Count++
				if r.Type == model.CategoryIncome {
					mt.Income = mt.Income.Add(amount)
				} else {
					mt.Expense = mt.Expense.Add(amount)
				}
			}
		}
		if dryRun {
			return errDryRun // roll everything back
		}
		return nil
	})
	if err != nil && !errors.Is(err, errDryRun) {
		return nil, err
	}
	return res, nil
}

// An existing category (even a hidden one) with the same name and type is reused.
func findOrCreateCategory(tx *gorm.DB, userID uint, name, typ string) (*model.Category, bool, error) {
	var c model.Category
	if err := tx.Where("user_id = ? AND type = ? AND name = ?", userID, typ, name).Limit(1).Find(&c).Error; err != nil {
		return nil, false, err
	}
	if c.ID != 0 {
		return &c, false, nil
	}
	c = model.Category{UserID: userID, Name: name, Type: typ, IsActive: true}
	return &c, true, tx.Create(&c).Error
}

func findOrCreateItem(tx *gorm.DB, categoryID uint, name string) (*model.Item, bool, error) {
	var it model.Item
	if err := tx.Where("category_id = ? AND name = ?", categoryID, name).Limit(1).Find(&it).Error; err != nil {
		return nil, false, err
	}
	if it.ID != 0 {
		return &it, false, nil
	}
	it = model.Item{CategoryID: categoryID, Name: name, IsActive: true}
	return &it, true, tx.Create(&it).Error
}
