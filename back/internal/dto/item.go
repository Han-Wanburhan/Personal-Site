package dto

import (
	"time"

	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

// ---------- Requests (JSON in) ----------
// The category comes from the URL (/categories/:id/items) and is checked against the token's user.

type CreateItemRequest struct {
	Name string `json:"name" validate:"required,max=100"`
}

// An item can't move to another category: old transactions would change type.
type UpdateItemRequest struct {
	Name     *string `json:"name" validate:"omitempty,min=1,max=100"`
	IsActive *bool   `json:"is_active"`
}

// ---------- Responses (JSON out) ----------

type ItemResponse struct {
	ID           uint      `json:"id"`
	CategoryID   uint      `json:"category_id"`
	CategoryName string    `json:"category_name"`
	Type         string    `json:"type"`
	Name         string    `json:"name"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func NewItemResponse(v *repository.ItemView) ItemResponse {
	return ItemResponse{
		ID:           v.ID,
		CategoryID:   v.CategoryID,
		CategoryName: v.CategoryName,
		Type:         v.CategoryType,
		Name:         v.Name,
		IsActive:     v.IsActive,
		CreatedAt:    v.CreatedAt,
		UpdatedAt:    v.UpdatedAt,
	}
}
