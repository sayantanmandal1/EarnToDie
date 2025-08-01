import React, { useState, useEffect } from 'react';
import { UpgradeUI } from './UpgradeUI';
import './GarageUI.css';

/**
 * GarageUI provides the main garage interface for vehicle selection and upgrades
 * Integrates vehicle selection with the upgrade system
 */
export const GarageUI = ({ upgradeManager, gameEngine, onClose, onVehicleSelect }) => {
    const [playerVehicles, setPlayerVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showUpgrades, setShowUpgrades] = useState(false);
    const [playerCurrency, setPlayerCurrency] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!upgradeManager) return;

        loadGarageData();

        // Listen for upgrade events
        const handleVehiclesLoaded = (vehicles) => {
            setPlayerVehicles(vehicles);
            setLoading(false);
        };

        const handleCurrencyUpdated = (newCurrency) => {
            setPlayerCurrency(newCurrency);
        };

        const handleUpgradeCompleted = () => {
            loadGarageData(); // Refresh data after upgrade
        };

        upgradeManager.on('vehiclesLoaded', handleVehiclesLoaded);
        upgradeManager.on('currencyUpdated', handleCurrencyUpdated);
        upgradeManager.on('upgradeCompleted', handleUpgradeCompleted);

        return () => {
            upgradeManager.off('vehiclesLoaded', handleVehiclesLoaded);
            upgradeManager.off('currencyUpdated', handleCurrencyUpdated);
            upgradeManager.off('upgradeCompleted', handleUpgradeCompleted);
        };
    }, [upgradeManager]);

    const loadGarageData = async () => {
        try {
            setLoading(true);
            setError(null);

            const vehicles = upgradeManager.getPlayerVehicles();
            const currency = upgradeManager.getPlayerCurrency();

            setPlayerVehicles(vehicles);
            setPlayerCurrency(currency);
            
            // Select first vehicle if none selected
            if (!selectedVehicle && vehicles.length > 0) {
                setSelectedVehicle(vehicles[0]);
            }
        } catch (err) {
            console.error('Failed to load garage data:', err);
            setError('Failed to load garage data');
        } finally {
            setLoading(false);
        }
    };

    const handleVehicleSelection = (vehicle) => {
        setSelectedVehicle(vehicle);
        if (onVehicleSelect) {
            onVehicleSelect(vehicle);
        }
    };

    const handleShowUpgrades = (vehicle) => {
        setSelectedVehicle(vehicle);
        setShowUpgrades(true);
    };

    const handleCloseUpgrades = () => {
        setShowUpgrades(false);
    };

    if (loading) {
        return (
            <div className="garage-ui loading">
                <div className="loading-spinner">Loading garage...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="garage-ui error">
                <div className="error-message">{error}</div>
                <button onClick={loadGarageData}>Retry</button>
            </div>
        );
    }

    return (
        <div className="garage-ui">
            <div className="garage-header">
                <h2>Vehicle Garage</h2>
                <div className="garage-currency">
                    <span className="currency-icon">💰</span>
                    <span className="currency-amount">{playerCurrency.toLocaleString()}</span>
                </div>
                <button className="close-button" onClick={onClose}>×</button>
            </div>

            <div className="garage-content">
                <div className="vehicle-grid">
                    {playerVehicles.map((vehicle) => (
                        <VehicleCard
                            key={vehicle.id}
                            vehicle={vehicle}
                            isSelected={selectedVehicle?.id === vehicle.id}
                            upgradeManager={upgradeManager}
                            onSelect={() => handleVehicleSelection(vehicle)}
                            onUpgrade={() => handleShowUpgrades(vehicle)}
                        />
                    ))}
                </div>

                {selectedVehicle && (
                    <div className="vehicle-details">
                        <VehicleDetails
                            vehicle={selectedVehicle}
                            upgradeManager={upgradeManager}
                            onUpgrade={() => handleShowUpgrades(selectedVehicle)}
                        />
                    </div>
                )}
            </div>

            {showUpgrades && selectedVehicle && (
                <UpgradeUI
                    upgradeManager={upgradeManager}
                    selectedVehicleId={selectedVehicle.id}
                    onClose={handleCloseUpgrades}
                />
            )}
        </div>
    );
};

/**
 * Individual vehicle card component
 */
