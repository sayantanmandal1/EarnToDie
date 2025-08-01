package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"zombie-car-game-backend/internal/services"
)

// GameStateHandler handles game state related HTTP requests
type GameStateHandler struct {
	gameStateService *services.GameStateService
}

// NewGameStateHandler creates a new game state handler
func NewGameStateHandler(gameStateService *services.GameStateService) *GameStateHandler {
	return &GameStateHandler{
		gameStateService: gameStateService,
	}
}

// StartSession handles POST /api/v1/game/sessions
func (h *GameStateHandler) StartSession(c *gin.Context) {
	playerID, exists := c.Get("playerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Player ID not found in context"})
		return
	}

	var req services.StartSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := h.gameStateService.StartSession(playerID.(uint), req)
	if err != nil {
		switch err {
		case services.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start session"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Session started successfully",
		"session": session,
	})
}

// GetSession handles GET /api/v1/game/sessions/:id
func (h *GameStateHandler) GetSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	session, err := h.gameStateService.GetSession(sessionID)
	if err != nil {
		switch err {
		case services.ErrSessionNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get session"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"session": session})
}

// UpdateScore handles PUT /api/v1/game/sessions/:id/score
func (h *GameStateHandler) UpdateScore(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var req services.UpdateScoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session, err := h.gameStateService.UpdateScore(sessionID, req)
	if err != nil {
		switch err {
		case services.ErrSessionNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		case services.ErrSessionNotActive:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Session is not active"})
		case services.ErrScoreValidation:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Score validation failed"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update score"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Score updated successfully",
		"session": session,
	})
}

// EndSession handles POST /api/v1/game/sessions/:id/end
func (h *GameStateHandler) EndSession(c *gin.Context) {
	sessionIDStr := c.Param("id")
	sessionID, err := uuid.Parse(sessionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session ID"})
		return
	}

	var req services.EndSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.gameStateService.EndSession(sessionID, req)
	if err != nil {
		switch err {
		case services.ErrSessionNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		case services.ErrSessionAlreadyEnded:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Session already ended"})
		case services.ErrScoreValidation:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Score validation failed"})
		case services.ErrInsufficientFunds:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient funds"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to end session"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Session ended successfully",
		"result":  result,
	})
}

// GetPlayerSessions handles GET /api/v1/game/sessions
func (h *GameStateHandler) GetPlayerSessions(c *gin.Context) {
	playerID, exists := c.Get("playerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Player ID not found in context"})
		return
	}

	// Parse optional limit parameter
	limit := 10 // default limit
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	sessions, err := h.gameStateService.GetPlayerSessions(playerID.(uint), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get player sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sessions": sessions})
}

// GetActiveSession handles GET /api/v1/game/sessions/active
func (h *GameStateHandler) GetActiveSession(c *gin.Context) {
	playerID, exists := c.Get("playerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Player ID not found in context"})
		return
	}

	session, err := h.gameStateService.GetActiveSession(playerID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get active session"})
		return
	}

	if session == nil {
		c.JSON(http.StatusOK, gin.H{"session": nil})
		return
	}

	c.JSON(http.StatusOK, gin.H{"session": session})
}