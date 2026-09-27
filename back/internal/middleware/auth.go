package middleware

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
	"github.com/Han-Wanburhan/personal-site/back/internal/service"
)

const currentUserKey = "currentUser"

func RequireAuth(auth service.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get(fiber.HeaderAuthorization)
		token, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || token == "" {
			return fiber.NewError(fiber.StatusUnauthorized, "missing token")
		}

		user, err := auth.Authenticate(c.UserContext(), token)
		if errors.Is(err, service.ErrInvalidToken) {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
		}
		if err != nil {
			return err
		}

		c.Locals(currentUserKey, user)
		return c.Next()
	}
}

func CurrentUser(c *fiber.Ctx) (*model.User, bool) {
	user, ok := c.Locals(currentUserKey).(*model.User)
	return user, ok
}