const VehicleCard = ({ vehicle, isSelected, upgradeManager, onSelect, onUpgrade }) => {
    const [upgradeStats, setUpgradeStats] = useState(null);
    const [canAffordUpgrades, setCanAffordUpgrades] = useState(false);

    useEffect(() => {
        if (!upgradeManager || !vehicle) return;

        const loadVehicleStats = () => {
            try {
                const stats = upgradeManager.getUpgradeStats(vehicle.id);
                const canAfford = upgradeManager.canAffordAnyUpgrade(vehicle.id);
                
                setUpgradeStats(stats);
                setCanAffordUpgrades(canAfford);
            } catch (err) {
                console.error('Failed to load vehicle stats:', err);
            }
        };

        loadVehicleStats();

        const handleUpgradeCompleted = (data) => {
            if (data.vehicleId === vehicle.id) {
                loadVehicleStats();
            }
        };

        const handleCurrencyUpdated = () => {
            loadVehicleStats();
        };

        upgradeManager.on('upgradeCompleted', handleUpgradeCompleted);
        upgradeManager.on('currencyUpdated', handleCurrencyUpdated);

        return () => {
            upgradeManager.off('upgradeCompleted', handleUpgradeCompleted);
            upgradeManager.off('currencyUpdated', handleCurrencyUpdated);
        };
    }, [upgradeManager, vehicle]);

    const getVehicleConfig = () => {
        return upgradeManager.vehicleConfigs.get(vehicle.vehicle_type) || {};
    };

    const config = getVehicleConfig();

    return (
        <div 
            className={`vehicle-card ${isSelected ? 'selected' : ''}`}
            onClick={onSelect}
        >
            <div className="vehicle-image">
                {/* Placeholder for vehicle image */}
                <div className="vehicle-placeholder">
                    🚗
                </div>
            </div>

            <div className="vehicle-info">
                <h3 className="vehicle-name">{config.name || vehicle.vehicle_type}</h3>
                <p className="vehicle-type">{vehicle.vehicle_type}</p>
            </div>

            {upgradeStats && (
                <div className="vehicle-progress">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${upgradeStats.upgradeProgress}%` }}
                        />
                    </div>
                    <span className="progress-text">
                        {upgradeStats.upgradeProgress}% Upgraded
                    </span>
                </div>
            )}

            <div className="vehicle-actions">
                <button 
                    className="select-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect();
                    }}
                >
                    {isSelected ? 'Selected' : 'Select'}
                </button>
                <button 
                    className={`upgrade-button ${canAffordUpgrades ? 'affordable' : 'expensive'}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onUpgrade();
                    }}
                >
                    Upgrade
                </button>
            </div>

            {upgradeStats?.isFullyUpgraded && (
                <div className="fully-upgraded-badge">
                    🏆 MAX
                </div>
            )}
        </div>
    );
};

/**
 * Vehicle details panel component
 */
const VehicleDetails = ({ vehicle, upgradeManager, onUpgrade }) => {
    const [vehicleUpgrades, setVehicleUpgrades] = useState(null);

    useEffect(() => {
        if (!upgradeManager || !vehicle) return;

        const loadVehicleDetails = () => {
            try {
                const upgrades = upgradeManager.getVehicleUpgrades(vehicle.id);
                setVehicleUpgrades(upgrades);
            } catch (err) {
                console.error('Failed to load vehicle details:', err);
            }
        };

        loadVehicleDetails();

        const handleUpgradeCompleted = (data) => {
            if (data.vehicleId === vehicle.id) {
                loadVehicleDetails();
            }
        };

        upgradeManager.on('upgradeCompleted', handleUpgradeCompleted);

        return () => {
            upgradeManager.off('upgradeCompleted', handleUpgradeCompleted);
        };
    }, [upgradeManager, vehicle]);

    if (!vehicleUpgrades) {
        return <div className="vehicle-details loading">Loading details...</div>;
    }

    const formatStatValue = (stat, value) => {
        const units = {
            speed: ' km/h',
            acceleration: '%',
            armor: ' pts',
            fuelCapacity: ' L',
            damage: ' pts',
            handling: '%'
        };
        
        return `${value}${units[stat] || ''}`;
    };

    return (
        <div className="vehicle-details-panel">
            <h3>{vehicleUpgrades.vehicleName}</h3>
            
            <div className="stats-section">
                <h4>Current Stats</h4>
                <div className="stats-grid">
                    {Object.entries(vehicleUpgrades.currentStats).map(([stat, value]) => (
                        <div key={stat} className="stat-item">
                            <span className="stat-name">{stat}</span>
                            <span className="stat-value">{formatStatValue(stat, value)}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="upgrades-section">
                <h4>Upgrade Levels</h4>
                <div className="upgrades-grid">
                    {Object.entries(vehicleUpgrades.upgrades).map(([category, upgrade]) => (
                        <div key={category} className="upgrade-item">
                            <div className="upgrade-header">
                                <span className="upgrade-icon">{upgrade.categoryInfo.icon}</span>
                                <span className="upgrade-name">{upgrade.categoryInfo.name}</span>
                            </div>
                            <div className="upgrade-level">
                                <div className="level-bar">
                                    <div 
                                        className="level-progress" 
                                        style={{ width: `${(upgrade.currentLevel / upgrade.maxLevel) * 100}%` }}
                                    />
                                </div>
                                <span className="level-text">
                                    {upgrade.currentLevel}/{upgrade.maxLevel}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="details-actions">
                <button className="upgrade-all-button" onClick={onUpgrade}>
                    Open Upgrade Menu
                </button>
            </div>
        </div>
    );
};

export default GarageUI;