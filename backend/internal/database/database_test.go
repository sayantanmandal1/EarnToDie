package database

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/models"
)

func TestDatabaseConnection(t *testing.T) {
	// Set test environment variables
	os.Setenv("DB_HOST", "localhost")
	os.Setenv("DB_PORT", "5432")
	os.Setenv("DB_USER", "testuser")
	os.Setenv("DB_PASSWORD", "testpass")
	os.Setenv("DB_NAME", "testdb")
	os.Setenv("DB_SSLMODE", "disable")

	t.Run("Load Config", func(t *testing.T) {
		config := LoadConfig()
		assert.Equal(t, "localhost", config.Host)
		assert.Equal(t, "5432", config.Port)
		assert.Equal(t, "testuser", config.User)
		assert.Equal(t, "testpass", config.Password)
		assert.Equal(t, "testdb", config.DBName)
		assert.Equal(t, "disable", config.SSLMode)
	})

	t.Run("Load Config with Defaults", func(t *testing.T) {
		// Clear environment variables
		os.Unsetenv("DB_HOST")
		os.Unsetenv("DB_PORT")
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("DB_SSLMODE")

		config := LoadConfig()
		assert.Equal(t, "localhost", config.Host)
		assert.Equal(t, "5432", config.Port)
		assert.Equal(t, "gameuser", config.User)
		assert.Equal(t, "gamepass", config.Password)
		assert.Equal(t, "zombie_game", config.DBName)
		assert.Equal(t, "disable", config.SSLMode)
	})
}

func TestAutoMigrate(t *testing.T) {
	// Create in-memory SQLite database for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Set the global DB variable
	originalDB := DB
	DB = db
	defer func() { DB = originalDB }()

	t.Run("Auto Migrate Success", func(t *testing.T) {
		err := AutoMigrate()
		assert.NoError(t, err)

		// Verify tables were created
		assert.True(t, db.Migrator().HasTable(&models.Player{}))
		assert.True(t, db.Migrator().HasTable(&models.OwnedVehicle{}))
		assert.True(t, db.Migrator().HasTable(&models.GameSession{}))
		assert.True(t, db.Migrator().HasTable(&models.LevelProgress{}))
	})

	t.Run("Auto Migrate with Nil DB", func(t *testing.T) {
		DB = nil
		err := AutoMigrate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "database connection not established")
		DB = db // Restore for cleanup
	})
}

