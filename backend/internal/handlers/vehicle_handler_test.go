package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/auth"
	"zombie-car-game-backend/internal/middleware"
	"zombie-car-game-backend/internal/models"
	"zombie-car-game-backend/internal/services"
)

func setupVehicleTestRouter(t *testing.T) (*gin.Engine, *gorm.DB) {
	// Skip tests if CGO is not available
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Skip("SQLite requires CGO, skipping database tests")
		return nil, nil
	}

	// Auto migrate the schema
	err = db.AutoMigrate(&models.Player{}, &models.GameSession{}, &models.LevelProgress{}, &models.OwnedVehicle{})
	require.NoError(t, err)

	// Initialize services
	playerService := services.NewPlayerService(db)
	vehicleService := services.NewVehicleService(db, playerService)
	jwtService := auth.NewJWTService()

	// Initialize handlers
	vehicleHandler := NewVehicleHandler(vehicleService)

	// Setup router
	gin.SetMode(gin.TestMode)
	router := gin.New()

	api := router.Group("/api/v1")
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware(jwtService))

	vehicles := protected.Group("/vehicles")
	{
		vehicles.GET("/available", vehicleHandler.GetAvailableVehicles)
		vehicles.GET("/", vehicleHandler.GetPlayerVehicles)
		vehicles.GET("/:id", vehicleHandler.GetVehicle)
		vehicles.POST("/purchase", vehicleHandler.PurchaseVehicle)
		vehicles.POST("/upgrade", vehicleHandler.UpgradeVehicle)
	}

	return router, db
}

func createTestPlayerForVehicleHandler(t *testing.T, db *gorm.DB, currency int, level int) (*models.Player, string) {
	playerService := services.NewPlayerService(db)
	
	req := services.CreatePlayerRequest{
		Username: "testplayer",
		Email:    "test@example.com",
		Password: "password123",
	}

	response, err := playerService.CreatePlayer(req)
	require.NoError(t, err)

	// Update currency and level
	err = playerService.UpdatePlayerCurrency(response.Player.ID, currency-1000) // Adjust from starting 1000
	require.NoError(t, err)
	
	err = playerService.UpdatePlayerLevel(response.Player.ID, level)
	require.NoError(t, err)

	return response.Player, response.Token
}

