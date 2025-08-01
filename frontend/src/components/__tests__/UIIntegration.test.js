import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MainMenu, GameHUD, PauseMenu, SettingsMenu } from '../index';

// Test component that integrates multiple UI components
const UIIntegrationTestComponent = () => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'paused', 'settings'
  const [previousState, setPreviousState] = useState('menu');
  const [gameStats, setGameStats] = useState({
    health: 100,
    maxHealth: 100,
    fuel: 80,
    maxFuel: 100,
    score: 15000,
    level: 2,
    zombiesKilled: 75,
    speed: 65,
    distance: 3500,
    combo: 3,
    timeFormatted: '03:45'
  });
  const [settings, setSettings] = useState({});

  const handleStartGame = () => setGameState('playing');
  const handlePause = () => setGameState('paused');
  const handleResume = () => setGameState('playing');
  const handleSettings = () => {
    setPreviousState(gameState);
    setGameState('settings');
  };
  const handleMainMenu = () => setGameState('menu');
  const handleCloseSettings = () => setGameState(previousState);
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    setGameState(previousState);
  };

  return (
    <div>
      {gameState === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          onVehicleSelection={() => console.log('Vehicle selection')}
          onSettings={handleSettings}
          onQuit={() => console.log('Quit')}
        />
      )}
      
      {gameState === 'playing' && (
        <GameHUD
          {...gameStats}
          isPaused={false}
          onPause={handlePause}
          showMinimap={true}
          minimapData={{
            zombies: [{ x: 30, y: 40 }],
            obstacles: [{ x: 60, y: 70 }]
          }}
        />
      )}
      
      {gameState === 'paused' && (
        <>
          <GameHUD
            {...gameStats}
            isPaused={true}
            onPause={handlePause}
            showMinimap={true}
          />
          <PauseMenu
            isVisible={true}
            onResume={handleResume}
            onRestart={() => console.log('Restart')}
            onSettings={handleSettings}
            onMainMenu={handleMainMenu}
            onQuit={() => console.log('Quit')}
            gameStats={gameStats}
          />
        </>
      )}
      
      {gameState === 'settings' && (
        <SettingsMenu
          isVisible={true}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
          initialSettings={settings}
        />
      )}
    </div>
  );
};

