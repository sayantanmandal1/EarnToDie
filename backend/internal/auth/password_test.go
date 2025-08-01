package auth

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPasswordService_HashPassword(t *testing.T) {
	passwordService := NewPasswordService()

	password := "testpassword123"
	hashedPassword, err := passwordService.HashPassword(password)
	
	require.NoError(t, err)
	assert.NotEmpty(t, hashedPassword)
	assert.NotEqual(t, password, hashedPassword)
	assert.True(t, len(hashedPassword) > 50) // bcrypt hashes are typically 60 characters
}

func TestPasswordService_VerifyPassword(t *testing.T) {
	passwordService := NewPasswordService()

	password := "testpassword123"
	hashedPassword, err := passwordService.HashPassword(password)
	require.NoError(t, err)

	// Test correct password
	err = passwordService.VerifyPassword(hashedPassword, password)
	assert.NoError(t, err)

	// Test incorrect password
	err = passwordService.VerifyPassword(hashedPassword, "wrongpassword")
	assert.Error(t, err)
}

func TestPasswordService_VerifyPassword_EmptyPassword(t *testing.T) {
	passwordService := NewPasswordService()

	password := "testpassword123"
	hashedPassword, err := passwordService.HashPassword(password)
	require.NoError(t, err)

	// Test empty password
	err = passwordService.VerifyPassword(hashedPassword, "")
	assert.Error(t, err)
}

func TestPasswordService_HashPassword_EmptyPassword(t *testing.T) {
	passwordService := NewPasswordService()

	// Test hashing empty password (should still work)
	hashedPassword, err := passwordService.HashPassword("")
	require.NoError(t, err)
	assert.NotEmpty(t, hashedPassword)

	// Verify empty password works
	err = passwordService.VerifyPassword(hashedPassword, "")
	assert.NoError(t, err)
}