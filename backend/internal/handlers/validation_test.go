package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAuthHandler_Register_ValidationErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Create handler with nil service (we're only testing validation)
	authHandler := NewAuthHandler(nil)
	
	r := gin.New()
	r.POST("/register", authHandler.Register)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing username",
			requestBody:    map[string]interface{}{"email": "test@example.com", "password": "password123"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "missing email",
			requestBody:    map[string]interface{}{"username": "testuser", "password": "password123"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "missing password",
			requestBody:    map[string]interface{}{"username": "testuser", "email": "test@example.com"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "invalid email format",
			requestBody:    map[string]interface{}{"username": "testuser", "email": "invalid-email", "password": "password123"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "short username",
			requestBody:    map[string]interface{}{"username": "ab", "email": "test@example.com", "password": "password123"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "short password",
			requestBody:    map[string]interface{}{"username": "testuser", "email": "test@example.com", "password": "12345"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedError)
		})
	}
}

func TestAuthHandler_Login_ValidationErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Create handler with nil service (we're only testing validation)
	authHandler := NewAuthHandler(nil)
	
	r := gin.New()
	r.POST("/login", authHandler.Login)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing username",
			requestBody:    map[string]interface{}{"password": "password123"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "missing password",
			requestBody:    map[string]interface{}{"username": "testuser"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "empty username",
			requestBody:    map[string]interface{}{"username": "", "password": "password123"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "empty password",
			requestBody:    map[string]interface{}{"username": "testuser", "password": ""},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedError)
		})
	}
}

func TestPlayerHandler_UpdateCurrency_ValidationErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Create handler with nil service (we're only testing validation)
	playerHandler := NewPlayerHandler(nil)
	
	r := gin.New()
	// Mock authentication middleware
	r.Use(func(c *gin.Context) {
		c.Set("player_id", uint(1))
		c.Next()
	})
	r.PUT("/currency", playerHandler.UpdateCurrency)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing amount",
			requestBody:    map[string]interface{}{},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "invalid amount type",
			requestBody:    map[string]interface{}{"amount": "not-a-number"},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("PUT", "/currency", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedError)
		})
	}
}

func TestPlayerHandler_UpdateLevel_ValidationErrors(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Create handler with nil service (we're only testing validation)
	playerHandler := NewPlayerHandler(nil)
	
	r := gin.New()
	// Mock authentication middleware
	r.Use(func(c *gin.Context) {
		c.Set("player_id", uint(1))
		c.Next()
	})
	r.PUT("/level", playerHandler.UpdateLevel)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing level",
			requestBody:    map[string]interface{}{},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "invalid level (zero)",
			requestBody:    map[string]interface{}{"level": 0},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
		{
			name:           "invalid level (negative)",
			requestBody:    map[string]interface{}{"level": -1},
			expectedStatus: 400,
			expectedError:  "Invalid request data",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("PUT", "/level", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tt.expectedError)
		})
	}
}