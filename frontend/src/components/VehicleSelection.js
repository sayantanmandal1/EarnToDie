import React, { useState, useEffect } from 'react';
import { getVehicleConfig, getAllVehicleTypes, getVehiclesByCategory, VEHICLE_CATEGORIES } from '../vehicles/VehicleConfig';
import './VehicleSelection.css';

/**
 * Vehicle Selection Component for choosing and customizing vehicles
 */
export const VehicleSelection = ({ 
    playerLevel = 1, 
    playerCurrency = 0, 
    ownedVehicles = [], 
    onVehicleSelect, 
    onVehiclePurchase,
    onClose 
}) => {
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [sortBy, setSortBy] = useState('level'); // 'level', 'cost', 'speed', 'armor'

    useEffect(() => {
        // Set default selected vehicle to first owned vehicle or sedan
        if (ownedVehicles.length > 0) {
            setSelectedVehicle(ownedVehicles[0]);
        } else {
            setSelectedVehicle('sedan');
        }
    }, [ownedVehicles]);

    const getFilteredVehicles = () => {
        let vehicles = getAllVehicleTypes().map(type => ({
            type,
            ...getVehicleConfig(type),
            owned: ownedVehicles.includes(type),
            canAfford: getVehicleConfig(type).cost <= playerCurrency,
            unlocked: getVehicleConfig(type).unlockLevel <= playerLevel
        }));

        // Filter by category
        if (selectedCategory !== 'all') {
            vehicles = vehicles.filter(v => v.category === selectedCategory);
        }

        // Sort vehicles
        vehicles.sort((a, b) => {
            switch (sortBy) {
                case 'cost':
                    return a.cost - b.cost;
                case 'speed':
                    return b.stats.speed - a.stats.speed;
                case 'armor':
                    return b.stats.armor - a.stats.armor;
                case 'level':
                default:
                    return a.unlockLevel - b.unlockLevel;
            }
        });

        return vehicles;
    };

    const handleVehicleClick = (vehicleType) => {
        setSelectedVehicle(vehicleType);
    };

    const handleSelectVehicle = () => {
        if (selectedVehicle && onVehicleSelect) {
            onVehicleSelect(selectedVehicle);
        }
    };

    const handlePurchaseVehicle = () => {
        if (selectedVehicle && onVehiclePurchase) {
            onVehiclePurchase(selectedVehicle);
        }
    };

    const getSelectedVehicleData = () => {
        if (!selectedVehicle) return null;
        const vehicles = getFilteredVehicles();
        return vehicles.find(v => v.type === selectedVehicle) || 
               { type: selectedVehicle, ...getVehicleConfig(selectedVehicle) };
    };

    const selectedData = getSelectedVehicleData();
    const filteredVehicles = getFilteredVehicles();

    return (
        <div className="vehicle-selection-overlay">
            <div className="vehicle-selection-container">
                <div className="vehicle-selection-header">
                    <h2>Vehicle Selection</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="vehicle-selection-content">
                    {/* Filters and Controls */}
                    <div className="vehicle-controls">
                        <div className="filter-controls">
                            <label>Category:</label>
                            <select 
                                value={selectedCategory} 
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="all">All Vehicles</option>
                                {Object.entries(VEHICLE_CATEGORIES).map(([key, value]) => (
                                    <option key={key} value={value}>
                                        {key.charAt(0) + key.slice(1).toLowerCase()}
                                    </option>
                                ))}
                            </select>

                            <label>Sort by:</label>
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="level">Unlock Level</option>
                                <option value="cost">Cost</option>
                                <option value="speed">Speed</option>
                                <option value="armor">Armor</option>
                            </select>

                            <label>View:</label>
                            <div className="view-toggle">
                                <button 
                                    className={viewMode === 'grid' ? 'active' : ''}
                                    onClick={() => setViewMode('grid')}
                                >
                                    Grid
                                </button>
                                <button 
                                    className={viewMode === 'list' ? 'active' : ''}
                                    onClick={() => setViewMode('list')}
                                >
                                    List
                                </button>
                            </div>
                        </div>

                        <div className="player-info">
                            <div className="currency">Currency: ${playerCurrency.toLocaleString()}</div>
                            <div className="level">Level: {playerLevel}</div>
                        </div>
                    </div>

                    <div className="vehicle-selection-main">
                        {/* Vehicle List */}
                        <div className={`vehicle-list ${viewMode}`}>
                            {filteredVehicles.map((vehicle) => (
                                <div
                                    key={vehicle.type}
                                    className={`vehicle-item ${selectedVehicle === vehicle.type ? 'selected' : ''} 
                                               ${!vehicle.unlocked ? 'locked' : ''} 
                                               ${vehicle.owned ? 'owned' : ''}`}
                                    onClick={() => vehicle.unlocked && handleVehicleClick(vehicle.type)}
                                >
                                    <div className="vehicle-preview">
                                        {/* Placeholder for vehicle image/3D preview */}
                                        <div className="vehicle-image" style={{backgroundColor: getVehicleColor(vehicle.type)}}>
                                            {vehicle.type.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    
                                    <div className="vehicle-info">
                                        <h3>{vehicle.name}</h3>
                                        <div className="vehicle-stats-mini">
                                            <span>Speed: {vehicle.stats.speed}</span>
                                            <span>Armor: {vehicle.stats.armor}</span>
                                        </div>
                                        <div className="vehicle-meta">
                                            <span className="cost">${vehicle.cost.toLocaleString()}</span>
                                            <span className="level">Lv.{vehicle.unlockLevel}</span>
                                        </div>
                                    </div>

                                    <div className="vehicle-status">
                                        {!vehicle.unlocked && <span className="locked-badge">🔒</span>}
                                        {vehicle.owned && <span className="owned-badge">✓</span>}
                                        {!vehicle.owned && vehicle.unlocked && !vehicle.canAfford && 
                                            <span className="expensive-badge">💰</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Vehicle Details */}
                        {selectedData && (
                            <div className="vehicle-details">
                                <div className="vehicle-preview-large">
                                    <div 
                                        className="vehicle-image-large" 
                                        style={{backgroundColor: getVehicleColor(selectedData.type)}}
                                    >
                                        {selectedData.name}
                                    </div>
                                </div>

                                <div className="vehicle-info-detailed">
                                    <h3>{selectedData.name}</h3>
                                    <p className="vehicle-description">{selectedData.description}</p>

                                    <div className="vehicle-stats-detailed">
                                        <h4>Statistics</h4>
                                        <div className="stats-grid">
                                            <div className="stat-item">
                                                <span className="stat-label">Speed</span>
                                                <div className="stat-bar">
                                                    <div 
                                                        className="stat-fill" 
                                                        style={{width: `${selectedData.stats.speed}%`}}
                                                    ></div>
                                                </div>
                                                <span className="stat-value">{selectedData.stats.speed}</span>
                                            </div>

                                            <div className="stat-item">
                                                <span className="stat-label">Acceleration</span>
                                                <div className="stat-bar">
                                                    <div 
                                                        className="stat-fill" 
                                                        style={{width: `${selectedData.stats.acceleration}%`}}
                                                    ></div>
                                                </div>
                                                <span className="stat-value">{selectedData.stats.acceleration}</span>
                                            </div>

                                            <div className="stat-item">
                                                <span className="stat-label">Armor</span>
                                                <div className="stat-bar">
                                                    <div 
                                                        className="stat-fill" 
                                                        style={{width: `${selectedData.stats.armor}%`}}
                                                    ></div>
                                                </div>
                                                <span className="stat-value">{selectedData.stats.armor}</span>
                                            </div>

                                            <div className="stat-item">
                                                <span className="stat-label">Handling</span>
                                                <div className="stat-bar">
                                                    <div 
                                                        className="stat-fill" 
                                                        style={{width: `${selectedData.stats.handling}%`}}
                                                    ></div>
                                                </div>
                                                <span className="stat-value">{selectedData.stats.handling}</span>
                                            </div>

                                            <div className="stat-item">
                                                <span className="stat-label">Fuel Capacity</span>
                                                <div className="stat-bar">
                                                    <div 
                                                        className="stat-fill" 
                                                        style={{width: `${(selectedData.stats.fuelCapacity / 300) * 100}%`}}
                                                    ></div>
                                                </div>
                                                <span className="stat-value">{selectedData.stats.fuelCapacity}</span>
                                            </div>

                                            <div className="stat-item">
                                                <span className="stat-label">Damage</span>
                                                <div className="stat-bar">
                                                    <div 
                                                        className="stat-fill" 
                                                        style={{width: `${selectedData.stats.damage}%`}}
                                                    ></div>
                                                </div>
                                                <span className="stat-value">{selectedData.stats.damage}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="vehicle-actions">
                                        {selectedData.owned ? (
                                            <button 
                                                className="select-button"
                                                onClick={handleSelectVehicle}
                                            >
                                                Select Vehicle
                                            </button>
                                        ) : selectedData.unlocked ? (
                                            selectedData.canAfford ? (
                                                <button 
                                                    className="purchase-button"
                                                    onClick={handlePurchaseVehicle}
                                                >
                                                    Purchase - ${selectedData.cost.toLocaleString()}
                                                </button>
                                            ) : (
                                                <button className="purchase-button disabled">
                                                    Insufficient Funds
                                                </button>
                                            )
                                        ) : (
                                            <button className="purchase-button disabled">
                                                Unlock at Level {selectedData.unlockLevel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to get vehicle color (matches Vehicle.js)
function getVehicleColor(type) {
    const colorMap = {
        sedan: '#3366cc',
        suv: '#228b22',
        truck: '#8b4513',
        sports_car: '#ff4500',
        monster_truck: '#800080',
        armored_car: '#696969',
        buggy: '#ffd700',
        motorcycle: '#000000',
        tank: '#556b2f',
        hovercraft: '#00ced1',
        muscle_car: '#dc143c',
        racing_car: '#ff1493',
        pickup_truck: '#4682b4',
        van: '#708090',
        convertible: '#ff69b4'
    };
    
    return colorMap[type] || colorMap.sedan;
}