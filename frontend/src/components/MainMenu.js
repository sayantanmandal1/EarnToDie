import React, { useState } from 'react';
import './MainMenu.css';

const MainMenu = ({ 
  onStartGame, 
  onVehicleSelection, 
  onSettings, 
  onQuit,
  gameTitle = "Zombie Car Game"
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleMenuAction = (action) => {
    setIsVisible(false);
    setTimeout(() => {
      action();
      setIsVisible(true);
    }, 300);
  };

  if (!isVisible) {
    return <div className="main-menu fade-out" />;
  }

  return (
    <div className="main-menu">
      <div className="main-menu-background">
        <div className="zombie-silhouettes"></div>
        <div className="car-silhouette"></div>
      </div>
      
      <div className="main-menu-content">
        <div className="game-title">
          <h1>{gameTitle}</h1>
          <p className="game-subtitle">Survive the Apocalypse</p>
        </div>
        
        <nav className="main-menu-nav">
          <button 
            className="menu-button primary"
            onClick={() => handleMenuAction(onStartGame)}
          >
            <span className="button-icon">🎮</span>
            Start Game
          </button>
          
          <button 
            className="menu-button"
            onClick={() => handleMenuAction(onVehicleSelection)}
          >
            <span className="button-icon">🚗</span>
            Garage
          </button>
          
          <button 
            className="menu-button"
            onClick={() => handleMenuAction(onSettings)}
          >
            <span className="button-icon">⚙️</span>
            Settings
          </button>
          
          <button 
            className="menu-button secondary"
            onClick={() => handleMenuAction(onQuit)}
          >
            <span className="button-icon">🚪</span>
            Quit
          </button>
        </nav>
        
        <div className="menu-footer">
          <p>Use WASD to drive • Space to brake • Mouse to look around</p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;