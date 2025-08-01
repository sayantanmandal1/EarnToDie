import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameHUD from '../GameHUD';

describe('GameHUD Component', () => {
  const mockProps = {
    health: 75,
    maxHealth: 100,
    fuel: 60,
    maxFuel: 100,
    score: 12500,
    level: 3,
    zombiesKilled: 45,
    speed: 85,
    distance: 2500,
    combo: 5,
    isPaused: false,
    onPause: jest.fn(),
    showMinimap: true,
    minimapData: {
      zombies: [
        { x: 25, y: 30 },
        { x: 75, y: 60 }
      ],
      obstacles: [
        { x: 50, y: 40 }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders HUD with correct health and fuel values', () => {
    render(<GameHUD {...mockProps} />);
    
    expect(screen.getByText('75/100')).toBeInTheDocument();
    expect(screen.getByText('60/100')).toBeInTheDocument();
  });

  test('displays score and level correctly', () => {
    render(<GameHUD {...mockProps} />);
    
    expect(screen.getByText('12.5K')).toBeInTheDocument(); // Formatted score
    expect(screen.getByText('3')).toBeInTheDocument(); // Level
  });

  test('shows combo multiplier when combo > 1', () => {
    render(<GameHUD {...mockProps} />);
    
    expect(screen.getByText('x5')).toBeInTheDocument();
    expect(screen.getByText('Combo')).toBeInTheDocument();
  });

  test('hides combo multiplier when combo <= 1', () => {
    const propsWithoutCombo = { ...mockProps, combo: 1 };
    render(<GameHUD {...propsWithoutCombo} />);
    
    expect(screen.queryByText('x1')).not.toBeInTheDocument();
    expect(screen.queryByText('Combo')).not.toBeInTheDocument();
  });

  test('displays speed correctly', () => {
    render(<GameHUD {...mockProps} />);
    
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('km/h')).toBeInTheDocument();
  });

  test('shows zombies killed and distance', () => {
    render(<GameHUD {...mockProps} />);
    
    expect(screen.getByText('Killed: 45')).toBeInTheDocument();
    expect(screen.getByText('Distance: 2.5km')).toBeInTheDocument();
  });

  test('calls onPause when pause button is clicked', () => {
    render(<GameHUD {...mockProps} />);
    
    const pauseButton = screen.getByTitle('Pause Game (ESC)');
    fireEvent.click(pauseButton);
    
    expect(mockProps.onPause).toHaveBeenCalledTimes(1);
  });

  test('applies paused class when isPaused is true', () => {
    const pausedProps = { ...mockProps, isPaused: true };
    render(<GameHUD {...pausedProps} />);
    
    const hud = document.querySelector('.game-hud');
    expect(hud).toHaveClass('paused');
  });

  test('shows low health warning when health is below 25%', () => {
    const lowHealthProps = { ...mockProps, health: 20 };
    render(<GameHUD {...lowHealthProps} />);
    
    expect(screen.getByText('LOW HEALTH!')).toBeInTheDocument();
    
    const healthBar = document.querySelector('.health-bar');
    expect(healthBar).toHaveClass('critical');
  });

  test('shows low fuel warning when fuel is below 25%', () => {
    const lowFuelProps = { ...mockProps, fuel: 15 };
    render(<GameHUD {...lowFuelProps} />);
    
    expect(screen.getByText('LOW FUEL!')).toBeInTheDocument();
    
    const fuelBar = document.querySelector('.fuel-bar');
    expect(fuelBar).toHaveClass('critical');
  });

  test('formats large numbers correctly', () => {
    const highScoreProps = { ...mockProps, score: 1500000 };
    render(<GameHUD {...highScoreProps} />);
    
    expect(screen.getByText('1.5M')).toBeInTheDocument();
  });

  test('renders minimap when showMinimap is true', () => {
    render(<GameHUD {...mockProps} />);
    
    expect(screen.getByText('Map')).toBeInTheDocument();
    
    const minimap = document.querySelector('.minimap');
    expect(minimap).toBeInTheDocument();
    
    const playerDot = document.querySelector('.player-dot');
    expect(playerDot).toBeInTheDocument();
  });

  test('hides minimap when showMinimap is false', () => {
    const noMinimapProps = { ...mockProps, showMinimap: false };
    render(<GameHUD {...noMinimapProps} />);
    
    const minimap = document.querySelector('.minimap');
    expect(minimap).not.toBeInTheDocument();
  });

  test('renders zombie and obstacle dots on minimap', () => {
    render(<GameHUD {...mockProps} />);
    
    const zombieDots = document.querySelectorAll('.zombie-dot');
    expect(zombieDots).toHaveLength(2);
    
    const obstacleDots = document.querySelectorAll('.obstacle-dot');
    expect(obstacleDots).toHaveLength(1);
  });

  test('handles missing minimap data gracefully', () => {
    const noMinimapDataProps = { ...mockProps, minimapData: null };
    render(<GameHUD {...noMinimapDataProps} />);
    
    // Should render without crashing
    expect(screen.getByText('Map')).toBeInTheDocument();
    
    // Should not have zombie or obstacle dots
    const zombieDots = document.querySelectorAll('.zombie-dot');
    expect(zombieDots).toHaveLength(0);
  });

  test('calculates health and fuel percentages correctly', () => {
    render(<GameHUD {...mockProps} />);
    
    const healthFill = document.querySelector('.health-fill');
    expect(healthFill).toHaveStyle('width: 75%');
    
    const fuelFill = document.querySelector('.fuel-fill');
    expect(fuelFill).toHaveStyle('width: 60%');
  });

  test('handles zero and negative values gracefully', () => {
    const edgeCaseProps = {
      ...mockProps,
      health: 0,
      fuel: -10,
      score: 0,
      speed: 0,
      zombiesKilled: 0,
      distance: 0
    };
    
    render(<GameHUD {...edgeCaseProps} />);
    
    expect(screen.getByText('0/100')).toBeInTheDocument(); // Health
    expect(screen.getAllByText('0')).toHaveLength(2); // Score and Speed both show 0
    expect(screen.getByText('Killed: 0')).toBeInTheDocument();
    expect(screen.getByText('Distance: 0.0km')).toBeInTheDocument();
  });

  test('speed bar width is calculated correctly', () => {
    render(<GameHUD {...mockProps} />);
    
    const speedFill = document.querySelector('.speed-fill');
    // Speed is 85, max display is 200, so 85/200 * 100 = 42.5%
    expect(speedFill).toHaveStyle('width: 42.5%');
  });

  test('speed bar caps at 100% for high speeds', () => {
    const highSpeedProps = { ...mockProps, speed: 250 };
    render(<GameHUD {...highSpeedProps} />);
    
    const speedFill = document.querySelector('.speed-fill');
    expect(speedFill).toHaveStyle('width: 100%');
  });
});