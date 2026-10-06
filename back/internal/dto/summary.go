package dto

// Money is sent as strings ("13800.00") so no precision is lost in JSON.

type MonthSummaryResponse struct {
	Month            int     `json:"month"` // 1-12 (0 for the year total)
	Income           string  `json:"income"`
	Expense          string  `json:"expense"`
	Saved            string  `json:"saved"`
	SavingsRate      *string `json:"savings_rate"` // "30.7", or null when there is no income
	TransactionCount int     `json:"transaction_count"`
}

type SummaryResponse struct {
	Year   int                    `json:"year"`
	Months []MonthSummaryResponse `json:"months"` // always 12
	Total  MonthSummaryResponse   `json:"total"`
}
