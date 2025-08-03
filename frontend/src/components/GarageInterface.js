/**
 * Garage Interface Component
 * Provides 3D vehicle viewer, upgrade system, and vehicle management
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import './GarageInterface.css';

const GarageInterface = ({
    playerData = {},
    vehicleData = {},
    upgradeData = {},
    currency = 0,
    onUpgradePurchase = () => {},
    onVehicleSelect = () => {},
    onBack = () => {},
    audioManager = null,
    settings = {}
}) => {
    // Component state
    const [selectedVehicle, setSelectedVehicle] = useState(vehicleData.currentVehicle || 'sedan');
    const [selectedCategory, setSelectedCategory] = useState('engine');
    const [selectedUpgrade, setSelectedUpgrade] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingPurchase, setPendingPurchase] = useState(null);
    const [vehicleRotation, setVehicleRotation] = useState({ x: 0, y: 0 });
    const [cameraDistance, setCameraDistance] = useState(5);
    const [isRotating, setIsRotating] = useState(false);
    const [compareMode, setCompareMode] = useState(false);
    const [comparisonData, setComparisonData] = useState(null);

    // Three.js refs
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const vehicleModelRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Mouse interaction refs
    const mouseRef = useRef({ x: 0, y: 0, isDown: false });
    const lastMouseRef = useRef({ x: 0, y: 0 });

    // Available vehicles
    const availableVehicles = [
        {
            id: 'sedan',
            name: 'Sedan',
            type: 'Balanced',
            baseStats: { speed: 80, armor: 60, handling: 70, fuel: 90 },
            price: 0,
            owned: true
        },
        {
            id: 'suv',
            name: 'SUV',
            type: 'Heavy',
            baseStats: { speed: 60, armor: 90, handling: 50, fuel: 70 },
            price: 15000,
            owned: playerData.ownedVehicles?.includes('suv') || false
        },
        {
            id: 'sports',
            name: 'Sports Car',
            type: 'Speed',
            baseStats: { speed: 100, armor: 40, handling: 95, fuel: 60 },
            price: 25000,
            owned: playerData.ownedVehicles?.includes('sports') || false
        },
        {
            id: 'truck',
            name: 'Pickup Truck',
            type: 'Utility',
            baseStats: { speed: 70, armor: 80, handling: 60, fuel: 80 },
            price: 20000,
            owned: playerData.ownedVehicles?.includes('truck') || false
        }
    ];

    // Upgrade categories
    const upgradeCategories = [
        {
            id: 'engine',
            name: 'Engine',
            icon: '🔧',
            description: 'Improve speed and acceleration'
        },
        {
            id: 'armor',
            name: 'Armor',
            icon: '🛡️',
            description: 'Increase vehicle durability'
        },
        {
            id: 'handling',
            name: 'Handling',
            icon: '🎯',
            description: 'Better steering and control'
        },
        {
            id: 'fuel',
            name: 'Fuel System',
            icon: '⛽',
            description: 'Improve fuel efficiency'
        },
        {
            id: 'weapons',
            name: 'Weapons',
            icon: '🔫',
            description: 'Combat modifications'
        },
        {
            id: 'visual',
            name: 'Visual',
            icon: '🎨',
            description: 'Cosmetic upgrades'
        }
    ];

    /**
     * Initialize garage interface
     */
    useEffect(() => {
        initializeGarage();
        return () => cleanup();
    }, []);

    /**
     * Update vehicle model when selection changes
     */
    useEffect(() => {
        if (sceneRef.current && selectedVehicle) {
            loadVehicleModel(selectedVehicle);
        }
    }, [selectedVehicle]);

    /**
     * Initialize garage components
     */
    const initializeGarage = () => {
        initializeThreeJS();
        loadVehicleModel(selectedVehicle);
        
        if (audioManager) {
            initializeAudio();
        }
    };

    /**
     * Initialize Three.js scene
     */
    const initializeThreeJS = () => {
        if (!mountRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            75,
            mountRef.current.clientWidth / mountRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 2, 5);
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        rendererRef.current = renderer;

        mountRef.current.appendChild(renderer.domElement);

        // Lighting setup
        setupLighting(scene);

        // Environment setup
        setupEnvironment(scene);

        // Start render loop
        startRenderLoop();

        // Setup mouse controls
        setupMouseControls();

        // Handle window resize
        window.addEventListener('resize', handleResize);
    };

    /**
     * Setup lighting for the scene
     */
    const setupLighting = (scene) => {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        scene.add(ambientLight);

        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        scene.add(directionalLight);

        // Fill lights
        const fillLight1 = new THREE.DirectionalLight(0x4080ff, 0.3);
        fillLight1.position.set(-5, 5, -5);
        scene.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0xff8040, 0.2);
        fillLight2.position.set(5, 2, -5);
        scene.add(fillLight2);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0x80ff80, 0.4);
        rimLight.position.set(0, 5, -10);
        scene.add(rimLight);
    };

    /**
     * Setup environment elements
     */
    const setupEnvironment = (scene) => {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        gridHelper.position.y = -0.99;
        scene.add(gridHelper);
    };

    /**
     * Load vehicle model
     */
    const loadVehicleModel = (vehicleId) => {
        if (!sceneRef.current) return;

        // Remove existing vehicle model
        if (vehicleModelRef.current) {
            sceneRef.current.remove(vehicleModelRef.current);
        }

        // Create placeholder vehicle model (in a real implementation, this would load actual 3D models)
        const vehicleGroup = new THREE.Group();
        
        // Vehicle body
        const bodyGeometry = new THREE.BoxGeometry(4, 1.5, 2);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: getVehicleColor(vehicleId),
            shininess: 100
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        vehicleGroup.add(body);

        // Vehicle roof
        const roofGeometry = new THREE.BoxGeometry(3, 1, 1.8);
        const roofMaterial = new THREE.MeshPhongMaterial({ 
            color: getVehicleColor(vehicleId),
            shininess: 100
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.set(0, 1.75, 0);
        roof.castShadow = true;
        vehicleGroup.add(roof);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        
        const wheelPositions = [
            [-1.5, 0, 0.8],
            [1.5, 0, 0.8],
            [-1.5, 0, -0.8],
            [1.5, 0, -0.8]
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            vehicleGroup.add(wheel);
        });

        // Windows
        const windowMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.3
        });
        
        const frontWindowGeometry = new THREE.PlaneGeometry(2.8, 0.8);
        const frontWindow = new THREE.Mesh(frontWindowGeometry, windowMaterial);
        frontWindow.position.set(0, 1.75, 0.9);
        vehicleGroup.add(frontWindow);

        const backWindowGeometry = new THREE.PlaneGeometry(2.8, 0.8);
        const backWindow = new THREE.Mesh(backWindowGeometry, windowMaterial);
        backWindow.position.set(0, 1.75, -0.9);
        backWindow.rotation.y = Math.PI;
        vehicleGroup.add(backWindow);

        // Add upgrade visual indicators
        addUpgradeVisuals(vehicleGroup, vehicleId);

        vehicleModelRef.current = vehicleGroup;
        sceneRef.current.add(vehicleGroup);

        // Play vehicle selection sound
        if (audioManager) {
            audioManager.playSound('garage_vehicle_select', { volume: 0.4 });
        }
    };

    /**
     * Get vehicle color based on type
     */
    const getVehicleColor = (vehicleId) => {
        const colors = {
            sedan: 0x4169e1,    // Royal Blue
            suv: 0x228b22,      // Forest Green
            sports: 0xff4500,   // Orange Red
            truck: 0x8b4513     // Saddle Brown
        };
        return colors[vehicleId] || 0x4169e1;
    };

    /**
     * Add visual indicators for upgrades
     */
    const addUpgradeVisuals = (vehicleGroup, vehicleId) => {
        const currentUpgrades = upgradeData[vehicleId] || {};
        
        // Engine upgrade visual (exhaust pipes)
        if (currentUpgrades.engine && currentUpgrades.engine.level > 0) {
            const exhaustGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
            const exhaustMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
            
            const exhaust1 = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
            exhaust1.position.set(-0.3, 0.2, -2.2);
            exhaust1.rotation.x = Math.PI / 2;
            vehicleGroup.add(exhaust1);
            
            const exhaust2 = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
            exhaust2.position.set(0.3, 0.2, -2.2);
            exhaust2.rotation.x = Math.PI / 2;
            vehicleGroup.add(exhaust2);
        }

        // Armor upgrade visual (additional plating)
        if (currentUpgrades.armor && currentUpgrades.armor.level > 0) {
            const armorGeometry = new THREE.BoxGeometry(4.2, 1.7, 2.2);
            const armorMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x666666,
                transparent: true,
                opacity: 0.3
            });
            const armor = new THREE.Mesh(armorGeometry, armorMaterial);
            armor.position.y = 0.75;
            vehicleGroup.add(armor);
        }

        // Weapon upgrade visual (roof-mounted weapon)
        if (currentUpgrades.weapons && currentUpgrades.weapons.level > 0) {
            const weaponGeometry = new THREE.BoxGeometry(0.3, 0.3, 1);
            const weaponMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
            weapon.position.set(0, 2.5, 0.5);
            vehicleGroup.add(weapon);
        }
    };

    /**
     * Setup mouse controls for 3D viewer
     */
    const setupMouseControls = () => {
        if (!rendererRef.current) return;

        const canvas = rendererRef.current.domElement;

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    };

    /**
     * Handle mouse down
     */
    const handleMouseDown = (event) => {
        mouseRef.current.isDown = true;
        mouseRef.current.x = event.clientX;
        mouseRef.current.y = event.clientY;
        lastMouseRef.current.x = event.clientX;
        lastMouseRef.current.y = event.clientY;
        setIsRotating(true);
    };

    /**
     * Handle mouse move
     */
    const handleMouseMove = (event) => {
        if (!mouseRef.current.isDown) return;

        const deltaX = event.clientX - lastMouseRef.current.x;
        const deltaY = event.clientY - lastMouseRef.current.y;

        setVehicleRotation(prev => ({
            x: prev.x + deltaY * 0.01,
            y: prev.y + deltaX * 0.01
        }));

        lastMouseRef.current.x = event.clientX;
        lastMouseRef.current.y = event.clientY;
    };

    /**
     * Handle mouse up
     */
    const handleMouseUp = () => {
        mouseRef.current.isDown = false;
        setIsRotating(false);
    };

    /**
     * Handle mouse wheel for zoom
     */
    const handleWheel = (event) => {
        event.preventDefault();
        const delta = event.deltaY * 0.01;
        setCameraDistance(prev => Math.max(2, Math.min(10, prev + delta)));
    };

    /**
     * Start render loop
     */
    const startRenderLoop = () => {
        const animate = () => {
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                // Update camera position based on rotation and distance
                const camera = cameraRef.current;
                camera.position.x = Math.sin(vehicleRotation.y) * cameraDistance;
                camera.position.z = Math.cos(vehicleRotation.y) * cameraDistance;
                camera.position.y = 2 + Math.sin(vehicleRotation.x) * 2;
                camera.lookAt(0, 0, 0);

                // Rotate vehicle model
                if (vehicleModelRef.current) {
                    vehicleModelRef.current.rotation.x = vehicleRotation.x * 0.1;
                    vehicleModelRef.current.rotation.y = vehicleRotation.y;
                }

                rendererRef.current.render(sceneRef.current, camera);
            }
            animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
    };

    /**
     * Handle window resize
     */
    const handleResize = () => {
        if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
    };

    /**
     * Initialize audio
     */
    const initializeAudio = () => {
        const audioAssets = [
            'garage_vehicle_select.ogg',
            'garage_upgrade_hover.ogg',
            'garage_upgrade_select.ogg',
            'garage_purchase_success.ogg',
            'garage_purchase_fail.ogg',
            'garage_category_change.ogg'
        ];

        audioAssets.forEach(asset => {
            audioManager.loadSound(
                `garage_${asset.split('.')[0]}`,
                `/audio/garage/${asset}`
            );
        });
    };

    /**
     * Get current vehicle data
     */
    const getCurrentVehicle = () => {
        return availableVehicles.find(v => v.id === selectedVehicle) || availableVehicles[0];
    };

    /**
     * Get available upgrades for current category
     */
    const getAvailableUpgrades = () => {
        const category = selectedCategory;
        const vehicleId = selectedVehicle;
        const currentLevel = upgradeData[vehicleId]?.[category]?.level || 0;

        // Generate upgrade tiers (in a real implementation, this would come from game data)
        const upgrades = [];
        for (let level = 1; level <= 5; level++) {
            const isOwned = currentLevel >= level;
            const canPurchase = currentLevel === level - 1;
            
            upgrades.push({
                id: `${category}_${level}`,
                name: `${upgradeCategories.find(c => c.id === category)?.name} Level ${level}`,
                level: level,
                category: category,
                price: level * 1000 + (level - 1) * 500,
                owned: isOwned,
                canPurchase: canPurchase && !isOwned,
                description: getUpgradeDescription(category, level),
                stats: getUpgradeStats(category, level),
                requirements: level > 1 ? [`${category} Level ${level - 1}`] : []
            });
        }

        return upgrades;
    };

    /**
     * Get upgrade description
     */
    const getUpgradeDescription = (category, level) => {
        const descriptions = {
            engine: [
                'Basic engine tuning',
                'Performance air filter',
                'Turbo upgrade',
                'Racing engine',
                'Supercharged engine'
            ],
            armor: [
                'Reinforced doors',
                'Bulletproof glass',
                'Armor plating',
                'Military-grade armor',
                'Titanium reinforcement'
            ],
            handling: [
                'Sport suspension',
                'Performance tires',
                'Racing brakes',
                'Advanced steering',
                'Professional racing setup'
            ],
            fuel: [
                'Fuel injector upgrade',
                'High-efficiency engine',
                'Hybrid system',
                'Advanced fuel management',
                'Experimental fuel cell'
            ],
            weapons: [
                'Roof-mounted machine gun',
                'Side-mounted cannons',
                'Missile launcher',
                'Plasma weapons',
                'Experimental laser system'
            ],
            visual: [
                'Custom paint job',
                'Neon underglow',
                'Carbon fiber body kit',
                'Holographic displays',
                'Quantum visual effects'
            ]
        };

        return descriptions[category]?.[level - 1] || 'Unknown upgrade';
    };

    /**
     * Get upgrade stats
     */
    const getUpgradeStats = (category, level) => {
        const baseBonus = level * 10;
        const stats = {};

        switch (category) {
            case 'engine':
                stats.speed = baseBonus;
                stats.acceleration = baseBonus * 0.8;
                break;
            case 'armor':
                stats.armor = baseBonus;
                stats.durability = baseBonus * 0.6;
                break;
            case 'handling':
                stats.handling = baseBonus;
                stats.braking = baseBonus * 0.7;
                break;
            case 'fuel':
                stats.fuel_efficiency = baseBonus;
                stats.range = baseBonus * 2;
                break;
            case 'weapons':
                stats.damage = baseBonus;
                stats.fire_rate = baseBonus * 0.5;
                break;
            case 'visual':
                stats.style = baseBonus;
                stats.intimidation = baseBonus * 0.3;
                break;
        }

        return stats;
    };

    /**
     * Calculate total vehicle stats
     */
    const calculateVehicleStats = (vehicleId) => {
        const vehicle = availableVehicles.find(v => v.id === vehicleId);
        if (!vehicle) return {};

        const baseStats = { ...vehicle.baseStats };
        const upgrades = upgradeData[vehicleId] || {};

        // Apply upgrade bonuses
        Object.keys(upgrades).forEach(category => {
            const upgrade = upgrades[category];
            if (upgrade && upgrade.level > 0) {
                const stats = getUpgradeStats(category, upgrade.level);
                Object.keys(stats).forEach(stat => {
                    if (baseStats[stat] !== undefined) {
                        baseStats[stat] += stats[stat];
                    }
                });
            }
        });

        return baseStats;
    };

    /**
     * Handle vehicle selection
     */
    const handleVehicleSelect = (vehicleId) => {
        const vehicle = availableVehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;

        if (!vehicle.owned) {
            // Show purchase confirmation for vehicle
            setPendingPurchase({
                type: 'vehicle',
                item: vehicle,
                price: vehicle.price
            });
            setShowConfirmDialog(true);
        } else {
            setSelectedVehicle(vehicleId);
            onVehicleSelect(vehicleId);
        }

        if (audioManager) {
            audioManager.playSound('garage_vehicle_select', { volume: 0.4 });
        }
    };

    /**
     * Handle category selection
     */
    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        setSelectedUpgrade(null);
        
        if (audioManager) {
            audioManager.playSound('garage_category_change', { volume: 0.3 });
        }
    };

    /**
     * Handle upgrade selection
     */
    const handleUpgradeSelect = (upgrade) => {
        setSelectedUpgrade(upgrade);
        
        if (audioManager) {
            audioManager.playSound('garage_upgrade_hover', { volume: 0.2 });
        }
    };

    /**
     * Handle upgrade purchase
     */
    const handleUpgradePurchase = (upgrade) => {
        if (!upgrade.canPurchase || currency < upgrade.price) {
            if (audioManager) {
                audioManager.playSound('garage_purchase_fail', { volume: 0.5 });
            }
            return;
        }

        setPendingPurchase({
            type: 'upgrade',
            item: upgrade,
            price: upgrade.price
        });
        setShowConfirmDialog(true);

        if (audioManager) {
            audioManager.playSound('garage_upgrade_select', { volume: 0.4 });
        }
    };

    /**
     * Confirm purchase
     */
    const confirmPurchase = () => {
        if (!pendingPurchase) return;

        const success = onUpgradePurchase(pendingPurchase.item, pendingPurchase.price);
        
        if (success) {
            if (audioManager) {
                audioManager.playSound('garage_purchase_success', { volume: 0.6 });
            }
            
            // Refresh vehicle model to show new upgrades
            if (pendingPurchase.type === 'upgrade') {
                setTimeout(() => {
                    loadVehicleModel(selectedVehicle);
                }, 100);
            }
        } else {
            if (audioManager) {
                audioManager.playSound('garage_purchase_fail', { volume: 0.5 });
            }
        }

        setShowConfirmDialog(false);
        setPendingPurchase(null);
    };

    /**
     * Cancel purchase
     */
    const cancelPurchase = () => {
        setShowConfirmDialog(false);
        setPendingPurchase(null);
        
        if (audioManager) {
            audioManager.playSound('garage_upgrade_hover', { volume: 0.2 });
        }
    };

    /**
     * Toggle comparison mode
     */
    const toggleCompareMode = () => {
        if (!compareMode) {
            const currentStats = calculateVehicleStats(selectedVehicle);
            setComparisonData({
                current: currentStats,
                preview: selectedUpgrade ? 
                    calculatePreviewStats(selectedVehicle, selectedUpgrade) : 
                    currentStats
            });
        }
        setCompareMode(!compareMode);
    };

    /**
     * Calculate preview stats with upgrade
     */
    const calculatePreviewStats = (vehicleId, upgrade) => {
        const currentStats = calculateVehicleStats(vehicleId);
        const upgradeStats = upgrade.stats;
        
        const previewStats = { ...currentStats };
        Object.keys(upgradeStats).forEach(stat => {
            if (previewStats[stat] !== undefined) {
                previewStats[stat] += upgradeStats[stat];
            }
        });
        
        return previewStats;
    };

    /**
     * Cleanup function
     */
    const cleanup = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (rendererRef.current && mountRef.current) {
            mountRef.current.removeChild(rendererRef.current.domElement);
        }
        
        window.removeEventListener('resize', handleResize);
    };

    const currentVehicle = getCurrentVehicle();
    const availableUpgrades = getAvailableUpgrades();
    const currentStats = calculateVehicleStats(selectedVehicle);

    return (
        <div className="garage-interface">
            {/* Header */}
            <div className="garage-header">
                <button className="back-button" onClick={onBack}>
                    ← Back
                </button>
                <h1 className="garage-title">Vehicle Garage</h1>
                <div className="currency-display">
                    <span className="currency-icon">💰</span>
                    <span className="currency-amount">${currency.toLocaleString()}</span>
                </div>
            </div>

            <div className="garage-content">
                {/* 3D Vehicle Viewer */}
                <div className="vehicle-viewer-section">
                    <div className="vehicle-viewer" ref={mountRef} />
                    
                    <div className="viewer-controls">
                        <div className="control-hint">
                            🖱️ Click and drag to rotate • Scroll to zoom
                        </div>
                        <div className="viewer-buttons">
                            <button 
                                className="reset-view-button"
                                onClick={() => {
                                    setVehicleRotation({ x: 0, y: 0 });
                                    setCameraDistance(5);
                                }}
                            >
                                Reset View
                            </button>
                            <button 
                                className="compare-button"
                                onClick={toggleCompareMode}
                            >
                                {compareMode ? 'Exit Compare' : 'Compare Stats'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vehicle Selection */}
                <div className="vehicle-selection-section">
                    <h2 className="section-title">Select Vehicle</h2>
                    <div className="vehicle-grid">
                        {availableVehicles.map(vehicle => (
                            <div
                                key={vehicle.id}
                                className={`vehicle-card ${selectedVehicle === vehicle.id ? 'selected' : ''} ${!vehicle.owned ? 'locked' : ''}`}
                                onClick={() => handleVehicleSelect(vehicle.id)}
                            >
                                <div className="vehicle-card-header">
                                    <h3 className="vehicle-name">{vehicle.name}</h3>
                                    <span className="vehicle-type">{vehicle.type}</span>
                                </div>
                                
                                <div className="vehicle-stats-mini">
                                    <div className="stat-mini">
                                        <span className="stat-label">Speed</span>
                                        <div className="stat-bar">
                                            <div 
                                                className="stat-fill"
                                                style={{ width: `${vehicle.baseStats.speed}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="stat-mini">
                                        <span className="stat-label">Armor</span>
                                        <div className="stat-bar">
                                            <div 
                                                className="stat-fill"
                                                style={{ width: `${vehicle.baseStats.armor}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!vehicle.owned && (
                                    <div className="vehicle-price">
                                        ${vehicle.price.toLocaleString()}
                                    </div>
                                )}
                                
                                {vehicle.owned && selectedVehicle === vehicle.id && (
                                    <div className="selected-indicator">✓ Selected</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upgrade System */}
                <div className="upgrade-section">
                    <h2 className="section-title">Vehicle Upgrades</h2>
                    
                    {/* Category Selection */}
                    <div className="upgrade-categories">
                        {upgradeCategories.map(category => (
                            <button
                                key={category.id}
                                className={`category-button ${selectedCategory === category.id ? 'selected' : ''}`}
                                onClick={() => handleCategorySelect(category.id)}
                            >
                                <span className="category-icon">{category.icon}</span>
                                <span className="category-name">{category.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Upgrade List */}
                    <div className="upgrade-list">
                        {availableUpgrades.map(upgrade => (
                            <div
                                key={upgrade.id}
                                className={`upgrade-item ${selectedUpgrade?.id === upgrade.id ? 'selected' : ''} ${upgrade.owned ? 'owned' : ''} ${!upgrade.canPurchase && !upgrade.owned ? 'locked' : ''}`}
                                onClick={() => handleUpgradeSelect(upgrade)}
                            >
                                <div className="upgrade-header">
                                    <h4 className="upgrade-name">{upgrade.name}</h4>
                                    <div className="upgrade-status">
                                        {upgrade.owned ? (
                                            <span className="owned-badge">✓ Owned</span>
                                        ) : upgrade.canPurchase ? (
                                            <span className="price-badge">${upgrade.price.toLocaleString()}</span>
                                        ) : (
                                            <span className="locked-badge">🔒 Locked</span>
                                        )}
                                    </div>
                                </div>
                                
                                <p className="upgrade-description">{upgrade.description}</p>
                                
                                <div className="upgrade-stats">
                                    {Object.entries(upgrade.stats).map(([stat, value]) => (
                                        <div key={stat} className="stat-bonus">
                                            <span className="stat-name">{stat.replace('_', ' ')}</span>
                                            <span className="stat-value">+{value}</span>
                                        </div>
                                    ))}
                                </div>

                                {upgrade.requirements.length > 0 && (
                                    <div className="upgrade-requirements">
                                        <span className="requirements-label">Requires:</span>
                                        {upgrade.requirements.map(req => (
                                            <span key={req} className="requirement">{req}</span>
                                        ))}
                                    </div>
                                )}

                                {upgrade.canPurchase && !upgrade.owned && (
                                    <button 
                                        className="purchase-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpgradePurchase(upgrade);
                                        }}
                                        disabled={currency < upgrade.price}
                                    >
                                        Purchase
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vehicle Stats Display */}
                <div className="stats-section">
                    <h2 className="section-title">
                        {compareMode ? 'Stats Comparison' : 'Vehicle Statistics'}
                    </h2>
                    
                    {compareMode && comparisonData ? (
                        <div className="stats-comparison">
                            <div className="stats-column">
                                <h3>Current</h3>
                                <div className="stats-display">
                                    {Object.entries(comparisonData.current).map(([stat, value]) => (
                                        <div key={stat} className="stat-item">
                                            <span className="stat-label">{stat}</span>
                                            <div className="stat-bar">
                                                <div 
                                                    className="stat-fill current"
                                                    style={{ width: `${Math.min(100, value)}%` }}
                                                />
                                            </div>
                                            <span className="stat-value">{Math.round(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="stats-column">
                                <h3>With Upgrade</h3>
                                <div className="stats-display">
                                    {Object.entries(comparisonData.preview).map(([stat, value]) => (
                                        <div key={stat} className="stat-item">
                                            <span className="stat-label">{stat}</span>
                                            <div className="stat-bar">
                                                <div 
                                                    className="stat-fill preview"
                                                    style={{ width: `${Math.min(100, value)}%` }}
                                                />
                                            </div>
                                            <span className="stat-value">
                                                {Math.round(value)}
                                                {value > comparisonData.current[stat] && (
                                                    <span className="stat-increase">
                                                        (+{Math.round(value - comparisonData.current[stat])})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="stats-display">
                            {Object.entries(currentStats).map(([stat, value]) => (
                                <div key={stat} className="stat-item">
                                    <span className="stat-label">{stat}</span>
                                    <div className="stat-bar">
                                        <div 
                                            className="stat-fill"
                                            style={{ width: `${Math.min(100, value)}%` }}
                                        />
                                    </div>
                                    <span className="stat-value">{Math.round(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Purchase Confirmation Dialog */}
            {showConfirmDialog && pendingPurchase && (
                <div className="confirm-dialog-overlay">
                    <div className="confirm-dialog">
                        <h3 className="confirm-title">
                            Confirm {pendingPurchase.type === 'vehicle' ? 'Vehicle' : 'Upgrade'} Purchase
                        </h3>
                        
                        <div className="confirm-content">
                            <div className="purchase-item">
                                <h4>{pendingPurchase.item.name}</h4>
                                {pendingPurchase.item.description && (
                                    <p>{pendingPurchase.item.description}</p>
                                )}
                            </div>
                            
                            <div className="purchase-cost">
                                <span className="cost-label">Cost:</span>
                                <span className="cost-amount">${pendingPurchase.price.toLocaleString()}</span>
                            </div>
                            
                            <div className="balance-info">
                                <span className="balance-label">Current Balance:</span>
                                <span className="balance-amount">${currency.toLocaleString()}</span>
                            </div>
                            
                            <div className="balance-after">
                                <span className="balance-label">After Purchase:</span>
                                <span className={`balance-amount ${currency - pendingPurchase.price < 0 ? 'insufficient' : ''}`}>
                                    ${(currency - pendingPurchase.price).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        
                        <div className="confirm-actions">
                            <button 
                                className="confirm-button"
                                onClick={confirmPurchase}
                                disabled={currency < pendingPurchase.price}
                            >
                                Confirm Purchase
                            </button>
                            <button 
                                className="cancel-button"
                                onClick={cancelPurchase}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GarageInterface;