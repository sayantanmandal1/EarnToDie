package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"zombie-car-game-backend/internal/models"
)

func setupVehicleTestDB(t *testing.T) *gorm.DB {
	// Skip tests if CGO is not available
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Skip("SQLite requires CGO, skipping database tests")
		return nil
	}

	// Auto migrate the schema
	err = db.AutoMigrate(&models.Player{}, &models.OwnedVehicle{}, &models.GameSession{}, &models.LevelProgress{})
	if err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	return db
}

func createTestPlayerForVehicle(t *testing.T, db *gorm.DB, currency int, level int) *models.Player {
	player := &models.Player{
		Username:     "testplayer",
		Email:        "test@example.com",
		PasswordHash: "hashedpassword",
		Currency:     currency,
		Level:        level,
		TotalScore:   0,
	}
	db.Create(player)
	return player
}

func TestVehicleService_GetAvailableVehicles(t *testing.T) {
	db := setupVehicleTestDB(t)
	playerService := NewPlayerService(db)
	vehicleService := NewVehicleService(db, playerService)

	vehicles := vehicleService.GetAvailableVehicles()

	assert.NotEmpty(t, vehicles)
	assert.Contains(t, vehicles, "sedan")
	assert.Contains(t, vehicles, "suv")
	assert.Contains(t, vehicles, "monster_truck")

	// Check sedan config
	sedan := vehicles["sedan"]
	assert.Equal(t, "Family Sedan", sedan.Name)
	assert.Equal(t, 0, sedan.Cost)
	assert.Equal(t, 1, sedan.UnlockLevel)
	assert.Equal(t, 60, sedan.BaseStats.Speed)
}

func TestVehicleService_PurchaseVehicle(t *testing.T) {
	db := setupVehicleTestDB(t)
	playerService := NewPlayerService(db)
	vehicleService := NewVehicleService(db, playerService)

	t.Run("successful vehicle purchase", func(t *testing.T) {
		player := createTestPlayerForVehicle(t, db, 2000, 2)

		req := PurchaseVehicleRequest{
			VehicleType: "suv",
		}

		vehicle, err := vehicleService.PurchaseVehicle(player.ID, req)

		assert.NoError(t, err)
		assert.NotNil(t, vehicle)
		assert.Equal(t, "suv", vehicle.VehicleType)
		assert.Equal(t, player.ID, vehicle.PlayerID)
		assert.Equal(t, "Heavy SUV", vehicle.Config.Name)

		// Check that currency was deducted
		updatedPlayer, err := playerService.GetPlayer(player.ID)
		require.NoError(t, err)
		assert.Equal(t, 500, updatedPlayer.Currency) // 2000 - 1500
	})

	t.Run("purchase invalid vehicle type", func(t *testing.T) {
		player := createTestPlayerForVehicle(t, db, 2000, 2)

		req := PurchaseVehicleRequest{
			VehicleType: "invalid_vehicle",
		}

		vehicle, err := vehicleService.PurchaseVehicle(player.ID, req)

		assert.Error(t, err)
		assert.Nil(t, vehicle)
		assert.Equal(t, ErrInvalidVehicleType, err)
	})

	t.Run("purchase vehicle already owned", func(t *testing.T) {
		player := createTestPlayerForVehicle(t, db, 2000, 2)

		req := PurchaseVehicleRequest{
			VehicleType: "suv",
		}

		// Purchase first time
		_, err := vehicleService.PurchaseVehicle(player.ID, req)
		require.NoError(t, err)

		// Try to purchase again
		vehicle, err := vehicleService.PurchaseVehicle(player.ID, req)

		assert.Error(t, err)
		assert.Nil(t, vehicle)
		assert.Equal(t, ErrVehicleAlreadyOwned, err)
	})

	t.Run("purchase vehicle with insufficient funds", func(t *testing.T) {
		player := createTestPlayerForVehicle(t, db, 500, 5) // Not enough for monster truck

		req := PurchaseVehicleRequest{
			VehicleType: "monster_truck",
		}

		vehicle, err := vehicleService.PurchaseVehicle(player.ID, req)

		assert.Error(t, err)
		assert.Nil(t, vehicle)
		assert.Equal(t, ErrInsufficientFunds, err)
	})

	t.Run("purchase vehicle with insufficient level", func(t *testing.T) {
		player := createTestPlayerForVehicle(t, db, 10000, 1) // Level too low for SUV

		req := PurchaseVehicleRequest{
			VehicleType: "suv",
		}

		vehicle, err := vehicleService.PurchaseVehicle(player.ID, req)

		assert.Error(t, err)
		assert.Nil(t, vehicle)
		assert.Contains(t, err.Error(), "player level 2 required")
	})

	t.Run("purchase free vehicle (sedan)", func(t *testing.T) {
		player := createTestPlayerForVehicle(t, db, 1000, 1)

		req := PurchaseVehicleRequest{
			VehicleType: "sedan",
		}

		vehicle, err := vehicleService.PurchaseVehicle(player.ID, req)

		assert.NoError(t, err)
		assert.NotNil(t, vehicle)

		// Check that currency wasn't deducted (sedan is free)
		updatedPlayer, err := playerService.GetPlayer(player.ID)
		require.NoError(t, err)
		assert.Equal(t, 1000, updatedPlayer.Currency)
	})
}

