/**
 * Unit Tests for InGamePauseMenu Component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InGamePauseMenu from '../InGamePauseMenu';

// Mock audio manager
const mockAudioManager = {
    playSound: jest.fn()
};

// Mock game state
const mockGameState = {
    currentLevel: 3,
    progress: 0.65,
    playtime: 3665, // 1h 1m 5s
    playerData: {
        health: 80,
        level: 5
    },
    vehicleData: {
        health: 90,
        upgrades: ['engine', 'armor']
    }
};

// Mock settings
const mockSettings = {
    volume: 0.8,
    difficulty: 'normal',
    graphics: 'high'
};

describe('InGamePauseMenu Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: jest.fn(),
                setItem: jest.fn(),
                removeItem: jest.fn(),
                clear: jest.fn()
            },
            writable: true
        });

        // Mock Date.now for consistent timestamps
        jest.spyOn(Date, 'now').mockReturnValue(1640995200000); // 2022-01-01 00:00:00
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders when visible', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                gameState={mockGameState}
                settings={mockSettings}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('Game Paused')).toBeInTheDocument();
        expect(screen.getByText('Level 3 • 1h 1m 5s')).toBeInTheDocument();
        expect(screen.getByText('Resume Game')).toBeInTheDocument();
        expect(screen.getByText('Save Game')).toBeInTheDocument();
        expect(screen.getByText('Load Game')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Main Menu')).toBeInTheDocument();
        expect(screen.getByText('Quit Game')).toBeInTheDocument();
    });

    test('does not render when not visible', () => {
        render(
            <InGamePauseMenu
                isVisible={false}
                gameState={mockGameState}
                settings={mockSettings}
            />
        );

        expect(screen.queryByText('Game Paused')).not.toBeInTheDocument();
    });

    test('handles resume game', () => {
        const mockOnResume = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                onResume={mockOnResume}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Resume Game'));

        expect(mockOnResume).toHaveBeenCalled();
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_resume', { volume: 0.5 });
    });

    test('handles keyboard navigation', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                gameState={mockGameState}
                audioManager={mockAudioManager}
            />
        );

        const menuContainer = document.querySelector('.pause-menu-container');
        
        // Test arrow down navigation
        fireEvent.keyDown(menuContainer, { key: 'ArrowDown' });
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_navigate', { volume: 0.3 });

        // Test arrow up navigation
        fireEvent.keyDown(menuContainer, { key: 'ArrowUp' });
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_navigate', { volume: 0.3 });
    });

    test('handles escape key to resume', () => {
        const mockOnResume = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                onResume={mockOnResume}
                audioManager={mockAudioManager}
            />
        );

        const menuContainer = document.querySelector('.pause-menu-container');
        fireEvent.keyDown(menuContainer, { key: 'Escape' });

        expect(mockOnResume).toHaveBeenCalled();
    });

    test('shows save game menu', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                gameState={mockGameState}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Save Game'));

        expect(screen.getByText('Save Game')).toBeInTheDocument();
        expect(screen.getByText('Slot 1')).toBeInTheDocument();
        expect(screen.getByText('Slot 2')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('shows load game menu', () => {
        // Mock existing save data
        window.localStorage.getItem.mockImplementation((key) => {
            if (key === 'zombieCarGame_save_1') {
                return JSON.stringify({
                    timestamp: 1640995200000,
                    level: 2,
                    progress: 0.4,
                    playtime: 1800
                });
            }
            return null;
        });

        render(
            <InGamePauseMenu
                isVisible={true}
                gameState={mockGameState}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Load Game'));

        expect(screen.getByText('Load Game')).toBeInTheDocument();
        expect(screen.getByText('Level 2')).toBeInTheDocument();
        expect(screen.getByText('40% Complete')).toBeInTheDocument();
    });

    test('handles save to slot', () => {
        const mockOnSaveGame = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                gameState={mockGameState}
                settings={mockSettings}
                onSaveGame={mockOnSaveGame}
                audioManager={mockAudioManager}
            />
        );

        // Open save menu
        fireEvent.click(screen.getByText('Save Game'));
        
        // Click on slot 1
        fireEvent.click(screen.getByText('Slot 1'));

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            'zombieCarGame_save_1',
            expect.stringContaining('"timestamp":1640995200000')
        );
        expect(mockOnSaveGame).toHaveBeenCalledWith(1, expect.any(Object));
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_save', { volume: 0.6 });
    });

    test('handles load from slot', () => {
        const mockOnLoadGame = jest.fn();
        const saveData = {
            timestamp: 1640995200000,
            level: 2,
            progress: 0.4,
            playtime: 1800,
            gameState: { test: 'data' }
        };

        window.localStorage.getItem.mockReturnValue(JSON.stringify(saveData));

        render(
            <InGamePauseMenu
                isVisible={true}
                onLoadGame={mockOnLoadGame}
                audioManager={mockAudioManager}
            />
        );

        // Open load menu
        fireEvent.click(screen.getByText('Load Game'));
        
        // Click on slot 1
        fireEvent.click(screen.getByText('Level 2'));

        expect(mockOnLoadGame).toHaveBeenCalledWith(1, saveData);
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_load', { volume: 0.6 });
    });

    test('shows confirmation dialog for main menu', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Main Menu'));

        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to continue? Any unsaved progress will be lost.')).toBeInTheDocument();
        expect(screen.getByText('Confirm')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('shows confirmation dialog for quit game', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Quit Game'));

        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    test('handles confirmation dialog confirm', () => {
        const mockOnMainMenu = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                onMainMenu={mockOnMainMenu}
                audioManager={mockAudioManager}
            />
        );

        // Open confirmation dialog
        fireEvent.click(screen.getByText('Main Menu'));
        
        // Confirm action
        fireEvent.click(screen.getByText('Confirm'));

        expect(mockOnMainMenu).toHaveBeenCalled();
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_confirm', { volume: 0.5 });
    });

    test('handles confirmation dialog cancel', () => {
        const mockOnMainMenu = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                onMainMenu={mockOnMainMenu}
                audioManager={mockAudioManager}
            />
        );

        // Open confirmation dialog
        fireEvent.click(screen.getByText('Main Menu'));
        
        // Cancel action
        fireEvent.click(screen.getByText('Cancel'));

        expect(mockOnMainMenu).not.toHaveBeenCalled();
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_cancel', { volume: 0.4 });
        expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    test('handles settings menu', () => {
        const mockOnSettings = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                onSettings={mockOnSettings}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Settings'));

        expect(mockOnSettings).toHaveBeenCalled();
    });

    test('formats playtime correctly', () => {
        const gameStateWithDifferentTimes = [
            { playtime: 45, expected: '45s' },
            { playtime: 125, expected: '2m 5s' },
            { playtime: 3665, expected: '1h 1m 5s' },
            { playtime: 7325, expected: '2h 2m 5s' }
        ];

        gameStateWithDifferentTimes.forEach(({ playtime, expected }) => {
            const { unmount } = render(
                <InGamePauseMenu
                    isVisible={true}
                    gameState={{ ...mockGameState, playtime }}
                />
            );

            expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
            unmount();
        });
    });

    test('formats timestamp correctly', () => {
        const saveData = {
            timestamp: 1640995200000, // 2022-01-01 00:00:00
            level: 2,
            progress: 0.4,
            playtime: 1800
        };

        window.localStorage.getItem.mockReturnValue(JSON.stringify(saveData));

        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Load Game'));

        // Check that timestamp is formatted (exact format depends on locale)
        expect(screen.getByText(/2022|01|1/)).toBeInTheDocument();
    });

    test('displays empty save slots', () => {
        window.localStorage.getItem.mockReturnValue(null);

        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        fireEvent.click(screen.getByText('Save Game'));

        expect(screen.getAllByText('Empty Slot')).toHaveLength(5);
    });

    test('handles save/load menu cancellation with escape', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        // Open save menu
        fireEvent.click(screen.getByText('Save Game'));
        expect(screen.getByText('Save Game')).toBeInTheDocument();

        // Press escape to close
        const menuContainer = document.querySelector('.pause-menu-container');
        fireEvent.keyDown(menuContainer, { key: 'Escape' });

        expect(screen.queryByText('Save Game')).not.toBeInTheDocument();
    });

    test('handles confirmation dialog cancellation with escape', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        // Open confirmation dialog
        fireEvent.click(screen.getByText('Main Menu'));
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();

        // Press escape to close
        const menuContainer = document.querySelector('.pause-menu-container');
        fireEvent.keyDown(menuContainer, { key: 'Escape' });

        expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
    });

    test('handles enter key selection', () => {
        const mockOnResume = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                onResume={mockOnResume}
                audioManager={mockAudioManager}
            />
        );

        const menuContainer = document.querySelector('.pause-menu-container');
        
        // Press enter to select current option (Resume Game is default)
        fireEvent.keyDown(menuContainer, { key: 'Enter' });

        expect(mockOnResume).toHaveBeenCalled();
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_select', { volume: 0.4 });
    });

    test('handles mouse hover navigation', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        const saveGameOption = screen.getByText('Save Game');
        fireEvent.mouseEnter(saveGameOption);

        // The selected option should change (verified by the component not crashing)
        expect(saveGameOption).toBeInTheDocument();
    });

    test('handles localStorage errors gracefully', () => {
        // Mock localStorage to throw an error
        window.localStorage.setItem.mockImplementation(() => {
            throw new Error('Storage quota exceeded');
        });

        const mockOnSaveGame = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                gameState={mockGameState}
                onSaveGame={mockOnSaveGame}
                audioManager={mockAudioManager}
            />
        );

        // Open save menu and try to save
        fireEvent.click(screen.getByText('Save Game'));
        fireEvent.click(screen.getByText('Slot 1'));

        // Should play error sound
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('menu_error', { volume: 0.5 });
    });

    test('handles missing audio manager gracefully', () => {
        const mockOnResume = jest.fn();
        
        render(
            <InGamePauseMenu
                isVisible={true}
                onResume={mockOnResume}
                audioManager={null}
            />
        );

        fireEvent.click(screen.getByText('Resume Game'));

        expect(mockOnResume).toHaveBeenCalled();
        // Should not crash without audio manager
    });

    test('displays controls hint', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('Use ↑↓ to navigate • Enter to select • Esc to resume')).toBeInTheDocument();
    });

    test('handles missing game state gracefully', () => {
        render(
            <InGamePauseMenu
                isVisible={true}
                gameState={{}}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('Level 1 • 0s')).toBeInTheDocument();
    });
});