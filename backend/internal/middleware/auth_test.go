package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"zombie-car-game-backend/internal/auth"
)

func TestAuthMiddleware_ValidToken(t *testing.T) {
	// Set test secret
	os.Setenv("JWT_SECRET", "test-secret-key")
	defer os.Unsetenv("JWT_SECRET")

	gin.SetMode(gin.TestMode)
	
	jwtService := auth.NewJWTService()
	token, err := jwtService.GenerateToken(1, "testuser")
	assert.NoError(t, err)

	// Create test router
	r := gin.New()
	r.Use(AuthMiddleware(jwtService))
	r.GET("/test", func(c *gin.Context) {
		playerID, exists := c.Get("player_id")
		assert.True(t, exists)
		assert.Equal(t, uint(1), playerID)

		username, exists := c.Get("username")
		assert.True(t, exists)
		assert.Equal(t, "testuser", username)

		c.JSON(200, gin.H{"message": "success"})
	})

	// Create test request
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	// Perform request
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestAuthMiddleware_MissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	jwtService := auth.NewJWTService()

	// Create test router
	r := gin.New()
	r.Use(AuthMiddleware(jwtService))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	// Create test request without Authorization header
	req, _ := http.NewRequest("GET", "/test", nil)

	// Perform request
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
	assert.Contains(t, w.Body.String(), "Authorization header is required")
}

func TestAuthMiddleware_InvalidTokenFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	jwtService := auth.NewJWTService()

	// Create test router
	r := gin.New()
	r.Use(AuthMiddleware(jwtService))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	// Create test request with invalid token format
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "InvalidFormat")

	// Perform request
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid authorization header format")
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	jwtService := auth.NewJWTService()

	// Create test router
	r := gin.New()
	r.Use(AuthMiddleware(jwtService))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "success"})
	})

	// Create test request with invalid token
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")

	// Perform request
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 401, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid token")
}

func TestOptionalAuthMiddleware_WithValidToken(t *testing.T) {
	// Set test secret
	os.Setenv("JWT_SECRET", "test-secret-key")
	defer os.Unsetenv("JWT_SECRET")

	gin.SetMode(gin.TestMode)
	
	jwtService := auth.NewJWTService()
	token, err := jwtService.GenerateToken(1, "testuser")
	assert.NoError(t, err)

	// Create test router
	r := gin.New()
	r.Use(OptionalAuthMiddleware(jwtService))
	r.GET("/test", func(c *gin.Context) {
		playerID, exists := c.Get("player_id")
		assert.True(t, exists)
		assert.Equal(t, uint(1), playerID)

		username, exists := c.Get("username")
		assert.True(t, exists)
		assert.Equal(t, "testuser", username)

		c.JSON(200, gin.H{"message": "success"})
	})

	// Create test request
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	// Perform request
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestOptionalAuthMiddleware_WithoutToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	jwtService := auth.NewJWTService()

	// Create test router
	r := gin.New()
	r.Use(OptionalAuthMiddleware(jwtService))
	r.GET("/test", func(c *gin.Context) {
		_, exists := c.Get("player_id")
		assert.False(t, exists)

		_, exists = c.Get("username")
		assert.False(t, exists)

		c.JSON(200, gin.H{"message": "success"})
	})

	// Create test request without Authorization header
	req, _ := http.NewRequest("GET", "/test", nil)

	// Perform request
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestOptionalAuthMiddleware_WithInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	jwtService := auth.NewJWTService()

	// Create test router
	r := gin.New()
	r.Use(OptionalAuthMiddleware(jwtService))
	r.GET("/test", func(c *gin.Context) {
		_, exists := c.Get("player_id")
		assert.False(t, exists)

		_, exists = c.Get("username")
		assert.False(t, exists)

		c.JSON(200, gin.H{"message": "success"})
	})

	// Create test request with invalid token
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")

	// Perform request
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}