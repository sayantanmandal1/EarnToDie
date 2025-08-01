import React, { useState, useEffect } from 'react';
import './UpgradeUI.css';

/**
 * UpgradeUI provides the main interface for vehicle upgrades
 * Shows upgrade categories, costs, effects, and purchase options
 */
export const UpgradeUI = ({ upgradeManager, selectedVehicleId, onClose }) => {
    const [vehicleUpgrades, setVehicleUpgrades] = useState(null);
    const [playerCurrency, setPlayerCurrency] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('engine');
    const [upgradePreview, setUpgradePreview] = useState(null);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!upgradeManager || !selectedVehicleId) return;

        loadVehicleData();
        
        // Listen for upgrade events
        const handleUpgradeCompleted = (data) => {
            if (data.vehicleId === selectedVehicleId) {
                loadVehicleData();
                setIsUpgrading(false);
                setError(null);
            }
        };

        const handleCurrencyUpdated = (newCurrency) => {
            setPlayerCurrency(newCurrency);
        };

        upgradeManager.on('upgradeCompleted', handleUpgradeCompleted);
        upgradeManager.on('currencyUpdated', handleCurrencyUpdated);

        return () => {
            upgradeManager.off('upgradeCompleted', handleUpgradeCompleted);
            upgradeManager.off('currencyUpdated', handleCurrencyUpdated);
        };
    }, [upgradeManager, selectedVehicleId]);

    useEffect(() => {
        if (vehicleUpgrades && selectedCategory) {
            updatePreview();
        }
    }, [vehicleUpgrades, selectedCategory]);

    const loadVehicleData = async () => {
        try {
            const upgrades = upgradeManager.getVehicleUpgrades(selectedVehicleId);
            const currency = upgradeManager.getPlayerCurrency();
            
            setVehicleUpgrades(upgrades);
            setPlayerCurrency(currency);
            setError(null);
        } catch (err) {
            console.error('Failed to load vehicle data:', err);
            setError('Failed to load vehicle data');
        }
    };

    const updatePreview = () => {
        try {
            const preview = upgradeManager.getUpgradePreview(selectedVehicleId, selectedCategory);
            setUpgradePreview(preview);
        } catch (err) {
            console.error('Failed to get upgrade preview:', err);
            setUpgradePreview(null);
        }
    };

    const handleUpgrade = async (category) => {
        if (isUpgrading) return;

        setIsUpgrading(true);
        setError(null);

        try {
            await upgradeManager.purchaseUpgrade(selectedVehicleId, category);
        } catch (err) {
            console.error('Upgrade failed:', err);
            setError(err.message);
            setIsUpgrading(false);
        }
    };

    const formatCurrency = (amount) => {
        return amount.toLocaleString('en-US');
    };

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

    if (!vehicleUpgrades) {
        return (
            <div className="upgrade-ui loading">
                <div className="loading-spinner">Loading upgrades...</div>
            </div>
        );
    }

    return (
        <div className="upgrade-ui">
            <div className="upgrade-header">
                <h2>Vehicle Upgrades</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>

            <div className="vehicle-info">
                <h3>{vehicleUpgrades.vehicleName}</h3>
                <div className="currency-display">
                    <span className="currency-icon">💰</span>
                    <span className="currency-amount">{formatCurrency(playerCurrency)}</span>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="upgrade-content">
                <div className="upgrade-categories">
                    {Object.entries(vehicleUpgrades.upgrades).map(([category, upgrade]) => (
                        <UpgradeCategoryCard
                            key={category}
                            category={category}
                            upgrade={upgrade}
                            isSelected={selectedCategory === category}
                            isUpgrading={isUpgrading}
                            onSelect={() => setSelectedCategory(category)}
                            onUpgrade={() => handleUpgrade(category)}
                            formatCurrency={formatCurrency}
                        />
                    ))}
                </div>

                {upgradePreview && (
                    <div className="upgrade-preview">
                        <UpgradePreview
                            preview={upgradePreview}
                            formatStatValue={formatStatValue}
                            formatCurrency={formatCurrency}
                        />
                    </div>
                )}
            </div>

            <div className="upgrade-stats">
                <VehicleUpgradeStats
                    vehicleId={selectedVehicleId}
                    upgradeManager={upgradeManager}
                />
            </div>
        </div>
    );
};

/**
 * Individual upgrade category card component
 */
