package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"zombie-car-game-backend/internal/auth"
)

// AuthMiddleware creates a middleware for JWT authentication
func AuthMiddleware(jwtService *auth.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if the header starts with "Bearer "
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid authorization header format",
			})
			c.Abort()
			return
		}

		token := tokenParts[1]
		claims, err := jwtService.ValidateToken(token)
		if err != nil {
			var message string
			switch err {
			case auth.ErrExpiredToken:
				message = "Token has expired"
			case auth.ErrInvalidToken:
				message = "Invalid token"
			default:
				message = "Token validation failed"
			}

			c.JSON(http.StatusUnauthorized, gin.H{
				"error": message,
			})
			c.Abort()
			return
		}

		// Set player information in context
		c.Set("player_id", claims.PlayerID)
		c.Set("username", claims.Username)
		c.Next()
	}
}

// OptionalAuthMiddleware creates a middleware that optionally authenticates requests
func OptionalAuthMiddleware(jwtService *auth.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			c.Next()
			return
		}

		token := tokenParts[1]
		claims, err := jwtService.ValidateToken(token)
		if err == nil {
			c.Set("player_id", claims.PlayerID)
			c.Set("username", claims.Username)
		}

		c.Next()
	}
}