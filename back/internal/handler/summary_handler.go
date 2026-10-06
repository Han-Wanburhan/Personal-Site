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

	year := service.Now().Year()
	if s := c.Query("year"); s != "" {
		y, err := strconv.Atoi(s)
		if err != nil {
			return fiber.NewError(fiber.StatusBadRequest, "year must be a number like 2026")
		}
		year = y
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
		Saved:            m.Saved.StringFixed(2),
		SavingsRate:      rate,
		TransactionCount: m.Count,
	}
}
