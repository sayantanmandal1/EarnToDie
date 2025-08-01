package models

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect to test database")
	}

	// Auto migrate all models
	err = db.AutoMigrate(&Player{}, &OwnedVehicle{}, &GameSession{}, &LevelProgress{})
	if err != nil {
		panic("failed to migrate test database")
	}

	return db
}

func TestPlayerModel(t *testing.T) {
	db := setupTestDB()

	t.Run("Create Player", func(t *testing.T) {
		player := Player{
			Username:     "testuser",
			Email:        "test@example.com",
			PasswordHash: "hashedpassword",
		}

		err := db.Create(&player).Error
		assert.NoError(t, err)
		assert.NotZero(t, player.ID)
		assert.Equal(t, 1000, player.Currency) // Default starting currency
		assert.Equal(t, 1, player.Level)       // Default level
	})

	t.Run("Player Unique Constraints", func(t *testing.T) {
		// Create first player
		player1 := Player{
			Username:     "unique1",
			Email:        "unique1@example.com",
			PasswordHash: "hash1",
		}
		err := db.Create(&player1).Error
		assert.NoError(t, err)

		// Try to create player with same username
		player2 := Player{
			Username:     "unique1",
			Email:        "unique2@example.com",
			PasswordHash: "hash2",
		}
		err = db.Create(&player2).Error
		assert.Error(t, err)

		// Try to create player with same email
		player3 := Player{
			Username:     "unique3",
			Email:        "unique1@example.com",
			PasswordHash: "hash3",
		}
		err = db.Create(&player3).Error
		assert.Error(t, err)
	})

	t.Run("Player Relationships", func(t *testing.T) {
		player := Player{
			Username:     "reltest",
			Email:        "rel@example.com",
			PasswordHash: "hash",
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)

		// Create owned vehicle
		vehicle := OwnedVehicle{
			PlayerID:    player.ID,
			VehicleType: "sedan",
		}
		err = db.Create(&vehicle).Error
		assert.NoError(t, err)

		// Load player with vehicles
		var loadedPlayer Player
		err = db.Preload("OwnedVehicles").First(&loadedPlayer, player.ID).Error
		assert.NoError(t, err)
		assert.Len(t, loadedPlayer.OwnedVehicles, 1)
		assert.Equal(t, "sedan", loadedPlayer.OwnedVehicles[0].VehicleType)
	})
}

func TestOwnedVehicleModel(t *testing.T) {
	db := setupTestDB()

	// Create a player first
	player := Player{
		Username:     "vehicleowner",
		Email:        "owner@example.com",
		PasswordHash: "hash",
	}
	err := db.Create(&player).Error
	assert.NoError(t, err)

	t.Run("Create Owned Vehicle", func(t *testing.T) {
		vehicle := OwnedVehicle{
			PlayerID:    player.ID,
			VehicleType: "monster_truck",
		}

		err := db.Create(&vehicle).Error
		assert.NoError(t, err)
		assert.NotZero(t, vehicle.ID)
		assert.Equal(t, 0, vehicle.Upgrades.Engine) // Default upgrade levels
	})

	t.Run("Vehicle Upgrades JSON", func(t *testing.T) {
		vehicle := OwnedVehicle{
			PlayerID:    player.ID,
			VehicleType: "sports_car",
			Upgrades: VehicleUpgrades{
				Engine:  3,
				Armor:   2,
				Weapons: 1,
				Fuel:    4,
				Tires:   2,
			},
		}

		err := db.Create(&vehicle).Error
		assert.NoError(t, err)

		// Retrieve and verify upgrades
		var loadedVehicle OwnedVehicle
		err = db.First(&loadedVehicle, vehicle.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, 3, loadedVehicle.Upgrades.Engine)
		assert.Equal(t, 2, loadedVehicle.Upgrades.Armor)
		assert.Equal(t, 1, loadedVehicle.Upgrades.Weapons)
		assert.Equal(t, 4, loadedVehicle.Upgrades.Fuel)
		assert.Equal(t, 2, loadedVehicle.Upgrades.Tires)
	})
}

