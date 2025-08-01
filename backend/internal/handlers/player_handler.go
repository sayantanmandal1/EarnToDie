package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"zombie-car-game-backend/internal/services"
)

// PlayerHandler handles player-related requests
type PlayerHandler struct {
	playerService *services.PlayerService
}

// NewPlayerHandler creates a new player handler
func NewPlayerHandler(playerService *services.PlayerService) *PlayerHandler {
	return &PlayerHandler{
		playerService: playerService,
	}
}

// GetProfile returns the authenticated player's profile
func (h *PlayerHandler) GetProfile(c *gin.Context) {
	playerID, exists := c.Get("player_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Player not authenticated",
		})
		return
	}

	player, err := h.playerService.GetPlayer(playerID.(uint))
	if err != nil {
		switch err {
		case services.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Player not found",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve player profile",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile retrieved successfully",
		"data":    player,
	})
}

// GetProgress returns the authenticated player's detailed progress
func (h *PlayerHandler) GetProgress(c *gin.Context) {
	playerID, exists := c.Get("player_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Player not authenticated",
		})
		return
	}

	player, err := h.playerService.GetPlayerProgress(playerID.(uint))
	if err != nil {
		switch err {
		case services.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Player not found",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve player progress",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Progress retrieved successfully",
		"data":    player,
	})
}

// UpdateCurrency updates the player's currency
func (h *PlayerHandler) UpdateCurrency(c *gin.Context) {
	playerID, exists := c.Get("player_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Player not authenticated",
		})
		return
	}

	var req struct {
		Amount int `json:"amount" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	err := h.playerService.UpdatePlayerCurrency(playerID.(uint), req.Amount)
	if err != nil {
		switch err {
		case services.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Player not found",
			})
		case services.ErrInsufficientFunds:
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Insufficient funds",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to update currency",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Currency updated successfully",
	})
}

// UpdateLevel updates the player's level
func (h *PlayerHandler) UpdateLevel(c *gin.Context) {
	playerID, exists := c.Get("player_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Player not authenticated",
		})
		return
	}

	var req struct {
		Level int `json:"level" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	err := h.playerService.UpdatePlayerLevel(playerID.(uint), req.Level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update level",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Level updated successfully",
	})
}

// UpdateScore updates the player's total score
func (h *PlayerHandler) UpdateScore(c *gin.Context) {
	playerID, exists := c.Get("player_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Player not authenticated",
		})
		return
	}

	var req struct {
		Score int64 `json:"score" binding:"required,min=0"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	err := h.playerService.UpdatePlayerScore(playerID.(uint), req.Score)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update score",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Score updated successfully",
	})
}

// GetPlayerByID returns a player by ID (admin endpoint)
func (h *PlayerHandler) GetPlayerByID(c *gin.Context) {
	idParam := c.Param("id")
	playerID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid player ID",
		})
		return
	}

	player, err := h.playerService.GetPlayer(uint(playerID))
	if err != nil {
		switch err {
		case services.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Player not found",
			})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to retrieve player",
			})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Player retrieved successfully",
		"data":    player,
	})
}