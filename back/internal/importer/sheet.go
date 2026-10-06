// Package importer reads the old yearly Excel sheet ("รายรับ-รายจ่าย <year>")
// and turns its monthly amounts into categories, items and transactions.
package importer

import (
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/shopspring/decimal"
	"github.com/xuri/excelize/v2"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

// Sheet layout: A = หมวด (category), B = รายการ (item), C..N = Jan..Dec.
const (
	headerLabel       = "หมวด"
	incomeLabel       = "รายรับ" // the only income category; every other หมวด is an expense
	subtotalPrefix    = "รวม"
	incomeTotalLabel  = "รวมรายรับ"
	expenseTotalLabel = "รวมรายจ่าย"
	firstMonthCol     = 2 // column C (0-based)
	maxNameLen        = 100
)

// Row is one item line of the sheet.
type Row struct {
	Category string
	Type     string // model.CategoryIncome or model.CategoryExpense
	Item     string
	Amounts  [12]decimal.Decimal // Jan..Dec
	Line     int                 // spreadsheet row number, for messages
}

type Sheet struct {
	Rows []Row
	// The sheet's own total rows, used by Check. nil when the row is missing.
	IncomeTotal, ExpenseTotal *[12]decimal.Decimal
}

// Parse reads rows as returned by excelize GetRows (raw values).
// Subtotal rows (รวม…), savings rows and anything above the header are skipped.
func Parse(rows [][]string) (*Sheet, error) {
	header := -1
	for i, r := range rows {
		if cell(r, 0) == headerLabel {
			header = i
			break
		}
	}
	if header < 0 {
		return nil, fmt.Errorf("header row with %q in column A not found", headerLabel)
	}

	s := &Sheet{}
	seen := map[string]int{}
	for i := header + 1; i < len(rows); i++ {
		r := rows[i]
		a, b := cell(r, 0), cell(r, 1)
		if a == "" {
			continue
		}
		if b == "" || strings.HasPrefix(a, subtotalPrefix) {
			// subtotal / savings line: keep the two grand totals for Check
			switch a {
			case incomeTotalLabel, expenseTotalLabel:
				amounts, err := parseAmounts(r, i)
				if err != nil {
					return nil, err
				}
				if a == incomeTotalLabel {
					s.IncomeTotal = &amounts
				} else {
					s.ExpenseTotal = &amounts
				}
			}
			continue
		}

		if utf8.RuneCountInString(a) > maxNameLen || utf8.RuneCountInString(b) > maxNameLen {
			return nil, fmt.Errorf("row %d: name longer than %d characters", i+1, maxNameLen)
		}
		typ := model.CategoryExpense
		if a == incomeLabel {
			typ = model.CategoryIncome
		}
		key := typ + "|" + a + "|" + b
		if prev, ok := seen[key]; ok {
			return nil, fmt.Errorf("row %d: %s / %s already on row %d", i+1, a, b, prev)
		}
		seen[key] = i + 1

		amounts, err := parseAmounts(r, i)
		if err != nil {
			return nil, err
		}
		s.Rows = append(s.Rows, Row{Category: a, Type: typ, Item: b, Amounts: amounts, Line: i + 1})
	}
	if len(s.Rows) == 0 {
		return nil, errors.New("no item rows found under the header")
	}
	return s, nil
}

// Check compares the item rows with the sheet's own รวมรายรับ / รวมรายจ่าย rows,
// so a skipped or misread row is caught before anything is written.
func (s *Sheet) Check() error {
	var income, expense [12]decimal.Decimal
	for _, r := range s.Rows {
		for m, v := range r.Amounts {
			if r.Type == model.CategoryIncome {
				income[m] = income[m].Add(v)
			} else {
				expense[m] = expense[m].Add(v)
			}
		}
	}
	var problems []string
	compare := func(label string, got [12]decimal.Decimal, want *[12]decimal.Decimal) {
		if want == nil {
			return
		}
		for m := range got {
			if !got[m].Equal(want[m]) {
				problems = append(problems, fmt.Sprintf("%s month %d: items add up to %s, sheet says %s",
					label, m+1, got[m].StringFixed(2), want[m].StringFixed(2)))
			}
		}
	}
	compare(incomeTotalLabel, income, s.IncomeTotal)
	compare(expenseTotalLabel, expense, s.ExpenseTotal)
	if len(problems) > 0 {
		return errors.New("totals do not match:\n  " + strings.Join(problems, "\n  "))
	}
	return nil
}

func parseAmounts(r []string, i int) ([12]decimal.Decimal, error) {
	var out [12]decimal.Decimal
	for m := 0; m < 12; m++ {
		raw := cell(r, firstMonthCol+m)
		if raw == "" {
			continue // empty cell = 0
		}
		v, err := decimal.NewFromString(raw)
		if err != nil {
			return out, fmt.Errorf("cell %s: %q is not a number", cellName(firstMonthCol+m, i), raw)
		}
		if v.IsNegative() {
			return out, fmt.Errorf("cell %s: negative amount %s", cellName(firstMonthCol+m, i), raw)
		}
		out[m] = v.Round(2) // Excel stores doubles; money has 2 decimals
	}
	return out, nil
}

func cell(r []string, col int) string {
	if col >= len(r) {
		return ""
	}
	return strings.TrimSpace(r[col])
}

func cellName(col, row int) string {
	name, _ := excelize.CoordinatesToCellName(col+1, row+1)
	return name
}
