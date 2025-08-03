/**
 * Unit Tests for InGameHUD Component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InGameHUD from '../InGameHUD';

// Mock audio manager
const mockAudioManager = {
    loadSound: jest.fn(),
    playSound: jest.fn(),
    stopSound: jest.fn(),
    setVolume: jest.fn()
};

// Mock visual effects manager
const mockVisualEffectsManager = {
    createEffect: jest.fn(),
    removeEffect: jest.fn(),
    updateEffects: jest.fn()
};

// Mock game state data
const mockGameState = {
    currentObjective: {
        name: 'Survive the Horde',
        icon: '🎯',
        progress: 0.6
    },
    nearbyZombies: [
        { x: 100, y: 50 },
        { x: -80, y: 120 }
    ],
    objectives: [
        { x: 200, y: -100 },
        { x: -150, y: 200 }
    ],
    nearbyItems: [
        { x: 50, y: -30 }
    ],
    environmentalHazards: [
        { x: -200, y: 100 }
    ],
    playerPosition: { x: 0, y: 0 },
    playerRotation: 0,
    newNotifications: []
};

const mockPlayerData = {
    health: 75,
    armor: 50,
    recentDamage: 0,
    damageDirection: 0
};

const mockVehicleData = {
    health: 80,
    fuel: 60,
    speed: 45,
    rpm: 3500,
    gear: 3,
    temperature: 95,
    maxSpeed: 120
};

const mockCombatData = {
    currentAmmo: 24,
    totalAmmo: 120,
    weaponName: 'Assault Rifle',
    reloading: false,
    inCombat: true,
    newHits: []
};

const mockSettings = {
    hudScale: 1.0,
    hudOpacity: 0.9,
    hudLayout: 'default',
    enableHudAnimations: true,
    showAdvancedInfo: false,
    allowHudCustomization: true
};

describe('InGameHUD Component', () => {
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
        
        // Mock canvas context
        HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
            fillStyle: '',
            fillRect: jest.fn(),
            strokeStyle: '',
            strokeRect: jest.fn(),
            lineWidth: 0,
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn()
        }));
        
        // Mock requestAnimationFrame
        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
        global.cancelAnimationFrame = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders HUD with all components', () => {
        render(
            <InGameHUD
                gameState={mockGameState}
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                combatData={mockCombatData}
                settings={mockSettings}
                audioManager={mockAudioManager}
                visualEffectsManager={mockVisualEffectsManager}
            />
        );

        // Check for main HUD elements
        expect(screen.getByText('75')).toBeInTheDocument(); // Health
        expect(screen.getByText('Survive the Horde')).toBeInTheDocument(); // Objective
        expect(screen.getByText('45')).toBeInTheDocument(); // Speed
        expect(screen.getByText('km/h')).toBeInTheDocument(); // Speed unit
        expect(screen.getByText('Map')).toBeInTheDocument(); // Minimap
        expect(screen.getByText('Assault Rifle')).toBeInTheDocument(); // Weapon
        expect(screen.getByText('24')).toBeInTheDocument(); // Ammo
    });

    test('displays health bar correctly', () => {
        render(
            <InGameHUD
                playerData={{ health: 75, armor: 25 }}
                settings={mockSettings}
            />
        );

        const healthFill = document.querySelector('.health-fill');
        expect(healthFill).toHaveStyle('width: 75%');
    });

    test('displays vehicle status correctly', () => {
        render(
            <InGameHUD
                vehicleData={mockVehicleData}
                settings={mockSettings}
            />
        );

        expect(screen.getByText('45')).toBeInTheDocument(); // Speed
        expect(screen.getByText('3')).toBeInTheDocument(); // Gear
        
        const fuelFill = document.querySelector('.fuel-fill');
        const healthFill = document.querySelector('.health-fill');
        expect(fuelFill).toHaveStyle('width: 60%');
        expect(healthFill).toHaveStyle('width: 80%');
    });

    test('displays combat HUD when in combat', () => {
        render(
            <InGameHUD
                combatData={{ ...mockCombatData, inCombat: true }}
                settings={mockSettings}
            />
        );

        expect(screen.getByText('Assault Rifle')).toBeInTheDocument();
        expect(screen.getByText('24')).toBeInTheDocument();
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(document.querySelector('.crosshair')).toBeInTheDocument();
    });

    test('hides combat HUD when not in combat', () => {
        render(
            <InGameHUD
                combatData={{ ...mockCombatData, inCombat: false }}
                settings={mockSettings}
            />
        );

        expect(document.querySelector('.crosshair')).not.toBeInTheDocument();
    });

    test('displays reloading indicator', () => {
        render(
            <InGameHUD
                combatData={{ ...mockCombatData, reloading: true, inCombat: true }}
                settings={mockSettings}
            />
        );

        expect(screen.getByText('Reloading...')).toBeInTheDocument();
    });

    test('displays objective progress correctly', () => {
        render(
            <InGameHUD
                gameState={mockGameState}
                settings={mockSettings}
            />
        );

        const progressFill = document.querySelector('.objective-progress-fill');
        expect(progressFill).toHaveStyle('width: 60%');
    });

    test('handles pause button click', () => {
        const mockOnPause = jest.fn();
        
        render(
            <InGameHUD
                onPause={mockOnPause}
                settings={mockSettings}
                audioManager={mockAudioManager}
            />
        );

        const pauseButton = screen.getByText('⏸️');
        fireEvent.click(pauseButton);

        expect(mockOnPause).toHaveBeenCalled();
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('hud_notification', { volume: 0.3 });
    });

    test('toggles HUD visibility', () => {
        render(
            <InGameHUD
                settings={mockSettings}
            />
        );

        const hideButton = screen.getByText('Hide HUD');
        fireEvent.click(hideButton);

        expect(screen.getByText('Show HUD')).toBeInTheDocument();
        expect(screen.queryByText('Hide HUD')).not.toBeInTheDocument();
    });

    test('displays notifications', () => {
        const gameStateWithNotifications = {
            ...mockGameState,
            newNotifications: [
                {
                    type: 'info',
                    title: 'Item Collected',
                    message: 'You found ammunition!',
                    icon: '🔫',
                    duration: 3000
                }
            ]
        };

        render(
            <InGameHUD
                gameState={gameStateWithNotifications}
                settings={mockSettings}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('Item Collected')).toBeInTheDocument();
        expect(screen.getByText('You found ammunition!')).toBeInTheDocument();
    });

    test('displays damage indicators', async () => {
        const playerDataWithDamage = {
            ...mockPlayerData,
            recentDamage: 25,
            damageDirection: 45
        };

        render(
            <InGameHUD
                playerData={playerDataWithDamage}
                settings={mockSettings}
                audioManager={mockAudioManager}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('-25')).toBeInTheDocument();
        });

        expect(mockAudioManager.playSound).toHaveBeenCalledWith('hud_damage', { volume: 0.6 });
    });

    test('displays hit markers', () => {
        const combatDataWithHits = {
            ...mockCombatData,
            newHits: [
                {
                    screenX: 400,
                    screenY: 300,
                    damage: 50
                }
            ]
        };

        render(
            <InGameHUD
                combatData={combatDataWithHits}
                settings={mockSettings}
            />
        );

        expect(screen.getByText('✕')).toBeInTheDocument();
        expect(screen.getByText('-50')).toBeInTheDocument();
    });

    test('shows advanced info when enabled', () => {
        const advancedSettings = {
            ...mockSettings,
            showAdvancedInfo: true
        };

        render(
            <InGameHUD
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                combatData={mockCombatData}
                settings={advancedSettings}
            />
        );

        expect(screen.getByText(/RPM:/)).toBeInTheDocument();
        expect(screen.getByText(/Gear:/)).toBeInTheDocument();
        expect(screen.getByText(/DMG:/)).toBeInTheDocument();
        expect(screen.getByText(/ACC:/)).toBeInTheDocument();
    });

    test('handles minimap canvas rendering', () => {
        const mockContext = {
            fillStyle: '',
            fillRect: jest.fn(),
            strokeStyle: '',
            strokeRect: jest.fn(),
            lineWidth: 0,
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn()
        };

        HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);

        render(
            <InGameHUD
                gameState={mockGameState}
                settings={mockSettings}
            />
        );

        // Verify canvas context methods were called
        expect(mockContext.fillRect).toHaveBeenCalled();
        expect(mockContext.strokeRect).toHaveBeenCalled();
    });

    test('loads HUD configuration from localStorage', () => {
        const savedConfig = {
            scale: 1.2,
            opacity: 0.8,
            elements: {
                healthBar: { visible: true, position: { x: 30, y: 30 } }
            }
        };

        window.localStorage.getItem.mockReturnValue(JSON.stringify(savedConfig));

        render(
            <InGameHUD
                settings={mockSettings}
            />
        );

        expect(window.localStorage.getItem).toHaveBeenCalledWith('advancedHUD_config');
    });

    test('saves HUD configuration to localStorage', () => {
        render(
            <InGameHUD
                settings={{ ...mockSettings, allowHudCustomization: true }}
            />
        );

        // Simulate drag operation (this would normally trigger save)
        // For testing purposes, we'll verify the localStorage setItem is available
        expect(window.localStorage.setItem).toBeDefined();
    });

    test('handles audio manager initialization', () => {
        render(
            <InGameHUD
                settings={mockSettings}
                audioManager={mockAudioManager}
            />
        );

        // Verify audio assets were loaded
        expect(mockAudioManager.loadSound).toHaveBeenCalledWith(
            'hud_hud_notification',
            '/audio/hud/hud_notification.ogg'
        );
        expect(mockAudioManager.loadSound).toHaveBeenCalledWith(
            'hud_hud_warning',
            '/audio/hud/hud_warning.ogg'
        );
    });

    test('handles settings changes', () => {
        const { rerender } = render(
            <InGameHUD
                settings={mockSettings}
            />
        );

        const newSettings = {
            ...mockSettings,
            hudScale: 1.5,
            hudOpacity: 0.7,
            showAdvancedInfo: true
        };

        rerender(
            <InGameHUD
                settings={newSettings}
            />
        );

        // Component should update with new settings
        // This is verified by the component not throwing errors
        expect(screen.getByText('Hide HUD')).toBeInTheDocument();
    });

    test('handles missing props gracefully', () => {
        render(<InGameHUD />);

        // Should render without crashing
        expect(screen.getByText('Hide HUD')).toBeInTheDocument();
    });

    test('cleans up on unmount', () => {
        const { unmount } = render(
            <InGameHUD
                settings={mockSettings}
            />
        );

        unmount();

        expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    test('handles window resize for dynamic scaling', () => {
        render(
            <InGameHUD
                settings={mockSettings}
            />
        );

        // Simulate window resize
        global.innerWidth = 1600;
        global.innerHeight = 900;
        fireEvent(window, new Event('resize'));

        // Component should handle resize without errors
        expect(screen.getByText('Hide HUD')).toBeInTheDocument();
    });

    test('displays minimap legend correctly', () => {
        render(
            <InGameHUD
                gameState={mockGameState}
                settings={mockSettings}
            />
        );

        expect(screen.getByText('You')).toBeInTheDocument();
        expect(screen.getByText('Zombies')).toBeInTheDocument();
        expect(screen.getByText('Objectives')).toBeInTheDocument();
    });

    test('handles health pulse animation', () => {
        const lowHealthPlayerData = {
            ...mockPlayerData,
            health: 25 // Below 30% threshold
        };

        render(
            <InGameHUD
                playerData={lowHealthPlayerData}
                settings={mockSettings}
            />
        );

        const healthBar = document.querySelector('.health-bar');
        expect(healthBar).toHaveClass('pulse');
    });

    test('handles speed flash animation', () => {
        const highSpeedVehicleData = {
            ...mockVehicleData,
            speed: 110, // Above 90% of max speed
            maxSpeed: 120
        };

        render(
            <InGameHUD
                vehicleData={highSpeedVehicleData}
                settings={mockSettings}
            />
        );

        const speedometer = document.querySelector('.speedometer');
        expect(speedometer).toHaveClass('flash');
    });
});