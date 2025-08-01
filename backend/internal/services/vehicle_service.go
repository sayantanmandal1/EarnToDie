package services

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
	"zombie-car-game-backend/internal/models"
)

var (
	ErrVehicleNotFound      = errors.New("vehicle not found")
	ErrVehicleAlreadyOwned  = errors.New("vehicle already owned")
	ErrVehicleNotOwned      = errors.New("vehicle not owned by player")
	ErrInvalidVehicleType   = errors.New("invalid vehicle type")
	ErrInvalidUpgradeType   = errors.New("invalid upgrade type")
	ErrMaxUpgradeLevel      = errors.New("maximum upgrade level reached")
	ErrInvalidUpgradeLevel  = errors.New("invalid upgrade level")
)

// VehicleService handles vehicle-related operations
type VehicleService struct {
	db            *gorm.DB
	playerService *PlayerService
}

// NewVehicleService creates a new vehicle service
func NewVehicleService(db *gorm.DB, playerService *PlayerService) *VehicleService {
	return &VehicleService{
		db:            db,
		playerService: playerService,
	}
}

// VehicleConfig represents the configuration for a vehicle type
type VehicleConfig struct {
	Name         string            `json:"name"`
	BaseStats    VehicleStats      `json:"base_stats"`
	Cost         int               `json:"cost"`
	UnlockLevel  int               `json:"unlock_level"`
	Description  string            `json:"description"`
	UpgradeCosts map[string][]int  `json:"upgrade_costs"`
}

// VehicleStats represents the stats of a vehicle
type VehicleStats struct {
	Speed        int `json:"speed"`
	Acceleration int `json:"acceleration"`
	Armor        int `json:"armor"`
	FuelCapacity int `json:"fuel_capacity"`
	Damage       int `json:"damage"`
	Handling     int `json:"handling"`
}

// PurchaseVehicleRequest represents the request to purchase a vehicle
type PurchaseVehicleRequest struct {
	VehicleType string `json:"vehicle_type" binding:"required"`
}

// UpgradeVehicleRequest represents the request to upgrade a vehicle
type UpgradeVehicleRequest struct {
	VehicleID   uint   `json:"vehicle_id" binding:"required"`
	UpgradeType string `json:"upgrade_type" binding:"required,oneof=engine armor weapons fuel tires"`
}

// VehicleResponse represents a vehicle with calculated stats
type VehicleResponse struct {
	*models.OwnedVehicle
	Config       VehicleConfig `json:"config"`
	CurrentStats VehicleStats  `json:"current_stats"`
	UpgradeCosts map[string]int `json:"upgrade_costs"`
}

// GetAvailableVehicles returns all vehicle configurations
func (s *VehicleService) GetAvailableVehicles() map[string]VehicleConfig {
	return vehicleConfigs
}

// GetPlayerVehicles retrieves all vehicles owned by a player
func (s *VehicleService) GetPlayerVehicles(playerID uint) ([]VehicleResponse, error) {
	var ownedVehicles []models.OwnedVehicle
	if err := s.db.Where("player_id = ?", playerID).Find(&ownedVehicles).Error; err != nil {
		return nil, fmt.Errorf("failed to get player vehicles: %w", err)
	}

	var response []VehicleResponse
	for _, vehicle := range ownedVehicles {
		config, exists := vehicleConfigs[vehicle.VehicleType]
		if !exists {
			continue // Skip invalid vehicle types
		}

		vehicleResponse := VehicleResponse{
			OwnedVehicle: &vehicle,
			Config:       config,
			CurrentStats: s.calculateCurrentStats(config.BaseStats, vehicle.Upgrades),
			UpgradeCosts: s.calculateUpgradeCosts(config, vehicle.Upgrades),
		}
		response = append(response, vehicleResponse)
	}

	return response, nil
}

