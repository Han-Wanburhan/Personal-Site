package handler

import (
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/middleware"
	"github.com/Han-Wanburhan/personal-site/back/internal/service"
)

type ItemHandler struct {
	items    service.ItemService
	validate *validator.Validate
}

func NewItemHandler(items service.ItemService, validate *validator.Validate) *ItemHandler {
	return &ItemHandler{items: items, validate: validate}
}

// ListAll handles GET /api/items (every item of the user, with its category).
func (h *ItemHandler) ListAll(c *fiber.Ctx) error {
	return h.list(c, 0)
}

// ListInCategory handles GET /api/categories/:id/items
func (h *ItemHandler) ListInCategory(c *fiber.Ctx) error {
	categoryID, err := pathID(c, "invalid category id")
	if err != nil {
		return err
	}
	return h.list(c, categoryID)
}

func (h *ItemHandler) list(c *fiber.Ctx, categoryID uint) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}
	list, err := h.items.List(c.UserContext(), user.ID, categoryID)
	if err != nil {
		return mapItemError(err)
	}
	resp := make([]dto.ItemResponse, 0, len(list))
	for i := range list {
		resp = append(resp, dto.NewItemResponse(&list[i]))
	}
	return c.JSON(resp)
}

// Create handles POST /api/categories/:id/items
func (h *ItemHandler) Create(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}
	categoryID, err := pathID(c, "invalid category id")
	if err != nil {
		return err
	}

	var req dto.CreateItemRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body")
	}
	if err := h.validate.Struct(req); err != nil {
		return validationError(c, err)
	}

	item, err := h.items.Create(c.UserContext(), user.ID, categoryID, req)
	if err != nil {
		return mapItemError(err)
	}
	return c.Status(fiber.StatusCreated).JSON(dto.NewItemResponse(item))
}

// Update handles PUT /api/items/:id
func (h *ItemHandler) Update(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}
	id, err := pathID(c, "invalid item id")
	if err != nil {
		return err
	}

	var req dto.UpdateItemRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body")
	}
	if err := h.validate.Struct(req); err != nil {
		return validationError(c, err)
	}

	item, err := h.items.Update(c.UserContext(), user.ID, id, req)
	if err != nil {
		return mapItemError(err)
	}
	return c.JSON(dto.NewItemResponse(item))
}

func mapItemError(err error) error {
	switch {
	case errors.Is(err, service.ErrItemNotFound):
		return fiber.NewError(fiber.StatusNotFound, "item not found")
	case errors.Is(err, service.ErrItemNameTaken):
		return fiber.NewError(fiber.StatusConflict, "item name already taken in this category")
	default:
		return mapCategoryError(err) // category not found, empty name, or unexpected → 500
	}
}

// ---------- small helpers shared by the handlers ----------

// pathID reads the :id route parameter as a positive number.
func pathID(c *fiber.Ctx, msg string) (uint, error) {
	id, err := c.ParamsInt("id")
	if err != nil || id <= 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, msg)
	}
	return uint(id), nil
}

func validationError(c *fiber.Ctx, err error) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"error":   "validation failed",
		"details": validationDetails(err),
	})
}