func TestVehicleService_GetPlayerVehicles(t *testing.T) {
	db := setupVehicleTestDB(t)
	playerService := NewPlayerService(db)
	vehicleService := NewVehicleService(db, playerService)

	player := createTestPlayerForVehicle(t, db, 5000, 5)

	t.Run("get vehicles when player has none", func(t *testing.T) {
		vehicles, err := vehicleService.GetPlayerVehicles(player.ID)

		assert.NoError(t, err)
		assert.Empty(t, vehicles)
	})

	t.Run("get vehicles after purchasing", func(t *testing.T) {
		// Purchase sedan and SUV
		req1 := PurchaseVehicleRequest{VehicleType: "sedan"}
		_, err := vehicleService.PurchaseVehicle(player.ID, req1)
		require.NoError(t, err)

		req2 := PurchaseVehicleRequest{VehicleType: "suv"}
		_, err = vehicleService.PurchaseVehicle(player.ID, req2)
		require.NoError(t, err)

		vehicles, err := vehicleService.GetPlayerVehicles(player.ID)

		assert.NoError(t, err)
		assert.Len(t, vehicles, 2)

		// Check that vehicles have correct data
		vehicleTypes := make(map[string]bool)
		for _, vehicle := range vehicles {
			vehicleTypes[vehicle.VehicleType] = true
			assert.NotNil(t, vehicle.Config)
			assert.NotNil(t, vehicle.CurrentStats)
			assert.NotNil(t, vehicle.UpgradeCosts)
		}

		assert.True(t, vehicleTypes["sedan"])
		assert.True(t, vehicleTypes["suv"])
	})
}

