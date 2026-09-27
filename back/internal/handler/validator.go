package handler

import (
	"reflect"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

var usernameRe = regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]{2,29}$`)

func NewValidator() *validator.Validate {
	v := validator.New(validator.WithRequiredStructEnabled())

	// Use JSON names in errors ("email" instead of "Email")
	v.RegisterTagNameFunc(func(f reflect.StructField) string {
		name := strings.SplitN(f.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	// Custom tag: validate:"username"
	_ = v.RegisterValidation("username", func(fl validator.FieldLevel) bool {
		return usernameRe.MatchString(fl.Field().String())
	})

	return v
}
