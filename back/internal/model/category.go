package model

import "time"

type Category struct {
	ID        uint `gorm:"primaryKey"`
	UserID    uint
	Name      string
	Type      string
	IsActive  bool
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Category) TableName() string {
	return "categories"
}

const (
	CategoryIncome     = "income"
	CategoryExpense    = "expense"
	CategorySaving     = "saving"     // moved to savings: still your money
	CategoryInvestment = "investment" // moved into funds / stocks: still your money
)

// IsCategoryType reports whether t is one of the four category types.
func IsCategoryType(t string) bool {
	switch t {
	case CategoryIncome, CategoryExpense, CategorySaving, CategoryInvestment:
		return true
	}
	return false
}

// AllowsWithdrawal: savings and investments can go down (a withdrawal or a sale),
// stored as a negative amount. Income and expenses are always positive.
func AllowsWithdrawal(t string) bool {
	return t == CategorySaving || t == CategoryInvestment
}
