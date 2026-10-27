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

type SummaryResponse struct {
	Year   int                    `json:"year"`
	Months []MonthSummaryResponse `json:"months"` // always 12
	Total  MonthSummaryResponse   `json:"total"`
}
