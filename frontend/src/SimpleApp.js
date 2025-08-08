import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import './styles/App.css';

// Simple 3D Game Canvas Component
function GameCanvas({ onBackToMenu }) {
  const canvasRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const carRef = useRef();
  const zombiesRef = useRef([]);
  const [gameStats, setGameStats] = useState({
    health: 100,
    speed: 0,
    zombies: 0,
    score: 0
  });

  useEffect(() => {
    // Initialize Three.js scene
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB); // Sky blue
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);
    
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // Create simple car
    const carGeometry = new THREE.BoxGeometry(2, 1, 4);
    const carMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.y = 0.5;
    scene.add(car);
    
    // Create some zombies
    const zombies = [];
    for (let i = 0; i < 5; i++) {
      const zombieGeometry = new THREE.CapsuleGeometry(0.5, 2);
      const zombieMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
      const zombie = new THREE.Mesh(zombieGeometry, zombieMaterial);
      zombie.position.set(
        (Math.random() - 0.5) * 50,
        1,
        (Math.random() - 0.5) * 50
      );
      zombies.push(zombie);
      scene.add(zombie);
    }
    
    // Position camera
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    
    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    carRef.current = car;
    zombiesRef.current = zombies;
    
    // Game loop
    let speed = 0;
    let score = 0;
    const keys = {};
    
    const handleKeyDown = (event) => {
      keys[event.code] = true;
    };
    
    const handleKeyUp = (event) => {
      keys[event.code] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Car controls
      if (keys['KeyW'] || keys['ArrowUp']) {
        speed = Math.min(speed + 0.1, 2);
        car.position.z -= speed * 0.1;
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        speed = Math.max(speed - 0.1, -1);
        car.position.z -= speed * 0.1;
      }
      if (keys['KeyA'] || keys['ArrowLeft']) {
        car.position.x -= 0.1;
        car.rotation.y = 0.1;
      } else if (keys['KeyD'] || keys['ArrowRight']) {
        car.position.x += 0.1;
        car.rotation.y = -0.1;
      } else {
        car.rotation.y = 0;
      }
      
      // Apply friction
      speed *= 0.95;
      
      // Move zombies towards car
      zombies.forEach((zombie, index) => {
        const direction = new THREE.Vector3();
        direction.subVectors(car.position, zombie.position);
        direction.normalize();
        zombie.position.add(direction.multiplyScalar(0.02));
        
        // Check collision with car
        const distance = car.position.distanceTo(zombie.position);
        if (distance < 2) {
          // Zombie hit - remove it and add score
          scene.remove(zombie);
          zombies.splice(index, 1);
          score += 10;
        }
      });
      
      // Update camera to follow car
      camera.position.x = car.position.x;
      camera.position.z = car.position.z + 10;
      camera.lookAt(car.position);
      
      // Update game stats
      setGameStats({
        health: 100,
        speed: Math.round(Math.abs(speed * 50)),
        zombies: zombies.length,
        score: score
      });
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      {/* Game HUD */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        <div>❤️ Health: {gameStats.health}</div>
        <div>⚡ Speed: {gameStats.speed} mph</div>
        <div>🧟‍♂️ Zombies: {gameStats.zombies}</div>
        <div>🏆 Score: {gameStats.score}</div>
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace'
      }}>
        <div><strong>Controls:</strong></div>
        <div>WASD/Arrows - Drive</div>
        <div>Hit zombies to score!</div>
      </div>

      {/* Back to Menu */}
      <button 
        onClick={onBackToMenu}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: '#f44336',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🏠 Menu
      </button>
    </div>
  );
}

function SimpleApp() {
  const [gameState, setGameState] = useState('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading process
    const loadGame = async () => {
      try {
        setGameState('loading');
        
        // Simulate loading steps
        const steps = [
          'Initializing game engine...',
          'Loading assets...',
          'Setting up physics...',
          'Spawning zombies...',
          'Preparing vehicles...',
          'Ready to play!'
        ];

        for (let i = 0; i < steps.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          setLoadingProgress(((i + 1) / steps.length) * 100);
        }

        setGameState('menu');
      } catch (err) {
        setError(err.message);
        setGameState('error');
      }
    };

    loadGame();
  }, []);

  const startGame = () => {
    setGameState('playing');
  };

  const backToMenu = () => {
    setGameState('menu');
  };

  if (gameState === 'loading') {
    return (
      <div className="app">
        <div className="loading-overlay">
          <div className="loading-content">
            <h2>🧟‍♂️ Zombie Car Game 🚗</h2>
            <p>Loading... {Math.round(loadingProgress)}%</p>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'error') {
    return (
      <div className="app error">
        <h1>⚠️ Game Error</h1>
        <pre>{error}</pre>
        <button onClick={() => window.location.reload()}>
          Reload Game
        </button>
      </div>
    );
  }

  if (gameState === 'menu') {
    return (
      <div className="app">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h1>🧟‍♂️ Zombie Car Game 🚗</h1>
          <p>Drive through hordes of zombies and survive!</p>
          <div style={{ marginTop: '30px' }}>
            <button 
              onClick={startGame}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                fontSize: '18px',
                borderRadius: '5px',
                cursor: 'pointer',
                margin: '10px'
              }}
            >
              🎮 Start Game
            </button>
            <button 
              style={{
                background: '#2196F3',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                fontSize: '18px',
                borderRadius: '5px',
                cursor: 'pointer',
                margin: '10px'
              }}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="app">
        <GameCanvas onBackToMenu={backToMenu} />
      </div>
    );
  }


    );
  }

  return null;
}

export default SimpleApp;