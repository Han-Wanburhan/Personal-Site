package config

import (
	"errors"
	"fmt"
	"io/fs"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	AppPort string `env:"APP_PORT" envDefault:"8080"`
	DB      DBConfig
	Auth    AuthConfig
}

type AuthConfig struct {
	JWTSecret     string        `env:"JWT_SECRET,required"`
	TokenTTL      time.Duration `env:"JWT_TTL" envDefault:"24h"`
	AllowRegister bool          `env:"ALLOW_REGISTER" envDefault:"false"`
}
type DBConfig struct {
	Host     string `env:"DB_HOST,required"`
	Port     string `env:"DB_PORT,required"`
	Name     string `env:"DB_NAME,required"`
	User     string `env:"DB_USER,required"`
	Password string `env:"DB_PASSWORD,required"`
}

func Load() (*Config, error) {
	if err := godotenv.Load("../.env"); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return nil, fmt.Errorf("load .env: %w", err)
	}

	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return nil, fmt.Errorf("parse env: %w", err)
	}

	if len(cfg.Auth.JWTSecret) < 32 {
		return nil, errors.New("JWT_SECRET must be at least 32 characters")
	}

	return &cfg, nil
}
