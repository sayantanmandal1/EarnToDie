package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/models"
)

var (
	ErrSessionNotFound    = errors.New("game session not found")
	ErrSessionNotActive   = errors.New("game session is not active")
	ErrInvalidScore       = errors.New("invalid score value")
	ErrScoreValidation    = errors.New("score validation failed")
	ErrSessionAlreadyEnded = errors.New("session already ended")
)

// GameStateService handles game session and state management
type GameStateService struct {
	db            *gorm.DB
	playerService *PlayerService
}

// NewGameStateService creates a new game state service
func NewGameStateService(db *gorm.DB, playerService *PlayerService) *GameStateService {
	return &GameStateService{
		db:            db,
		playerService: playerService,
	}
}

// StartSessionRequest represents the request to start a new game session
type StartSessionRequest struct {
	LevelID string `json:"level_id" binding:"required"`
}

// UpdateScoreRequest represents the request to update session score
type UpdateScoreRequest struct {
	Score            int     `json:"score" binding:"min=0"`
	ZombiesKilled    int     `json:"zombies_killed" binding:"min=0"`
	DistanceTraveled float64 `json:"distance_traveled" binding:"min=0"`
}

// EndSessionRequest represents the request to end a game session
type EndSessionRequest struct {
	FinalScore       int     `json:"final_score" binding:"min=0"`
	ZombiesKilled    int     `json:"zombies_killed" binding:"min=0"`
	DistanceTraveled float64 `json:"distance_traveled" binding:"min=0"`
	SessionState     string  `json:"session_state" binding:"required,oneof=completed failed abandoned"`
}

// GameResult represents the result of a completed game session
type GameResult struct {
	SessionID        uuid.UUID `json:"session_id"`
	FinalScore       int       `json:"final_score"`
	ZombiesKilled    int       `json:"zombies_killed"`
	DistanceTraveled float64   `json:"distance_traveled"`
	Duration         string    `json:"duration"`
	CurrencyEarned   int       `json:"currency_earned"`
	LevelCompleted   bool      `json:"level_completed"`
}

// StartSession creates a new game session for a player
func (s *GameStateService) StartSession(playerID uint, req StartSessionRequest) (*models.GameSession, error) {
	// Check if player exists
	_, err := s.playerService.GetPlayer(playerID)
	if err != nil {
		return nil, err
	}

	// Check if player has any active sessions and end them
	if err := s.endActiveSessions(playerID); err != nil {
		return nil, fmt.Errorf("failed to end active sessions: %w", err)
	}

	// Create new session
	session := &models.GameSession{
		PlayerID:         playerID,
		LevelID:          req.LevelID,
		Score:            0,
		ZombiesKilled:    0,
		DistanceTraveled: 0,
		SessionState:     models.SessionStateActive,
		StartedAt:        time.Now(),
	}

	if err := s.db.Create(session).Error; err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return session, nil
}

