package handler

import (
	"errors"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/middleware"
	"github.com/Han-Wanburhan/personal-site/back/internal/service"
)

type TransactionHandler struct {
	txns     service.TransactionService
	validate *validator.Validate
}

func NewTransactionHandler(txns service.TransactionService, validate *validator.Validate) *TransactionHandler {
	return &TransactionHandler{txns: txns, validate: validate}
}

// List handles GET /api/transactions?from=2026-09-01&to=2026-09-30 (both optional).
func (h *TransactionHandler) List(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	from, err := queryDate(c, "from")
	if err != nil {
		return err
	}
	to, err := queryDate(c, "to")
	if err != nil {
		return err
	}
	if from != nil && to != nil && from.After(*to) {
		return fiber.NewError(fiber.StatusBadRequest, "from must be on or before to")
	}

	list, err := h.txns.List(c.UserContext(), user.ID, from, to)
	if err != nil {
		return err
	}
	resp := make([]dto.TransactionResponse, 0, len(list))
	for i := range list {
		resp = append(resp, dto.NewTransactionResponse(&list[i]))
	}
	return c.JSON(resp)
}

// Create handles POST /api/transactions
func (h *TransactionHandler) Create(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	var req dto.CreateTransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body (amount must be a number)")
	}
	if err := h.validate.Struct(req); err != nil {
		return validationError(c, err)
	}

	t, err := h.txns.Create(c.UserContext(), user.ID, req)
	if err != nil {
		return mapTransactionError(err)
	}
	return c.Status(fiber.StatusCreated).JSON(dto.NewTransactionResponse(t))
}

// Update handles PUT /api/transactions/:id
func (h *TransactionHandler) Update(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}
	id, err := pathID(c, "invalid transaction id")
	if err != nil {
		return err
	}

	var req dto.UpdateTransactionRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body (amount must be a number)")
	}
	if err := h.validate.Struct(req); err != nil {
		return validationError(c, err)
	}

	t, err := h.txns.Update(c.UserContext(), user.ID, id, req)
	if err != nil {
		return mapTransactionError(err)
	}
	return c.JSON(dto.NewTransactionResponse(t))
}

// Delete handles DELETE /api/transactions/:id → 204 No Content
func (h *TransactionHandler) Delete(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}
	id, err := pathID(c, "invalid transaction id")
	if err != nil {
		return err
	}
	if err := h.txns.Delete(c.UserContext(), user.ID, id); err != nil {
		return mapTransactionError(err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// queryDate reads an optional YYYY-MM-DD query parameter.
func queryDate(c *fiber.Ctx, name string) (*time.Time, error) {
	s := c.Query(name)
	if s == "" {
		return nil, nil
	}
	d, err := service.ParseDate(s)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, name+" must be a date like 2026-09-30")
	}
	return &d, nil
}

func mapTransactionError(err error) error {
	switch {
	case errors.Is(err, service.ErrTransactionNotFound):
		return fiber.NewError(fiber.StatusNotFound, "transaction not found")
	case errors.Is(err, service.ErrItemNotFound):
		return fiber.NewError(fiber.StatusNotFound, "item not found")
	case errors.Is(err, service.ErrInvalidAmount):
		return fiber.NewError(fiber.StatusBadRequest, "amount must be greater than 0 with at most 2 decimals")
	default:
		return err // unexpected → 500 by ErrorHandler
	}
}
