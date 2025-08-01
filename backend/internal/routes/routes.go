package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/auth"
	"zombie-car-game-backend/internal/handlers"
	"zombie-car-game-backend/internal/middleware"
	"zombie-car-game-backend/internal/services"
)

// SetupRoutes configures all API routes
func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	// Initialize services
	playerService := services.NewPlayerService(db)
	gameStateService := services.NewGameStateService(db, playerService)
	vehicleService := services.NewVehicleService(db, playerService)
	jwtService := auth.NewJWTService()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(playerService)
	playerHandler := handlers.NewPlayerHandler(playerService)
	gameStateHandler := handlers.NewGameStateHandler(gameStateService)
	vehicleHandler := handlers.NewVehicleHandler(vehicleService)

	// API v1 routes
	api := r.Group("/api/v1")
	{
		// Public routes (no authentication required)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)
		}

		// Protected routes (authentication required)
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware(jwtService))
		{
			// Player profile routes
			players := protected.Group("/players")
			{
				players.GET("/profile", playerHandler.GetProfile)
				players.GET("/progress", playerHandler.GetProgress)
				players.PUT("/currency", playerHandler.UpdateCurrency)
				players.PUT("/level", playerHandler.UpdateLevel)
				players.PUT("/score", playerHandler.UpdateScore)
			}

			// Game state routes
			game := protected.Group("/game")
			{
				// Session management
				sessions := game.Group("/sessions")
				{
					sessions.POST("/", gameStateHandler.StartSession)
					sessions.GET("/", gameStateHandler.GetPlayerSessions)
					sessions.GET("/active", gameStateHandler.GetActiveSession)
					sessions.GET("/:id", gameStateHandler.GetSession)
					sessions.PUT("/:id/score", gameStateHandler.UpdateScore)
					sessions.POST("/:id/end", gameStateHandler.EndSession)
				}
			}

			// Vehicle routes
			vehicles := protected.Group("/vehicles")
			{
				vehicles.GET("/available", vehicleHandler.GetAvailableVehicles)
				vehicles.GET("/", vehicleHandler.GetPlayerVehicles)
				vehicles.GET("/:id", vehicleHandler.GetVehicle)
				vehicles.POST("/purchase", vehicleHandler.PurchaseVehicle)
				vehicles.POST("/upgrade", vehicleHandler.UpgradeVehicle)
			}

			// Admin routes (for now, same as regular player routes)
			// In the future, we can add admin-specific middleware
			admin := protected.Group("/admin")
			{
				admin.GET("/players/:id", playerHandler.GetPlayerByID)
			}
		}
	}
}