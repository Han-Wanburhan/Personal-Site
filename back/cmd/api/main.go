package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/Han-Wanburhan/personal-site/back/internal/config"
	"github.com/Han-Wanburhan/personal-site/back/internal/database"
	"github.com/Han-Wanburhan/personal-site/back/internal/handler"
	"github.com/Han-Wanburhan/personal-site/back/internal/middleware"
	"github.com/Han-Wanburhan/personal-site/back/internal/repository"
	"github.com/Han-Wanburhan/personal-site/back/internal/service"
)

func main() {
	// 1. config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	// 2. database
	db, err := database.Connect(cfg.DB)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	sqlDB, _ := db.DB()
	defer sqlDB.Close()
	log.Println("db connected")

	// 3. fiber + routes
	app := fiber.New(fiber.Config{
		ErrorHandler: handler.ErrorHandler,
	})
	app.Use(recover.New()) // a panic in one request returns 500 instead of crashing the server
	app.Use(logger.New())  // log every request: status, latency, method, path

	validate := handler.NewValidator()

	userRepo := repository.NewUserRepository(db)
	authService := service.NewAuthService(userRepo, cfg.Auth)

	categoryRepo := repository.NewCategoryRepository(db)
	categoryService := service.NewCategoryService(categoryRepo)

	itemRepo := repository.NewItemRepository(db)
	itemService := service.NewItemService(itemRepo, categoryRepo)

	txnRepo := repository.NewTransactionRepository(db)
	txnService := service.NewTransactionService(txnRepo, itemRepo)

	summaryService := service.NewSummaryService(repository.NewSummaryRepository(db))

	healthHandler := handler.NewHealthHandler(db)
	authHandler := handler.NewAuthHandler(authService, validate)
	categoryHandler := handler.NewCategoryHandler(categoryService, validate)
	itemHandler := handler.NewItemHandler(itemService, validate)
	txnHandler := handler.NewTransactionHandler(txnService, validate)
	summaryHandler := handler.NewSummaryHandler(summaryService)
	importHandler := handler.NewImportHandler(db)
	requireAuth := middleware.RequireAuth(authService)

	app.Get("/health", healthHandler.Check)

	api := app.Group("/api")
	api.Get("/health", healthHandler.Check) // for Uptime Kuma: reachable through Caddy as /api/health
	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)
	api.Get("/me", requireAuth, authHandler.Me)

	categories := api.Group("/categories", requireAuth) // every category route needs a login
	categories.Get("/", categoryHandler.List)
	categories.Post("/", categoryHandler.Create)
	categories.Put("/:id", categoryHandler.Update)
	categories.Get("/:id/items", itemHandler.ListInCategory)
	categories.Post("/:id/items", itemHandler.Create)

	items := api.Group("/items", requireAuth)
	items.Get("/", itemHandler.ListAll)
	items.Put("/:id", itemHandler.Update)

	txns := api.Group("/transactions", requireAuth)
	txns.Get("/", txnHandler.List)
	txns.Post("/", txnHandler.Create)
	txns.Put("/:id", txnHandler.Update)
	txns.Delete("/:id", txnHandler.Delete)

	api.Get("/summary", requireAuth, summaryHandler.Year)
	api.Post("/import/sheets", requireAuth, importHandler.Sheets) // list the sheets of an uploaded workbook
	api.Post("/import", requireAuth, importHandler.Excel)         // upload the old Excel workbook

	// 4. start server
	serverErr := make(chan error, 1)
	go func() {
		serverErr <- app.Listen(":" + cfg.AppPort)
	}()

	// 5. wait for Ctrl+C / SIGTERM or server error
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErr:
		log.Printf("server error: %v", err)
	case <-ctx.Done():
		log.Println("shutting down...")
	}

	// 6. graceful shutdown
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Printf("shutdown error: %v", err)
	}
	log.Println("server stopped")
}