const UpgradeCategoryCard = ({ 
    category, 
    upgrade, 
    isSelected, 
    isUpgrading, 
    onSelect, 
    onUpgrade, 
    formatCurrency 
}) => {
    const { categoryInfo, currentLevel, maxLevel, isMaxLevel, cost, canAfford } = upgrade;

    return (
        <div 
            className={`upgrade-category ${isSelected ? 'selected' : ''} ${isMaxLevel ? 'maxed' : ''}`}
            onClick={onSelect}
            tabIndex={0}
        >
            <div className="category-header">
                <span className="category-icon">{categoryInfo.icon}</span>
                <span className="category-name">{categoryInfo.name}</span>
            </div>

            <div className="category-level">
                <div className="level-bar">
                    <div 
                        className="level-progress" 
                        style={{ width: `${(currentLevel / maxLevel) * 100}%` }}
                    />
                </div>
                <span className="level-text">{currentLevel}/{maxLevel}</span>
            </div>

            <div className="category-description">
                {categoryInfo.description}
            </div>

            {!isMaxLevel && (
                <div className="upgrade-action">
                    <div className="upgrade-cost">
                        💰 {formatCurrency(cost)}
                    </div>
                    <button
                        className={`upgrade-button ${canAfford ? 'affordable' : 'expensive'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpgrade();
                        }}
                        disabled={!canAfford || isUpgrading}
                    >
                        {isUpgrading ? 'Upgrading...' : 'Upgrade'}
                    </button>
                </div>
            )}

            {isMaxLevel && (
                <div className="max-level-indicator">
                    ✅ MAX LEVEL
                </div>
            )}
        </div>
    );
};

/**
 * Upgrade preview component showing stat changes
 */
const UpgradePreview = ({ preview, formatStatValue, formatCurrency }) => {
    if (!preview) return null;

    const { category, currentLevel, nextLevel, cost, statChanges } = preview;

    return (
        <div className="upgrade-preview-panel">
            <h4>Upgrade Preview</h4>
            <div className="preview-header">
                <span>Level {currentLevel} → {nextLevel}</span>
                <span className="preview-cost">Cost: 💰 {formatCurrency(cost)}</span>
            </div>

            <div className="stat-changes">
                {Object.entries(statChanges).map(([stat, change]) => (
                    <div key={stat} className="stat-change">
                        <span className="stat-name">{stat}</span>
                        <div className="stat-values">
                            <span className="current-value">
                                {formatStatValue(stat, change.current)}
                            </span>
                            <span className="arrow">→</span>
                            <span className="new-value">
                                {formatStatValue(stat, change.preview)}
                            </span>
                            <span className="change-amount positive">
                                +{change.change} ({change.percentage}%)
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Vehicle upgrade statistics component
 */
const VehicleUpgradeStats = ({ vehicleId, upgradeManager }) => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!upgradeManager || !vehicleId) return;

        const loadStats = () => {
            try {
                const upgradeStats = upgradeManager.getUpgradeStats(vehicleId);
                setStats(upgradeStats);
            } catch (err) {
                console.error('Failed to load upgrade stats:', err);
            }
        };

        loadStats();

        const handleUpgradeCompleted = (data) => {
            if (data.vehicleId === vehicleId) {
                loadStats();
            }
        };

        upgradeManager.on('upgradeCompleted', handleUpgradeCompleted);

        return () => {
            upgradeManager.off('upgradeCompleted', handleUpgradeCompleted);
        };
    }, [upgradeManager, vehicleId]);

    if (!stats) return null;

    return (
        <div className="upgrade-stats-panel">
            <h4>Upgrade Progress</h4>
            <div className="overall-progress">
                <div className="progress-bar">
                    <div 
                        className="progress-fill" 
                        style={{ width: `${stats.upgradeProgress}%` }}
                    />
                </div>
                <span className="progress-text">
                    {stats.upgradeProgress}% Complete ({stats.totalLevels}/{stats.maxPossibleLevels})
                </span>
            </div>

            <div className="category-breakdown">
                {Object.entries(stats.categoryBreakdown).map(([category, level]) => (
                    <div key={category} className="category-stat">
                        <span className="category-name">{category}</span>
                        <span className="category-level">{level}/5</span>
                    </div>
                ))}
            </div>

            {stats.isFullyUpgraded && (
                <div className="fully-upgraded">
                    🏆 Vehicle Fully Upgraded!
                </div>
            )}
        </div>
    );
};

export default UpgradeUI;