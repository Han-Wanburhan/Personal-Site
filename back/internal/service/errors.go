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
)
