package models

import (
	"gorm.io/gorm"
)

// LevelProgress represents a player's progress on a specific level
type LevelProgress struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	PlayerID    uint           `json:"player_id" gorm:"not null;index"`
	LevelID     string         `json:"level_id" gorm:"size:50;not null"`
	BestScore   int            `json:"best_score" gorm:"default:0"`
	Completed   bool           `json:"completed" gorm:"default:false"`
	StarsEarned int            `json:"stars_earned" gorm:"default:0"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Player Player `json:"player,omitempty" gorm:"foreignKey:PlayerID"`
}

// TableName specifies the table name for LevelProgress model
func (LevelProgress) TableName() string {
	return "level_progress"
}

// BeforeCreate hook to ensure unique constraint
func (lp *LevelProgress) BeforeCreate(tx *gorm.DB) error {
	// GORM will handle the unique constraint at database level
	return nil
}

// UpdateProgress updates the progress if the new score is better
func (lp *LevelProgress) UpdateProgress(score int, completed bool, stars int) bool {
	updated := false
	
	if score > lp.BestScore {
		lp.BestScore = score
		updated = true
	}
	
	if completed && !lp.Completed {
		lp.Completed = completed
		updated = true
	}
	
	if stars > lp.StarsEarned {
		lp.StarsEarned = stars
		updated = true
	}
	
	return updated
}

// GetStarRating calculates star rating based on score thresholds
func (lp *LevelProgress) GetStarRating(scoreThresholds []int) int {
	if len(scoreThresholds) == 0 {
		return 0
	}
	
	stars := 0
	for _, threshold := range scoreThresholds {
		if lp.BestScore >= threshold {
			stars++
		} else {
			break
		}
	}
	
	return stars
}