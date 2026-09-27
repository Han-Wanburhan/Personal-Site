package dto

import (
	"time"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

// ---------- Requests (JSON in) ----------

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email,max=100"`
	Username string `json:"username" validate:"required,username,max=100"`
	Phone    string `json:"phone" validate:"required,numeric,len=10,startswith=0"`
	Password string `json:"password" validate:"required,min=8,max=72"`
}

type LoginRequest struct {
	Identifier string `json:"identifier" validate:"required,max=100"` // email, username, or phone
	Password   string `json:"password" validate:"required"`
}

// ---------- Responses (JSON out) ----------

type UserResponse struct {
	ID        uint      `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthResponse struct {
	AccessToken string       `json:"access_token"`
	TokenType   string       `json:"token_type"`
	ExpiresIn   int64        `json:"expires_in"`
	User        UserResponse `json:"user"`
}

func NewUserResponse(u *model.User) UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Username:  u.Username,
		Phone:     u.Phone,
		CreatedAt: u.CreatedAt,
	}
}
