package models

import (
	"time"
	"gorm.io/gorm"
	"github.com/google/uuid"
)

// SessionState represents the state of a game session
type SessionState string

const (
	SessionStateActive    SessionState = "active"
	SessionStateCompleted SessionState = "completed"
	SessionStateFailed    SessionState = "failed"
	SessionStateAbandoned SessionState = "abandoned"
)

// GameSession represents a single game session
type GameSession struct {
	ID               uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PlayerID         uint           `json:"player_id" gorm:"not null;index"`
	LevelID          string         `json:"level_id" gorm:"size:50;not null"`
	Score            int            `json:"score" gorm:"default:0"`
	ZombiesKilled    int            `json:"zombies_killed" gorm:"default:0"`
	DistanceTraveled float64        `json:"distance_traveled" gorm:"default:0"`
	SessionState     SessionState   `json:"session_state" gorm:"size:20;default:'active'"`
	StartedAt        time.Time      `json:"started_at"`
	EndedAt          *time.Time     `json:"ended_at,omitempty"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Player Player `json:"player,omitempty" gorm:"foreignKey:PlayerID"`
}

// TableName specifies the table name for GameSession model
func (GameSession) TableName() string {
	return "game_sessions"
}

// BeforeCreate hook to set default values
func (gs *GameSession) BeforeCreate(tx *gorm.DB) error {
	if gs.ID == uuid.Nil {
		gs.ID = uuid.New()
	}
	if gs.SessionState == "" {
		gs.SessionState = SessionStateActive
	}
	return nil
}

// IsActive returns true if the session is currently active
func (gs *GameSession) IsActive() bool {
	return gs.SessionState == SessionStateActive
}

// End marks the session as completed and sets the end time
func (gs *GameSession) End(state SessionState) {
	gs.SessionState = state
	now := time.Now()
	gs.EndedAt = &now
}

// Duration returns the duration of the session
func (gs *GameSession) Duration() time.Duration {
	if gs.EndedAt != nil {
		return gs.EndedAt.Sub(gs.StartedAt)
	}
	return time.Since(gs.StartedAt)
}