func TestVehicleHandler_GetAvailableVehicles(t *testing.T) {
	router, db := setupVehicleTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForVehicleHandler(t, db, 5000, 5)

	t.Run("get available vehicles", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/vehicles/available", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		vehicles := response["vehicles"].(map[string]interface{})
		assert.Contains(t, vehicles, "sedan")
		assert.Contains(t, vehicles, "suv")
		assert.Contains(t, vehicles, "monster_truck")

		sedan := vehicles["sedan"].(map[string]interface{})
		assert.Equal(t, "Family Sedan", sedan["name"])
		assert.Equal(t, float64(0), sedan["cost"])
		assert.Equal(t, float64(1), sedan["unlock_level"])
	})

	t.Run("get available vehicles without token", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/vehicles/available", nil)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestVehicleHandler_PurchaseVehicle(t *testing.T) {
	router, db := setupVehicleTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForVehicleHandler(t, db, 5000, 5)

	t.Run("successful vehicle purchase", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"vehicle_type": "sedan",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/vehicles/purchase", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Vehicle purchased successfully", response["message"])
		vehicle := response["vehicle"].(map[string]interface{})
		assert.Equal(t, "sedan", vehicle["vehicle_type"])
		assert.NotNil(t, vehicle["config"])
		assert.NotNil(t, vehicle["current_stats"])
		assert.NotNil(t, vehicle["upgrade_costs"])
	})

	t.Run("purchase invalid vehicle type", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"vehicle_type": "invalid_vehicle",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/vehicles/purchase", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Invalid vehicle type", response["error"])
	})

	t.Run("purchase vehicle already owned", func(t *testing.T) {
		// Purchase sedan first
		reqBody := map[string]interface{}{
			"vehicle_type": "suv",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/vehicles/purchase", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)

		// Try to purchase again
		req, _ = http.NewRequest("POST", "/api/v1/vehicles/purchase", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusConflict, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Vehicle already owned", response["error"])
	})
}

func TestVehicleHandler_GetPlayerVehicles(t *testing.T) {
	router, db := setupVehicleTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForVehicleHandler(t, db, 5000, 5)

	t.Run("get vehicles when player has none", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/vehicles", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		vehicles := response["vehicles"].([]interface{})
		assert.Empty(t, vehicles)
	})

	t.Run("get vehicles after purchasing", func(t *testing.T) {
		// Purchase a vehicle first
		reqBody := map[string]interface{}{
			"vehicle_type": "truck",
		}
		jsonBody, _ := json.Marshal(reqBody)

		req, _ := http.NewRequest("POST", "/api/v1/vehicles/purchase", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		require.Equal(t, http.StatusCreated, w.Code)

		// Now get vehicles
		req, _ = http.NewRequest("GET", "/api/v1/vehicles", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		vehicles := response["vehicles"].([]interface{})
		assert.Len(t, vehicles, 1)

		vehicle := vehicles[0].(map[string]interface{})
		assert.Equal(t, "truck", vehicle["vehicle_type"])
		assert.NotNil(t, vehicle["config"])
		assert.NotNil(t, vehicle["current_stats"])
	})
}

func TestVehicleHandler_UpgradeVehicle(t *testing.T) {
	router, db := setupVehicleTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForVehicleHandler(t, db, 10000, 5)

	// Purchase a vehicle first
	reqBody := map[string]interface{}{
		"vehicle_type": "sports_car",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/v1/vehicles/purchase", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var purchaseResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &purchaseResponse)
	require.NoError(t, err)

	vehicle := purchaseResponse["vehicle"].(map[string]interface{})
	vehicleID := vehicle["id"].(float64)

	t.Run("successful vehicle upgrade", func(t *testing.T) {
		upgradeBody := map[string]interface{}{
			"vehicle_id":   int(vehicleID),
			"upgrade_type": "engine",
		}
		jsonBody, _ := json.Marshal(upgradeBody)

		req, _ := http.NewRequest("POST", "/api/v1/vehicles/upgrade", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Vehicle upgraded successfully", response["message"])
		upgradedVehicle := response["vehicle"].(map[string]interface{})
		
		upgrades := upgradedVehicle["upgrades"].(map[string]interface{})
		assert.Equal(t, float64(1), upgrades["engine"])
	})

	t.Run("upgrade non-owned vehicle", func(t *testing.T) {
		upgradeBody := map[string]interface{}{
			"vehicle_id":   999,
			"upgrade_type": "engine",
		}
		jsonBody, _ := json.Marshal(upgradeBody)

		req, _ := http.NewRequest("POST", "/api/v1/vehicles/upgrade", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Vehicle not found or not owned", response["error"])
	})

	t.Run("upgrade with invalid upgrade type", func(t *testing.T) {
		upgradeBody := map[string]interface{}{
			"vehicle_id":   int(vehicleID),
			"upgrade_type": "invalid_upgrade",
		}
		jsonBody, _ := json.Marshal(upgradeBody)

		req, _ := http.NewRequest("POST", "/api/v1/vehicles/upgrade", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestVehicleHandler_GetVehicle(t *testing.T) {
	router, db := setupVehicleTestRouter(t)
	if router == nil {
		return // Test was skipped
	}

	_, token := createTestPlayerForVehicleHandler(t, db, 5000, 5)

	// Purchase a vehicle first
	reqBody := map[string]interface{}{
		"vehicle_type": "sedan",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/v1/vehicles/purchase", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	require.Equal(t, http.StatusCreated, w.Code)

	var purchaseResponse map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &purchaseResponse)
	require.NoError(t, err)

	vehicle := purchaseResponse["vehicle"].(map[string]interface{})
	vehicleID := int(vehicle["id"].(float64))

	t.Run("get owned vehicle", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/vehicles/"+string(rune(vehicleID+'0')), nil)
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		returnedVehicle := response["vehicle"].(map[string]interface{})
		assert.Equal(t, "sedan", returnedVehicle["vehicle_type"])
		assert.NotNil(t, returnedVehicle["config"])
		assert.NotNil(t, returnedVehicle["current_stats"])
	})

	t.Run("get non-owned vehicle", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/vehicles/999", nil)
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "Vehicle not found or not owned", response["error"])
	})
}