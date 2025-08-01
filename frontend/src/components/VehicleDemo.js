import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { VehicleManager } from '../vehicles/VehicleManager';
import { VEHICLE_TYPES } from '../vehicles/VehicleConfig';
import { VehicleSelection } from './VehicleSelection';
import { VehicleUpgrade } from './VehicleUpgrade';

/**
 * Demo component showing the vehicle system in action
 */
export const VehicleDemo = () => {
    const canvasRef = useRef(null);
    const gameEngineRef = useRef(null);
    const vehicleManagerRef = useRef(null);
    const animationFrameRef = useRef(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [showVehicleSelection, setShowVehicleSelection] = useState(false);
    const [showVehicleUpgrade, setShowVehicleUpgrade] = useState(false);
    const [currentVehicle, setCurrentVehicle] = useState(null);
    const [playerStats, setPlayerStats] = useState({
        level: 5,
        currency: 15000,
        ownedVehicles: ['sedan', 'suv']
    });

    // Initialize game engine and vehicle system
    useEffect(() => {
        const initializeDemo = async () => {
            try {
                if (!canvasRef.current) return;

                // Initialize game engine
                const gameEngine = new GameEngine(canvasRef.current);
                await gameEngine.initialize();
                gameEngineRef.current = gameEngine;

                // Initialize vehicle manager
                const vehicleManager = new VehicleManager(gameEngine);
                vehicleManager.initialize();
                vehicleManagerRef.current = vehicleManager;

                // Spawn a default vehicle
                const vehicle = await vehicleManager.spawnPlayerVehicle(
                    VEHICLE_TYPES.SEDAN,
                    { x: 0, y: 2, z: 0 }
                );
                setCurrentVehicle(vehicle);

                // Add some ground
                addGround(gameEngine);

                // Start the demo
                gameEngine.start();
                setIsInitialized(true);

                console.log('Vehicle demo initialized successfully');
            } catch (error) {
                console.error('Failed to initialize vehicle demo:', error);
            }
        };

        initializeDemo();

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (gameEngineRef.current) {
                gameEngineRef.current.dispose();
            }
            if (vehicleManagerRef.current) {
                vehicleManagerRef.current.dispose();
            }
        };
    }, []);

    // Handle keyboard input for vehicle controls
    useEffect(() => {
        if (!isInitialized || !vehicleManagerRef.current) return;

        const handleKeyDown = (event) => {
            const controls = {};
            
            switch (event.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    controls.forward = 1.0;
                    break;
                case 's':
                case 'arrowdown':
                    controls.backward = 1.0;
                    break;
                case 'a':
                case 'arrowleft':
                    controls.left = 1.0;
                    break;
                case 'd':
                case 'arrowright':
                    controls.right = 1.0;
                    break;
                case ' ':
                    controls.brake = 1.0;
                    event.preventDefault();
                    break;
            }

            if (Object.keys(controls).length > 0) {
                vehicleManagerRef.current.applyControls(controls);
            }
        };

        const handleKeyUp = (event) => {
            const controls = {};
            
            switch (event.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    controls.forward = 0;
                    break;
                case 's':
                case 'arrowdown':
                    controls.backward = 0;
                    break;
                case 'a':
                case 'arrowleft':
                    controls.left = 0;
                    break;
                case 'd':
                case 'arrowright':
                    controls.right = 0;
                    break;
                case ' ':
                    controls.brake = 0;
                    break;
            }

            if (Object.keys(controls).length > 0) {
                vehicleManagerRef.current.applyControls(controls);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isInitialized]);

    const addGround = (gameEngine) => {
        // Add a simple ground plane for the vehicle to drive on
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.receiveShadow = true;

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

        gameEngine.addObject(groundMesh, groundBody);
    };

    const handleVehicleSelect = async (vehicleType) => {
        if (!vehicleManagerRef.current) return;

        try {
            const vehicle = await vehicleManagerRef.current.spawnPlayerVehicle(
                vehicleType,
                { x: 0, y: 2, z: 0 }
            );
            setCurrentVehicle(vehicle);
            setShowVehicleSelection(false);
        } catch (error) {
            console.error('Failed to select vehicle:', error);
        }
    };

    const handleVehiclePurchase = (vehicleType) => {
        // Simulate vehicle purchase
        const config = getVehicleConfig(vehicleType);
        if (playerStats.currency >= config.cost) {
            setPlayerStats(prev => ({
                ...prev,
                currency: prev.currency - config.cost,
                ownedVehicles: [...prev.ownedVehicles, vehicleType]
            }));
            console.log(`Purchased ${vehicleType} for $${config.cost}`);
        }
    };

    const handleVehicleUpgrade = (upgrades, cost) => {
        if (!currentVehicle || playerStats.currency < cost) return;

        // Apply upgrades to current vehicle
        Object.entries(upgrades).forEach(([category, level]) => {
            vehicleManagerRef.current.upgradeVehicle(currentVehicle.id, category, level);
        });

        // Deduct cost
        setPlayerStats(prev => ({
            ...prev,
            currency: prev.currency - cost
        }));

        setShowVehicleUpgrade(false);
        console.log('Vehicle upgraded successfully');
    };

    const spawnAIVehicles = async () => {
        if (!vehicleManagerRef.current) return;

        try {
            await vehicleManagerRef.current.spawnAIVehicles(3);
            console.log('AI vehicles spawned');
        } catch (error) {
            console.error('Failed to spawn AI vehicles:', error);
        }
    };

    const clearAllVehicles = () => {
        if (!vehicleManagerRef.current) return;
        
        vehicleManagerRef.current.clearAllVehicles();
        setCurrentVehicle(null);
        console.log('All vehicles cleared');
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    background: '#87CEEB'
                }}
            />

            {/* Control Panel */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '20px',
                borderRadius: '10px',
                minWidth: '250px'
            }}>
                <h3>Vehicle Demo Controls</h3>
                
                <div style={{ marginBottom: '15px' }}>
                    <strong>Movement:</strong><br />
                    WASD or Arrow Keys<br />
                    Space = Brake
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <strong>Player Stats:</strong><br />
                    Level: {playerStats.level}<br />
                    Currency: ${playerStats.currency.toLocaleString()}<br />
                    Owned Vehicles: {playerStats.ownedVehicles.length}
                </div>

                {currentVehicle && (
                    <div style={{ marginBottom: '15px' }}>
                        <strong>Current Vehicle:</strong><br />
                        Type: {currentVehicle.type}<br />
                        Health: {Math.round(currentVehicle.health)}%<br />
                        Fuel: {Math.round(currentVehicle.fuel)}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={() => setShowVehicleSelection(true)}
                        style={{
                            padding: '10px',
                            background: '#ff6b35',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Select Vehicle
                    </button>

                    {currentVehicle && (
                        <button
                            onClick={() => setShowVehicleUpgrade(true)}
                            style={{
                                padding: '10px',
                                background: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '5px',
                                cursor: 'pointer'
                            }}
                        >
                            Upgrade Vehicle
                        </button>
                    )}

                    <button
                        onClick={spawnAIVehicles}
                        style={{
                            padding: '10px',
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Spawn AI Vehicles
                    </button>

                    <button
                        onClick={clearAllVehicles}
                        style={{
                            padding: '10px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear All Vehicles
                    </button>
                </div>
            </div>

            {/* Vehicle Selection Modal */}
            {showVehicleSelection && (
                <VehicleSelection
                    playerLevel={playerStats.level}
                    playerCurrency={playerStats.currency}
                    ownedVehicles={playerStats.ownedVehicles}
                    onVehicleSelect={handleVehicleSelect}
                    onVehiclePurchase={handleVehiclePurchase}
                    onClose={() => setShowVehicleSelection(false)}
                />
            )}

            {/* Vehicle Upgrade Modal */}
            {showVehicleUpgrade && currentVehicle && (
                <VehicleUpgrade
                    vehicle={{
                        ...currentVehicle,
                        name: currentVehicle.type.charAt(0).toUpperCase() + currentVehicle.type.slice(1)
                    }}
                    playerCurrency={playerStats.currency}
                    onUpgrade={handleVehicleUpgrade}
                    onClose={() => setShowVehicleUpgrade(false)}
                />
            )}

            {/* Loading indicator */}
            {!isInitialized && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    fontSize: '18px'
                }}>
                    Initializing Vehicle Demo...
                </div>
            )}
        </div>
    );
};