func TestVehicleService_UpgradeVehicle(t *testing.T) {
	db := setupVehicleTestDB(t)
	playerService := NewPlayerService(db)
	vehicleService := NewVehicleService(db, playerService)

	player := createTestPlayerForVehicle(t, db, 5000, 5)

	// Purchase a vehicle first
	req := PurchaseVehicleRequest{VehicleType: "sedan"}
	vehicle, err := vehicleService.PurchaseVehicle(player.ID, req)
	require.NoError(t, err)

	t.Run("successful engine upgrade", func(t *testing.T) {
		upgradeReq := UpgradeVehicleRequest{
			VehicleID:   vehicle.ID,
			UpgradeType: "engine",
		}

		upgradedVehicle, err := vehicleService.UpgradeVehicle(player.ID, upgradeReq)

		assert.NoError(t, err)
		assert.NotNil(t, upgradedVehicle)
		assert.Equal(t, 1, upgradedVehicle.Upgrades.Engine)

		// Check that stats were updated
		baseStats := vehicleConfigs["sedan"].BaseStats
		expectedSpeed := baseStats.Speed + (1 * 5) // Engine upgrade adds 5 speed per level
		assert.Equal(t, expectedSpeed, upgradedVehicle.CurrentStats.Speed)

		// Check that currency was deducted
		updatedPlayer, err := playerService.GetPlayer(player.ID)
		require.NoError(t, err)
		expectedCurrency := 5000 - 100 // Cost of first engine upgrade for sedan
		assert.Equal(t, expectedCurrency, updatedPlayer.Currency)
	})

	t.Run("upgrade non-owned vehicle", func(t *testing.T) {
		upgradeReq := UpgradeVehicleRequest{
			VehicleID:   999, // Non-existent vehicle ID
			UpgradeType: "engine",
		}

		upgradedVehicle, err := vehicleService.UpgradeVehicle(player.ID, upgradeReq)

		assert.Error(t, err)
		assert.Nil(t, upgradedVehicle)
		assert.Equal(t, ErrVehicleNotOwned, err)
	})

	t.Run("upgrade with invalid upgrade type", func(t *testing.T) {
		upgradeReq := UpgradeVehicleRequest{
			VehicleID:   vehicle.ID,
			UpgradeType: "invalid_upgrade",
		}

		upgradedVehicle, err := vehicleService.UpgradeVehicle(player.ID, upgradeReq)

		assert.Error(t, err)
		assert.Nil(t, upgradedVehicle)
		assert.Equal(t, ErrInvalidUpgradeType, err)
	})

	t.Run("upgrade with insufficient funds", func(t *testing.T) {
		// Create a player with very little currency
		poorPlayer := createTestPlayerForVehicle(t, db, 50, 5)
		
		// Purchase sedan for poor player
		req := PurchaseVehicleRequest{VehicleType: "sedan"}
		poorVehicle, err := vehicleService.PurchaseVehicle(poorPlayer.ID, req)
		require.NoError(t, err)

		upgradeReq := UpgradeVehicleRequest{
			VehicleID:   poorVehicle.ID,
			UpgradeType: "engine",
		}

		upgradedVehicle, err := vehicleService.UpgradeVehicle(poorPlayer.ID, upgradeReq)

		assert.Error(t, err)
		assert.Nil(t, upgradedVehicle)
		assert.Equal(t, ErrInsufficientFunds, err)
	})

	t.Run("upgrade to maximum level", func(t *testing.T) {
		// Create a rich player
		richPlayer := createTestPlayerForVehicle(t, db, 50000, 5)
		
		// Purchase sedan
		req := PurchaseVehicleRequest{VehicleType: "sedan"}
		richVehicle, err := vehicleService.PurchaseVehicle(richPlayer.ID, req)
		require.NoError(t, err)

		// Upgrade engine to max level
		for i := 0; i < maxUpgradeLevel; i++ {
			upgradeReq := UpgradeVehicleRequest{
				VehicleID:   richVehicle.ID,
				UpgradeType: "engine",
			}

			upgradedVehicle, err := vehicleService.UpgradeVehicle(richPlayer.ID, upgradeReq)
			assert.NoError(t, err)
			assert.Equal(t, i+1, upgradedVehicle.Upgrades.Engine)
		}

		// Try to upgrade beyond max level
		upgradeReq := UpgradeVehicleRequest{
			VehicleID:   richVehicle.ID,
			UpgradeType: "engine",
		}

		upgradedVehicle, err := vehicleService.UpgradeVehicle(richPlayer.ID, upgradeReq)

		assert.Error(t, err)
		assert.Nil(t, upgradedVehicle)
		assert.Equal(t, ErrMaxUpgradeLevel, err)
	})

	t.Run("upgrade different types", func(t *testing.T) {
		// Create another rich player
		richPlayer := createTestPlayerForVehicle(t, db, 50000, 5)
		
		// Purchase sedan
		req := PurchaseVehicleRequest{VehicleType: "sedan"}
		richVehicle, err := vehicleService.PurchaseVehicle(richPlayer.ID, req)
		require.NoError(t, err)

		upgradeTypes := []string{"engine", "armor", "weapons", "fuel", "tires"}

		for _, upgradeType := range upgradeTypes {
			upgradeReq := UpgradeVehicleRequest{
				VehicleID:   richVehicle.ID,
				UpgradeType: upgradeType,
			}

			upgradedVehicle, err := vehicleService.UpgradeVehicle(richPlayer.ID, upgradeReq)
			assert.NoError(t, err)
			assert.NotNil(t, upgradedVehicle)

			// Check that the specific upgrade was incremented
			switch upgradeType {
			case "engine":
				assert.Equal(t, 1, upgradedVehicle.Upgrades.Engine)
			case "armor":
				assert.Equal(t, 1, upgradedVehicle.Upgrades.Armor)
			case "weapons":
				assert.Equal(t, 1, upgradedVehicle.Upgrades.Weapons)
			case "fuel":
				assert.Equal(t, 1, upgradedVehicle.Upgrades.Fuel)
			case "tires":
				assert.Equal(t, 1, upgradedVehicle.Upgrades.Tires)
			}
		}
	})
}

