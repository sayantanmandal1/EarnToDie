/**
 * Unit Tests for GarageInterface Component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GarageInterface from '../GarageInterface';

// Mock Three.js
jest.mock('three', () => ({
    Scene: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        background: null
    })),
    PerspectiveCamera: jest.fn(() => ({
        position: { set: jest.fn(), x: 0, y: 0, z: 0 },
        aspect: 1,
        updateProjectionMatrix: jest.fn(),
        lookAt: jest.fn()
    })),
    WebGLRenderer: jest.fn(() => ({
        setSize: jest.fn(),
        render: jest.fn(),
        shadowMap: { enabled: false, type: null },
        toneMapping: null,
        toneMappingExposure: 1,
        domElement: (() => {
                    if (typeof document !== 'undefined') {
                        return document.createElement('canvas');
                    }
                    return { tagName: 'CANVAS', width: 800, height: 600, style: {} };
                })()
    })),
    Color: jest.fn(),
    AmbientLight: jest.fn(() => ({ position: { set: jest.fn() } })),
    DirectionalLight: jest.fn(() => ({
        position: { set: jest.fn() },
        castShadow: false,
        shadow: {
            mapSize: { width: 0, height: 0 },
            camera: { near: 0, far: 0 }
        }
    })),
    PlaneGeometry: jest.fn(),
    BoxGeometry: jest.fn(),
    CylinderGeometry: jest.fn(),
    MeshLambertMaterial: jest.fn(),
    MeshPhongMaterial: jest.fn(),
    Mesh: jest.fn(() => ({
        position: { set: jest.fn(), x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        castShadow: false,
        receiveShadow: false
    })),
    Group: jest.fn(() => ({
        add: jest.fn(),
        position: { set: jest.fn() },
        rotation: { x: 0, y: 0 }
    })),
    GridHelper: jest.fn(() => ({ position: { y: 0 } })),
    PCFSoftShadowMap: 'PCFSoftShadowMap',
    ACESFilmicToneMapping: 'ACESFilmicToneMapping'
}));

// Mock audio manager
const mockAudioManager = {
    loadSound: jest.fn(),
    playSound: jest.fn()
};

// Mock player data
const mockPlayerData = {
    ownedVehicles: ['sedan', 'suv']
};

// Mock vehicle data
const mockVehicleData = {
    currentVehicle: 'sedan'
};

// Mock upgrade data
const mockUpgradeData = {
    sedan: {
        engine: { level: 2 },
        armor: { level: 1 }
    },
    suv: {
        engine: { level: 1 },
        weapons: { level: 1 }
    }
};

// Mock settings
const mockSettings = {
    graphics: 'high',
    audio: true
};

describe('GarageInterface Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
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
        jest.restoreAllMocks();
    });

    test('renders garage interface with all sections', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                settings={mockSettings}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('Vehicle Garage')).toBeInTheDocument();
        expect(screen.getByText('$50,000')).toBeInTheDocument();
        expect(screen.getByText('Select Vehicle')).toBeInTheDocument();
        expect(screen.getByText('Vehicle Upgrades')).toBeInTheDocument();
        expect(screen.getByText('Vehicle Statistics')).toBeInTheDocument();
    });

    test('displays available vehicles correctly', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('Sedan')).toBeInTheDocument();
        expect(screen.getByText('SUV')).toBeInTheDocument();
        expect(screen.getByText('Sports Car')).toBeInTheDocument();
        expect(screen.getByText('Pickup Truck')).toBeInTheDocument();
    });

    test('shows owned vehicles correctly', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Sedan should be selected (owned and current)
        const sedanCard = screen.getByText('Sedan').closest('.vehicle-card');
        expect(sedanCard).toHaveClass('selected');

        // SUV should be owned but not selected
        const suvCard = screen.getByText('SUV').closest('.vehicle-card');
        expect(suvCard).not.toHaveClass('locked');
    });

    test('shows locked vehicles with prices', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Sports Car should be locked with price
        const sportsCard = screen.getByText('Sports Car').closest('.vehicle-card');
        expect(sportsCard).toHaveClass('locked');
        expect(screen.getByText('$25,000')).toBeInTheDocument();
    });

    test('handles vehicle selection', () => {
        const mockOnVehicleSelect = jest.fn();
        
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                onVehicleSelect={mockOnVehicleSelect}
                audioManager={mockAudioManager}
            />
        );

        const suvCard = screen.getByText('SUV').closest('.vehicle-card');
        fireEvent.click(suvCard);

        expect(mockOnVehicleSelect).toHaveBeenCalledWith('suv');
        expect(mockAudioManager.playSound).toHaveBeenCalledWith('garage_vehicle_select', { volume: 0.4 });
    });

    test('shows purchase confirmation for locked vehicles', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const sportsCard = screen.getByText('Sports Car').closest('.vehicle-card');
        fireEvent.click(sportsCard);

        expect(screen.getByText('Confirm Vehicle Purchase')).toBeInTheDocument();
        expect(screen.getByText('Sports Car')).toBeInTheDocument();
        expect(screen.getByText('Cost:')).toBeInTheDocument();
    });

    test('displays upgrade categories', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('Engine')).toBeInTheDocument();
        expect(screen.getByText('Armor')).toBeInTheDocument();
        expect(screen.getByText('Handling')).toBeInTheDocument();
        expect(screen.getByText('Fuel System')).toBeInTheDocument();
        expect(screen.getByText('Weapons')).toBeInTheDocument();
        expect(screen.getByText('Visual')).toBeInTheDocument();
    });

    test('handles category selection', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const armorButton = screen.getByText('Armor');
        fireEvent.click(armorButton);

        expect(mockAudioManager.playSound).toHaveBeenCalledWith('garage_category_change', { volume: 0.3 });
    });

    test('displays upgrade levels correctly', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Should show engine upgrades by default
        expect(screen.getByText('Engine Level 1')).toBeInTheDocument();
        expect(screen.getByText('Engine Level 2')).toBeInTheDocument();
        expect(screen.getByText('Engine Level 3')).toBeInTheDocument();
    });

    test('shows owned upgrades correctly', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Engine Level 1 and 2 should be owned for sedan
        const ownedBadges = screen.getAllByText('✓ Owned');
        expect(ownedBadges.length).toBeGreaterThan(0);
    });

    test('handles upgrade purchase', () => {
        const mockOnUpgradePurchase = jest.fn(() => true);
        
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                onUpgradePurchase={mockOnUpgradePurchase}
                audioManager={mockAudioManager}
            />
        );

        // Find a purchasable upgrade
        const purchaseButtons = screen.getAllByText('Purchase');
        if (purchaseButtons.length > 0) {
            fireEvent.click(purchaseButtons[0]);
            
            // Should show confirmation dialog
            expect(screen.getByText('Confirm Upgrade Purchase')).toBeInTheDocument();
            
            // Confirm purchase
            const confirmButton = screen.getByText('Confirm Purchase');
            fireEvent.click(confirmButton);
            
            expect(mockOnUpgradePurchase).toHaveBeenCalled();
        }
    });

    test('prevents purchase with insufficient funds', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={100} // Low currency
                audioManager={mockAudioManager}
            />
        );

        // Purchase buttons should be disabled for expensive items
        const purchaseButtons = screen.getAllByText('Purchase');
        purchaseButtons.forEach(button => {
            if (button.closest('.upgrade-item')) {
                const upgradeItem = button.closest('.upgrade-item');
                const priceElement = upgradeItem.querySelector('.price-badge');
                if (priceElement && parseInt(priceElement.textContent.replace(/[$,]/g, '')) > 100) {
                    expect(button).toBeDisabled();
                }
            }
        });
    });

    test('displays vehicle statistics', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        expect(screen.getByText('speed')).toBeInTheDocument();
        expect(screen.getByText('armor')).toBeInTheDocument();
        expect(screen.getByText('handling')).toBeInTheDocument();
        expect(screen.getByText('fuel')).toBeInTheDocument();
    });

    test('toggles comparison mode', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const compareButton = screen.getByText('Compare Stats');
        fireEvent.click(compareButton);

        expect(screen.getByText('Stats Comparison')).toBeInTheDocument();
        expect(screen.getByText('Current')).toBeInTheDocument();
        expect(screen.getByText('With Upgrade')).toBeInTheDocument();
        
        // Button text should change
        expect(screen.getByText('Exit Compare')).toBeInTheDocument();
    });

    test('resets 3D view', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const resetButton = screen.getByText('Reset View');
        fireEvent.click(resetButton);

        // Should reset without errors
        expect(resetButton).toBeInTheDocument();
    });

    test('handles back button', () => {
        const mockOnBack = jest.fn();
        
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                onBack={mockOnBack}
                audioManager={mockAudioManager}
            />
        );

        const backButton = screen.getByText('← Back');
        fireEvent.click(backButton);

        expect(mockOnBack).toHaveBeenCalled();
    });

    test('handles confirmation dialog cancellation', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Open purchase dialog
        const sportsCard = screen.getByText('Sports Car').closest('.vehicle-card');
        fireEvent.click(sportsCard);

        // Cancel purchase
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(screen.queryByText('Confirm Vehicle Purchase')).not.toBeInTheDocument();
    });

    test('displays upgrade requirements', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Higher level upgrades should show requirements
        const upgradeItems = screen.getAllByText(/Engine Level [3-5]/);
        if (upgradeItems.length > 0) {
            // Check if requirements are shown
            expect(screen.getByText('Requires:')).toBeInTheDocument();
        }
    });

    test('handles upgrade selection', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const upgradeItem = screen.getByText('Engine Level 3').closest('.upgrade-item');
        fireEvent.click(upgradeItem);

        expect(mockAudioManager.playSound).toHaveBeenCalledWith('garage_upgrade_hover', { volume: 0.2 });
    });

    test('shows upgrade stats bonuses', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Should show stat bonuses for upgrades
        const statBonuses = screen.getAllByText(/\+\d+/);
        expect(statBonuses.length).toBeGreaterThan(0);
    });

    test('handles window resize', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Simulate window resize
        global.innerWidth = 1200;
        global.innerHeight = 800;
        fireEvent(window, new Event('resize'));

        // Component should handle resize without errors
        expect(screen.getByText('Vehicle Garage')).toBeInTheDocument();
    });

    test('initializes Three.js scene', () => {
        const { container } = render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        // Should create canvas element
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
    });

    test('loads audio assets', () => {
        render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        expect(mockAudioManager.loadSound).toHaveBeenCalledWith(
            'garage_garage_vehicle_select',
            '/audio/garage/garage_vehicle_select.ogg'
        );
    });

    test('handles missing props gracefully', () => {
        render(<GarageInterface />);

        // Should render without crashing
        expect(screen.getByText('Vehicle Garage')).toBeInTheDocument();
        expect(screen.getByText('$0')).toBeInTheDocument();
    });

    test('cleans up on unmount', () => {
        const { unmount } = render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        unmount();

        expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    test('handles mouse interactions on 3D viewer', () => {
        const { container } = render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const canvas = container.querySelector('canvas');
        if (canvas) {
            // Simulate mouse down
            fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
            
            // Simulate mouse move
            fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
            
            // Simulate mouse up
            fireEvent.mouseUp(canvas);
            
            // Should handle mouse interactions without errors
            expect(canvas).toBeInTheDocument();
        }
    });

    test('handles wheel events for zoom', () => {
        const { container } = render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const canvas = container.querySelector('canvas');
        if (canvas) {
            fireEvent.wheel(canvas, { deltaY: 100 });
            
            // Should handle wheel events without errors
            expect(canvas).toBeInTheDocument();
        }
    });

    test('prevents context menu on canvas', () => {
        const { container } = render(
            <GarageInterface
                playerData={mockPlayerData}
                vehicleData={mockVehicleData}
                upgradeData={mockUpgradeData}
                currency={50000}
                audioManager={mockAudioManager}
            />
        );

        const canvas = container.querySelector('canvas');
        if (canvas) {
            const contextMenuEvent = new Event('contextmenu');
            const preventDefaultSpy = jest.spyOn(contextMenuEvent, 'preventDefault');
            
            fireEvent(canvas, contextMenuEvent);
            
            expect(preventDefaultSpy).toHaveBeenCalled();
        }
    });
});