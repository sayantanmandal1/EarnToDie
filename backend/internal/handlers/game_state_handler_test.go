package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/auth"
	"zombie-car-game-backend/internal/middleware"
	"zombie-car-game-backend/internal/models"
	"zombie-car-game-backend/internal/services"
)

func setupGameStateTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	// Skip tests if CGO is not available
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Skip("SQLite requires CGO, skipping database tests")
		return nil, nil
	}

	// Auto migrate the schema
	err = db.AutoMigrate(&models.Player{}, &models.GameSession{}, &models.LevelProgress{}, &models.OwnedVehicle{})
	require.NoError(t, err)

	// Initialize services
	playerService := services.NewPlayerService(db)
	gameStateService := services.NewGameStateService(db, playerService)
	jwtService := auth.NewJWTService()

	// Initialize handlers
	gameStateHandler := NewGameStateHandler(gameStateService)

	// Setup router
	gin.SetMode(gin.TestMode)
	router := gin.New()

	api := router.Group("/api/v1")
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware(jwtService))

	game := protected.Group("/game")
	sessions := game.Group("/sessions")
	{
		sessions.POST("/", gameStateHandler.StartSession)
		sessions.GET("/", gameStateHandler.GetPlayerSessions)
		sessions.GET("/active", gameStateHandler.GetActiveSession)
		sessions.GET("/:id", gameStateHandler.GetSession)
		sessions.PUT("/:id/score", gameStateHandler.UpdateScore)
		sessions.POST("/:id/end", gameStateHandler.EndSession)
	}

	return router, db
}

func createTestPlayerForHandler(t *testing.T, db *gorm.DB) (*models.Player, string) {
	playerService := services.NewPlayerService(db)
	
	req := services.CreatePlayerRequest{
		Username: "testplayer",
		Email:    "test@example.com",
		Password: "password123",
	}

	response, err := playerService.CreatePlayer(req)
	require.NoError(t, err)

	return response.Player, response.Token
}

func TestGameStateHandler_StartSession(t *testing.T) {
	router, db := setupGameStateTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	player, token := createTestPlayerForHandler(t, db)

	t.Run("successful session start", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"level_id": "level_1",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/game/sessions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Session started successfully", response["message"])
		assert.NotNil(t, response["session"])

		session := response["session"].(map[string]interface{})
		assert.Equal(t, float64(player.ID), session["player_id"])
		assert.Equal(t, "level_1", session["level_id"])
		assert.Equal(t, "active", session["session_state"])
	})

	t.Run("start session without token", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"level_id": "level_1",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/game/sessions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("start session with invalid request", func(t *testing.T) {
		reqBody := map[string]interface{}{
			// Missing level_id
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/game/sessions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGameStateHandler_GetActiveSession(t *testing.T) {
	router, db := setupGameStateTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForHandler(t, db)

	t.Run("get active session when none exists", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/game/sessions/active", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Nil(t, response["session"])
	})

	t.Run("get active session after starting one", func(t *testing.T) {
		// First start a session
		reqBody := map[string]interface{}{
			"level_id": "level_1",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/game/sessions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)

		// Now get active session
		req, _ = http.NewRequest("GET", "/api/v1/game/sessions/active", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.NotNil(t, response["session"])
		session := response["session"].(map[string]interface{})
		assert.Equal(t, "level_1", session["level_id"])
		assert.Equal(t, "active", session["session_state"])
	})
}

func TestGameStateHandler_UpdateScore(t *testing.T) {
	router, db := setupGameStateTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForHandler(t, db)

	// Start a session first
	reqBody := map[string]interface{}{
		"level_id": "level_1",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/v1/game/sessions", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var startResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &startResponse)
	require.NoError(t, err)

	session := startResponse["session"].(map[string]interface{})
	sessionID := session["id"].(string)

	t.Run("successful score update", func(t *testing.T) {
		updateBody := map[string]interface{}{
			"score":             100,
			"zombies_killed":    10,
			"distance_traveled": 50.5,
		}
		jsonBody, _ := json.Marshal(updateBody)

		req, _ := http.NewRequest("PUT", "/api/v1/game/sessions/"+sessionID+"/score", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Score updated successfully", response["message"])
		updatedSession := response["session"].(map[string]interface{})
		assert.Equal(t, float64(100), updatedSession["score"])
		assert.Equal(t, float64(10), updatedSession["zombies_killed"])
		assert.Equal(t, 50.5, updatedSession["distance_traveled"])
	})

	t.Run("update score with invalid session ID", func(t *testing.T) {
		updateBody := map[string]interface{}{
			"score":             100,
			"zombies_killed":    10,
			"distance_traveled": 50.5,
		}
		jsonBody, _ := json.Marshal(updateBody)

		req, _ := http.NewRequest("PUT", "/api/v1/game/sessions/invalid-uuid/score", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestGameStateHandler_EndSession(t *testing.T) {
	router, db := setupGameStateTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForHandler(t, db)

	// Start a session first
	reqBody := map[string]interface{}{
		"level_id": "level_1",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/v1/game/sessions", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var startResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &startResponse)
	require.NoError(t, err)

	session := startResponse["session"].(map[string]interface{})
	sessionID := session["id"].(string)

	t.Run("successful session end", func(t *testing.T) {
		endBody := map[string]interface{}{
			"final_score":       500,
			"zombies_killed":    50,
			"distance_traveled": 200.0,
			"session_state":     "completed",
		}
		jsonBody, _ := json.Marshal(endBody)

		req, _ := http.NewRequest("POST", "/api/v1/game/sessions/"+sessionID+"/end", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Session ended successfully", response["message"])
		result := response["result"].(map[string]interface{})
		assert.Equal(t, float64(500), result["final_score"])
		assert.Equal(t, float64(50), result["zombies_killed"])
		assert.Equal(t, 200.0, result["distance_traveled"])
		assert.Equal(t, float64(50), result["currency_earned"]) // 10% of score
		assert.Equal(t, true, result["level_completed"])
	})

	t.Run("end session with invalid state", func(t *testing.T) {
		// Start another session
		reqBody := map[string]interface{}{
			"level_id": "level_2",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/game/sessions", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)

		var startResponse map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &startResponse)
		require.NoError(t, err)

		session := startResponse["session"].(map[string]interface{})
		sessionID := session["id"].(string)

		endBody := map[string]interface{}{
			"final_score":       500,
			"zombies_killed":    50,
			"distance_traveled": 200.0,
			"session_state":     "invalid_state",
		}
		jsonBody, _ = json.Marshal(endBody)

		req, _ = http.NewRequest("POST", "/api/v1/game/sessions/"+sessionID+"/end", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}