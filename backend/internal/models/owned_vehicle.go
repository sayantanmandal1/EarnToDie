package models

import (
	"time"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"gorm.io/gorm"
)

// VehicleUpgrades represents the upgrades applied to a vehicle
type VehicleUpgrades struct {
	Engine  int `json:"engine"`
	Armor   int `json:"armor"`
	Weapons int `json:"weapons"`
	Fuel    int `json:"fuel"`
	Tires   int `json:"tires"`
}

// Value implements the driver.Valuer interface for database storage
func (vu VehicleUpgrades) Value() (driver.Value, error) {
	return json.Marshal(vu)
}

// Scan implements the sql.Scanner interface for database retrieval
func (vu *VehicleUpgrades) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	
	return json.Unmarshal(bytes, vu)
}

// OwnedVehicle represents a vehicle owned by a player
type OwnedVehicle struct {
	ID           uint              `json:"id" gorm:"primaryKey"`
	PlayerID     uint              `json:"player_id" gorm:"not null;index"`
	VehicleType  string            `json:"vehicle_type" gorm:"size:50;not null"`
	Upgrades     VehicleUpgrades   `json:"upgrades" gorm:"type:jsonb;default:'{}'"`
	PurchasedAt  time.Time         `json:"purchased_at"`
	DeletedAt    gorm.DeletedAt    `json:"-" gorm:"index"`

	// Relationships
	Player Player `json:"player,omitempty" gorm:"foreignKey:PlayerID"`
}

// TableName specifies the table name for OwnedVehicle model
func (OwnedVehicle) TableName() string {
	return "owned_vehicles"
}

// BeforeCreate hook to initialize default upgrades
func (ov *OwnedVehicle) BeforeCreate(tx *gorm.DB) error {
	if ov.Upgrades == (VehicleUpgrades{}) {
		ov.Upgrades = VehicleUpgrades{
			Engine:  0,
			Armor:   0,
			Weapons: 0,
			Fuel:    0,
			Tires:   0,
		}
	}
	return nil
}