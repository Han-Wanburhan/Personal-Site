package service

import (
	"context"
	"errors"
	"strings"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/model"
	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

type ItemService interface {
	// List returns the user's items. categoryID 0 means all categories.
	List(ctx context.Context, userID, categoryID uint) ([]repository.ItemView, error)
	Create(ctx context.Context, userID, categoryID uint, req dto.CreateItemRequest) (*repository.ItemView, error)
	Update(ctx context.Context, userID, id uint, req dto.UpdateItemRequest) (*repository.ItemView, error)
}

type itemService struct {
	items      repository.ItemRepository
	categories repository.CategoryRepository
}

func NewItemService(items repository.ItemRepository, categories repository.CategoryRepository) ItemService {
	return &itemService{items: items, categories: categories}
}

// ownCategory makes sure the category exists and belongs to the user.
func (s *itemService) ownCategory(ctx context.Context, userID, categoryID uint) error {
	_, err := s.categories.FindByIDForUser(ctx, categoryID, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrCategoryNotFound
	}
	return err
}

func (s *itemService) List(ctx context.Context, userID, categoryID uint) ([]repository.ItemView, error) {
	if categoryID != 0 {
		if err := s.ownCategory(ctx, userID, categoryID); err != nil {
			return nil, err
		}
	}
	return s.items.ListByUser(ctx, userID, categoryID)
}

// Create adds an item. Hidden (inactive) categories may still get items:
// hiding only removes a category from pickers, it doesn't lock it.
func (s *itemService) Create(ctx context.Context, userID, categoryID uint, req dto.CreateItemRequest) (*repository.ItemView, error) {
	if err := s.ownCategory(ctx, userID, categoryID); err != nil {
		return nil, err
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, ErrInvalidName
	}

	item := &model.Item{CategoryID: categoryID, Name: name, IsActive: true}
	err := s.items.Create(ctx, item)
	if errors.Is(err, repository.ErrDuplicate) {
		return nil, ErrItemNameTaken
	}
	if err != nil {
		return nil, err
	}
	return s.items.FindByIDForUser(ctx, item.ID, userID)
}

func (s *itemService) Update(ctx context.Context, userID, id uint, req dto.UpdateItemRequest) (*repository.ItemView, error) {
	view, err := s.items.FindByIDForUser(ctx, id, userID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrItemNotFound
	}
	if err != nil {
		return nil, err
	}

	item := view.Item // plain item row, without the joined category columns
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, ErrInvalidName
		}
		item.Name = name
	}
	if req.IsActive != nil {
		item.IsActive = *req.IsActive
	}

	err = s.items.Update(ctx, &item)
	if errors.Is(err, repository.ErrDuplicate) {
		return nil, ErrItemNameTaken
	}
	if err != nil {
		return nil, err
	}
	return s.items.FindByIDForUser(ctx, id, userID)
}
