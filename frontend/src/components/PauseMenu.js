import React, { useState, useEffect } from 'react';
import './PauseMenu.css';

const PauseMenu = ({ 
  isVisible = false,
  onResume,
  onRestart,
  onSettings,
  onMainMenu,
  onQuit,
  gameStats = {}
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const handleMenuAction = (action) => {
    if (action) {
      action();
    }
  };

  if (!isVisible && !isAnimating) {
    return null;
  }

  return (
    <div className={`pause-menu-overlay ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="pause-menu-background" onClick={onResume} />
      
      <div className={`pause-menu ${isVisible ? 'slide-in' : 'slide-out'}`}>
        <div className="pause-header">
          <h2>Game Paused</h2>
          <div className="pause-subtitle">Take a breather, survivor</div>
        </div>
        
        <div className="pause-stats">
          <div className="stat-row">
            <span className="stat-label">Current Score:</span>
            <span className="stat-value">{gameStats.score?.toLocaleString() || '0'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Zombies Killed:</span>
            <span className="stat-value">{gameStats.zombiesKilled || '0'}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Distance:</span>
            <span className="stat-value">{((gameStats.distance || 0) / 1000).toFixed(1)}km</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Time Played:</span>
            <span className="stat-value">{gameStats.timeFormatted || '00:00'}</span>
          </div>
        </div>
        
        <div className="pause-menu-buttons">
          <button 
            className="pause-button primary"
            onClick={() => handleMenuAction(onResume)}
          >
            <span className="button-icon">▶️</span>
            Resume Game
          </button>
          
          <button 
            className="pause-button"
            onClick={() => handleMenuAction(onRestart)}
          >
            <span className="button-icon">🔄</span>
            Restart Level
          </button>
          
          <button 
            className="pause-button"
            onClick={() => handleMenuAction(onSettings)}
          >
            <span className="button-icon">⚙️</span>
            Settings
          </button>
          
          <button 
            className="pause-button"
            onClick={() => handleMenuAction(onMainMenu)}
          >
            <span className="button-icon">🏠</span>
            Main Menu
          </button>
          
          <button 
            className="pause-button secondary"
            onClick={() => handleMenuAction(onQuit)}
          >
            <span className="button-icon">🚪</span>
            Quit Game
          </button>
        </div>
        
        <div className="pause-footer">
          <div className="controls-reminder">
            <p><strong>Controls:</strong> WASD to move • Space to brake • Mouse to look</p>
            <p><strong>Tip:</strong> Press ESC to pause/resume anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PauseMenu;