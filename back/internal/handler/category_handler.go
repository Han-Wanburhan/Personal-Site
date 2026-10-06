package handler

import (
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/middleware"
	"github.com/Han-Wanburhan/personal-site/back/internal/model"
	"github.com/Han-Wanburhan/personal-site/back/internal/service"
)

type CategoryHandler struct {
	categories service.CategoryService
	validate   *validator.Validate
}

func NewCategoryHandler(categories service.CategoryService, validate *validator.Validate) *CategoryHandler {
	return &CategoryHandler{categories: categories, validate: validate}
}

// List handles GET /api/categories?type=income|expense
func (h *CategoryHandler) List(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	catType := c.Query("type")
	if catType != "" && catType != model.CategoryIncome && catType != model.CategoryExpense {
		return fiber.NewError(fiber.StatusBadRequest, "type must be income or expense")
	}

	list, err := h.categories.List(c.UserContext(), user.ID, catType)
	if err != nil {
		return err
	}

	// Always send an array, so an empty list is [] and not null.
	resp := make([]dto.CategoryResponse, 0, len(list))
	for i := range list {
		resp = append(resp, dto.NewCategoryResponse(&list[i]))
	}
	return c.JSON(resp)
}

// Create handles POST /api/categories
func (h *CategoryHandler) Create(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	var req dto.CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body")
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "validation failed",
			"details": validationDetails(err),
		})
	}

	cat, err := h.categories.Create(c.UserContext(), user.ID, req)
	if err != nil {
		return mapCategoryError(err)
	}
	return c.Status(fiber.StatusCreated).JSON(dto.NewCategoryResponse(cat))
}

// Update handles PUT /api/categories/:id
func (h *CategoryHandler) Update(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return fiber.NewError(fiber.StatusBadRequest, "invalid category id")
	}

	var req dto.UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body")
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "validation failed",
			"details": validationDetails(err),
		})
	}

	cat, err := h.categories.Update(c.UserContext(), user.ID, uint(id), req)
	if err != nil {
		return mapCategoryError(err)
	}
	return c.JSON(dto.NewCategoryResponse(cat))
}

// mapCategoryError turns service errors into HTTP errors.
func mapCategoryError(err error) error {
	switch {
	case errors.Is(err, service.ErrCategoryNotFound):
		return fiber.NewError(fiber.StatusNotFound, "category not found")
	case errors.Is(err, service.ErrCategoryNameTaken):
		return fiber.NewError(fiber.StatusConflict, "category name already taken")
	case errors.Is(err, service.ErrInvalidName):
		return fiber.NewError(fiber.StatusBadRequest, "name must not be empty")
	default:
		return err // unexpected → 500 by ErrorHandler
	}
}
