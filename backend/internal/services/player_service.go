package services

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
	"zombie-car-game-backend/internal/auth"
	"zombie-car-game-backend/internal/models"
)

var (
	ErrPlayerNotFound     = errors.New("player not found")
	ErrUsernameExists     = errors.New("username already exists")
	ErrEmailExists        = errors.New("email already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInsufficientFunds  = errors.New("insufficient funds")
)

// PlayerService handles player-related operations
type PlayerService struct {
	db              *gorm.DB
	passwordService *auth.PasswordService
	jwtService      *auth.JWTService
}

// NewPlayerService creates a new player service
func NewPlayerService(db *gorm.DB) *PlayerService {
	return &PlayerService{
		db:              db,
		passwordService: auth.NewPasswordService(),
		jwtService:      auth.NewJWTService(),
	}
}

// CreatePlayerRequest represents the request to create a new player
type CreatePlayerRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email,max=100"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginRequest represents the login request
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	Token  string        `json:"token"`
	Player *models.Player `json:"player"`
}

// CreatePlayer creates a new player account
func (s *PlayerService) CreatePlayer(req CreatePlayerRequest) (*AuthResponse, error) {
	// Check if username already exists
	var existingPlayer models.Player
	if err := s.db.Where("username = ?", req.Username).First(&existingPlayer).Error; err == nil {
		return nil, ErrUsernameExists
	}

	// Check if email already exists
	if err := s.db.Where("email = ?", req.Email).First(&existingPlayer).Error; err == nil {
		return nil, ErrEmailExists
	}

	// Hash password
	hashedPassword, err := s.passwordService.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create player
	player := models.Player{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Currency:     1000, // Starting currency
		Level:        1,
	}

	if err := s.db.Create(&player).Error; err != nil {
		return nil, fmt.Errorf("failed to create player: %w", err)
	}

	// Generate JWT token
	token, err := s.jwtService.GenerateToken(player.ID, player.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResponse{
		Token:  token,
		Player: &player,
	}, nil
}

// Login authenticates a player and returns a JWT token
func (s *PlayerService) Login(req LoginRequest) (*AuthResponse, error) {
	var player models.Player
	if err := s.db.Where("username = ?", req.Username).First(&player).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Verify password
	if err := s.passwordService.VerifyPassword(player.PasswordHash, req.Password); err != nil {
		return nil, ErrInvalidCredentials
	}

	// Generate JWT token
	token, err := s.jwtService.GenerateToken(player.ID, player.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResponse{
		Token:  token,
		Player: &player,
	}, nil
}

// GetPlayer retrieves a player by ID
func (s *PlayerService) GetPlayer(playerID uint) (*models.Player, error) {
	var player models.Player
	if err := s.db.Preload("OwnedVehicles").Preload("LevelProgress").First(&player, playerID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPlayerNotFound
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &player, nil
}

// UpdatePlayerCurrency updates a player's currency
func (s *PlayerService) UpdatePlayerCurrency(playerID uint, amount int) error {
	var player models.Player
	if err := s.db.First(&player, playerID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPlayerNotFound
		}
		return fmt.Errorf("database error: %w", err)
	}

	newCurrency := player.Currency + amount
	if newCurrency < 0 {
		return ErrInsufficientFunds
	}

	if err := s.db.Model(&player).Update("currency", newCurrency).Error; err != nil {
		return fmt.Errorf("failed to update currency: %w", err)
	}

	return nil
}

// UpdatePlayerLevel updates a player's level
func (s *PlayerService) UpdatePlayerLevel(playerID uint, level int) error {
	if err := s.db.Model(&models.Player{}).Where("id = ?", playerID).Update("level", level).Error; err != nil {
		return fmt.Errorf("failed to update level: %w", err)
	}
	return nil
}

// UpdatePlayerScore updates a player's total score
func (s *PlayerService) UpdatePlayerScore(playerID uint, scoreToAdd int64) error {
	if err := s.db.Model(&models.Player{}).Where("id = ?", playerID).
		Update("total_score", gorm.Expr("total_score + ?", scoreToAdd)).Error; err != nil {
		return fmt.Errorf("failed to update score: %w", err)
	}
	return nil
}

// GetPlayerProgress retrieves a player's progress including owned vehicles and level progress
func (s *PlayerService) GetPlayerProgress(playerID uint) (*models.Player, error) {
	var player models.Player
	if err := s.db.Preload("OwnedVehicles").
		Preload("LevelProgress").
		Preload("GameSessions", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(10) // Last 10 sessions
		}).
		First(&player, playerID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPlayerNotFound
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &player, nil
}

// RefreshToken generates a new token for the player
func (s *PlayerService) RefreshToken(oldToken string) (*AuthResponse, error) {
	claims, err := s.jwtService.ValidateToken(oldToken)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	// Get updated player data
	player, err := s.GetPlayer(claims.PlayerID)
	if err != nil {
		return nil, err
	}

	// Generate new token
	token, err := s.jwtService.GenerateToken(player.ID, player.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &AuthResponse{
		Token:  token,
		Player: player,
	}, nil
}