describe('UI Integration Tests', () => {
  test('complete UI flow from menu to game to pause to settings', async () => {
    render(<UIIntegrationTestComponent />);
    
    // Start at main menu
    expect(screen.getByText('Zombie Car Game')).toBeInTheDocument();
    
    // Start game
    const startButton = screen.getByText('Start Game');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      // Should show game HUD
      expect(screen.getByText('100/100')).toBeInTheDocument(); // Health
      expect(screen.getByText('15.0K')).toBeInTheDocument(); // Score
      expect(screen.getByText('2')).toBeInTheDocument(); // Level
    });
    
    // Pause game
    const pauseButton = screen.getByTitle('Pause Game (ESC)');
    fireEvent.click(pauseButton);
    
    await waitFor(() => {
      // Should show pause menu
      expect(screen.getByText('Game Paused')).toBeInTheDocument();
      expect(screen.getByText('15,000')).toBeInTheDocument(); // Formatted score in pause menu
    });
    
    // Open settings from pause menu
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      // Should show settings menu
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('🎨 Graphics')).toBeInTheDocument();
    });
    
    // Close settings
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      // Should return to pause menu
      expect(screen.getByText('Game Paused')).toBeInTheDocument();
    });
    
    // Resume game
    const resumeButton = screen.getByText('Resume Game');
    fireEvent.click(resumeButton);
    
    await waitFor(() => {
      // Should return to game HUD
      expect(screen.getByText('100/100')).toBeInTheDocument();
      expect(screen.queryByText('Game Paused')).not.toBeInTheDocument();
    });
  });

  test('settings can be accessed from main menu', async () => {
    render(<UIIntegrationTestComponent />);
    
    // Start at main menu
    expect(screen.getByText('Zombie Car Game')).toBeInTheDocument();
    
    // Open settings from main menu
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      // Should show settings menu
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
    
    // Make a change in settings
    const qualitySelect = screen.getByLabelText('Graphics Quality');
    fireEvent.change(qualitySelect, { target: { value: 'high' } });
    
    // Save settings
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      // Should return to main menu
      expect(screen.getByText('Zombie Car Game')).toBeInTheDocument();
    });
  });

  test('pause menu shows correct game statistics', async () => {
    render(<UIIntegrationTestComponent />);
    
    // Start game
    const startButton = screen.getByText('Start Game');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByText('15.0K')).toBeInTheDocument();
    });
    
    // Pause game
    const pauseButton = screen.getByTitle('Pause Game (ESC)');
    fireEvent.click(pauseButton);
    
    await waitFor(() => {
      // Check that pause menu shows the same stats as HUD
      expect(screen.getByText('Game Paused')).toBeInTheDocument();
      expect(screen.getByText('15,000')).toBeInTheDocument(); // Score
      expect(screen.getByText('75')).toBeInTheDocument(); // Zombies killed
      expect(screen.getByText('3.5km')).toBeInTheDocument(); // Distance
      expect(screen.getByText('03:45')).toBeInTheDocument(); // Time
    });
  });

  test('HUD shows paused state correctly', async () => {
    render(<UIIntegrationTestComponent />);
    
    // Start game
    const startButton = screen.getByText('Start Game');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      const hud = document.querySelector('.game-hud');
      expect(hud).not.toHaveClass('paused');
    });
    
    // Pause game
    const pauseButton = screen.getByTitle('Pause Game (ESC)');
    fireEvent.click(pauseButton);
    
    await waitFor(() => {
      const hud = document.querySelector('.game-hud');
      expect(hud).toHaveClass('paused');
    });
  });

  test('navigation between all UI states works correctly', async () => {
    render(<UIIntegrationTestComponent />);
    
    // Menu -> Game
    fireEvent.click(screen.getByText('Start Game'));
    await waitFor(() => {
      expect(screen.getByText('15.0K')).toBeInTheDocument();
    });
    
    // Game -> Pause
    fireEvent.click(screen.getByTitle('Pause Game (ESC)'));
    await waitFor(() => {
      expect(screen.getByText('Game Paused')).toBeInTheDocument();
    });
    
    // Pause -> Main Menu
    fireEvent.click(screen.getByText('Main Menu'));
    await waitFor(() => {
      expect(screen.getByText('Zombie Car Game')).toBeInTheDocument();
    });
    
    // Menu -> Settings
    fireEvent.click(screen.getByText('Settings'));
    await waitFor(() => {
      expect(screen.getByText('🎨 Graphics')).toBeInTheDocument();
    });
    
    // Settings -> Menu
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByText('Zombie Car Game')).toBeInTheDocument();
    });
  });

  test('combo display appears and disappears correctly in HUD', async () => {
    const TestComponentWithCombo = () => {
      const [combo, setCombo] = useState(1);
      
      return (
        <div>
          <GameHUD
            health={100}
            maxHealth={100}
            fuel={80}
            maxFuel={100}
            score={15000}
            level={2}
            zombiesKilled={75}
            speed={65}
            distance={3500}
            combo={combo}
            isPaused={false}
            onPause={() => {}}
            showMinimap={true}
          />
          <button onClick={() => setCombo(combo + 1)}>Increase Combo</button>
          <button onClick={() => setCombo(1)}>Reset Combo</button>
        </div>
      );
    };
    
    render(<TestComponentWithCombo />);
    
    // Initially no combo display (combo = 1)
    expect(screen.queryByText('Combo')).not.toBeInTheDocument();
    
    // Increase combo
    fireEvent.click(screen.getByText('Increase Combo'));
    
    await waitFor(() => {
      expect(screen.getByText('x2')).toBeInTheDocument();
      expect(screen.getByText('Combo')).toBeInTheDocument();
    });
    
    // Reset combo
    fireEvent.click(screen.getByText('Reset Combo'));
    
    await waitFor(() => {
      expect(screen.queryByText('Combo')).not.toBeInTheDocument();
    });
  });

  test('low health and fuel warnings appear correctly', async () => {
    const TestComponentWithWarnings = () => {
      const [health, setHealth] = useState(100);
      const [fuel, setFuel] = useState(100);
      
      return (
        <div>
          <GameHUD
            health={health}
            maxHealth={100}
            fuel={fuel}
            maxFuel={100}
            score={15000}
            level={2}
            zombiesKilled={75}
            speed={65}
            distance={3500}
            combo={1}
            isPaused={false}
            onPause={() => {}}
            showMinimap={true}
          />
          <button onClick={() => setHealth(20)}>Low Health</button>
          <button onClick={() => setFuel(15)}>Low Fuel</button>
          <button onClick={() => { setHealth(100); setFuel(100); }}>Reset</button>
        </div>
      );
    };
    
    render(<TestComponentWithWarnings />);
    
    // Initially no warnings
    expect(screen.queryByText('LOW HEALTH!')).not.toBeInTheDocument();
    expect(screen.queryByText('LOW FUEL!')).not.toBeInTheDocument();
    
    // Trigger low health
    fireEvent.click(screen.getByText('Low Health'));
    
    await waitFor(() => {
      expect(screen.getByText('LOW HEALTH!')).toBeInTheDocument();
    });
    
    // Trigger low fuel
    fireEvent.click(screen.getByText('Low Fuel'));
    
    await waitFor(() => {
      expect(screen.getByText('LOW FUEL!')).toBeInTheDocument();
    });
    
    // Reset
    fireEvent.click(screen.getByText('Reset'));
    
    await waitFor(() => {
      expect(screen.queryByText('LOW HEALTH!')).not.toBeInTheDocument();
      expect(screen.queryByText('LOW FUEL!')).not.toBeInTheDocument();
    });
  });
});