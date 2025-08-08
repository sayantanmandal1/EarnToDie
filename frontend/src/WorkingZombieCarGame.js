import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './styles/ZombieCarGame.css';

/**
 * Working 3D Zombie Car Game
 * A proper 3D implementation using Three.js
 */
function WorkingZombieCarGame() {
    const canvasRef = useRef();
    const sceneRef = useRef();
    const rendererRef = useRef();
    const cameraRef = useRef();
    const carRef = useRef();
    const zombiesRef = useRef([]);
    const keysRef = useRef({});
    const gameStateRef = useRef({
        health: 100,
        speed: 0,
        score: 0,
        zombiesKilled: 0
    });

    const [gameStats, setGameStats] = useState({
        health: 100,
        speed: 0,
        score: 0,
        zombiesKilled: 0
    });

    const [gameState, setGameState] = useState('loading');
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        const initializeGame = async () => {
            try {
                setLoadingProgress(10);
                await new Promise(resolve => setTimeout(resolve, 500));

                // Initialize Three.js
                setLoadingProgress(30);
                const scene = new THREE.Scene();
                scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
                
                const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                const renderer = new THREE.WebGLRenderer({ 
                    canvas: canvasRef.current,
                    antialias: true 
                });
                
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setClearColor(0x87CEEB);
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFShadowMap;

                setLoadingProgress(50);
                await new Promise(resolve => setTimeout(resolve, 300));

                // Add lighting
                const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                directionalLight.position.set(50, 50, 50);
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 2048;
                directionalLight.shadow.mapSize.height = 2048;
                scene.add(directionalLight);

                setLoadingProgress(70);
                await new Promise(resolve => setTimeout(resolve, 300));

                // Create ground
                const groundGeometry = new THREE.PlaneGeometry(200, 200);
                const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
                const ground = new THREE.Mesh(groundGeometry, groundMaterial);
                ground.rotation.x = -Math.PI / 2;
                ground.receiveShadow = true;
                scene.add(ground);

                // Create road
                const roadGeometry = new THREE.PlaneGeometry(20, 200);
                const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
                const road = new THREE.Mesh(roadGeometry, roadMaterial);
                road.rotation.x = -Math.PI / 2;
                road.position.y = 0.01;
                scene.add(road);

                // Create car
                const carGeometry = new THREE.BoxGeometry(2, 1, 4);
                const carMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
                const car = new THREE.Mesh(carGeometry, carMaterial);
                car.position.set(0, 0.5, 0);
                car.castShadow = true;
                scene.add(car);

                setLoadingProgress(90);
                await new Promise(resolve => setTimeout(resolve, 300));

                // Create zombies
                const zombies = [];
                for (let i = 0; i < 20; i++) {
                    const zombieGeometry = new THREE.CapsuleGeometry(0.5, 2);
                    const zombieMaterial = new THREE.MeshLambertMaterial({ 
                        color: new THREE.Color().setHSL(0.3, 0.8, 0.3 + Math.random() * 0.3)
                    });
                    const zombie = new THREE.Mesh(zombieGeometry, zombieMaterial);
                    
                    zombie.position.set(
                        (Math.random() - 0.5) * 15,
                        1,
                        (Math.random() - 0.5) * 100 - 50
                    );
                    zombie.castShadow = true;
                    zombie.userData = { 
                        speed: 0.02 + Math.random() * 0.03,
                        health: 100,
                        originalY: zombie.position.y
                    };
                    
                    zombies.push(zombie);
                    scene.add(zombie);
                }

                // Position camera behind car
                camera.position.set(0, 8, 15);
                camera.lookAt(0, 0, 0);

                // Store references
                sceneRef.current = scene;
                rendererRef.current = renderer;
                cameraRef.current = camera;
                carRef.current = car;
                zombiesRef.current = zombies;

                setLoadingProgress(100);
                await new Promise(resolve => setTimeout(resolve, 500));
                setGameState('playing');

                // Start game loop
                startGameLoop();

            } catch (error) {
                console.error('Failed to initialize game:', error);
                setGameState('error');
            }
        };

        initializeGame();

        // Event listeners
        const handleKeyDown = (event) => {
            keysRef.current[event.code] = true;
        };

        const handleKeyUp = (event) => {
            keysRef.current[event.code] = false;
        };

        const handleResize = () => {
            if (cameraRef.current && rendererRef.current) {
                cameraRef.current.aspect = window.innerWidth / window.innerHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(window.innerWidth, window.innerHeight);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('resize', handleResize);
            
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, []);

    const startGameLoop = () => {
        const gameLoop = () => {
            if (gameState !== 'playing') return;

            const car = carRef.current;
            const camera = cameraRef.current;
            const zombies = zombiesRef.current;
            const keys = keysRef.current;
            const gameStats = gameStateRef.current;

            if (!car || !camera) return;

            // Car controls
            let acceleration = 0;
            if (keys['KeyW'] || keys['ArrowUp']) {
                acceleration = 0.1;
            }
            if (keys['KeyS'] || keys['ArrowDown']) {
                acceleration = -0.05;
            }

            gameStats.speed += acceleration;
            gameStats.speed *= 0.95; // Friction
            gameStats.speed = Math.max(-2, Math.min(5, gameStats.speed));

            // Move car forward/backward
            car.position.z -= gameStats.speed * 0.2;

            // Steering
            if (keys['KeyA'] || keys['ArrowLeft']) {
                car.position.x = Math.max(-8, car.position.x - 0.15);
                car.rotation.y = 0.1;
            } else if (keys['KeyD'] || keys['ArrowRight']) {
                car.position.x = Math.min(8, car.position.x + 0.15);
                car.rotation.y = -0.1;
            } else {
                car.rotation.y *= 0.9;
            }

            // Update zombies
            zombies.forEach((zombie, index) => {
                if (!zombie.parent) return;

                // Move zombie towards car
                const direction = new THREE.Vector3();
                direction.subVectors(car.position, zombie.position);
                direction.normalize();
                
                zombie.position.add(direction.multiplyScalar(zombie.userData.speed));
                
                // Add some bobbing animation
                zombie.position.y = zombie.userData.originalY + Math.sin(Date.now() * 0.005 + index) * 0.1;
                
                // Check collision with car
                const distance = car.position.distanceTo(zombie.position);
                if (distance < 2.5) {
                    // Zombie hit!
                    sceneRef.current.remove(zombie);
                    zombies.splice(index, 1);
                    
                    gameStats.score += 100;
                    gameStats.zombiesKilled += 1;
                    
                    // Spawn new zombie further away
                    const zombieGeometry = new THREE.CapsuleGeometry(0.5, 2);
                    const zombieMaterial = new THREE.MeshLambertMaterial({ 
                        color: new THREE.Color().setHSL(0.3, 0.8, 0.3 + Math.random() * 0.3)
                    });
                    const newZombie = new THREE.Mesh(zombieGeometry, zombieMaterial);
                    
                    newZombie.position.set(
                        (Math.random() - 0.5) * 15,
                        1,
                        car.position.z - 50 - Math.random() * 50
                    );
                    newZombie.castShadow = true;
                    newZombie.userData = { 
                        speed: 0.02 + Math.random() * 0.03,
                        health: 100,
                        originalY: newZombie.position.y
                    };
                    
                    zombies.push(newZombie);
                    sceneRef.current.add(newZombie);
                }
                
                // Remove zombies that are too far behind
                if (zombie.position.z > car.position.z + 30) {
                    zombie.position.z = car.position.z - 50 - Math.random() * 50;
                    zombie.position.x = (Math.random() - 0.5) * 15;
                }
            });

            // Update camera to follow car
            camera.position.x = car.position.x;
            camera.position.z = car.position.z + 15;
            camera.lookAt(car.position.x, car.position.y, car.position.z);

            // Update UI stats
            setGameStats({
                health: gameStats.health,
                speed: Math.round(Math.abs(gameStats.speed * 20)),
                score: gameStats.score,
                zombiesKilled: gameStats.zombiesKilled
            });

            // Render
            rendererRef.current.render(sceneRef.current, camera);
            
            requestAnimationFrame(gameLoop);
        };

        gameLoop();
    };

    if (gameState === 'loading') {
        return (
            <div className="loading-overlay">
                <div className="loading-content">
                    <h1>🧟‍♂️ Zombie Car Game 🚗</h1>
                    <p>Loading 3D World... {Math.round(loadingProgress)}%</p>
                    <div className="loading-spinner"></div>
                    <div style={{ marginTop: '20px', fontSize: '14px', color: '#ccc' }}>
                        {loadingProgress < 30 && 'Initializing Three.js engine...'}
                        {loadingProgress >= 30 && loadingProgress < 50 && 'Creating 3D scene...'}
                        {loadingProgress >= 50 && loadingProgress < 70 && 'Adding lighting and shadows...'}
                        {loadingProgress >= 70 && loadingProgress < 90 && 'Spawning zombies...'}
                        {loadingProgress >= 90 && 'Starting game...'}
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="app error">
                <h1>⚠️ Game Error</h1>
                <p>Failed to initialize the 3D game engine.</p>
                <button onClick={() => window.location.reload()}>
                    Reload Game
                </button>
            </div>
        );
    }

    return (
        <div className="game-container">
            <canvas ref={canvasRef} className="game-canvas" />
            
            {/* Game HUD */}
            <div className="game-hud">
                <div className="hud-stats">
                    <div>❤️ Health: {gameStats.health}</div>
                    <div>⚡ Speed: {gameStats.speed} mph</div>
                    <div>🧟‍♂️ Zombies Killed: {gameStats.zombiesKilled}</div>
                    <div>🏆 Score: {gameStats.score}</div>
                </div>
            </div>

            {/* Controls Info */}
            <div className="controls-info">
                <h3>Controls</h3>
                <div>WASD / Arrow Keys - Drive</div>
                <div>Run over zombies to score points!</div>
            </div>
        </div>
    );
}

export default WorkingZombieCarGame;