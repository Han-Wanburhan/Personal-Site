package service

import (
	"context"
	"errors"
	"strings"

	"github.com/Han-Wanburhan/personal-site/back/internal/dto"
	"github.com/Han-Wanburhan/personal-site/back/internal/model"
	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
)

type CategoryService interface {
	List(ctx context.Context, userID uint, catType string) ([]model.Category, error)
	Create(ctx context.Context, userID uint, req dto.CreateCategoryRequest) (*model.Category, error)
	Update(ctx context.Context, userID, id uint, req dto.UpdateCategoryRequest) (*model.Category, error)
}

type categoryService struct {
	categories repository.CategoryRepository
}

func NewCategoryService(categories repository.CategoryRepository) CategoryService {
	return &categoryService{categories: categories}
}

func (s *categoryService) List(ctx context.Context, userID uint, catType string) ([]model.Category, error) {
	return s.categories.ListByUser(ctx, userID, catType)
}

func (s *categoryService) Create(ctx context.Context, userID uint, req dto.CreateCategoryRequest) (*model.Category, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, ErrInvalidName // rule 1
	}

	c := &model.Category{
		UserID:   userID, // from the token (passed in by the handler)
		Name:     name,
		Type:     req.Type,
		IsActive: true, // rule 2
	}
	err := s.categories.Create(ctx, c)
	if errors.Is(err, repository.ErrDuplicate) {
		return nil, ErrCategoryNameTaken // rule 5
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (s *categoryService) Update(ctx context.Context, userID, id uint, req dto.UpdateCategoryRequest) (*model.Category, error) {
	c, err := s.categories.FindByIDForUser(ctx, id, userID) // rule 4
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrCategoryNotFound
	}
	if err != nil {
		return nil, err
	}

	// rule 3: only change what was sent
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			return nil, ErrInvalidName
		}
		c.Name = name
	}
	if req.IsActive != nil {
		c.IsActive = *req.IsActive // the value the pointer points to
	}

	err = s.categories.Update(ctx, c)
	if errors.Is(err, repository.ErrDuplicate) {
		return nil, ErrCategoryNameTaken
	}
	if err != nil {
		return nil, err
	}
	return c, nil
}