func TestGameSessionModel(t *testing.T) {
	db := setupTestDB()

	// Create a player first
	player := Player{
		Username:     "gamer",
		Email:        "gamer@example.com",
		PasswordHash: "hash",
	}
	err := db.Create(&player).Error
	assert.NoError(t, err)

	t.Run("Create Game Session", func(t *testing.T) {
		session := GameSession{
			PlayerID: player.ID,
			LevelID:  "level_001",
		}

		err := db.Create(&session).Error
		assert.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, session.ID)
		assert.Equal(t, SessionStateActive, session.SessionState)
		assert.True(t, session.IsActive())
	})

	t.Run("End Game Session", func(t *testing.T) {
		session := GameSession{
			PlayerID: player.ID,
			LevelID:  "level_002",
			Score:    1500,
		}

		err := db.Create(&session).Error
		assert.NoError(t, err)

		// End the session
		session.End(SessionStateCompleted)
		err = db.Save(&session).Error
		assert.NoError(t, err)

		assert.Equal(t, SessionStateCompleted, session.SessionState)
		assert.False(t, session.IsActive())
		assert.NotNil(t, session.EndedAt)
	})

	t.Run("Session Duration", func(t *testing.T) {
		startTime := time.Now().Add(-5 * time.Minute)
		endTime := time.Now()

		session := GameSession{
			PlayerID:  player.ID,
			LevelID:   "level_003",
			StartedAt: startTime,
			EndedAt:   &endTime,
		}

		duration := session.Duration()
		assert.True(t, duration >= 4*time.Minute && duration <= 6*time.Minute)
	})
}

func TestLevelProgressModel(t *testing.T) {
	db := setupTestDB()

	// Create a player first
	player := Player{
		Username:     "progressor",
		Email:        "progress@example.com",
		PasswordHash: "hash",
	}
	err := db.Create(&player).Error
	assert.NoError(t, err)

	t.Run("Create Level Progress", func(t *testing.T) {
		progress := LevelProgress{
			PlayerID: player.ID,
			LevelID:  "level_001",
		}

		err := db.Create(&progress).Error
		assert.NoError(t, err)
		assert.NotZero(t, progress.ID)
		assert.Equal(t, 0, progress.BestScore)
		assert.False(t, progress.Completed)
		assert.Equal(t, 0, progress.StarsEarned)
	})

	t.Run("Update Progress", func(t *testing.T) {
		progress := LevelProgress{
			PlayerID:  player.ID,
			LevelID:   "level_002",
			BestScore: 1000,
		}

		err := db.Create(&progress).Error
		assert.NoError(t, err)

		// Update with better score
		updated := progress.UpdateProgress(1500, true, 3)
		assert.True(t, updated)
		assert.Equal(t, 1500, progress.BestScore)
		assert.True(t, progress.Completed)
		assert.Equal(t, 3, progress.StarsEarned)

		// Update with worse score
		updated = progress.UpdateProgress(1200, false, 2)
		assert.False(t, updated) // Should not update with worse values
		assert.Equal(t, 1500, progress.BestScore)
		assert.True(t, progress.Completed)
		assert.Equal(t, 3, progress.StarsEarned)
	})

	t.Run("Star Rating Calculation", func(t *testing.T) {
		progress := LevelProgress{
			PlayerID:  player.ID,
			LevelID:   "level_003",
			BestScore: 2500,
		}

		thresholds := []int{1000, 2000, 3000}
		stars := progress.GetStarRating(thresholds)
		assert.Equal(t, 2, stars) // Should get 2 stars for score 2500

		progress.BestScore = 3500
		stars = progress.GetStarRating(thresholds)
		assert.Equal(t, 3, stars) // Should get 3 stars for score 3500

		progress.BestScore = 500
		stars = progress.GetStarRating(thresholds)
		assert.Equal(t, 0, stars) // Should get 0 stars for score 500
	})

	t.Run("Unique Constraint", func(t *testing.T) {
		progress1 := LevelProgress{
			PlayerID: player.ID,
			LevelID:  "level_unique",
		}
		err := db.Create(&progress1).Error
		assert.NoError(t, err)

		// Try to create duplicate progress for same player and level
		progress2 := LevelProgress{
			PlayerID: player.ID,
			LevelID:  "level_unique",
		}
		err = db.Create(&progress2).Error
		assert.Error(t, err) // Should fail due to unique constraint
	})
}