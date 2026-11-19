package handler

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/middleware"
	"github.com/Han-Wanburhan/personal-site/back/internal/service"
)

type SummaryHandler struct {
	summary service.SummaryService
}

func NewSummaryHandler(summary service.SummaryService) *SummaryHandler {
	return &SummaryHandler{summary: summary}
}

// Year handles GET /api/summary?year=2026 (default: the current year in Bangkok).
func (h *SummaryHandler) Year(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}

	year, err := yearParam(c)
	if err != nil {
		return err
	}

	ys, err := h.summary.Year(c.UserContext(), user.ID, year)
	if errors.Is(err, service.ErrInvalidYear) {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err != nil {
		return err
	}

	resp := dto.SummaryResponse{Year: ys.Year, Months: make([]dto.MonthSummaryResponse, 0, 12), Total: monthResponse(ys.Total)}
	for _, m := range ys.Months {
		resp.Months = append(resp.Months, monthResponse(m))
	}
	return c.JSON(resp)
}

// Items handles GET /api/summary/items?year=2026: every item with its 12 monthly totals.
func (h *SummaryHandler) Items(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}
	year, err := yearParam(c)
	if err != nil {
		return err
	}

	items, err := h.summary.Items(c.UserContext(), user.ID, year)
	if errors.Is(err, service.ErrInvalidYear) {
		return fiber.NewError(fiber.StatusBadRequest, err.Error())
	}
	if err != nil {
		return err
	}

	resp := dto.ItemsSummaryResponse{Year: year, Items: make([]dto.ItemYearResponse, 0, len(items))}
	for _, it := range items {
		months := make([]string, 12)
		for i, m := range it.Months {
			months[i] = m.StringFixed(2)
		}
		resp.Items = append(resp.Items, dto.ItemYearResponse{
			ItemID: it.ItemID, ItemName: it.ItemName,
			CategoryID: it.CategoryID, CategoryName: it.CategoryName, Type: it.Type,
			Months: months, Total: it.Total.StringFixed(2),
		})
	}
	return c.JSON(resp)
}

// yearParam reads ?year=, defaulting to the current year in Bangkok.
func yearParam(c *fiber.Ctx) (int, error) {
	s := c.Query("year")
	if s == "" {
		return service.Now().Year(), nil
	}
	y, err := strconv.Atoi(s)
	if err != nil {
		return 0, fiber.NewError(fiber.StatusBadRequest, "year must be a number like 2026")
	}
	return y, nil
}

func monthResponse(m service.MonthSummary) dto.MonthSummaryResponse {
	var rate *string
	if m.SavingsRate != nil {
		s := m.SavingsRate.StringFixed(1)
		rate = &s
	}
	return dto.MonthSummaryResponse{
		Month:            m.Month,
		Income:           m.Income.StringFixed(2),
		Expense:          m.Expense.StringFixed(2),
		Saving:           m.Saving.StringFixed(2),
		Investment:       m.Investment.StringFixed(2),
		LeftOver:         m.LeftOver.StringFixed(2),
		SavingsRate:      rate,
		TransactionCount: m.Count,
	}
}