func TestVehicleService_GetVehicle(t *testing.T) {
	db := setupVehicleTestDB(t)
	playerService := NewPlayerService(db)
	vehicleService := NewVehicleService(db, playerService)

	player := createTestPlayerForVehicle(t, db, 5000, 5)

	t.Run("get owned vehicle", func(t *testing.T) {
		// Purchase vehicle
		req := PurchaseVehicleRequest{VehicleType: "sedan"}
		purchasedVehicle, err := vehicleService.PurchaseVehicle(player.ID, req)
		require.NoError(t, err)

		// Get vehicle
		vehicle, err := vehicleService.GetVehicle(player.ID, purchasedVehicle.ID)

		assert.NoError(t, err)
		assert.NotNil(t, vehicle)
		assert.Equal(t, purchasedVehicle.ID, vehicle.ID)
		assert.Equal(t, "sedan", vehicle.VehicleType)
		assert.Equal(t, "Family Sedan", vehicle.Config.Name)
	})

	t.Run("get non-owned vehicle", func(t *testing.T) {
		vehicle, err := vehicleService.GetVehicle(player.ID, 999)

		assert.Error(t, err)
		assert.Nil(t, vehicle)
		assert.Equal(t, ErrVehicleNotOwned, err)
	})
}

func TestVehicleService_CalculateCurrentStats(t *testing.T) {
	db := setupVehicleTestDB(t)
	playerService := NewPlayerService(db)
	vehicleService := NewVehicleService(db, playerService)

	baseStats := VehicleStats{
		Speed:        60,
		Acceleration: 40,
		Armor:        30,
		FuelCapacity: 100,
		Damage:       25,
		Handling:     70,
	}

	upgrades := models.VehicleUpgrades{
		Engine:  2,
		Armor:   1,
		Weapons: 3,
		Fuel:    1,
		Tires:   2,
	}

	currentStats := vehicleService.calculateCurrentStats(baseStats, upgrades)

	// Engine upgrades affect speed and acceleration
	assert.Equal(t, 70, currentStats.Speed)        // 60 + (2 * 5)
	assert.Equal(t, 46, currentStats.Acceleration) // 40 + (2 * 3)

	// Armor upgrades affect armor
	assert.Equal(t, 40, currentStats.Armor) // 30 + (1 * 10)

	// Weapon upgrades affect damage
	assert.Equal(t, 49, currentStats.Damage) // 25 + (3 * 8)

	// Fuel upgrades affect fuel capacity
	assert.Equal(t, 120, currentStats.FuelCapacity) // 100 + (1 * 20)

	// Tire upgrades affect handling
	assert.Equal(t, 78, currentStats.Handling) // 70 + (2 * 4)
}

func TestVehicleService_CalculateUpgradeCosts(t *testing.T) {
	db := setupVehicleTestDB(t)
	playerService := NewPlayerService(db)
	vehicleService := NewVehicleService(db, playerService)

	config := vehicleConfigs["sedan"]

	t.Run("calculate costs for no upgrades", func(t *testing.T) {
		upgrades := models.VehicleUpgrades{
			Engine:  0,
			Armor:   0,
			Weapons: 0,
			Fuel:    0,
			Tires:   0,
		}

		costs := vehicleService.calculateUpgradeCosts(config, upgrades)

		// Should return first level costs for all upgrade types
		assert.Equal(t, 100, costs["engine"])
		assert.Equal(t, 150, costs["armor"])
		assert.Equal(t, 200, costs["weapons"])
		assert.Equal(t, 80, costs["fuel"])
		assert.Equal(t, 120, costs["tires"])
	})

	t.Run("calculate costs for partially upgraded vehicle", func(t *testing.T) {
		upgrades := models.VehicleUpgrades{
			Engine:  2,
			Armor:   1,
			Weapons: 0,
			Fuel:    maxUpgradeLevel, // Maxed out
			Tires:   3,
		}

		costs := vehicleService.calculateUpgradeCosts(config, upgrades)

		// Should return next level costs
		assert.Equal(t, 400, costs["engine"])  // Third upgrade (index 2)
		assert.Equal(t, 300, costs["armor"])   // Second upgrade (index 1)
		assert.Equal(t, 200, costs["weapons"]) // First upgrade (index 0)
		assert.Equal(t, 960, costs["tires"])   // Fourth upgrade (index 3)

		// Fuel should not be present since it's maxed out
		_, exists := costs["fuel"]
		assert.False(t, exists)
	})
}