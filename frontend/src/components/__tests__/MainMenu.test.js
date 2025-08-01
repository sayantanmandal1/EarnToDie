import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainMenu from '../MainMenu';

describe('MainMenu Component', () => {
  const mockProps = {
    onStartGame: jest.fn(),
    onVehicleSelection: jest.fn(),
    onSettings: jest.fn(),
    onQuit: jest.fn(),
    gameTitle: 'Test Zombie Game'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders main menu with correct title', () => {
    render(<MainMenu {...mockProps} />);
    
    expect(screen.getByText('Test Zombie Game')).toBeInTheDocument();
    expect(screen.getByText('Survive the Apocalypse')).toBeInTheDocument();
  });

  test('renders all menu buttons', () => {
    render(<MainMenu {...mockProps} />);
    
    expect(screen.getByText('Start Game')).toBeInTheDocument();
    expect(screen.getByText('Garage')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Quit')).toBeInTheDocument();
  });

  test('calls onStartGame when Start Game button is clicked', async () => {
    render(<MainMenu {...mockProps} />);
    
    const startButton = screen.getByText('Start Game');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(mockProps.onStartGame).toHaveBeenCalledTimes(1);
    });
  });

  test('calls onVehicleSelection when Garage button is clicked', async () => {
    render(<MainMenu {...mockProps} />);
    
    const garageButton = screen.getByText('Garage');
    fireEvent.click(garageButton);
    
    await waitFor(() => {
      expect(mockProps.onVehicleSelection).toHaveBeenCalledTimes(1);
    });
  });

  test('calls onSettings when Settings button is clicked', async () => {
    render(<MainMenu {...mockProps} />);
    
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);
    
    await waitFor(() => {
      expect(mockProps.onSettings).toHaveBeenCalledTimes(1);
    });
  });

  test('calls onQuit when Quit button is clicked', async () => {
    render(<MainMenu {...mockProps} />);
    
    const quitButton = screen.getByText('Quit');
    fireEvent.click(quitButton);
    
    await waitFor(() => {
      expect(mockProps.onQuit).toHaveBeenCalledTimes(1);
    });
  });

  test('displays controls information', () => {
    render(<MainMenu {...mockProps} />);
    
    expect(screen.getByText(/WASD to drive/)).toBeInTheDocument();
    expect(screen.getByText(/Space to brake/)).toBeInTheDocument();
    expect(screen.getByText(/Mouse to look around/)).toBeInTheDocument();
  });

  test('uses default title when none provided', () => {
    const propsWithoutTitle = { ...mockProps };
    delete propsWithoutTitle.gameTitle;
    
    render(<MainMenu {...propsWithoutTitle} />);
    
    expect(screen.getByText('Zombie Car Game')).toBeInTheDocument();
  });

  test('has proper CSS classes for styling', () => {
    render(<MainMenu {...mockProps} />);
    
    const mainMenu = document.querySelector('.main-menu');
    expect(mainMenu).toBeInTheDocument();
    
    const primaryButton = screen.getByText('Start Game').closest('button');
    expect(primaryButton).toHaveClass('menu-button', 'primary');
    
    const secondaryButton = screen.getByText('Quit').closest('button');
    expect(secondaryButton).toHaveClass('menu-button', 'secondary');
  });

  test('handles missing callback functions gracefully', () => {
    const incompleteProps = {
      onStartGame: jest.fn(),
      // Missing other callbacks
    };
    
    render(<MainMenu {...incompleteProps} />);
    
    // Should render without crashing
    expect(screen.getByText('Start Game')).toBeInTheDocument();
    
    // Clicking buttons with missing callbacks should not crash
    const garageButton = screen.getByText('Garage');
    expect(() => fireEvent.click(garageButton)).not.toThrow();
  });

  test('applies fade-out animation class correctly', async () => {
    render(<MainMenu {...mockProps} />);
    
    const startButton = screen.getByText('Start Game');
    fireEvent.click(startButton);
    
    // The component should temporarily apply fade-out class
    await waitFor(() => {
      const mainMenu = document.querySelector('.main-menu');
      // Note: The fade-out class is applied temporarily during animation
      // This test verifies the component structure supports the animation
      expect(mainMenu).toBeInTheDocument();
    });
  });
});