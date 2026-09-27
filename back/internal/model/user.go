package model

import "time"

type User struct {
	ID           uint `gorm:"primaryKey"`
	Email        string
	Username     string
	Phone        string
	PasswordHash string
	TokenVersion int
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (User) TableName() string {
	return "users"
}