import React, { useState, useEffect } from 'react';
import './GameHUD.css';

const GameHUD = ({ 
  health = 100,
  maxHealth = 100,
  fuel = 100,
  maxFuel = 100,
  score = 0,
  level = 1,
  zombiesKilled = 0,
  speed = 0,
  distance = 0,
  combo = 0,
  isPaused = false,
  onPause,
  showMinimap = true,
  minimapData = null
}) => {
  const [healthPercentage, setHealthPercentage] = useState(100);
  const [fuelPercentage, setFuelPercentage] = useState(100);
  const [isLowHealth, setIsLowHealth] = useState(false);
  const [isLowFuel, setIsLowFuel] = useState(false);

  useEffect(() => {
    const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
    const fuelPct = Math.max(0, Math.min(100, (fuel / maxFuel) * 100));
    
    setHealthPercentage(healthPct);
    setFuelPercentage(fuelPct);
    setIsLowHealth(healthPct <= 25);
    setIsLowFuel(fuelPct <= 25);
  }, [health, maxHealth, fuel, maxFuel]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDistance = (dist) => {
    return (dist / 1000).toFixed(1) + 'km';
  };

  return (
    <div className={`game-hud ${isPaused ? 'paused' : ''}`}>
      {/* Top HUD Bar */}
      <div className="hud-top">
        <div className="hud-section level-info">
          <div className="level-display">
            <span className="level-label">Level</span>
            <span className="level-number">{level}</span>
          </div>
        </div>
        
        <div className="hud-section score-info">
          <div className="score-display">
            <span className="score-value">{formatNumber(score)}</span>
            <span className="score-label">Score</span>
          </div>
          {combo > 1 && (
            <div className="combo-display">
              <span className="combo-multiplier">x{combo}</span>
              <span className="combo-label">Combo</span>
            </div>
          )}
        </div>
        
        <div className="hud-section pause-button">
          <button 
            className="pause-btn"
            onClick={onPause}
            title="Pause Game (ESC)"
          >
            ⏸️
          </button>
        </div>
      </div>

      {/* Left HUD Panel */}
      <div className="hud-left">
        <div className="vital-stats">
          <div className={`stat-bar health-bar ${isLowHealth ? 'critical' : ''}`}>
            <div className="stat-label">
              <span className="stat-icon">❤️</span>
              <span>Health</span>
            </div>
            <div className="stat-bar-container">
              <div 
                className="stat-bar-fill health-fill"
                style={{ width: `${healthPercentage}%` }}
              />
              <span className="stat-value">{Math.round(health)}/{maxHealth}</span>
            </div>
          </div>
          
          <div className={`stat-bar fuel-bar ${isLowFuel ? 'critical' : ''}`}>
            <div className="stat-label">
              <span className="stat-icon">⛽</span>
              <span>Fuel</span>
            </div>
            <div className="stat-bar-container">
              <div 
                className="stat-bar-fill fuel-fill"
                style={{ width: `${fuelPercentage}%` }}
              />
              <span className="stat-value">{Math.round(fuel)}/{maxFuel}</span>
            </div>
          </div>
        </div>
        
        <div className="game-stats">
          <div className="stat-item">
            <span className="stat-icon">🧟</span>
            <span className="stat-text">Killed: {zombiesKilled}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📏</span>
            <span className="stat-text">Distance: {formatDistance(distance)}</span>
          </div>
        </div>
      </div>

      {/* Right HUD Panel */}
      <div className="hud-right">
        <div className="speedometer">
          <div className="speed-display">
            <span className="speed-value">{Math.round(speed)}</span>
            <span className="speed-unit">km/h</span>
          </div>
          <div className="speed-bar">
            <div 
              className="speed-fill"
              style={{ width: `${Math.min(100, (speed / 200) * 100)}%` }}
            />
          </div>
        </div>
        
        {showMinimap && (
          <div className="minimap">
            <div className="minimap-header">
              <span>Map</span>
            </div>
            <div className="minimap-content">
              <div className="player-dot"></div>
              {minimapData?.zombies?.map((zombie, index) => (
                <div 
                  key={index}
                  className="zombie-dot"
                  style={{
                    left: `${zombie.x}%`,
                    top: `${zombie.y}%`
                  }}
                />
              ))}
              {minimapData?.obstacles?.map((obstacle, index) => (
                <div 
                  key={index}
                  className="obstacle-dot"
                  style={{
                    left: `${obstacle.x}%`,
                    top: `${obstacle.y}%`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Warning Overlays */}
      {isLowHealth && (
        <div className="warning-overlay health-warning">
          <div className="warning-text">LOW HEALTH!</div>
        </div>
      )}
      
      {isLowFuel && (
        <div className="warning-overlay fuel-warning">
          <div className="warning-text">LOW FUEL!</div>
        </div>
      )}
    </div>
  );
};

export default GameHUD;