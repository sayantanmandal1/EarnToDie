package models

import (
	"time"
	"gorm.io/gorm"
)

// Player represents a game player
type Player struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	Username     string         `json:"username" gorm:"uniqueIndex;size:50;not null"`
	Email        string         `json:"email" gorm:"uniqueIndex;size:100;not null"`
	PasswordHash string         `json:"-" gorm:"size:255;not null"`
	Currency     int            `json:"currency" gorm:"default:0"`
	Level        int            `json:"level" gorm:"default:1"`
	TotalScore   int64          `json:"total_score" gorm:"default:0"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	OwnedVehicles []OwnedVehicle `json:"owned_vehicles,omitempty" gorm:"foreignKey:PlayerID"`
	GameSessions  []GameSession  `json:"game_sessions,omitempty" gorm:"foreignKey:PlayerID"`
	LevelProgress []LevelProgress `json:"level_progress,omitempty" gorm:"foreignKey:PlayerID"`
}

// TableName specifies the table name for Player model
func (Player) TableName() string {
	return "players"
}

// BeforeCreate hook to set default values
func (p *Player) BeforeCreate(tx *gorm.DB) error {
	if p.Currency == 0 {
		p.Currency = 1000 // Starting currency
	}
	return nil
}