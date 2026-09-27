package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/Han-Wanburhan/personal-site/back/internal/config"
	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/model"
	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

type AuthService interface {
	Register(ctx context.Context, req dto.RegisterRequest) (*model.User, error)
	Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error)
	Authenticate(ctx context.Context, token string) (*model.User, error)
}

type Claims struct {
	Ver int `json:"ver"`
	jwt.RegisteredClaims
}

type authService struct {
	users repository.UserRepository
	cfg   config.AuthConfig
}

func NewAuthService(users repository.UserRepository, cfg config.AuthConfig) AuthService {
	return &authService{users: users, cfg: cfg}
}

// ---------- Register ----------

func (s *authService) Register(ctx context.Context, req dto.RegisterRequest) (*model.User, error) {
	if !s.cfg.AllowRegister {
		return nil, ErrRegisterDisabled
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	username := strings.ToLower(strings.TrimSpace(req.Username))
	phone := strings.TrimSpace(req.Phone)

	if err := s.ensureFree(ctx, s.users.FindByEmail, email, ErrEmailTaken); err != nil {
		return nil, err
	}
	if err := s.ensureFree(ctx, s.users.FindByUsername, username, ErrUsernameTaken); err != nil {
		return nil, err
	}
	if err := s.ensureFree(ctx, s.users.FindByPhone, phone, ErrPhoneTaken); err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &model.User{
		Email:        email,
		Username:     username,
		Phone:        phone,
		PasswordHash: string(hash),
	}
	if err := s.users.Create(ctx, user); err != nil {
		if errors.Is(err, repository.ErrDuplicate) {
			return nil, ErrUserExists
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

// ensureFree returns takenErr if a user with this value already exists.
func (s *authService) ensureFree(
	ctx context.Context,
	find func(context.Context, string) (*model.User, error),
	value string,
	takenErr error,
) error {
	_, err := find(ctx, value)
	if err == nil {
		return takenErr
	}
	if errors.Is(err, repository.ErrNotFound) {
		return nil
	}
	return fmt.Errorf("check existing user: %w", err)
}

// ---------- Login ----------

func (s *authService) Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error) {
	user, err := s.findByIdentifier(ctx, strings.TrimSpace(req.Identifier))
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.issueToken(user)
	if err != nil {
		return nil, fmt.Errorf("issue token: %w", err)
	}

	return &dto.AuthResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   int64(s.cfg.TokenTTL.Seconds()),
		User:        dto.NewUserResponse(user),
	}, nil
}

func (s *authService) findByIdentifier(ctx context.Context, id string) (*model.User, error) {
	switch {
	case strings.Contains(id, "@"):
		return s.users.FindByEmail(ctx, strings.ToLower(id))
	case isAllDigits(id):
		return s.users.FindByPhone(ctx, id)
	default:
		return s.users.FindByUsername(ctx, strings.ToLower(id))
	}
}

func isAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// ---------- JWT ----------

func (s *authService) issueToken(user *model.User) (string, error) {
	now := time.Now()
	claims := Claims{
		Ver: user.TokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatUint(uint64(user.ID), 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.TokenTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *authService) Authenticate(ctx context.Context, tokenStr string) (*model.User, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(
		tokenStr,
		claims,
		func(t *jwt.Token) (any, error) { return []byte(s.cfg.JWTSecret), nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, ErrInvalidToken
	}

	id, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil {
		return nil, ErrInvalidToken
	}

	user, err := s.users.FindByID(ctx, uint(id))
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrInvalidToken
	}
	if err != nil {
		return nil, fmt.Errorf("find user: %w", err)
	}

	if user.TokenVersion != claims.Ver {
		return nil, ErrInvalidToken
	}
	return user, nil
}
