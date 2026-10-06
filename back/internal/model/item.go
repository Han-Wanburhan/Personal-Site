package model

import "time"

type Item struct {
	ID         uint `gorm:"primaryKey"`
	CategoryID uint
	Name       string
	IsActive   bool
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (Item) TableName() string {
	return "items"
}
