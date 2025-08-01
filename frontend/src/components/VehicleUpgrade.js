import React, { useState } from 'react';
import { calculateUpgradedStats } from '../vehicles/VehicleConfig';
import './VehicleUpgrade.css';

/**
 * Vehicle Upgrade Component for customizing vehicle performance
 */
export const VehicleUpgrade = ({ 
    vehicle, 
    playerCurrency = 0, 
    onUpgrade, 
    onClose 
}) => {
    const [selectedCategory, setSelectedCategory] = useState('engine');
    const [previewUpgrades, setPreviewUpgrades] = useState({ ...vehicle.upgrades });

    const upgradeCategories = {
        engine: {
            name: 'Engine',
            description: 'Increases speed and acceleration',
            icon: '⚙️',
            maxLevel: 10,
            baseCost: 500,
            effects: ['Speed +10%', 'Acceleration +15%']
        },
        armor: {
            name: 'Armor',
            description: 'Increases damage resistance',
            icon: '🛡️',
            maxLevel: 10,
            baseCost: 400,
            effects: ['Armor +10 points']
        },
        weapons: {
            name: 'Weapons',
            description: 'Increases damage output',
            icon: '⚔️',
            maxLevel: 10,
            baseCost: 600,
            effects: ['Damage +20%']
        },
        fuel: {
            name: 'Fuel System',
            description: 'Increases fuel capacity and efficiency',
            icon: '⛽',
            maxLevel: 10,
            baseCost: 300,
            effects: ['Fuel Capacity +20%', 'Efficiency +10%']
        },
        tires: {
            name: 'Tires',
            description: 'Improves handling and braking',
            icon: '🛞',
            maxLevel: 10,
            baseCost: 350,
            effects: ['Handling +10%', 'Braking +10%']
        }
    };

    const calculateUpgradeCost = (category, currentLevel) => {
        const baseConfig = upgradeCategories[category];
        return Math.floor(baseConfig.baseCost * Math.pow(1.5, currentLevel));
    };

    const getTotalUpgradeCost = () => {
        let total = 0;
        Object.entries(previewUpgrades).forEach(([category, level]) => {
            const currentLevel = vehicle.upgrades[category] || 0;
            for (let i = currentLevel; i < level; i++) {
                total += calculateUpgradeCost(category, i);
            }
        });
        return total;
    };

    const canAffordUpgrades = () => {
        return getTotalUpgradeCost() <= playerCurrency;
    };

    const handleUpgradePreview = (category, newLevel) => {
        setPreviewUpgrades({
            ...previewUpgrades,
            [category]: Math.max(0, Math.min(upgradeCategories[category].maxLevel, newLevel))
        });
    };

    const handleApplyUpgrades = () => {
        if (canAffordUpgrades() && onUpgrade) {
            onUpgrade(previewUpgrades, getTotalUpgradeCost());
        }
    };

    const resetPreview = () => {
        setPreviewUpgrades({ ...vehicle.upgrades });
    };

    const getStatComparison = () => {
        const currentStats = calculateUpgradedStats(vehicle.stats, vehicle.upgrades);
        const previewStats = calculateUpgradedStats(vehicle.stats, previewUpgrades);
        
        return {
            current: currentStats,
            preview: previewStats
        };
    };

    const stats = getStatComparison();
    const totalCost = getTotalUpgradeCost();
    const hasChanges = JSON.stringify(previewUpgrades) !== JSON.stringify(vehicle.upgrades);

    return (
        <div className="vehicle-upgrade-overlay">
            <div className="vehicle-upgrade-container">
                <div className="vehicle-upgrade-header">
                    <h2>Upgrade {vehicle.name}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="vehicle-upgrade-content">
                    {/* Vehicle Preview */}
                    <div className="vehicle-preview-section">
                        <div className="vehicle-preview-large">
                            <div 
                                className="vehicle-image-large" 
                                style={{backgroundColor: getVehicleColor(vehicle.type)}}
                            >
                                {vehicle.name}
                            </div>
                        </div>

                        <div className="upgrade-summary">
                            <h3>Upgrade Summary</h3>
                            <div className="cost-display">
                                <span className="total-cost">
                                    Total Cost: ${totalCost.toLocaleString()}
                                </span>
                                <span className={`currency ${canAffordUpgrades() ? 'sufficient' : 'insufficient'}`}>
                                    Available: ${playerCurrency.toLocaleString()}
                                </span>
                            </div>
                            
                            {hasChanges && (
                                <div className="upgrade-actions">
                                    <button 
                                        className="apply-button"
                                        onClick={handleApplyUpgrades}
                                        disabled={!canAffordUpgrades()}
                                    >
                                        Apply Upgrades
                                    </button>
                                    <button 
                                        className="reset-button"
                                        onClick={resetPreview}
                                    >
                                        Reset
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upgrade Categories */}
                    <div className="upgrade-categories">
                        <div className="category-tabs">
                            {Object.entries(upgradeCategories).map(([key, category]) => (
                                <button
                                    key={key}
                                    className={`category-tab ${selectedCategory === key ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(key)}
                                >
                                    <span className="category-icon">{category.icon}</span>
                                    <span className="category-name">{category.name}</span>
                                    <span className="category-level">
                                        {previewUpgrades[key] || 0}/{category.maxLevel}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="category-content">
                            {selectedCategory && (
                                <div className="upgrade-category-detail">
                                    <div className="category-header">
                                        <h3>
                                            {upgradeCategories[selectedCategory].icon} {upgradeCategories[selectedCategory].name}
                                        </h3>
                                        <p>{upgradeCategories[selectedCategory].description}</p>
                                    </div>

                                    <div className="upgrade-effects">
                                        <h4>Effects per level:</h4>
                                        <ul>
                                            {upgradeCategories[selectedCategory].effects.map((effect, index) => (
                                                <li key={index}>{effect}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="upgrade-controls">
                                        <div className="level-control">
                                            <button
                                                className="level-button"
                                                onClick={() => handleUpgradePreview(selectedCategory, (previewUpgrades[selectedCategory] || 0) - 1)}
                                                disabled={(previewUpgrades[selectedCategory] || 0) <= 0}
                                            >
                                                -
                                            </button>
                                            
                                            <div className="level-display">
                                                <span className="current-level">
                                                    Level {previewUpgrades[selectedCategory] || 0}
                                                </span>
                                                <div className="level-bar">
                                                    <div 
                                                        className="level-fill"
                                                        style={{
                                                            width: `${((previewUpgrades[selectedCategory] || 0) / upgradeCategories[selectedCategory].maxLevel) * 100}%`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                            
                                            <button
                                                className="level-button"
                                                onClick={() => handleUpgradePreview(selectedCategory, (previewUpgrades[selectedCategory] || 0) + 1)}
                                                disabled={(previewUpgrades[selectedCategory] || 0) >= upgradeCategories[selectedCategory].maxLevel}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="upgrade-cost">
                                            Next Level Cost: ${calculateUpgradeCost(selectedCategory, previewUpgrades[selectedCategory] || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Comparison */}
                    <div className="stats-comparison">
                        <h3>Performance Comparison</h3>
                        <div className="stats-grid">
                            {Object.entries(stats.current).map(([statName, currentValue]) => {
                                const previewValue = stats.preview[statName];
                                const difference = previewValue - currentValue;
                                const isImproved = difference > 0;
                                
                                return (
                                    <div key={statName} className="stat-comparison-item">
                                        <span className="stat-name">{statName}</span>
                                        <div className="stat-values">
                                            <span className="current-value">{Math.round(currentValue)}</span>
                                            {isImproved && (
                                                <>
                                                    <span className="arrow">→</span>
                                                    <span className="preview-value improved">
                                                        {Math.round(previewValue)} (+{Math.round(difference)})
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to get vehicle color (matches other components)
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