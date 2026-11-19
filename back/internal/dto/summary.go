package dto

// Money is sent as strings ("13800.00") so no precision is lost in JSON.

type MonthSummaryResponse struct {
	Month            int     `json:"month"` // 1-12 (0 for the year total)
	Income           string  `json:"income"`
	Expense          string  `json:"expense"`
	Saving           string  `json:"saving"`       // net, may be negative ("-500.00" = withdrew more)
	Investment       string  `json:"investment"`   // net, may be negative
	LeftOver         string  `json:"left_over"`    // income − expense − saving − investment
	SavingsRate      *string `json:"savings_rate"` // (saving + investment) / income: "30.7", or null when there is no income
	TransactionCount int     `json:"transaction_count"`
}

// ItemYearResponse is one row of the yearly grid (GET /api/summary/items).
type ItemYearResponse struct {
	ItemID       uint     `json:"item_id"`
	ItemName     string   `json:"item_name"`
	CategoryID   uint     `json:"category_id"`
	CategoryName string   `json:"category_name"`
	Type         string   `json:"type"`
	Months       []string `json:"months"` // always 12, "0.00" for empty months
	Total        string   `json:"total"`
}

type ItemsSummaryResponse struct {
	Year  int                `json:"year"`
	Items []ItemYearResponse `json:"items"`
}

type SummaryResponse struct {
	Year   int                    `json:"year"`
	Months []MonthSummaryResponse `json:"months"` // always 12
	Total  MonthSummaryResponse   `json:"total"`
}