// GetSession retrieves a game session by ID
func (s *GameStateService) GetSession(sessionID uuid.UUID) (*models.GameSession, error) {
	var session models.GameSession
	if err := s.db.Preload("Player").First(&session, "id = ?", sessionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &session, nil
}

// UpdateScore updates the score and stats for an active game session
func (s *GameStateService) UpdateScore(sessionID uuid.UUID, req UpdateScoreRequest) (*models.GameSession, error) {
	var session models.GameSession
	if err := s.db.First(&session, "id = ?", sessionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if session is active
	if !session.IsActive() {
		return nil, ErrSessionNotActive
	}

	// Validate score (anti-cheat measures)
	if err := s.validateScore(&session, req); err != nil {
		return nil, err
	}

	// Update session data
	session.Score = req.Score
	session.ZombiesKilled = req.ZombiesKilled
	session.DistanceTraveled = req.DistanceTraveled

	if err := s.db.Save(&session).Error; err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	return &session, nil
}

// EndSession ends a game session and calculates rewards
func (s *GameStateService) EndSession(sessionID uuid.UUID, req EndSessionRequest) (*GameResult, error) {
	var session models.GameSession
	if err := s.db.First(&session, "id = ?", sessionID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Check if session is active
	if !session.IsActive() {
		return nil, ErrSessionAlreadyEnded
	}

	// Validate final score
	finalReq := UpdateScoreRequest{
		Score:            req.FinalScore,
		ZombiesKilled:    req.ZombiesKilled,
		DistanceTraveled: req.DistanceTraveled,
	}
	if err := s.validateScore(&session, finalReq); err != nil {
		return nil, err
	}

	// Update session with final data
	session.Score = req.FinalScore
	session.ZombiesKilled = req.ZombiesKilled
	session.DistanceTraveled = req.DistanceTraveled
	session.End(models.SessionState(req.SessionState))

	// Calculate currency earned (10% of score)
	currencyEarned := req.FinalScore / 10
	if currencyEarned < 0 {
		currencyEarned = 0
	}

	// Start transaction for atomic updates
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Save session
	if err := tx.Save(&session).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to save session: %w", err)
	}

	// Update player currency and total score
	if currencyEarned > 0 {
		if err := s.playerService.UpdatePlayerCurrency(session.PlayerID, currencyEarned); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to update player currency: %w", err)
		}
	}

	if err := s.playerService.UpdatePlayerScore(session.PlayerID, int64(req.FinalScore)); err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update player score: %w", err)
	}

	// Update level progress if session was completed
	levelCompleted := req.SessionState == "completed"
	if levelCompleted {
		if err := s.updateLevelProgress(tx, session.PlayerID, session.LevelID, req.FinalScore); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to update level progress: %w", err)
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &GameResult{
		SessionID:        session.ID,
		FinalScore:       req.FinalScore,
		ZombiesKilled:    req.ZombiesKilled,
		DistanceTraveled: req.DistanceTraveled,
		Duration:         session.Duration().String(),
		CurrencyEarned:   currencyEarned,
		LevelCompleted:   levelCompleted,
	}, nil
}

// GetPlayerSessions retrieves recent game sessions for a player
func (s *GameStateService) GetPlayerSessions(playerID uint, limit int) ([]models.GameSession, error) {
	var sessions []models.GameSession
	query := s.db.Where("player_id = ?", playerID).Order("started_at DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&sessions).Error; err != nil {
		return nil, fmt.Errorf("failed to get player sessions: %w", err)
	}

	return sessions, nil
}

// GetActiveSession retrieves the active session for a player
func (s *GameStateService) GetActiveSession(playerID uint) (*models.GameSession, error) {
	var session models.GameSession
	if err := s.db.Where("player_id = ? AND session_state = ?", playerID, models.SessionStateActive).
		First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // No active session is not an error
		}
		return nil, fmt.Errorf("database error: %w", err)
	}
	return &session, nil
}

// endActiveSessions ends all active sessions for a player
func (s *GameStateService) endActiveSessions(playerID uint) error {
	return s.db.Model(&models.GameSession{}).
		Where("player_id = ? AND session_state = ?", playerID, models.SessionStateActive).
		Updates(map[string]interface{}{
			"session_state": models.SessionStateAbandoned,
			"ended_at":      time.Now(),
		}).Error
}

// validateScore implements anti-cheat measures for score validation
func (s *GameStateService) validateScore(session *models.GameSession, req UpdateScoreRequest) error {
	// Basic validation: score should not decrease
	if req.Score < session.Score {
		return ErrScoreValidation
	}

	// Validate zombies killed vs score ratio (minimum 5 points per zombie)
	if req.ZombiesKilled > 0 && req.Score < req.ZombiesKilled*5 {
		return ErrScoreValidation
	}

	// Validate distance vs time ratio (max 100 units per second)
	sessionDuration := time.Since(session.StartedAt).Seconds()
	maxDistance := sessionDuration * 100
	if req.DistanceTraveled > maxDistance {
		return ErrScoreValidation
	}

	// Validate score vs time ratio (max 1000 points per second)
	maxScore := int(sessionDuration * 1000)
	if req.Score > maxScore {
		return ErrScoreValidation
	}

	return nil
}

// updateLevelProgress updates or creates level progress record
func (s *GameStateService) updateLevelProgress(tx *gorm.DB, playerID uint, levelID string, score int) error {
	var progress models.LevelProgress
	
	// Try to find existing progress
	err := tx.Where("player_id = ? AND level_id = ?", playerID, levelID).First(&progress).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("database error: %w", err)
	}

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new progress record
		progress = models.LevelProgress{
			PlayerID:  playerID,
			LevelID:   levelID,
			BestScore: score,
			Completed: true,
			StarsEarned: s.calculateStars(score),
		}
		return tx.Create(&progress).Error
	} else {
		// Update existing progress if score is better
		if score > progress.BestScore {
			progress.BestScore = score
			progress.StarsEarned = s.calculateStars(score)
		}
		progress.Completed = true
		return tx.Save(&progress).Error
	}
}

// calculateStars calculates stars earned based on score
func (s *GameStateService) calculateStars(score int) int {
	if score >= 10000 {
		return 3
	} else if score >= 5000 {
		return 2
	} else if score >= 1000 {
		return 1
	}
	return 0
}