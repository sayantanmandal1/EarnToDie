/**
 * In-Game HUD System
 * Provides immersive HUD with vehicle information, minimap, damage indicators, and visual feedback
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './InGameHUD.css';

const InGameHUD = ({
    gameState = {},
    playerData = {},
    vehicleData = {},
    combatData = {},
    environmentData = {},
    settings = {},
    onPause = () => {},
    onSettingsChange = () => {},
    audioManager = null,
    visualEffectsManager = null
}) => {
    // HUD State Management
    const [hudVisible, setHudVisible] = useState(true);
    const [damageIndicators, setDamageIndicators] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [minimapData, setMinimapData] = useState({
        playerPosition: { x: 0, y: 0 },
        playerRotation: 0,
        zombies: [],
        objectives: [],
        items: [],
        hazards: []
    });
    const [vehicleStatus, setVehicleStatus] = useState({
        health: 100,
        fuel: 100,
        speed: 0,
        rpm: 0,
        gear: 1,
        temperature: 90,
        damage: []
    });
    const [combatStatus, setCombatStatus] = useState({
        ammo: 0,
        totalAmmo: 0,
        weaponName: 'None',
        reloading: false,
        crosshairVisible: false,
        hitMarkers: []
    });

    // Refs for performance optimization
    const hudRef = useRef(null);
    const minimapCanvasRef = useRef(null);
    const damageOverlayRef = useRef(null);
    const animationFrameRef = useRef(null);

    /**
     * Initialize HUD system
     */
    useEffect(() => {
        initializeHUD();
        return () => cleanup();
    }, []);

    /**
     * Update HUD based on game state changes
     */
    useEffect(() => {
        updateVehicleStatus();
        updateCombatStatus();
        updateMinimapData();
        updateDamageIndicators();
        updateNotifications();
    }, [gameState, playerData, vehicleData, combatData, environmentData]);

    /**
     * Initialize HUD system
     */
    const initializeHUD = () => {
        // Initialize minimap canvas
        initializeMinimap();
        
        // Setup damage overlay
        initializeDamageOverlay();
        
        // Initialize audio feedback
        if (audioManager) {
            initializeAudioFeedback();
        }

        // Start HUD update loop
        startUpdateLoop();
    };

    /**
     * Initialize minimap canvas
     */
    const initializeMinimap = () => {
        const canvas = minimapCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        // Set initial minimap properties
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    /**
     * Initialize damage overlay
     */
    const initializeDamageOverlay = () => {
        const overlay = damageOverlayRef.current;
        if (!overlay) return;

        // Setup damage overlay properties
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '1000';
    };

    /**
     * Initialize audio feedback for HUD interactions
     */
    const initializeAudioFeedback = () => {
        if (!audioManager) return;

        // Preload HUD audio assets
        const audioAssets = [
            'hud_notification.ogg',
            'hud_warning.ogg',
            'hud_damage.ogg',
            'hud_pickup.ogg',
            'hud_objective.ogg'
        ];

        audioAssets.forEach(asset => {
            audioManager.loadSound(`hud_${asset.split('.')[0]}`, `/audio/hud/${asset}`);
        });
    };

    /**
     * Start HUD update loop
     */
    const startUpdateLoop = () => {
        const updateHUD = () => {
            if (hudVisible) {
                updateMinimapCanvas();
                updateDamageOverlay();
                updateHitMarkers();
            }
            animationFrameRef.current = requestAnimationFrame(updateHUD);
        };
        updateHUD();
    };

    /**
     * Update vehicle status from game data
     */
    const updateVehicleStatus = () => {
        if (!vehicleData) return;

        setVehicleStatus(prev => ({
            ...prev,
            health: vehicleData.health || prev.health,
            fuel: vehicleData.fuel || prev.fuel,
            speed: vehicleData.speed || 0,
            rpm: vehicleData.rpm || 0,
            gear: vehicleData.gear || 1,
            temperature: vehicleData.temperature || prev.temperature,
            damage: vehicleData.damagePoints || prev.damage
        }));
    };

    /**
     * Update combat status from game data
     */
    const updateCombatStatus = () => {
        if (!combatData) return;

        setCombatStatus(prev => ({
            ...prev,
            ammo: combatData.currentAmmo || 0,
            totalAmmo: combatData.totalAmmo || 0,
            weaponName: combatData.weaponName || 'None',
            reloading: combatData.reloading || false,
            crosshairVisible: combatData.inCombat || false
        }));
    };

    /**
     * Update minimap data from game state
     */
    const updateMinimapData = () => {
        if (!gameState) return;

        setMinimapData(prev => ({
            ...prev,
            playerPosition: gameState.playerPosition || prev.playerPosition,
            playerRotation: gameState.playerRotation || prev.playerRotation,
            zombies: gameState.nearbyZombies || [],
            objectives: gameState.objectives || [],
            items: gameState.nearbyItems || [],
            hazards: gameState.environmentalHazards || []
        }));
    };

    /**
     * Update damage indicators
     */
    const updateDamageIndicators = () => {
        if (playerData.recentDamage && playerData.recentDamage > 0) {
            const newIndicator = {
                id: Date.now(),
                damage: playerData.recentDamage,
                direction: playerData.damageDirection || 0,
                timestamp: Date.now(),
                opacity: 1.0
            };

            setDamageIndicators(prev => [...prev, newIndicator]);

            // Play damage sound
            if (audioManager) {
                audioManager.playSound('hud_damage', { volume: 0.6 });
            }

            // Remove indicator after animation
            setTimeout(() => {
                setDamageIndicators(prev => prev.filter(indicator => indicator.id !== newIndicator.id));
            }, 2000);
        }
    };

    /**
     * Update notifications
     */
    const updateNotifications = () => {
        if (gameState.newNotifications) {
            gameState.newNotifications.forEach(notification => {
                addNotification(notification);
            });
        }
    };

    /**
     * Add notification to HUD
     */
    const addNotification = (notification) => {
        const newNotification = {
            id: Date.now() + Math.random(),
            ...notification,
            timestamp: Date.now()
        };

        setNotifications(prev => [...prev, newNotification]);

        // Play notification sound
        if (audioManager) {
            const soundType = notification.type === 'warning' ? 'hud_warning' : 'hud_notification';
            audioManager.playSound(soundType, { volume: 0.4 });
        }

        // Auto-remove notification
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, notification.duration || 5000);
    };

    /**
     * Update minimap canvas
     */
    const updateMinimapCanvas = () => {
        const canvas = minimapCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const scale = 0.1; // Adjust based on game world scale

        // Clear canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Draw player
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(minimapData.playerRotation);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-3, -5, 6, 10);
        ctx.restore();

        // Draw zombies
        ctx.fillStyle = '#ff0000';
        minimapData.zombies.forEach(zombie => {
            const x = centerX + (zombie.x - minimapData.playerPosition.x) * scale;
            const y = centerY + (zombie.y - minimapData.playerPosition.y) * scale;
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                ctx.fillRect(x - 2, y - 2, 4, 4);
            }
        });

        // Draw objectives
        ctx.fillStyle = '#ffff00';
        minimapData.objectives.forEach(objective => {
            const x = centerX + (objective.x - minimapData.playerPosition.x) * scale;
            const y = centerY + (objective.y - minimapData.playerPosition.y) * scale;
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                ctx.fillRect(x - 3, y - 3, 6, 6);
            }
        });

        // Draw items
        ctx.fillStyle = '#00ffff';
        minimapData.items.forEach(item => {
            const x = centerX + (item.x - minimapData.playerPosition.x) * scale;
            const y = centerY + (item.y - minimapData.playerPosition.y) * scale;
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                ctx.fillRect(x - 1, y - 1, 2, 2);
            }
        });

        // Draw hazards
        ctx.fillStyle = '#ff8800';
        minimapData.hazards.forEach(hazard => {
            const x = centerX + (hazard.x - minimapData.playerPosition.x) * scale;
            const y = centerY + (hazard.y - minimapData.playerPosition.y) * scale;
            if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
                ctx.fillRect(x - 2, y - 2, 4, 4);
            }
        });
    };

    /**
     * Update damage overlay
     */
    const updateDamageOverlay = () => {
        const overlay = damageOverlayRef.current;
        if (!overlay) return;

        // Calculate damage overlay opacity based on health
        const healthPercentage = (playerData.health || 100) / 100;
        const damageOpacity = Math.max(0, (1 - healthPercentage) * 0.5);
        
        overlay.style.background = `radial-gradient(circle, transparent 30%, rgba(255, 0, 0, ${damageOpacity}) 100%)`;
    };

    /**
     * Update hit markers
     */
    const updateHitMarkers = () => {
        if (combatData.newHits) {
            combatData.newHits.forEach(hit => {
                const marker = {
                    id: Date.now() + Math.random(),
                    x: hit.screenX || window.innerWidth / 2,
                    y: hit.screenY || window.innerHeight / 2,
                    damage: hit.damage,
                    timestamp: Date.now()
                };

                setCombatStatus(prev => ({
                    ...prev,
                    hitMarkers: [...prev.hitMarkers, marker]
                }));

                // Remove hit marker after animation
                setTimeout(() => {
                    setCombatStatus(prev => ({
                        ...prev,
                        hitMarkers: prev.hitMarkers.filter(m => m.id !== marker.id)
                    }));
                }, 1000);
            });
        }
    };

    /**
     * Handle pause button click
     */
    const handlePause = () => {
        onPause();
        if (audioManager) {
            audioManager.playSound('hud_notification', { volume: 0.3 });
        }
    };

    /**
     * Toggle HUD visibility
     */
    const toggleHUDVisibility = () => {
        setHudVisible(prev => !prev);
    };

    /**
     * Cleanup function
     */
    const cleanup = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };

    if (!hudVisible) {
        return (
            <div className="hud-toggle-button" onClick={toggleHUDVisibility}>
                Show HUD
            </div>
        );
    }

    return (
        <div className="in-game-hud" ref={hudRef}>
            {/* Damage Overlay */}
            <div className="damage-overlay" ref={damageOverlayRef} />

            {/* Top HUD Bar */}
            <div className="hud-top-bar">
                <div className="health-display">
                    <div className="health-icon">❤️</div>
                    <div className="health-bar">
                        <div 
                            className="health-fill"
                            style={{ width: `${(playerData.health || 100)}%` }}
                        />
                    </div>
                    <div className="health-text">{Math.round(playerData.health || 100)}</div>
                </div>

                <div className="objective-display">
                    {gameState.currentObjective && (
                        <div className="current-objective">
                            <div className="objective-icon">{gameState.currentObjective.icon || '🎯'}</div>
                            <div className="objective-text">{gameState.currentObjective.name}</div>
                            <div className="objective-progress">
                                <div 
                                    className="objective-progress-fill"
                                    style={{ width: `${(gameState.currentObjective.progress || 0) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="pause-button" onClick={handlePause}>
                    ⏸️
                </div>
            </div>

            {/* Vehicle Status Panel */}
            <div className="vehicle-status-panel">
                <div className="speedometer">
                    <div className="speed-value">{Math.round(vehicleStatus.speed)}</div>
                    <div className="speed-unit">km/h</div>
                </div>
                
                <div className="vehicle-gauges">
                    <div className="gauge fuel-gauge">
                        <div className="gauge-label">Fuel</div>
                        <div className="gauge-bar">
                            <div 
                                className="gauge-fill fuel-fill"
                                style={{ width: `${vehicleStatus.fuel}%` }}
                            />
                        </div>
                        <div className="gauge-value">{Math.round(vehicleStatus.fuel)}%</div>
                    </div>

                    <div className="gauge health-gauge">
                        <div className="gauge-label">Vehicle</div>
                        <div className="gauge-bar">
                            <div 
                                className="gauge-fill health-fill"
                                style={{ width: `${vehicleStatus.health}%` }}
                            />
                        </div>
                        <div className="gauge-value">{Math.round(vehicleStatus.health)}%</div>
                    </div>

                    <div className="gear-display">
                        <div className="gear-label">Gear</div>
                        <div className="gear-value">{vehicleStatus.gear}</div>
                    </div>
                </div>
            </div>

            {/* Minimap */}
            <div className="minimap-container">
                <div className="minimap-header">
                    <span className="minimap-title">Map</span>
                    <div className="minimap-legend">
                        <div className="legend-item">
                            <div className="legend-color player-color"></div>
                            <span>You</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color zombie-color"></div>
                            <span>Zombies</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color objective-color"></div>
                            <span>Objectives</span>
                        </div>
                    </div>
                </div>
                <canvas 
                    ref={minimapCanvasRef}
                    className="minimap-canvas"
                />
            </div>

            {/* Combat HUD */}
            {combatStatus.crosshairVisible && (
                <div className="combat-hud">
                    <div className="crosshair">
                        <div className="crosshair-horizontal"></div>
                        <div className="crosshair-vertical"></div>
                    </div>

                    <div className="weapon-info">
                        <div className="weapon-name">{combatStatus.weaponName}</div>
                        <div className="ammo-display">
                            <span className="current-ammo">{combatStatus.ammo}</span>
                            <span className="ammo-separator">/</span>
                            <span className="total-ammo">{combatStatus.totalAmmo}</span>
                        </div>
                        {combatStatus.reloading && (
                            <div className="reload-indicator">Reloading...</div>
                        )}
                    </div>
                </div>
            )}

            {/* Hit Markers */}
            {combatStatus.hitMarkers.map(marker => (
                <div
                    key={marker.id}
                    className="hit-marker"
                    style={{
                        left: marker.x,
                        top: marker.y,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <div className="hit-marker-cross">✕</div>
                    <div className="hit-marker-damage">-{marker.damage}</div>
                </div>
            ))}

            {/* Damage Indicators */}
            {damageIndicators.map(indicator => (
                <div
                    key={indicator.id}
                    className="damage-indicator"
                    style={{
                        transform: `rotate(${indicator.direction}deg)`,
                        opacity: Math.max(0, 1 - (Date.now() - indicator.timestamp) / 2000)
                    }}
                >
                    <div className="damage-arrow">↑</div>
                    <div className="damage-amount">-{indicator.damage}</div>
                </div>
            ))}

            {/* Notifications */}
            <div className="notifications-container">
                {notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`notification ${notification.type || 'info'}`}
                    >
                        <div className="notification-icon">
                            {notification.icon || (notification.type === 'warning' ? '⚠️' : 'ℹ️')}
                        </div>
                        <div className="notification-content">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* HUD Toggle Button */}
            <div className="hud-controls">
                <button className="hud-toggle" onClick={toggleHUDVisibility}>
                    Hide HUD
                </button>
            </div>
        </div>
    );
};

export default InGameHUD;