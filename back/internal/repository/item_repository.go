package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/Han-Wanburhan/personal-site/back/internal/model"
)

// ItemView is an item plus the category it belongs to (one JOIN query).
type ItemView struct {
	model.Item
	CategoryName string
	CategoryType string
}

type ItemRepository interface {
	// ListByUser returns the user's items. categoryID 0 means all categories.
	ListByUser(ctx context.Context, userID, categoryID uint) ([]ItemView, error)
	FindByIDForUser(ctx context.Context, id, userID uint) (*ItemView, error)
	Create(ctx context.Context, item *model.Item) error
	Update(ctx context.Context, item *model.Item) error
}

type itemRepository struct {
	db *gorm.DB
}

func NewItemRepository(db *gorm.DB) ItemRepository {
	return &itemRepository{db: db}
}

// items have no user_id: ownership goes through the category.
func (r *itemRepository) viewQuery(ctx context.Context, userID uint) *gorm.DB {
	return r.db.WithContext(ctx).
		Table("items").
		Select("items.*, categories.name AS category_name, categories.type AS category_type").
		Joins("JOIN categories ON categories.id = items.category_id").
		Where("categories.user_id = ?", userID)
}

func (r *itemRepository) ListByUser(ctx context.Context, userID, categoryID uint) ([]ItemView, error) {
	q := r.viewQuery(ctx, userID)
	if categoryID != 0 {
		q = q.Where("items.category_id = ?", categoryID)
	}
	var list []ItemView
	err := q.Order("categories.type, categories.name, items.name").Scan(&list).Error
	return list, err
}

func (r *itemRepository) FindByIDForUser(ctx context.Context, id, userID uint) (*ItemView, error) {
	var list []ItemView
	err := r.viewQuery(ctx, userID).Where("items.id = ?", id).Limit(1).Scan(&list).Error
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, ErrNotFound
	}
	return &list[0], nil
}

func (r *itemRepository) Create(ctx context.Context, item *model.Item) error {
	err := r.db.WithContext(ctx).Create(item).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrDuplicate // same name twice in one category
	}
	return err
}

func (r *itemRepository) Update(ctx context.Context, item *model.Item) error {
	err := r.db.WithContext(ctx).Save(item).Error
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrDuplicate
	}
	return err
}
