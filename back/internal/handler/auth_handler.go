package handler

import (
	"errors"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/middleware"
	"github.com/Han-Wanburhan/personal-site/back/internal/service"
)

type AuthHandler struct {
	auth     service.AuthService
	validate *validator.Validate
}

func NewAuthHandler(auth service.AuthService, validate *validator.Validate) *AuthHandler {
	return &AuthHandler{auth: auth, validate: validate}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body")
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "validation failed",
			"details": validationDetails(err),
		})
	}

	user, err := h.auth.Register(c.UserContext(), req)
	if err != nil {
		return mapAuthError(err)
	}
	return c.Status(fiber.StatusCreated).JSON(dto.NewUserResponse(user))
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid JSON body")
	}
	if err := h.validate.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "validation failed",
			"details": validationDetails(err),
		})
	}

	res, err := h.auth.Login(c.UserContext(), req)
	if err != nil {
		return mapAuthError(err)
	}
	return c.JSON(res)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		return fiber.ErrUnauthorized
	}
	return c.JSON(dto.NewUserResponse(user))
}

// mapAuthError turns service errors into HTTP errors.
func mapAuthError(err error) error {
	switch {
	case errors.Is(err, service.ErrEmailTaken):
		return fiber.NewError(fiber.StatusConflict, "email already taken")
	case errors.Is(err, service.ErrUsernameTaken):
		return fiber.NewError(fiber.StatusConflict, "username already taken")
	case errors.Is(err, service.ErrPhoneTaken):
		return fiber.NewError(fiber.StatusConflict, "phone already taken")
	case errors.Is(err, service.ErrUserExists):
		return fiber.NewError(fiber.StatusConflict, "user already exists")
	case errors.Is(err, service.ErrInvalidCredentials):
		return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
	case errors.Is(err, service.ErrRegisterDisabled):
		return fiber.NewError(fiber.StatusForbidden, "registration is disabled")
	default:
		return err // unexpected → 500 by ErrorHandler
	}
}

// validationDetails returns {"field": "rule"} for each failed field.
func validationDetails(err error) map[string]string {
	details := map[string]string{}
	var verrs validator.ValidationErrors
	if errors.As(err, &verrs) {
		for _, fe := range verrs {
			details[fe.Field()] = fe.Tag()
		}
	}
	return details
}
