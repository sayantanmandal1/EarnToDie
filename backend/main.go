package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"zombie-car-game-backend/internal/cache"
	"zombie-car-game-backend/internal/database"
	"zombie-car-game-backend/internal/routes"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database connection
	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// Run database migrations
	if err := database.AutoMigrate(); err != nil {
		log.Fatal("Failed to run database migrations:", err)
	}

	// Initialize Redis connection
	if err := cache.Connect(); err != nil {
		log.Println("Warning: Failed to connect to Redis:", err)
		log.Println("Continuing without Redis cache...")
	} else {
		defer cache.Close()
	}

	// Initialize router
	r := gin.Default()

	// Basic health check endpoint
	r.GET("/health", func(c *gin.Context) {
		// Check database connection
		db := database.GetDB()
		sqlDB, err := db.DB()
		dbStatus := "ok"
		if err != nil || sqlDB.Ping() != nil {
			dbStatus = "error"
		}

		// Check Redis connection
		redisStatus := "ok"
		if redisClient := cache.GetClient(); redisClient != nil {
			if _, err := redisClient.Ping(c.Request.Context()).Result(); err != nil {
				redisStatus = "error"
			}
		} else {
			redisStatus = "not_connected"
		}

		c.JSON(200, gin.H{
			"status":   "ok",
			"message":  "Zombie Car Game Backend is running",
			"database": dbStatus,
			"redis":    redisStatus,
		})
	})

	// Setup API routes
	setupStatusRoutes(r)
	routes.SetupRoutes(r, database.GetDB())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Set up graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server starting on port %s", port)
		if err := r.Run(":" + port); err != nil {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	<-quit
	log.Println("Shutting down server...")

	// Close database connection
	if err := database.Close(); err != nil {
		log.Printf("Error closing database: %v", err)
	}

	// Close Redis connection
	if err := cache.Close(); err != nil {
		log.Printf("Error closing Redis: %v", err)
	}

	log.Println("Server shutdown complete")
}

// setupStatusRoutes sets up health check and status endpoints
func setupStatusRoutes(r *gin.Engine) {
	// API routes for status and health checks
	api := r.Group("/api/v1")
	{
		api.GET("/ping", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"message": "pong",
			})
		})

		// Database status endpoint
		api.GET("/status/db", func(c *gin.Context) {
			db := database.GetDB()
			sqlDB, err := db.DB()
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to get database connection"})
				return
			}

			if err := sqlDB.Ping(); err != nil {
				c.JSON(500, gin.H{"error": "Database ping failed"})
				return
			}

			stats := sqlDB.Stats()
			c.JSON(200, gin.H{
				"status":           "connected",
				"open_connections": stats.OpenConnections,
				"in_use":          stats.InUse,
				"idle":            stats.Idle,
			})
		})

		// Redis status endpoint
		api.GET("/status/redis", func(c *gin.Context) {
			redisClient := cache.GetClient()
			if redisClient == nil {
				c.JSON(500, gin.H{"error": "Redis client not initialized"})
				return
			}

			pong, err := redisClient.Ping(c.Request.Context()).Result()
			if err != nil {
				c.JSON(500, gin.H{"error": "Redis ping failed", "details": err.Error()})
				return
			}

			c.JSON(200, gin.H{
				"status": "connected",
				"ping":   pong,
			})
		})
	}
}