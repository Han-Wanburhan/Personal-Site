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
	CategoryIncome  = "income"
	CategoryExpense = "expense"
)
