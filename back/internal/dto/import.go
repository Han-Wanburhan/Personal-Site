package dto

import (
	"github.com/shopspring/decimal"

	"github.com/Han-Wanburhan/personal-site/back/internal/importer"
)

type ImportSheetResponse struct {
	Name       string `json:"name"`
	Year       int    `json:"year"`       // guessed from the name, 0 if none
	Importable bool   `json:"importable"` // has the monthly layout
}

type ImportItemResponse struct {
	Category string `json:"category"`
	Type     string `json:"type"`
	Item     string `json:"item"`
	Day      int    `json:"day"`   // 0 = last day of the month
	Total    string `json:"total"` // sum over the imported months
}

type ImportMonthResponse struct {
	Month   int    `json:"month"`
	Income  string `json:"income"`
	Expense string `json:"expense"`
	Count   int    `json:"transaction_count"`
}

// ImportResponse is both the preview (applied=false) and the result (applied=true).
type ImportResponse struct {
	Sheet             string                `json:"sheet"`
	Year              int                   `json:"year"`
	From              int                   `json:"from"`
	To                int                   `json:"to"`
	Applied           bool                  `json:"applied"`
	CategoriesCreated int                   `json:"categories_created"`
	ItemsCreated      int                   `json:"items_created"`
	Transactions      int                   `json:"transactions"`
	Months            []ImportMonthResponse `json:"months"`
	Items             []ImportItemResponse  `json:"items"`
}

func NewImportResponse(sheetName string, s *importer.Sheet, days importer.Days, rg importer.Range, res *importer.Result, applied bool) ImportResponse {
	out := ImportResponse{
		Sheet: sheetName, Year: rg.Year, From: rg.From, To: rg.To, Applied: applied,
		CategoriesCreated: res.CategoriesCreated, ItemsCreated: res.ItemsCreated, Transactions: res.Transactions,
		Months: make([]ImportMonthResponse, 0, rg.To-rg.From+1),
		Items:  make([]ImportItemResponse, 0, len(s.Rows)),
	}
	for m := rg.From; m <= rg.To; m++ {
		t := res.Months[m]
		out.Months = append(out.Months, ImportMonthResponse{
			Month: m, Income: t.Income.StringFixed(2), Expense: t.Expense.StringFixed(2), Count: t.Count,
		})
	}
	for _, r := range s.Rows {
		total := decimal.Zero
		for m := rg.From; m <= rg.To; m++ {
			total = total.Add(r.Amounts[m-1])
		}
		out.Items = append(out.Items, ImportItemResponse{
			Category: r.Category, Type: r.Type, Item: r.Item, Day: days[r.Item], Total: total.StringFixed(2),
		})
	}
	return out
}
