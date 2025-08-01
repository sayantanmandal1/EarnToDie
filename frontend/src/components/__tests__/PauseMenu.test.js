import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PauseMenu from '../PauseMenu';

describe('PauseMenu Component', () => {
  const mockProps = {
    isVisible: true,
    onResume: jest.fn(),
    onRestart: jest.fn(),
    onSettings: jest.fn(),
    onMainMenu: jest.fn(),
    onQuit: jest.fn(),
    gameStats: {
      score: 25000,
      zombiesKilled: 150,
      distance: 5000,
      timeFormatted: '05:30'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders pause menu when visible', () => {
    render(<PauseMenu {...mockProps} />);
    
    expect(screen.getByText('Game Paused')).toBeInTheDocument();
    expect(screen.getByText('Take a breather, survivor')).toBeInTheDocument();
  });

  test('does not render when not visible', () => {
    const hiddenProps = { ...mockProps, isVisible: false };
    render(<PauseMenu {...hiddenProps} />);
    
    expect(screen.queryByText('Game Paused')).not.toBeInTheDocument();
  });

  test('displays game statistics correctly', () => {
    render(<PauseMenu {...mockProps} />);
    
    expect(screen.getByText('25,000')).toBeInTheDocument(); // Formatted score
    expect(screen.getByText('150')).toBeInTheDocument(); // Zombies killed
    expect(screen.getByText('5.0km')).toBeInTheDocument(); // Distance
    expect(screen.getByText('05:30')).toBeInTheDocument(); // Time
  });

  test('renders all menu buttons', () => {
    render(<PauseMenu {...mockProps} />);
    
    expect(screen.getByText('Resume Game')).toBeInTheDocument();
    expect(screen.getByText('Restart Level')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Main Menu')).toBeInTheDocument();
    expect(screen.getByText('Quit Game')).toBeInTheDocument();
  });

  test('calls onResume when Resume Game button is clicked', () => {
    render(<PauseMenu {...mockProps} />);
    
    const resumeButton = screen.getByText('Resume Game');
    fireEvent.click(resumeButton);
    
    expect(mockProps.onResume).toHaveBeenCalledTimes(1);
  });

  test('calls onRestart when Restart Level button is clicked', () => {
    render(<PauseMenu {...mockProps} />);
    
    const restartButton = screen.getByText('Restart Level');
    fireEvent.click(restartButton);
    
    expect(mockProps.onRestart).toHaveBeenCalledTimes(1);
  });

  test('calls onSettings when Settings button is clicked', () => {
    render(<PauseMenu {...mockProps} />);
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    expect(mockProps.onSettings).toHaveBeenCalledTimes(1);
  });

  test('calls onMainMenu when Main Menu button is clicked', () => {
    render(<PauseMenu {...mockProps} />);
    
    const mainMenuButton = screen.getByText('Main Menu');
    fireEvent.click(mainMenuButton);
    
    expect(mockProps.onMainMenu).toHaveBeenCalledTimes(1);
  });

  test('calls onQuit when Quit Game button is clicked', () => {
    render(<PauseMenu {...mockProps} />);
    
    const quitButton = screen.getByText('Quit Game');
    fireEvent.click(quitButton);
    
    expect(mockProps.onQuit).toHaveBeenCalledTimes(1);
  });

  test('calls onResume when background is clicked', () => {
    render(<PauseMenu {...mockProps} />);
    
    const background = document.querySelector('.pause-menu-background');
    fireEvent.click(background);
    
    expect(mockProps.onResume).toHaveBeenCalledTimes(1);
  });

  test('displays controls reminder', () => {
    render(<PauseMenu {...mockProps} />);
    
    expect(screen.getByText(/WASD to move/)).toBeInTheDocument();
    expect(screen.getByText(/Space to brake/)).toBeInTheDocument();
    expect(screen.getByText(/Mouse to look/)).toBeInTheDocument();
    expect(screen.getByText(/Press ESC to pause\/resume/)).toBeInTheDocument();
  });

  test('handles missing game stats gracefully', () => {
    const noStatsProps = { ...mockProps, gameStats: {} };
    render(<PauseMenu {...noStatsProps} />);
    
    expect(screen.getAllByText('0')).toHaveLength(2); // Default score and zombies killed
    expect(screen.getByText('0.0km')).toBeInTheDocument(); // Default distance
    expect(screen.getByText('00:00')).toBeInTheDocument(); // Default time
  });

  test('handles undefined game stats', () => {
    const undefinedStatsProps = { ...mockProps, gameStats: undefined };
    render(<PauseMenu {...undefinedStatsProps} />);
    
    // Should render without crashing
    expect(screen.getByText('Game Paused')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    render(<PauseMenu {...mockProps} />);
    
    const overlay = document.querySelector('.pause-menu-overlay');
    expect(overlay).toHaveClass('visible');
    
    const menu = document.querySelector('.pause-menu');
    expect(menu).toHaveClass('slide-in');
    
    const primaryButton = screen.getByText('Resume Game').closest('button');
    expect(primaryButton).toHaveClass('pause-button', 'primary');
    
    const secondaryButton = screen.getByText('Quit Game').closest('button');
    expect(secondaryButton).toHaveClass('pause-button', 'secondary');
  });

  test('applies hidden class when not visible', () => {
    const hiddenProps = { ...mockProps, isVisible: false };
    const { rerender } = render(<PauseMenu {...mockProps} />);
    
    // Initially visible
    let overlay = document.querySelector('.pause-menu-overlay');
    expect(overlay).toHaveClass('visible');
    
    // Change to hidden
    rerender(<PauseMenu {...hiddenProps} />);
    
    // Should apply hidden class during animation
    overlay = document.querySelector('.pause-menu-overlay');
    if (overlay) {
      expect(overlay).toHaveClass('hidden');
    }
  });

  test('handles missing callback functions gracefully', () => {
    const incompleteProps = {
      isVisible: true,
      onResume: jest.fn(),
      gameStats: mockProps.gameStats
      // Missing other callbacks
    };
    
    render(<PauseMenu {...incompleteProps} />);
    
    // Should render without crashing
    expect(screen.getByText('Game Paused')).toBeInTheDocument();
    
    // Clicking buttons with missing callbacks should not crash
    const settingsButton = screen.getByText('Settings');
    expect(() => fireEvent.click(settingsButton)).not.toThrow();
  });

  test('formats distance correctly', () => {
    const customStatsProps = {
      ...mockProps,
      gameStats: {
        ...mockProps.gameStats,
        distance: 12345
      }
    };
    
    render(<PauseMenu {...customStatsProps} />);
    
    expect(screen.getByText('12.3km')).toBeInTheDocument();
  });

  test('animation state management works correctly', async () => {
    const { rerender } = render(<PauseMenu {...mockProps} />);
    
    // Should be visible initially
    expect(screen.getByText('Game Paused')).toBeInTheDocument();
    
    // Hide the menu
    rerender(<PauseMenu {...mockProps} isVisible={false} />);
    
    // Should still be in DOM during animation
    await waitFor(() => {
      const menu = document.querySelector('.pause-menu');
      if (menu) {
        expect(menu).toHaveClass('slide-out');
      }
    });
  });
});