package service

import "errors"

var (
	ErrEmailTaken         = errors.New("email already taken")
	ErrUsernameTaken      = errors.New("username already taken")
	ErrPhoneTaken         = errors.New("phone already taken")
	ErrUserExists         = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrRegisterDisabled   = errors.New("registration is disabled")
	ErrInvalidToken       = errors.New("invalid token")

	ErrCategoryNotFound  = errors.New("category not found")
	ErrCategoryNameTaken = errors.New("category name already taken")
	ErrInvalidName       = errors.New("name must not be empty")

	ErrItemNotFound  = errors.New("item not found")
	ErrItemNameTaken = errors.New("item name already taken in this category")

	ErrTransactionNotFound = errors.New("transaction not found")
	ErrInvalidAmount       = errors.New("amount must be greater than 0 with at most 2 decimals")
)
