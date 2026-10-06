package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

type CategoryRepository interface {
	ListByUser(ctx context.Context, userID uint, catType string) ([]model.Category, error)
	FindByIDForUser(ctx context.Context, id, userID uint) (*model.Category, error)
	Create(ctx context.Context, c *model.Category) error
	Update(ctx context.Context, c *model.Category) error
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

// ListByUser returns the user's categories. catType "" means both types.
func (r *categoryRepository) ListByUser(ctx context.Context, userID uint, catType string) ([]model.Category, error) {
	q := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if catType != "" {
		q = q.Where("type = ?", catType)
	}
	var list []model.Category
	err := q.Order("type, name").Find(&list).Error
	return list, err
}

// FindByIDForUser finds one category, only if it belongs to userID.
func (r *categoryRepository) FindByIDForUser(ctx context.Context, id, userID uint) (*model.Category, error) {
	var c model.Category
	err := r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound // the same "not found" error the user repository uses
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *categoryRepository) Create(ctx context.Context, c *model.Category) error {
	err := r.db.WithContext(ctx).Create(c).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrDuplicate // e.g. a second "Food" expense for the same user
	}
	return err
}

// Update saves every field of an existing category.
func (r *categoryRepository) Update(ctx context.Context, c *model.Category) error {
	err := r.db.WithContext(ctx).Save(c).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrDuplicate // renaming to a name that already exists
	}
	return err
}
