package services

import (
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/models"
)

func setupGameStateTestDB(t *testing.T) *gorm.DB {
	// Skip tests if CGO is not available
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Skip("SQLite requires CGO, skipping database tests")
		return nil
	}

	// Auto migrate the schema
	err = db.AutoMigrate(&models.Player{}, &models.GameSession{}, &models.LevelProgress{}, &models.OwnedVehicle{})
	if err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	return db
}

func createTestPlayerForGameState(t *testing.T, db *gorm.DB, currency int) *models.Player {
	player := &models.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hashedpassword",
		Currency:     currency,
		Level:        1,
		TotalScore:   0,
	}
	db.Create(player)
	return player
}

func TestGameStateService_StartSession(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	player := createTestPlayerForGameState(t, db, 1000)

	t.Run("successful session start", func(t *testing.T) {
		req := StartSessionRequest{
			LevelID: "level_1",
		}

		session, err := gameStateService.StartSession(player.ID, req)

		assert.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, player.ID, session.PlayerID)
		assert.Equal(t, "level_1", session.LevelID)
		assert.Equal(t, models.SessionStateActive, session.SessionState)
		assert.Equal(t, 0, session.Score)
		assert.Equal(t, 0, session.ZombiesKilled)
		assert.Equal(t, float64(0), session.DistanceTraveled)
		assert.NotEqual(t, uuid.Nil, session.ID)
	})

	t.Run("start session with non-existent player", func(t *testing.T) {
		req := StartSessionRequest{
			LevelID: "level_1",
		}

		session, err := gameStateService.StartSession(999, req)

		assert.Error(t, err)
		assert.Nil(t, session)
		assert.Equal(t, ErrPlayerNotFound, err)
	})

	t.Run("start session ends previous active session", func(t *testing.T) {
		// Create first session
		req1 := StartSessionRequest{LevelID: "level_1"}
		session1, err := gameStateService.StartSession(player.ID, req1)
		require.NoError(t, err)

		// Create second session
		req2 := StartSessionRequest{LevelID: "level_2"}
		session2, err := gameStateService.StartSession(player.ID, req2)
		require.NoError(t, err)

		// Check that first session is abandoned
		var updatedSession1 models.GameSession
		db.First(&updatedSession1, session1.ID)
		assert.Equal(t, models.SessionStateAbandoned, updatedSession1.SessionState)
		assert.NotNil(t, updatedSession1.EndedAt)

		// Check that second session is active
		assert.Equal(t, models.SessionStateActive, session2.SessionState)
	})
}

func TestGameStateService_GetSession(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	player := createTestPlayerForGameState(t, db, 1000)

	t.Run("get existing session", func(t *testing.T) {
		// Create session
		req := StartSessionRequest{LevelID: "level_1"}
		createdSession, err := gameStateService.StartSession(player.ID, req)
		require.NoError(t, err)

		// Get session
		session, err := gameStateService.GetSession(createdSession.ID)

		assert.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, createdSession.ID, session.ID)
		assert.Equal(t, player.ID, session.PlayerID)
		assert.Equal(t, "level_1", session.LevelID)
	})

	t.Run("get non-existent session", func(t *testing.T) {
		nonExistentID := uuid.New()
		session, err := gameStateService.GetSession(nonExistentID)

		assert.Error(t, err)
		assert.Nil(t, session)
		assert.Equal(t, ErrSessionNotFound, err)
	})
}

func TestGameStateService_UpdateScore(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	player := createTestPlayerForGameState(t, db, 1000)

	t.Run("successful score update", func(t *testing.T) {
		// Create session
		req := StartSessionRequest{LevelID: "level_1"}
		session, err := gameStateService.StartSession(player.ID, req)
		require.NoError(t, err)

		// Update score
		updateReq := UpdateScoreRequest{
			Score:            100,
			ZombiesKilled:    10,
			DistanceTraveled: 50.5,
		}

		updatedSession, err := gameStateService.UpdateScore(session.ID, updateReq)

		assert.NoError(t, err)
		assert.NotNil(t, updatedSession)
		assert.Equal(t, 100, updatedSession.Score)
		assert.Equal(t, 10, updatedSession.ZombiesKilled)
		assert.Equal(t, 50.5, updatedSession.DistanceTraveled)
	})

	t.Run("update score for non-existent session", func(t *testing.T) {
		nonExistentID := uuid.New()
		updateReq := UpdateScoreRequest{
			Score:            100,
			ZombiesKilled:    10,
			DistanceTraveled: 50.5,
		}

		session, err := gameStateService.UpdateScore(nonExistentID, updateReq)

		assert.Error(t, err)
		assert.Nil(t, session)
		assert.Equal(t, ErrSessionNotFound, err)
	})

	t.Run("update score for inactive session", func(t *testing.T) {
		// Create and end session
		req := StartSessionRequest{LevelID: "level_1"}
		session, err := gameStateService.StartSession(player.ID, req)
		require.NoError(t, err)

		endReq := EndSessionRequest{
			FinalScore:       50,
			ZombiesKilled:    5,
			DistanceTraveled: 25.0,
			SessionState:     "completed",
		}
		_, err = gameStateService.EndSession(session.ID, endReq)
		require.NoError(t, err)

		// Try to update score
		updateReq := UpdateScoreRequest{
			Score:            100,
			ZombiesKilled:    10,
			DistanceTraveled: 50.5,
		}

		updatedSession, err := gameStateService.UpdateScore(session.ID, updateReq)

		assert.Error(t, err)
		assert.Nil(t, updatedSession)
		assert.Equal(t, ErrSessionNotActive, err)
	})
}

