import React, { useState, useEffect, useRef } from 'react';
import './styles/App.css';

// Simple working game without complex dependencies
function App() {
  const [gameState, setGameState] = useState('menu');
  const canvasRef = useRef();
  const gameLoopRef = useRef();

  const startGame = () => {
    setGameState('playing');
  };

  const backToMenu = () => {
    setGameState('menu');
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Game state
      const game = {
        car: { x: canvas.width / 2, y: canvas.height - 100, width: 40, height: 80, speed: 0 },
        zombies: [],
        score: 0,
        health: 100,
        keys: {}
      };
      
      // Create zombies
      for (let i = 0; i < 10; i++) {
        game.zombies.push({
          x: Math.random() * canvas.width,
          y: Math.random() * -500,
          width: 30,
          height: 50,
          speed: 1 + Math.random() * 2
        });
      }
      
      // Event listeners
      const handleKeyDown = (e) => {
        game.keys[e.code] = true;
      };
      
      const handleKeyUp = (e) => {
        game.keys[e.code] = false;
      };
      
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      // Game loop
      const gameLoop = () => {
        // Clear canvas
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw road
        ctx.fillStyle = '#333';
        ctx.fillRect(canvas.width / 4, 0, canvas.width / 2, canvas.height);
        
        // Road lines
        ctx.fillStyle = '#fff';
        for (let i = 0; i < canvas.height; i += 40) {
          ctx.fillRect(canvas.width / 2 - 2, i, 4, 20);
        }
        
        // Handle car movement
        if (game.keys['KeyA'] || game.keys['ArrowLeft']) {
          game.car.x = Math.max(canvas.width / 4, game.car.x - 5);
        }
        if (game.keys['KeyD'] || game.keys['ArrowRight']) {
          game.car.x = Math.min(canvas.width * 3/4 - game.car.width, game.car.x + 5);
        }
        if (game.keys['KeyW'] || game.keys['ArrowUp']) {
          game.car.speed = Math.min(10, game.car.speed + 0.5);
        }
        if (game.keys['KeyS'] || game.keys['ArrowDown']) {
          game.car.speed = Math.max(0, game.car.speed - 0.5);
        }
        
        // Apply friction
        game.car.speed *= 0.98;
        
        // Draw car
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(game.car.x, game.car.y, game.car.width, game.car.height);
        
        // Update and draw zombies
        game.zombies.forEach((zombie, index) => {
          zombie.y += zombie.speed + game.car.speed;
          
          // Reset zombie if off screen
          if (zombie.y > canvas.height) {
            zombie.y = Math.random() * -200;
            zombie.x = canvas.width / 4 + Math.random() * (canvas.width / 2 - zombie.width);
          }
          
          // Draw zombie
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height);
          
          // Check collision
          if (game.car.x < zombie.x + zombie.width &&
              game.car.x + game.car.width > zombie.x &&
              game.car.y < zombie.y + zombie.height &&
              game.car.y + game.car.height > zombie.y) {
            // Hit zombie
            game.score += 10;
            zombie.y = Math.random() * -200;
            zombie.x = canvas.width / 4 + Math.random() * (canvas.width / 2 - zombie.width);
          }
        });
        
        // Draw HUD
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(20, 20, 200, 120);
        
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText(`❤️ Health: ${game.health}`, 30, 45);
        ctx.fillText(`⚡ Speed: ${Math.round(game.car.speed * 10)} mph`, 30, 70);
        ctx.fillText(`🧟‍♂️ Zombies Hit: ${Math.floor(game.score / 10)}`, 30, 95);
        ctx.fillText(`🏆 Score: ${game.score}`, 30, 120);
        
        // Draw controls
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(20, canvas.height - 120, 200, 100);
        
        ctx.fillStyle = '#fff';
        ctx.fillText('Controls:', 30, canvas.height - 95);
        ctx.fillText('WASD/Arrows - Drive', 30, canvas.height - 75);
        ctx.fillText('Hit zombies to score!', 30, canvas.height - 55);
        
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      };
      
      gameLoop();
      
      // Cleanup
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
      };
    }
  }, [gameState]);

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
        <canvas 
          ref={canvasRef}
          style={{ 
            display: 'block',
            background: '#000'
          }}
        />
        <button 
          onClick={backToMenu}
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
            fontSize: '16px',
            zIndex: 1000
          }}
        >
          🏠 Menu
        </button>
      </div>
    );
  }

  return null;
}

export default App;