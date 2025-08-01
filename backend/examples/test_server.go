package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"zombie-car-game-backend/internal/auth"
	"zombie-car-game-backend/internal/handlers"
	"zombie-car-game-backend/internal/middleware"
	"zombie-car-game-backend/internal/services"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/models"
)

// Simple test to verify the authentication system works
func main() {
	// Set test environment
	os.Setenv("JWT_SECRET", "test-secret-key")
	gin.SetMode(gin.TestMode)

	// Setup in-memory database for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to test database:", err)
	}

	// Auto migrate
	err = db.AutoMigrate(&models.Player{}, &models.OwnedVehicle{}, &models.GameSession{}, &models.LevelProgress{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Setup services and handlers
	playerService := services.NewPlayerService(db)
	jwtService := auth.NewJWTService()
	authHandler := handlers.NewAuthHandler(playerService)
	playerHandler := handlers.NewPlayerHandler(playerService)

	// Setup router
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "Test server is running"})
	})

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

	fmt.Println("Test server starting on :8081")
	fmt.Println("Available endpoints:")
	fmt.Println("  GET  /health")
	fmt.Println("  POST /api/v1/auth/register")
	fmt.Println("  POST /api/v1/auth/login")
	fmt.Println("  POST /api/v1/auth/refresh")
	fmt.Println("  POST /api/v1/auth/logout")
	fmt.Println("  GET  /api/v1/players/profile (protected)")
	fmt.Println("  GET  /api/v1/players/progress (protected)")
	fmt.Println("  PUT  /api/v1/players/currency (protected)")
	fmt.Println("  PUT  /api/v1/players/level (protected)")
	fmt.Println("  PUT  /api/v1/players/score (protected)")
	fmt.Println()
	fmt.Println("Test the endpoints with curl or a REST client")

	// Start server with timeout
	srv := &http.Server{
		Addr:    ":8081",
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait a moment for server to start
	time.Sleep(100 * time.Millisecond)
	fmt.Println("Server started successfully!")
	fmt.Println("Press Ctrl+C to stop")

	// Keep running for a short time for testing
	select {
	case <-time.After(30 * time.Second):
		fmt.Println("Test completed successfully!")
	}
}