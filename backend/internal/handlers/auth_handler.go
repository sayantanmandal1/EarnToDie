package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"zombie-car-game-backend/internal/services"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	playerService *services.PlayerService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(playerService *services.PlayerService) *AuthHandler {
	return &AuthHandler{
		playerService: playerService,
	}
}

// Register handles player registration
func (h *AuthHandler) Register(c *gin.Context) {
	var req services.CreatePlayerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	response, err := h.playerService.CreatePlayer(req)
	if err != nil {
		switch err {
		case services.ErrUsernameExists:
			c.JSON(http.StatusConflict, gin.H{
				"error": "Username already exists",
			})
		case services.ErrEmailExists:
			c.JSON(http.StatusConflict, gin.H{
				"error": "Email already exists",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create player",
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Player created successfully",
		"data":    response,
	})
}

// Login handles player login
func (h *AuthHandler) Login(c *gin.Context) {
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	response, err := h.playerService.Login(req)
	if err != nil {
		switch err {
		case services.ErrInvalidCredentials:
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid username or password",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Login failed",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"data":    response,
	})
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	response, err := h.playerService.RefreshToken(req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Failed to refresh token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Token refreshed successfully",
		"data":    response,
	})
}

// Logout handles player logout (client-side token invalidation)
func (h *AuthHandler) Logout(c *gin.Context) {
	// In a JWT-based system, logout is typically handled client-side
	// by removing the token from storage. We can add token blacklisting
	// in the future if needed.
	c.JSON(http.StatusOK, gin.H{
		"message": "Logout successful",
	})
}