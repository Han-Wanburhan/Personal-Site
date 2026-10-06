package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

var (
	ErrNotFound  = errors.New("record not found")
	ErrDuplicate = errors.New("duplicate record")
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	FindByID(ctx context.Context, id uint) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
	FindByPhone(ctx context.Context, phone string) (*model.User, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *model.User) error {
	err := r.db.WithContext(ctx).Create(user).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrDuplicate
	}
	return err
}

func (r *userRepository) FindByID(ctx context.Context, id uint) (*model.User, error) {
	return r.findOne(ctx, "id = ?", id)
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	return r.findOne(ctx, "email = ?", email)
}

func (r *userRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	return r.findOne(ctx, "username = ?", username)
}

func (r *userRepository) FindByPhone(ctx context.Context, phone string) (*model.User, error) {
	return r.findOne(ctx, "phone = ?", phone)
}

// findOne runs a query that returns one user, and turns "not found" into ErrNotFound.
func (r *userRepository) findOne(ctx context.Context, query string, arg any) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where(query, arg).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}
