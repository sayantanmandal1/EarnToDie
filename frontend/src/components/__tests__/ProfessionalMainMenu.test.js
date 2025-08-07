/**
 * Professional Main Menu Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfessionalMainMenu from '../ProfessionalMainMenu';

// Mock audio manager
const mockAudioManager = {
    loadSound: jest.fn().mockResolvedValue(true),
    playSound: jest.fn(),
    stopSound: jest.fn()
};

// Mock visual effects manager
const mockVisualEffectsManager = {
    addEffect: jest.fn(),
    removeEffect: jest.fn()
};

// Mock game data
const mockGameData = {
    version: '1.0.0',
    hasSaveGame: true,
    zombiesKilled: 1250,
    distanceTraveled: 45.7,
    bestScore: 98500,
    playerName: 'TestPlayer',
    playerLevel: 15,
    experience: 7500,
    recentAchievements: [
        { icon: '🏆', name: 'First Blood' },
        { icon: '🚗', name: 'Speed Demon' },
        { icon: '🧟', name: 'Zombie Hunter' }
    ],
    achievements: [
        {
            icon: '🏆',
            name: 'First Blood',
            description: 'Kill your first zombie',
            unlocked: true,
            unlockedAt: '2024-01-15T10:30:00Z'
        },
        {
            icon: '🔒',
            name: 'Master Survivor',
            description: 'Survive 100 waves',
            unlocked: false
        }
    ],
    achievementsUnlocked: 15,
    totalAchievements: 50
};

describe('ProfessionalMainMenu', () => {
    let mockCallbacks;

    beforeEach(() => {
        mockCallbacks = {
            onStartGame: jest.fn(),
            onLoadGame: jest.fn(),
            onSettings: jest.fn(),
            onProfile: jest.fn(),
            onQuit: jest.fn()
        };

        // Mock canvas context
        HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
            fillStyle: '',
            fillRect: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            canvas: { width: 1920, height: 1080 }
        }));

        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
        global.cancelAnimationFrame = jest.fn();

        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1920
        });
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 1080
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('Initialization', () => {
        test('should render intro screen initially', () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                    visualEffectsManager={mockVisualEffectsManager}
                />
            );

            expect(screen.getByText('ZOMBIE CAR GAME')).toBeInTheDocument();
            expect(screen.getByText('Survive the Apocalypse')).toBeInTheDocument();
            expect(screen.getByText('Skip Intro')).toBeInTheDocument();
        });

        test('should initialize background canvas', () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const canvas = document.querySelector('.background-canvas');
            expect(canvas).toBeInTheDocument();
        });

        test('should load menu audio on initialization', async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            await act(async () => {
                expect(mockAudioManager.loadSound).toHaveBeenCalledWith(
                    'menu_ambient',
                    '/audio/menu/ambient_music.ogg'
                );
            });
        });
    });

    describe('Intro Sequence', () => {
        test('should skip intro when skip button is clicked', async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                expect(screen.getByText('New Game')).toBeInTheDocument();
            });
        });

        test('should transition to main menu after intro completion', async () => {
            jest.useFakeTimers();

            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            // Fast-forward through intro timeline
            jest.advanceTimersByTime(8000);

            await act(async () => {
                expect(screen.getByText('New Game')).toBeInTheDocument();
            });

            jest.useRealTimers();
        });

        test('should play intro animations in sequence', () => {
            jest.useFakeTimers();

            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            // Check initial state
            const logo = document.querySelector('.intro-logo');
            expect(logo).toHaveStyle('transform: scale(0)');

            // Advance to logo animation
            jest.advanceTimersByTime(500);
            expect(logo).toHaveStyle('transform: scale(1)');

            jest.useRealTimers();
        });
    });

    describe('Main Menu Navigation', () => {
        beforeEach(async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            // Skip intro to get to main menu
            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                expect(screen.getByText('New Game')).toBeInTheDocument();
            });
        });

        test('should render all main menu items', () => {
            expect(screen.getByText('New Game')).toBeInTheDocument();
            expect(screen.getByText('Continue')).toBeInTheDocument();
            expect(screen.getByText('Profile')).toBeInTheDocument();
            expect(screen.getByText('Settings')).toBeInTheDocument();
            expect(screen.getByText('Credits')).toBeInTheDocument();
            expect(screen.getByText('Quit')).toBeInTheDocument();
        });

        test('should call onStartGame when New Game is clicked', () => {
            const newGameButton = screen.getByText('New Game');
            fireEvent.click(newGameButton);

            expect(mockCallbacks.onStartGame).toHaveBeenCalled();
        });

        test('should call onLoadGame when Continue is clicked', () => {
            const continueButton = screen.getByText('Continue');
            fireEvent.click(continueButton);

            expect(mockCallbacks.onLoadGame).toHaveBeenCalled();
        });

        test('should disable Continue button when no save game exists', () => {
            const gameDataWithoutSave = { ...mockGameData, hasSaveGame: false };
            
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={gameDataWithoutSave}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            waitFor(() => {
                const continueButton = screen.getByText('Continue');
                expect(continueButton).toBeDisabled();
            });
        });

        test('should call onQuit when Quit is clicked', () => {
            const quitButton = screen.getByText('Quit');
            fireEvent.click(quitButton);

            expect(mockCallbacks.onQuit).toHaveBeenCalled();
        });

        test('should play hover sound on menu item hover', () => {
            const newGameButton = screen.getByText('New Game');
            fireEvent.mouseEnter(newGameButton);

            expect(mockAudioManager.playSound).toHaveBeenCalledWith(
                'menu_hover',
                { volume: 0.3 }
            );
        });

        test('should play click sound on menu item click', () => {
            const newGameButton = screen.getByText('New Game');
            fireEvent.click(newGameButton);

            expect(mockAudioManager.playSound).toHaveBeenCalledWith(
                'menu_click',
                { volume: 0.5 }
            );
        });
    });

    describe('Game Statistics Display', () => {
        beforeEach(async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                expect(screen.getByText('New Game')).toBeInTheDocument();
            });
        });

        test('should display quick stats', () => {
            expect(screen.getByText('Quick Stats')).toBeInTheDocument();
            expect(screen.getByText('1250')).toBeInTheDocument(); // Zombies killed
            expect(screen.getByText('45.7 km')).toBeInTheDocument(); // Distance traveled
            expect(screen.getByText('98500')).toBeInTheDocument(); // Best score
        });

        test('should display recent achievements', () => {
            expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
            expect(screen.getByText('First Blood')).toBeInTheDocument();
            expect(screen.getByText('Speed Demon')).toBeInTheDocument();
            expect(screen.getByText('Zombie Hunter')).toBeInTheDocument();
        });

        test('should show version information', () => {
            expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
        });
    });

    describe('Profile Screen', () => {
        beforeEach(async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                expect(screen.getByText('Profile')).toBeInTheDocument();
            });

            const profileButton = screen.getByText('Profile');
            fireEvent.click(profileButton);
        });

        test('should navigate to profile screen', async () => {
            await act(async () => {
                expect(screen.getByText('Player Profile')).toBeInTheDocument();
            });
        });

        test('should display player information', async () => {
            await act(async () => {
                expect(screen.getByText('TestPlayer')).toBeInTheDocument();
                expect(screen.getByText('Level 15')).toBeInTheDocument();
            });
        });

        test('should display detailed statistics', async () => {
            await act(async () => {
                expect(screen.getByText('Detailed Statistics')).toBeInTheDocument();
                expect(screen.getByText('Combat')).toBeInTheDocument();
                expect(screen.getByText('Exploration')).toBeInTheDocument();
                expect(screen.getByText('Survival')).toBeInTheDocument();
            });
        });

        test('should display achievements section', async () => {
            await act(async () => {
                expect(screen.getByText('Achievements (15/50)')).toBeInTheDocument();
            });
        });

        test('should navigate back to main menu', async () => {
            await act(async () => {
                const backButton = screen.getByText('← Back');
                fireEvent.click(backButton);
            });

            await act(async () => {
                expect(screen.getByText('New Game')).toBeInTheDocument();
            });
        });
    });

    describe('Settings Screen', () => {
        beforeEach(async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                const settingsButton = screen.getByText('Settings');
                fireEvent.click(settingsButton);
            });
        });

        test('should navigate to settings screen', async () => {
            await act(async () => {
                expect(screen.getByText('Settings')).toBeInTheDocument();
            });
        });

        test('should display settings tabs', async () => {
            await act(async () => {
                expect(screen.getByText('Graphics')).toBeInTheDocument();
                expect(screen.getByText('Audio')).toBeInTheDocument();
                expect(screen.getByText('Controls')).toBeInTheDocument();
                expect(screen.getByText('Gameplay')).toBeInTheDocument();
            });
        });
    });

    describe('Credits Screen', () => {
        beforeEach(async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                const creditsButton = screen.getByText('Credits');
                fireEvent.click(creditsButton);
            });
        });

        test('should navigate to credits screen', async () => {
            await act(async () => {
                expect(screen.getByText('Credits')).toBeInTheDocument();
            });
        });

        test('should display credits sections', async () => {
            await act(async () => {
                expect(screen.getByText('Development Team')).toBeInTheDocument();
                expect(screen.getByText('Special Thanks')).toBeInTheDocument();
                expect(screen.getByText('Assets')).toBeInTheDocument();
            });
        });
    });

    describe('Screen Transitions', () => {
        test('should handle screen transitions with fade effects', async () => {
            jest.useFakeTimers();

            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                const profileButton = screen.getByText('Profile');
                fireEvent.click(profileButton);
            });

            // Check transition state
            const menuElement = document.querySelector('.professional-main-menu');
            expect(menuElement).toHaveClass('transitioning');

            // Advance through transition
            jest.advanceTimersByTime(600);

            await act(async () => {
                expect(screen.getByText('Player Profile')).toBeInTheDocument();
            });

            jest.useRealTimers();
        });

        test('should play transition sound during screen changes', async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                const profileButton = screen.getByText('Profile');
                fireEvent.click(profileButton);
            });

            expect(mockAudioManager.playSound).toHaveBeenCalledWith(
                'menu_transition',
                { volume: 0.5 }
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle missing audio manager gracefully', () => {
            expect(() => {
                render(
                    <ProfessionalMainMenu
                        {...mockCallbacks}
                        gameData={mockGameData}
                        audioManager={null}
                    />
                );
            }).not.toThrow();
        });

        test('should handle missing game data gracefully', () => {
            expect(() => {
                render(
                    <ProfessionalMainMenu
                        {...mockCallbacks}
                        gameData={{}}
                        audioManager={mockAudioManager}
                    />
                );
            }).not.toThrow();
        });

        test('should handle audio loading failures', async () => {
            const failingAudioManager = {
                ...mockAudioManager,
                loadSound: jest.fn().mockRejectedValue(new Error('Audio load failed'))
            };

            expect(() => {
                render(
                    <ProfessionalMainMenu
                        {...mockCallbacks}
                        gameData={mockGameData}
                        audioManager={failingAudioManager}
                    />
                );
            }).not.toThrow();
        });
    });

    describe('Responsive Design', () => {
        test('should adapt to mobile screen sizes', () => {
            // Mock mobile dimensions
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 768
            });

            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            // Component should render without errors on mobile
            expect(screen.getByText('ZOMBIE CAR GAME')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        test('should have proper ARIA labels and roles', async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                const buttons = screen.getAllByRole('button');
                expect(buttons.length).toBeGreaterThan(0);
            });
        });

        test('should support keyboard navigation', async () => {
            render(
                <ProfessionalMainMenu
                    {...mockCallbacks}
                    gameData={mockGameData}
                    audioManager={mockAudioManager}
                />
            );

            const skipButton = screen.getByText('Skip Intro');
            fireEvent.click(skipButton);

            await act(async () => {
                const newGameButton = screen.getByText('New Game');
                newGameButton.focus();
                expect(document.activeElement).toBe(newGameButton);
            });
        });
    });
});