func TestDatabaseCRUDOperations(t *testing.T) {
	// Create in-memory SQLite database for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Auto migrate
	err = db.AutoMigrate(&models.Player{}, &models.OwnedVehicle{}, &models.GameSession{}, &models.LevelProgress{})
	assert.NoError(t, err)

	t.Run("Player CRUD Operations", func(t *testing.T) {
		// Create
		player := models.Player{
			Username:     "testplayer",
			Email:        "test@example.com",
			PasswordHash: "hashedpassword",
			Currency:     2000,
			Level:        5,
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)
		assert.NotZero(t, player.ID)

		// Read
		var retrievedPlayer models.Player
		err = db.First(&retrievedPlayer, player.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, "testplayer", retrievedPlayer.Username)
		assert.Equal(t, "test@example.com", retrievedPlayer.Email)
		assert.Equal(t, 2000, retrievedPlayer.Currency)

		// Update
		err = db.Model(&retrievedPlayer).Update("currency", 3000).Error
		assert.NoError(t, err)
		
		err = db.First(&retrievedPlayer, player.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, 3000, retrievedPlayer.Currency)

		// Delete (soft delete)
		err = db.Delete(&retrievedPlayer).Error
		assert.NoError(t, err)

		// Verify soft delete
		var deletedPlayer models.Player
		err = db.First(&deletedPlayer, player.ID).Error
		assert.Error(t, err) // Should not find deleted record

		// Find with deleted records
		err = db.Unscoped().First(&deletedPlayer, player.ID).Error
		assert.NoError(t, err)
		assert.NotNil(t, deletedPlayer.DeletedAt)
	})

	t.Run("Vehicle CRUD with JSON Upgrades", func(t *testing.T) {
		// Create player first
		player := models.Player{
			Username:     "vehicleowner",
			Email:        "owner@example.com",
			PasswordHash: "hash",
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)

		// Create vehicle with upgrades
		vehicle := models.OwnedVehicle{
			PlayerID:    player.ID,
			VehicleType: "monster_truck",
			Upgrades: models.VehicleUpgrades{
				Engine:  3,
				Armor:   2,
				Weapons: 4,
				Fuel:    1,
				Tires:   3,
			},
		}
		err = db.Create(&vehicle).Error
		assert.NoError(t, err)

		// Read and verify JSON field
		var retrievedVehicle models.OwnedVehicle
		err = db.First(&retrievedVehicle, vehicle.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, 3, retrievedVehicle.Upgrades.Engine)
		assert.Equal(t, 2, retrievedVehicle.Upgrades.Armor)
		assert.Equal(t, 4, retrievedVehicle.Upgrades.Weapons)

		// Update upgrades
		retrievedVehicle.Upgrades.Engine = 5
		err = db.Save(&retrievedVehicle).Error
		assert.NoError(t, err)

		// Verify update
		err = db.First(&retrievedVehicle, vehicle.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, 5, retrievedVehicle.Upgrades.Engine)
	})

	t.Run("Game Session CRUD", func(t *testing.T) {
		// Create player first
		player := models.Player{
			Username:     "sessionplayer",
			Email:        "session@example.com",
			PasswordHash: "hash",
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)

		// Create game session
		session := models.GameSession{
			PlayerID:         player.ID,
			LevelID:          "level_001",
			Score:            1500,
			ZombiesKilled:    25,
			DistanceTraveled: 1200.5,
		}
		err = db.Create(&session).Error
		assert.NoError(t, err)
		assert.NotZero(t, session.ID)

		// Read session
		var retrievedSession models.GameSession
		err = db.First(&retrievedSession, "id = ?", session.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, player.ID, retrievedSession.PlayerID)
		assert.Equal(t, "level_001", retrievedSession.LevelID)
		assert.Equal(t, 1500, retrievedSession.Score)
		assert.Equal(t, 25, retrievedSession.ZombiesKilled)
		assert.Equal(t, 1200.5, retrievedSession.DistanceTraveled)

		// Update session
		retrievedSession.Score = 2000
		retrievedSession.End(models.SessionStateCompleted)
		err = db.Save(&retrievedSession).Error
		assert.NoError(t, err)

		// Verify update
		err = db.First(&retrievedSession, "id = ?", session.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, 2000, retrievedSession.Score)
		assert.Equal(t, models.SessionStateCompleted, retrievedSession.SessionState)
		assert.NotNil(t, retrievedSession.EndedAt)
	})

	t.Run("Level Progress CRUD", func(t *testing.T) {
		// Create player first
		player := models.Player{
			Username:     "progressplayer",
			Email:        "progress@example.com",
			PasswordHash: "hash",
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)

		// Create level progress
		progress := models.LevelProgress{
			PlayerID:    player.ID,
			LevelID:     "level_001",
			BestScore:   1000,
			Completed:   true,
			StarsEarned: 2,
		}
		err = db.Create(&progress).Error
		assert.NoError(t, err)

		// Read progress
		var retrievedProgress models.LevelProgress
		err = db.First(&retrievedProgress, progress.ID).Error
		assert.NoError(t, err)
		assert.Equal(t, player.ID, retrievedProgress.PlayerID)
		assert.Equal(t, "level_001", retrievedProgress.LevelID)
		assert.Equal(t, 1000, retrievedProgress.BestScore)
		assert.True(t, retrievedProgress.Completed)
		assert.Equal(t, 2, retrievedProgress.StarsEarned)

		// Test unique constraint
		duplicateProgress := models.LevelProgress{
			PlayerID: player.ID,
			LevelID:  "level_001", // Same level for same player
		}
		err = db.Create(&duplicateProgress).Error
		assert.Error(t, err) // Should fail due to unique constraint
	})
}