func TestGameStateService_ValidateScore(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	player := createTestPlayerForGameState(t, db, 1000)

	// Create session
	req := StartSessionRequest{LevelID: "level_1"}
	session, err := gameStateService.StartSession(player.ID, req)
	require.NoError(t, err)

	t.Run("valid score update", func(t *testing.T) {
		updateReq := UpdateScoreRequest{
			Score:            100,
			ZombiesKilled:    10,
			DistanceTraveled: 50.0,
		}

		err := gameStateService.validateScore(session, updateReq)
		assert.NoError(t, err)
	})

	t.Run("score decrease should fail", func(t *testing.T) {
		// First update
		updateReq1 := UpdateScoreRequest{
			Score:            100,
			ZombiesKilled:    10,
			DistanceTraveled: 50.0,
		}
		_, err := gameStateService.UpdateScore(session.ID, updateReq1)
		require.NoError(t, err)

		// Try to decrease score
		updateReq2 := UpdateScoreRequest{
			Score:            50,
			ZombiesKilled:    5,
			DistanceTraveled: 25.0,
		}

		err = gameStateService.validateScore(session, updateReq2)
		assert.Error(t, err)
		assert.Equal(t, ErrScoreValidation, err)
	})

	t.Run("invalid zombies to score ratio", func(t *testing.T) {
		updateReq := UpdateScoreRequest{
			Score:            100,
			ZombiesKilled:    50, // Too many zombies for the score
			DistanceTraveled: 50.0,
		}

		err := gameStateService.validateScore(session, updateReq)
		assert.Error(t, err)
		assert.Equal(t, ErrScoreValidation, err)
	})

	t.Run("excessive distance for time", func(t *testing.T) {
		updateReq := UpdateScoreRequest{
			Score:            100,
			ZombiesKilled:    10,
			DistanceTraveled: 10000.0, // Too much distance for time elapsed
		}

		err := gameStateService.validateScore(session, updateReq)
		assert.Error(t, err)
		assert.Equal(t, ErrScoreValidation, err)
	})

	t.Run("excessive score for time", func(t *testing.T) {
		updateReq := UpdateScoreRequest{
			Score:            100000, // Too much score for time elapsed
			ZombiesKilled:    10,
			DistanceTraveled: 50.0,
		}

		err := gameStateService.validateScore(session, updateReq)
		assert.Error(t, err)
		assert.Equal(t, ErrScoreValidation, err)
	})
}

func TestGameStateService_EndSession(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	player := createTestPlayerForGameState(t, db, 1000)

	t.Run("successful session completion", func(t *testing.T) {
		// Create session
		req := StartSessionRequest{LevelID: "level_1"}
		session, err := gameStateService.StartSession(player.ID, req)
		require.NoError(t, err)

		// End session
		endReq := EndSessionRequest{
			FinalScore:       500,
			ZombiesKilled:    50,
			DistanceTraveled: 100.0,
			SessionState:     "completed",
		}

		result, err := gameStateService.EndSession(session.ID, endReq)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, session.ID, result.SessionID)
		assert.Equal(t, 500, result.FinalScore)
		assert.Equal(t, 50, result.ZombiesKilled)
		assert.Equal(t, 100.0, result.DistanceTraveled)
		assert.Equal(t, 50, result.CurrencyEarned) // 10% of score
		assert.True(t, result.LevelCompleted)

		// Check that player currency was updated
		updatedPlayer, err := playerService.GetPlayer(player.ID)
		require.NoError(t, err)
		assert.Equal(t, 1050, updatedPlayer.Currency) // 1000 + 50

		// Check that player total score was updated
		assert.Equal(t, int64(500), updatedPlayer.TotalScore)

		// Check that session was marked as completed
		updatedSession, err := gameStateService.GetSession(session.ID)
		require.NoError(t, err)
		assert.Equal(t, models.SessionStateCompleted, updatedSession.SessionState)
		assert.NotNil(t, updatedSession.EndedAt)
	})

	t.Run("end non-existent session", func(t *testing.T) {
		nonExistentID := uuid.New()
		endReq := EndSessionRequest{
			FinalScore:       500,
			ZombiesKilled:    50,
			DistanceTraveled: 100.0,
			SessionState:     "completed",
		}

		result, err := gameStateService.EndSession(nonExistentID, endReq)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Equal(t, ErrSessionNotFound, err)
	})

	t.Run("end already ended session", func(t *testing.T) {
		// Create and end session
		req := StartSessionRequest{LevelID: "level_1"}
		session, err := gameStateService.StartSession(player.ID, req)
		require.NoError(t, err)

		endReq := EndSessionRequest{
			FinalScore:       500,
			ZombiesKilled:    50,
			DistanceTraveled: 100.0,
			SessionState:     "completed",
		}
		_, err = gameStateService.EndSession(session.ID, endReq)
		require.NoError(t, err)

		// Try to end again
		result, err := gameStateService.EndSession(session.ID, endReq)

		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Equal(t, ErrSessionAlreadyEnded, err)
	})

	t.Run("failed session should not mark level as completed", func(t *testing.T) {
		// Create session
		req := StartSessionRequest{LevelID: "level_2"}
		session, err := gameStateService.StartSession(player.ID, req)
		require.NoError(t, err)

		// End session as failed
		endReq := EndSessionRequest{
			FinalScore:       100,
			ZombiesKilled:    10,
			DistanceTraveled: 50.0,
			SessionState:     "failed",
		}

		result, err := gameStateService.EndSession(session.ID, endReq)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.False(t, result.LevelCompleted)
	})
}