// PurchaseVehicle allows a player to purchase a new vehicle
func (s *VehicleService) PurchaseVehicle(playerID uint, req PurchaseVehicleRequest) (*VehicleResponse, error) {
	// Validate vehicle type
	config, exists := vehicleConfigs[req.VehicleType]
	if !exists {
		return nil, ErrInvalidVehicleType
	}

	// Check if player already owns this vehicle
	var existingVehicle models.OwnedVehicle
	if err := s.db.Where("player_id = ? AND vehicle_type = ?", playerID, req.VehicleType).
		First(&existingVehicle).Error; err == nil {
		return nil, ErrVehicleAlreadyOwned
	}

	// Get player to check currency and level
	player, err := s.playerService.GetPlayer(playerID)
	if err != nil {
		return nil, err
	}

	// Check if player has enough currency
	if player.Currency < config.Cost {
		return nil, ErrInsufficientFunds
	}

	// Check if player meets level requirement
	if player.Level < config.UnlockLevel {
		return nil, fmt.Errorf("player level %d required, current level %d", config.UnlockLevel, player.Level)
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Deduct currency
	if err := s.playerService.UpdatePlayerCurrency(playerID, -config.Cost); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create owned vehicle
	ownedVehicle := models.OwnedVehicle{
		PlayerID:    playerID,
		VehicleType: req.VehicleType,
		Upgrades: models.VehicleUpgrades{
			Engine:  0,
			Armor:   0,
			Weapons: 0,
			Fuel:    0,
			Tires:   0,
		},
		PurchasedAt: time.Now(),
	}

	if err := tx.Create(&ownedVehicle).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create owned vehicle: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return vehicle response
	response := &VehicleResponse{
		OwnedVehicle: &ownedVehicle,
		Config:       config,
		CurrentStats: s.calculateCurrentStats(config.BaseStats, ownedVehicle.Upgrades),
		UpgradeCosts: s.calculateUpgradeCosts(config, ownedVehicle.Upgrades),
	}

	return response, nil
}

// UpgradeVehicle upgrades a specific aspect of a player's vehicle
func (s *VehicleService) UpgradeVehicle(playerID uint, req UpgradeVehicleRequest) (*VehicleResponse, error) {
	// Get the owned vehicle
	var ownedVehicle models.OwnedVehicle
	if err := s.db.Where("id = ? AND player_id = ?", req.VehicleID, playerID).
		First(&ownedVehicle).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrVehicleNotOwned
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	// Get vehicle config
	config, exists := vehicleConfigs[ownedVehicle.VehicleType]
	if !exists {
		return nil, ErrInvalidVehicleType
	}

	// Get current upgrade level
	currentLevel := s.getCurrentUpgradeLevel(ownedVehicle.Upgrades, req.UpgradeType)
	if currentLevel >= maxUpgradeLevel {
		return nil, ErrMaxUpgradeLevel
	}

	// Calculate upgrade cost
	upgradeCosts := s.calculateUpgradeCosts(config, ownedVehicle.Upgrades)
	cost, exists := upgradeCosts[req.UpgradeType]
	if !exists {
		return nil, ErrInvalidUpgradeType
	}

	// Check if player has enough currency
	player, err := s.playerService.GetPlayer(playerID)
	if err != nil {
		return nil, err
	}

	if player.Currency < cost {
		return nil, ErrInsufficientFunds
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Deduct currency
	if err := s.playerService.UpdatePlayerCurrency(playerID, -cost); err != nil {
		tx.Rollback()
		return nil, err
	}

	// Update vehicle upgrades
	s.incrementUpgradeLevel(&ownedVehicle.Upgrades, req.UpgradeType)

	if err := tx.Save(&ownedVehicle).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to update vehicle: %w", err)
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return updated vehicle response
	response := &VehicleResponse{
		OwnedVehicle: &ownedVehicle,
		Config:       config,
		CurrentStats: s.calculateCurrentStats(config.BaseStats, ownedVehicle.Upgrades),
		UpgradeCosts: s.calculateUpgradeCosts(config, ownedVehicle.Upgrades),
	}

	return response, nil
}

// GetVehicle retrieves a specific vehicle owned by a player
func (s *VehicleService) GetVehicle(playerID uint, vehicleID uint) (*VehicleResponse, error) {
	var ownedVehicle models.OwnedVehicle
	if err := s.db.Where("id = ? AND player_id = ?", vehicleID, playerID).
		First(&ownedVehicle).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrVehicleNotOwned
		}
		return nil, fmt.Errorf("database error: %w", err)
	}

	config, exists := vehicleConfigs[ownedVehicle.VehicleType]
	if !exists {
		return nil, ErrInvalidVehicleType
	}

	response := &VehicleResponse{
		OwnedVehicle: &ownedVehicle,
		Config:       config,
		CurrentStats: s.calculateCurrentStats(config.BaseStats, ownedVehicle.Upgrades),
		UpgradeCosts: s.calculateUpgradeCosts(config, ownedVehicle.Upgrades),
	}

	return response, nil
}

// Helper functions

func (s *VehicleService) calculateCurrentStats(baseStats VehicleStats, upgrades models.VehicleUpgrades) VehicleStats {
	return VehicleStats{
		Speed:        baseStats.Speed + (upgrades.Engine * 5),
		Acceleration: baseStats.Acceleration + (upgrades.Engine * 3),
		Armor:        baseStats.Armor + (upgrades.Armor * 10),
		FuelCapacity: baseStats.FuelCapacity + (upgrades.Fuel * 20),
		Damage:       baseStats.Damage + (upgrades.Weapons * 8),
		Handling:     baseStats.Handling + (upgrades.Tires * 4),
	}
}

func (s *VehicleService) calculateUpgradeCosts(config VehicleConfig, upgrades models.VehicleUpgrades) map[string]int {
	costs := make(map[string]int)
	
	if upgrades.Engine < maxUpgradeLevel {
		costs["engine"] = config.UpgradeCosts["engine"][upgrades.Engine]
	}
	if upgrades.Armor < maxUpgradeLevel {
		costs["armor"] = config.UpgradeCosts["armor"][upgrades.Armor]
	}
	if upgrades.Weapons < maxUpgradeLevel {
		costs["weapons"] = config.UpgradeCosts["weapons"][upgrades.Weapons]
	}
	if upgrades.Fuel < maxUpgradeLevel {
		costs["fuel"] = config.UpgradeCosts["fuel"][upgrades.Fuel]
	}
	if upgrades.Tires < maxUpgradeLevel {
		costs["tires"] = config.UpgradeCosts["tires"][upgrades.Tires]
	}
	
	return costs
}

