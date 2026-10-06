package dto

import (
	"time"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

// ---------- Requests (JSON in) ----------

type CreateCategoryRequest struct {
	Name string `json:"name" validate:"required,max=100"`
	Type string `json:"type" validate:"required,oneof=income expense"`
}

type UpdateCategoryRequest struct {
	Name     *string `json:"name" validate:"omitempty,min=1,max=100"`
	IsActive *bool   `json:"is_active"`
}

// ---------- Responses (JSON out) ----------

type CategoryResponse struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func NewCategoryResponse(c *model.Category) CategoryResponse {
	return CategoryResponse{
		ID:        c.ID,
		Name:      c.Name,
		Type:      c.Type,
		IsActive:  c.IsActive,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}
