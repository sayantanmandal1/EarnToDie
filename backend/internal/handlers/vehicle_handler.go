package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"zombie-car-game-backend/internal/services"
)

// VehicleHandler handles vehicle related HTTP requests
type VehicleHandler struct {
	vehicleService *services.VehicleService
}

// NewVehicleHandler creates a new vehicle handler
func NewVehicleHandler(vehicleService *services.VehicleService) *VehicleHandler {
	return &VehicleHandler{
		vehicleService: vehicleService,
	}
}

// GetAvailableVehicles handles GET /api/v1/vehicles/available
func (h *VehicleHandler) GetAvailableVehicles(c *gin.Context) {
	vehicles := h.vehicleService.GetAvailableVehicles()
	c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
}

// GetPlayerVehicles handles GET /api/v1/vehicles
func (h *VehicleHandler) GetPlayerVehicles(c *gin.Context) {
	playerID, exists := c.Get("playerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Player ID not found in context"})
		return
	}

	vehicles, err := h.vehicleService.GetPlayerVehicles(playerID.(uint))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get player vehicles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
}

// GetVehicle handles GET /api/v1/vehicles/:id
func (h *VehicleHandler) GetVehicle(c *gin.Context) {
	playerID, exists := c.Get("playerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Player ID not found in context"})
		return
	}

	vehicleIDStr := c.Param("id")
	vehicleID, err := strconv.ParseUint(vehicleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle ID"})
		return
	}

	vehicle, err := h.vehicleService.GetVehicle(playerID.(uint), uint(vehicleID))
	if err != nil {
		switch err {
		case services.ErrVehicleNotOwned:
			c.JSON(http.StatusNotFound, gin.H{"error": "Vehicle not found or not owned"})
		case services.ErrInvalidVehicleType:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle type"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get vehicle"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"vehicle": vehicle})
}

// PurchaseVehicle handles POST /api/v1/vehicles/purchase
func (h *VehicleHandler) PurchaseVehicle(c *gin.Context) {
	playerID, exists := c.Get("playerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Player ID not found in context"})
		return
	}

	var req services.PurchaseVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vehicle, err := h.vehicleService.PurchaseVehicle(playerID.(uint), req)
	if err != nil {
		switch err {
		case services.ErrInvalidVehicleType:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle type"})
		case services.ErrVehicleAlreadyOwned:
			c.JSON(http.StatusConflict, gin.H{"error": "Vehicle already owned"})
		case services.ErrInsufficientFunds:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient funds"})
		case services.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
		default:
			if err.Error() == "player level 2 required, current level 1" {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to purchase vehicle"})
			}
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Vehicle purchased successfully",
		"vehicle": vehicle,
	})
}

// UpgradeVehicle handles POST /api/v1/vehicles/upgrade
func (h *VehicleHandler) UpgradeVehicle(c *gin.Context) {
	playerID, exists := c.Get("playerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Player ID not found in context"})
		return
	}

	var req services.UpgradeVehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	vehicle, err := h.vehicleService.UpgradeVehicle(playerID.(uint), req)
	if err != nil {
		switch err {
		case services.ErrVehicleNotOwned:
			c.JSON(http.StatusNotFound, gin.H{"error": "Vehicle not found or not owned"})
		case services.ErrInvalidVehicleType:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vehicle type"})
		case services.ErrInvalidUpgradeType:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid upgrade type"})
		case services.ErrMaxUpgradeLevel:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum upgrade level reached"})
		case services.ErrInsufficientFunds:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient funds"})
		case services.ErrPlayerNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Player not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upgrade vehicle"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Vehicle upgraded successfully",
		"vehicle": vehicle,
	})
}