func TestGameStateService_GetPlayerSessions(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	player := createTestPlayerForGameState(t, db, 1000)

	t.Run("get sessions with limit", func(t *testing.T) {
		// Create multiple sessions
		for i := 0; i < 5; i++ {
			req := StartSessionRequest{LevelID: "level_1"}
			session, err := gameStateService.StartSession(player.ID, req)
			require.NoError(t, err)

			// End each session
			endReq := EndSessionRequest{
				FinalScore:       100,
				ZombiesKilled:    10,
				DistanceTraveled: 50.0,
				SessionState:     "completed",
			}
			_, err = gameStateService.EndSession(session.ID, endReq)
			require.NoError(t, err)

			// Small delay to ensure different timestamps
			time.Sleep(time.Millisecond)
		}

		// Get sessions with limit
		sessions, err := gameStateService.GetPlayerSessions(player.ID, 3)

		assert.NoError(t, err)
		assert.Len(t, sessions, 3)

		// Check that sessions are ordered by most recent first
		for i := 0; i < len(sessions)-1; i++ {
			assert.True(t, sessions[i].StartedAt.After(sessions[i+1].StartedAt) || 
						sessions[i].StartedAt.Equal(sessions[i+1].StartedAt))
		}
	})

	t.Run("get all sessions without limit", func(t *testing.T) {
		sessions, err := gameStateService.GetPlayerSessions(player.ID, 0)

		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(sessions), 5) // At least 5 from previous test
	})
}

func TestGameStateService_GetActiveSession(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	player := createTestPlayerForGameState(t, db, 1000)

	t.Run("get active session when exists", func(t *testing.T) {
		// Create session
		req := StartSessionRequest{LevelID: "level_1"}
		createdSession, err := gameStateService.StartSession(player.ID, req)
		require.NoError(t, err)

		// Get active session
		activeSession, err := gameStateService.GetActiveSession(player.ID)

		assert.NoError(t, err)
		assert.NotNil(t, activeSession)
		assert.Equal(t, createdSession.ID, activeSession.ID)
		assert.Equal(t, models.SessionStateActive, activeSession.SessionState)
	})

	t.Run("get active session when none exists", func(t *testing.T) {
		// End the active session first
		activeSession, err := gameStateService.GetActiveSession(player.ID)
		require.NoError(t, err)
		require.NotNil(t, activeSession)

		endReq := EndSessionRequest{
			FinalScore:       100,
			ZombiesKilled:    10,
			DistanceTraveled: 50.0,
			SessionState:     "completed",
		}
		_, err = gameStateService.EndSession(activeSession.ID, endReq)
		require.NoError(t, err)

		// Now get active session
		activeSession, err = gameStateService.GetActiveSession(player.ID)

		assert.NoError(t, err)
		assert.Nil(t, activeSession)
	})
}

func TestGameStateService_CalculateStars(t *testing.T) {
	db := setupGameStateTestDB(t)
	playerService := NewPlayerService(db)
	gameStateService := NewGameStateService(db, playerService)

	tests := []struct {
		score    int
		expected int
	}{
		{500, 0},
		{1000, 1},
		{3000, 1},
		{5000, 2},
		{8000, 2},
		{10000, 3},
		{15000, 3},
	}

	for _, test := range tests {
		t.Run(fmt.Sprintf("score_%d_should_give_%d_stars", test.score, test.expected), func(t *testing.T) {
			stars := gameStateService.calculateStars(test.score)
			assert.Equal(t, test.expected, stars)
		})
	}
}