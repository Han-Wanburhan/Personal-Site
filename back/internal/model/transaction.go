package model

import (
	"time"

	"github.com/shopspring/decimal"
)

type Transaction struct {
	ID        uint `gorm:"primaryKey"`
	ItemID    uint
	Amount    decimal.Decimal `gorm:"type:decimal(12,2)"` // money: exact decimals, never float
	TxnDate   time.Time       `gorm:"type:date"`
	Note      *string         // NULL when there is no note
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Transaction) TableName() string {
	return "transactions"
}
