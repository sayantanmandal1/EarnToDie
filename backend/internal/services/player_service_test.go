package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"zombie-car-game-backend/internal/models"
)

func setupTestDB(t *testing.T) *gorm.DB {
	// Skip tests if CGO is not available
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Skip("SQLite requires CGO, skipping database tests")
		return nil
	}

	// Auto migrate the schema
	err = db.AutoMigrate(&models.Player{}, &models.OwnedVehicle{}, &models.GameSession{}, &models.LevelProgress{})
	require.NoError(t, err)

	return db
}

func TestPlayerService_CreatePlayer(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	req := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	response, err := service.CreatePlayer(req)
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.NotEmpty(t, response.Token)
	assert.Equal(t, "testuser", response.Player.Username)
	assert.Equal(t, "test@example.com", response.Player.Email)
	assert.Equal(t, 1000, response.Player.Currency) // Starting currency
	assert.Equal(t, 1, response.Player.Level)       // Starting level
}

func TestPlayerService_CreatePlayer_DuplicateUsername(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	req := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	// Create first player
	_, err := service.CreatePlayer(req)
	require.NoError(t, err)

	// Try to create second player with same username
	req.Email = "test2@example.com"
	_, err = service.CreatePlayer(req)
	assert.Error(t, err)
	assert.Equal(t, ErrUsernameExists, err)
}

func TestPlayerService_CreatePlayer_DuplicateEmail(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	req := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}

	// Create first player
	_, err := service.CreatePlayer(req)
	require.NoError(t, err)

	// Try to create second player with same email
	req.Username = "testuser2"
	_, err = service.CreatePlayer(req)
	assert.Error(t, err)
	assert.Equal(t, ErrEmailExists, err)
}

func TestPlayerService_Login(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	_, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	// Test login
	loginReq := LoginRequest{
		Username: "testuser",
		Password: "password123",
	}

	response, err := service.Login(loginReq)
	require.NoError(t, err)
	assert.NotNil(t, response)
	assert.NotEmpty(t, response.Token)
	assert.Equal(t, "testuser", response.Player.Username)
}

func TestPlayerService_Login_InvalidCredentials(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	_, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	// Test login with wrong password
	loginReq := LoginRequest{
		Username: "testuser",
		Password: "wrongpassword",
	}

	_, err = service.Login(loginReq)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidCredentials, err)

	// Test login with non-existent user
	loginReq.Username = "nonexistent"
	_, err = service.Login(loginReq)
	assert.Error(t, err)
	assert.Equal(t, ErrInvalidCredentials, err)
}

func TestPlayerService_GetPlayer(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	response, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	// Get the player
	player, err := service.GetPlayer(response.Player.ID)
	require.NoError(t, err)
	assert.Equal(t, "testuser", player.Username)
	assert.Equal(t, "test@example.com", player.Email)
}

func TestPlayerService_GetPlayer_NotFound(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Try to get non-existent player
	_, err := service.GetPlayer(999)
	assert.Error(t, err)
	assert.Equal(t, ErrPlayerNotFound, err)
}

func TestPlayerService_UpdatePlayerCurrency(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	response, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	playerID := response.Player.ID

	// Add currency
	err = service.UpdatePlayerCurrency(playerID, 500)
	require.NoError(t, err)

	// Verify currency was updated
	player, err := service.GetPlayer(playerID)
	require.NoError(t, err)
	assert.Equal(t, 1500, player.Currency) // 1000 + 500

	// Subtract currency
	err = service.UpdatePlayerCurrency(playerID, -200)
	require.NoError(t, err)

	player, err = service.GetPlayer(playerID)
	require.NoError(t, err)
	assert.Equal(t, 1300, player.Currency) // 1500 - 200
}

func TestPlayerService_UpdatePlayerCurrency_InsufficientFunds(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	response, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	playerID := response.Player.ID

	// Try to subtract more currency than available
	err = service.UpdatePlayerCurrency(playerID, -2000) // Player has 1000
	assert.Error(t, err)
	assert.Equal(t, ErrInsufficientFunds, err)
}

func TestPlayerService_UpdatePlayerLevel(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	response, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	playerID := response.Player.ID

	// Update level
	err = service.UpdatePlayerLevel(playerID, 5)
	require.NoError(t, err)

	// Verify level was updated
	player, err := service.GetPlayer(playerID)
	require.NoError(t, err)
	assert.Equal(t, 5, player.Level)
}

func TestPlayerService_UpdatePlayerScore(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	response, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	playerID := response.Player.ID

	// Update score
	err = service.UpdatePlayerScore(playerID, 1000)
	require.NoError(t, err)

	// Verify score was updated
	player, err := service.GetPlayer(playerID)
	require.NoError(t, err)
	assert.Equal(t, int64(1000), player.TotalScore)

	// Add more score
	err = service.UpdatePlayerScore(playerID, 500)
	require.NoError(t, err)

	player, err = service.GetPlayer(playerID)
	require.NoError(t, err)
	assert.Equal(t, int64(1500), player.TotalScore)
}

func TestPlayerService_GetPlayerProgress(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	response, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	playerID := response.Player.ID

	// Get player progress
	player, err := service.GetPlayerProgress(playerID)
	require.NoError(t, err)
	assert.Equal(t, "testuser", player.Username)
	assert.NotNil(t, player.OwnedVehicles)
	assert.NotNil(t, player.LevelProgress)
	assert.NotNil(t, player.GameSessions)
}

func TestPlayerService_RefreshToken(t *testing.T) {
	db := setupTestDB(t)
	service := NewPlayerService(db)

	// Create a player first
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	response, err := service.CreatePlayer(createReq)
	require.NoError(t, err)

	// Refresh token
	newResponse, err := service.RefreshToken(response.Token)
	require.NoError(t, err)
	assert.NotEmpty(t, newResponse.Token)
	assert.NotEqual(t, response.Token, newResponse.Token)
	assert.Equal(t, response.Player.ID, newResponse.Player.ID)
	assert.Equal(t, response.Player.Username, newResponse.Player.Username)
}