func TestDatabaseRelationships(t *testing.T) {
	// Create in-memory SQLite database for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Auto migrate
	err = db.AutoMigrate(&models.Player{}, &models.OwnedVehicle{}, &models.GameSession{}, &models.LevelProgress{})
	assert.NoError(t, err)

	t.Run("Player with Related Data", func(t *testing.T) {
		// Create player
		player := models.Player{
			Username:     "relplayer",
			Email:        "rel@example.com",
			PasswordHash: "hash",
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)

		// Create related data
		vehicle := models.OwnedVehicle{
			PlayerID:    player.ID,
			VehicleType: "sedan",
		}
		err = db.Create(&vehicle).Error
		assert.NoError(t, err)

		session := models.GameSession{
			PlayerID: player.ID,
			LevelID:  "level_001",
			Score:    1000,
		}
		err = db.Create(&session).Error
		assert.NoError(t, err)

		progress := models.LevelProgress{
			PlayerID:  player.ID,
			LevelID:   "level_001",
			BestScore: 1000,
		}
		err = db.Create(&progress).Error
		assert.NoError(t, err)

		// Load player with all relationships
		var loadedPlayer models.Player
		err = db.Preload("OwnedVehicles").
			Preload("GameSessions").
			Preload("LevelProgress").
			First(&loadedPlayer, player.ID).Error
		assert.NoError(t, err)

		assert.Len(t, loadedPlayer.OwnedVehicles, 1)
		assert.Len(t, loadedPlayer.GameSessions, 1)
		assert.Len(t, loadedPlayer.LevelProgress, 1)
		assert.Equal(t, "sedan", loadedPlayer.OwnedVehicles[0].VehicleType)
		assert.Equal(t, "level_001", loadedPlayer.GameSessions[0].LevelID)
		assert.Equal(t, "level_001", loadedPlayer.LevelProgress[0].LevelID)
	})

	t.Run("Cascade Delete", func(t *testing.T) {
		// Create player with related data
		player := models.Player{
			Username:     "cascadeplayer",
			Email:        "cascade@example.com",
			PasswordHash: "hash",
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)

		vehicle := models.OwnedVehicle{
			PlayerID:    player.ID,
			VehicleType: "truck",
		}
		err = db.Create(&vehicle).Error
		assert.NoError(t, err)

		// Delete player (soft delete)
		err = db.Delete(&player).Error
		assert.NoError(t, err)

		// Vehicle should still exist (soft delete doesn't cascade in GORM by default)
		var existingVehicle models.OwnedVehicle
		err = db.First(&existingVehicle, vehicle.ID).Error
		assert.NoError(t, err)

		// But player should be soft deleted
		var deletedPlayer models.Player
		err = db.First(&deletedPlayer, player.ID).Error
		assert.Error(t, err) // Should not find deleted player
	})
}

func TestDatabasePerformance(t *testing.T) {
	// Create in-memory SQLite database for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Auto migrate
	err = db.AutoMigrate(&models.Player{}, &models.OwnedVehicle{}, &models.GameSession{}, &models.LevelProgress{})
	assert.NoError(t, err)

	t.Run("Bulk Insert Performance", func(t *testing.T) {
		start := time.Now()

		// Create multiple players
		players := make([]models.Player, 100)
		for i := 0; i < 100; i++ {
			players[i] = models.Player{
				Username:     "user" + string(rune(i)),
				Email:        "user" + string(rune(i)) + "@example.com",
				PasswordHash: "hash",
			}
		}

		err := db.CreateInBatches(players, 10).Error
		assert.NoError(t, err)

		duration := time.Since(start)
		t.Logf("Bulk insert of 100 players took: %v", duration)
		assert.Less(t, duration, 5*time.Second) // Should complete within 5 seconds
	})

	t.Run("Query Performance with Indexes", func(t *testing.T) {
		// Create a player
		player := models.Player{
			Username:     "querytest",
			Email:        "query@example.com",
			PasswordHash: "hash",
		}
		err := db.Create(&player).Error
		assert.NoError(t, err)

		start := time.Now()

		// Query by username (should use index)
		var foundPlayer models.Player
		err = db.Where("username = ?", "querytest").First(&foundPlayer).Error
		assert.NoError(t, err)

		duration := time.Since(start)
		t.Logf("Query by username took: %v", duration)
		assert.Less(t, duration, 100*time.Millisecond) // Should be very fast with index
	})
}