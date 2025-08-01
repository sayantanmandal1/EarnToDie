package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"zombie-car-game-backend/internal/auth"
	"zombie-car-game-backend/internal/middleware"
	"zombie-car-game-backend/internal/models"
	"zombie-car-game-backend/internal/services"
)

func setupTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	// Set test mode
	gin.SetMode(gin.TestMode)
	os.Setenv("JWT_SECRET", "test-secret-key")

	// Setup test database
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Skip("SQLite requires CGO, skipping integration tests")
		return nil, nil
	}

	// Auto migrate
	err = db.AutoMigrate(&models.Player{}, &models.OwnedVehicle{}, &models.GameSession{}, &models.LevelProgress{})
	require.NoError(t, err)

	// Setup services and handlers
	playerService := services.NewPlayerService(db)
	jwtService := auth.NewJWTService()
	authHandler := NewAuthHandler(playerService)
	playerHandler := NewPlayerHandler(playerService)

	// Setup router
	r := gin.New()
	
	// Auth routes
	authGroup := r.Group("/api/v1/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/refresh", authHandler.RefreshToken)
		authGroup.POST("/logout", authHandler.Logout)
	}

	// Protected routes
	protected := r.Group("/api/v1/players")
	protected.Use(middleware.AuthMiddleware(jwtService))
	{
		protected.GET("/profile", playerHandler.GetProfile)
		protected.GET("/progress", playerHandler.GetProgress)
		protected.PUT("/currency", playerHandler.UpdateCurrency)
		protected.PUT("/level", playerHandler.UpdateLevel)
		protected.PUT("/score", playerHandler.UpdateScore)
	}

	return r, db
}

func TestAuthIntegration_RegisterAndLogin(t *testing.T) {
	router, db := setupTestRouter(t)
	if router == nil || db == nil {
		return // Skipped due to CGO requirement
	}

	// Test registration
	registerReq := map[string]string{
		"username": "testuser",
		"email":    "test@example.com",
		"password": "password123",
	}
	
	reqBody, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 201, w.Code)
	
	var registerResp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &registerResp)
	require.NoError(t, err)
	
	assert.Equal(t, "Player created successfully", registerResp["message"])
	assert.NotNil(t, registerResp["data"])

	// Test login
	loginReq := map[string]string{
		"username": "testuser",
		"password": "password123",
	}
	
	reqBody, _ = json.Marshal(loginReq)
	req, _ = http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	
	var loginResp map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &loginResp)
	require.NoError(t, err)
	
	assert.Equal(t, "Login successful", loginResp["message"])
	assert.NotNil(t, loginResp["data"])
}

func TestAuthIntegration_ProtectedEndpoint(t *testing.T) {
	router, db := setupTestRouter(t)
	if router == nil || db == nil {
		return // Skipped due to CGO requirement
	}

	// First register a user
	registerReq := map[string]string{
		"username": "testuser",
		"email":    "test@example.com",
		"password": "password123",
	}
	
	reqBody, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, 201, w.Code)
	
	var registerResp map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &registerResp)
	require.NoError(t, err)
	
	data := registerResp["data"].(map[string]interface{})
	token := data["token"].(string)

	// Test accessing protected endpoint with token
	req, _ = http.NewRequest("GET", "/api/v1/players/profile", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	
	var profileResp map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &profileResp)
	require.NoError(t, err)
	
	assert.Equal(t, "Profile retrieved successfully", profileResp["message"])
	assert.NotNil(t, profileResp["data"])
}

func TestAuthIntegration_ProtectedEndpointWithoutToken(t *testing.T) {
	router, db := setupTestRouter(t)
	if router == nil || db == nil {
		return // Skipped due to CGO requirement
	}

	// Test accessing protected endpoint without token
	req, _ := http.NewRequest("GET", "/api/v1/players/profile", nil)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
	assert.Contains(t, w.Body.String(), "Authorization header is required")
}

func TestAuthIntegration_DuplicateRegistration(t *testing.T) {
	router, db := setupTestRouter(t)
	if router == nil || db == nil {
		return // Skipped due to CGO requirement
	}

	// Register first user
	registerReq := map[string]string{
		"username": "testuser",
		"email":    "test@example.com",
		"password": "password123",
	}
	
	reqBody, _ := json.Marshal(registerReq)
	req, _ := http.NewRequest("POST", "/api/v1/auth/register", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	require.Equal(t, 201, w.Code)

	// Try to register with same username
	w = httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, 409, w.Code)
	assert.Contains(t, w.Body.String(), "Username already exists")
}