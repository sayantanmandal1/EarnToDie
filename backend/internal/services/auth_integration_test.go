package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"zombie-car-game-backend/internal/auth"
)

// TestAuthIntegration tests the integration between auth services without database
func TestAuthIntegration_JWTAndPassword(t *testing.T) {
	// Test password hashing and JWT generation work together
	passwordService := auth.NewPasswordService()
	jwtService := auth.NewJWTService()

	// Test password hashing
	password := "testpassword123"
	hashedPassword, err := passwordService.HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hashedPassword)

	// Test password verification
	err = passwordService.VerifyPassword(hashedPassword, password)
	require.NoError(t, err)

	// Test JWT generation
	token, err := jwtService.GenerateToken(1, "testuser")
	require.NoError(t, err)
	assert.NotEmpty(t, token)

	// Test JWT validation
	claims, err := jwtService.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, uint(1), claims.PlayerID)
	assert.Equal(t, "testuser", claims.Username)

	// Test token refresh
	newToken, err := jwtService.RefreshToken(token)
	require.NoError(t, err)
	assert.NotEmpty(t, newToken)

	// Validate refreshed token
	newClaims, err := jwtService.ValidateToken(newToken)
	require.NoError(t, err)
	assert.Equal(t, uint(1), newClaims.PlayerID)
	assert.Equal(t, "testuser", newClaims.Username)
}

// TestPlayerServiceStructure tests that the player service structure is correct
func TestPlayerServiceStructure(t *testing.T) {
	// Test that we can create a player service (even with nil DB for structure testing)
	service := NewPlayerService(nil)
	assert.NotNil(t, service)

	// Test request structures
	createReq := CreatePlayerRequest{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "password123",
	}
	assert.Equal(t, "testuser", createReq.Username)
	assert.Equal(t, "test@example.com", createReq.Email)
	assert.Equal(t, "password123", createReq.Password)

	loginReq := LoginRequest{
		Username: "testuser",
		Password: "password123",
	}
	assert.Equal(t, "testuser", loginReq.Username)
	assert.Equal(t, "password123", loginReq.Password)

	// Test error constants exist
	assert.NotNil(t, ErrPlayerNotFound)
	assert.NotNil(t, ErrUsernameExists)
	assert.NotNil(t, ErrEmailExists)
	assert.NotNil(t, ErrInvalidCredentials)
	assert.NotNil(t, ErrInsufficientFunds)
}

// TestAuthResponseStructure tests the auth response structure
func TestAuthResponseStructure(t *testing.T) {
	// Test that AuthResponse structure is correct
	response := &AuthResponse{
		Token: "test-token",
		Player: nil, // Would normally contain player data
	}
	
	assert.Equal(t, "test-token", response.Token)
	assert.Nil(t, response.Player)
}