func (s *VehicleService) getCurrentUpgradeLevel(upgrades models.VehicleUpgrades, upgradeType string) int {
	switch upgradeType {
	case "engine":
		return upgrades.Engine
	case "armor":
		return upgrades.Armor
	case "weapons":
		return upgrades.Weapons
	case "fuel":
		return upgrades.Fuel
	case "tires":
		return upgrades.Tires
	default:
		return 0
	}
}

func (s *VehicleService) incrementUpgradeLevel(upgrades *models.VehicleUpgrades, upgradeType string) {
	switch upgradeType {
	case "engine":
		upgrades.Engine++
	case "armor":
		upgrades.Armor++
	case "weapons":
		upgrades.Weapons++
	case "fuel":
		upgrades.Fuel++
	case "tires":
		upgrades.Tires++
	}
}

// Constants and configurations
const maxUpgradeLevel = 5

var vehicleConfigs = map[string]VehicleConfig{
	"sedan": {
		Name: "Family Sedan",
		BaseStats: VehicleStats{
			Speed:        60,
			Acceleration: 40,
			Armor:        30,
			FuelCapacity: 100,
			Damage:       25,
			Handling:     70,
		},
		Cost:        0,
		UnlockLevel: 1,
		Description: "A reliable family car, perfect for beginners.",
		UpgradeCosts: map[string][]int{
			"engine":  {100, 200, 400, 800, 1600},
			"armor":   {150, 300, 600, 1200, 2400},
			"weapons": {200, 400, 800, 1600, 3200},
			"fuel":    {80, 160, 320, 640, 1280},
			"tires":   {120, 240, 480, 960, 1920},
		},
	},
	"suv": {
		Name: "Heavy SUV",
		BaseStats: VehicleStats{
			Speed:        50,
			Acceleration: 35,
			Armor:        50,
			FuelCapacity: 120,
			Damage:       35,
			Handling:     60,
		},
		Cost:        1500,
		UnlockLevel: 2,
		Description: "A sturdy SUV with better armor and damage.",
		UpgradeCosts: map[string][]int{
			"engine":  {150, 300, 600, 1200, 2400},
			"armor":   {200, 400, 800, 1600, 3200},
			"weapons": {250, 500, 1000, 2000, 4000},
			"fuel":    {100, 200, 400, 800, 1600},
			"tires":   {150, 300, 600, 1200, 2400},
		},
	},
	"truck": {
		Name: "Pickup Truck",
		BaseStats: VehicleStats{
			Speed:        55,
			Acceleration: 30,
			Armor:        60,
			FuelCapacity: 140,
			Damage:       45,
			Handling:     50,
		},
		Cost:        3000,
		UnlockLevel: 3,
		Description: "A powerful truck with excellent damage capabilities.",
		UpgradeCosts: map[string][]int{
			"engine":  {200, 400, 800, 1600, 3200},
			"armor":   {250, 500, 1000, 2000, 4000},
			"weapons": {300, 600, 1200, 2400, 4800},
			"fuel":    {120, 240, 480, 960, 1920},
			"tires":   {180, 360, 720, 1440, 2880},
		},
	},
	"sports_car": {
		Name: "Sports Car",
		BaseStats: VehicleStats{
			Speed:        80,
			Acceleration: 70,
			Armor:        20,
			FuelCapacity: 80,
			Damage:       20,
			Handling:     90,
		},
		Cost:        4500,
		UnlockLevel: 4,
		Description: "Fast and agile, but fragile.",
		UpgradeCosts: map[string][]int{
			"engine":  {300, 600, 1200, 2400, 4800},
			"armor":   {400, 800, 1600, 3200, 6400},
			"weapons": {350, 700, 1400, 2800, 5600},
			"fuel":    {150, 300, 600, 1200, 2400},
			"tires":   {200, 400, 800, 1600, 3200},
		},
	},
	"monster_truck": {
		Name: "Monster Crusher",
		BaseStats: VehicleStats{
			Speed:        45,
			Acceleration: 30,
			Armor:        80,
			FuelCapacity: 150,
			Damage:       60,
			Handling:     40,
		},
		Cost:        8000,
		UnlockLevel: 5,
		Description: "The ultimate zombie crusher with massive damage and armor.",
		UpgradeCosts: map[string][]int{
			"engine":  {400, 800, 1600, 3200, 6400},
			"armor":   {500, 1000, 2000, 4000, 8000},
			"weapons": {600, 1200, 2400, 4800, 9600},
			"fuel":    {200, 400, 800, 1600, 3200},
			"tires":   {300, 600, 1200, 2400, 4800},
		},
	},
}