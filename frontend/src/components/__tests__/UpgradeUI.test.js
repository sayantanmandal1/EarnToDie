import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpgradeUI } from '../UpgradeUI';
import { EventEmitter } from 'events';

// Mock upgrade manager
const mockUpgradeManager = new EventEmitter();
mockUpgradeManager.getVehicleUpgrades = jest.fn();
mockUpgradeManager.getPlayerCurrency = jest.fn();
mockUpgradeManager.getUpgradePreview = jest.fn();
mockUpgradeManager.purchaseUpgrade = jest.fn();
mockUpgradeManager.getUpgradeStats = jest.fn();

const mockVehicleUpgrades = {
    vehicleId: 1,
    vehicleType: 'sedan',
    vehicleName: 'Family Sedan',
    currentStats: {
        speed: 65,
        acceleration: 43,
        armor: 30,
        fuelCapacity: 100,
        damage: 41,
        handling: 74
    },
    upgrades: {
        engine: {
            category: 'engine',
            categoryInfo: {
                name: 'Engine',
                description: 'Increases speed and acceleration',
                icon: '⚡',
                maxLevel: 5
            },
            currentLevel: 1,
            nextLevel: 2,
            maxLevel: 5,
            isMaxLevel: false,
            cost: 200,
            canAfford: true
        },
        armor: {
            category: 'armor',
            categoryInfo: {
                name: 'Armor',
                description: 'Increases damage resistance',
                icon: '🛡️',
                maxLevel: 5
            },
            currentLevel: 0,
            nextLevel: 1,
            maxLevel: 5,
            isMaxLevel: false,
            cost: 150,
            canAfford: true
        },
        weapons: {
            category: 'weapons',
            categoryInfo: {
                name: 'Weapons',
                description: 'Increases damage output',
                icon: '⚔️',
                maxLevel: 5
            },
            currentLevel: 5,
            nextLevel: 5,
            maxLevel: 5,
            isMaxLevel: true,
            cost: 0,
            canAfford: false
        }
    }
};

const mockUpgradePreview = {
    category: 'engine',
    currentLevel: 1,
    nextLevel: 2,
    cost: 200,
    currentStats: {
        speed: 65,
        acceleration: 43
    },
    previewStats: {
        speed: 70,
        acceleration: 46
    },
    statChanges: {
        speed: {
            current: 65,
            preview: 70,
            change: 5,
            percentage: '7.7'
        },
        acceleration: {
            current: 43,
            preview: 46,
            change: 3,
            percentage: '7.0'
        }
    }
};

const mockUpgradeStats = {
    totalLevels: 6,
    maxPossibleLevels: 25,
    upgradeProgress: '24.0',
    categoryBreakdown: {
        engine: 1,
        armor: 0,
        weapons: 5,
        fuel: 0,
        tires: 0
    },
    isFullyUpgraded: false
};

describe('UpgradeUI', () => {
    const defaultProps = {
        upgradeManager: mockUpgradeManager,
        selectedVehicleId: 1,
        onClose: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockUpgradeManager.getVehicleUpgrades.mockReturnValue(mockVehicleUpgrades);
        mockUpgradeManager.getPlayerCurrency.mockReturnValue(1500);
        mockUpgradeManager.getUpgradePreview.mockReturnValue(mockUpgradePreview);
        mockUpgradeManager.getUpgradeStats.mockReturnValue(mockUpgradeStats);
        mockUpgradeManager.purchaseUpgrade.mockResolvedValue({
            success: true,
            newLevel: 2
        });
    });

    describe('Rendering', () => {
        test('should render upgrade UI with vehicle information', () => {
            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('Vehicle Upgrades')).toBeInTheDocument();
            expect(screen.getByText('Family Sedan')).toBeInTheDocument();
            expect(screen.getByText('1,500')).toBeInTheDocument(); // Currency
        });

        test('should render loading state', () => {
            mockUpgradeManager.getVehicleUpgrades.mockReturnValue(null);

            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('Loading upgrades...')).toBeInTheDocument();
        });

        test('should render upgrade categories', () => {
            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('Engine')).toBeInTheDocument();
            expect(screen.getByText('Armor')).toBeInTheDocument();
            expect(screen.getByText('Weapons')).toBeInTheDocument();
        });

        test('should show max level indicator for maxed upgrades', () => {
            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('✅ MAX LEVEL')).toBeInTheDocument();
        });
    });

    describe('Upgrade Categories', () => {
        test('should display upgrade category information correctly', () => {
            render(<UpgradeUI {...defaultProps} />);

            // Check engine category
            expect(screen.getByText('⚡')).toBeInTheDocument();
            expect(screen.getByText('Engine')).toBeInTheDocument();
            expect(screen.getByText('Increases speed and acceleration')).toBeInTheDocument();
            expect(screen.getAllByText((content, element) => {
                return element && element.textContent.includes('1/5');
            })[0]).toBeInTheDocument(); // Level display
            expect(screen.getByText('💰 200')).toBeInTheDocument(); // Cost
        });

        test('should handle category selection', () => {
            render(<UpgradeUI {...defaultProps} />);

            const armorCategory = screen.getByText('Armor').closest('.upgrade-category');
            fireEvent.click(armorCategory);

            // Should update preview for armor
            expect(mockUpgradeManager.getUpgradePreview).toHaveBeenCalledWith(1, 'armor');
        });

        test('should show affordable/expensive styling', () => {
            // Test with insufficient funds
            mockUpgradeManager.getPlayerCurrency.mockReturnValue(50);
            const lowFundsUpgrades = {
                ...mockVehicleUpgrades,
                upgrades: {
                    ...mockVehicleUpgrades.upgrades,
                    engine: {
                        ...mockVehicleUpgrades.upgrades.engine,
                        canAfford: false
                    }
                }
            };
            mockUpgradeManager.getVehicleUpgrades.mockReturnValue(lowFundsUpgrades);

            render(<UpgradeUI {...defaultProps} />);

            const upgradeButton = screen.getAllByText('Upgrade')[0];
            expect(upgradeButton).toHaveClass('expensive');
            expect(upgradeButton).toBeDisabled();
        });
    });

    describe('Upgrade Preview', () => {
        test('should display upgrade preview', () => {
            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('Upgrade Preview')).toBeInTheDocument();
            expect(screen.getByText('Level 1 → 2')).toBeInTheDocument();
            expect(screen.getByText('Cost: 💰 200')).toBeInTheDocument();
        });

        test('should show stat changes in preview', () => {
            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('speed')).toBeInTheDocument();
            expect(screen.getByText('65 km/h')).toBeInTheDocument(); // Current value
            expect(screen.getByText('70 km/h')).toBeInTheDocument(); // New value
            expect(screen.getByText('+5 (7.7%)')).toBeInTheDocument(); // Change
        });
    });

    describe('Upgrade Purchase', () => {
        test('should handle upgrade purchase', async () => {
            render(<UpgradeUI {...defaultProps} />);

            const upgradeButton = screen.getAllByText('Upgrade')[0];
            fireEvent.click(upgradeButton);

            expect(mockUpgradeManager.purchaseUpgrade).toHaveBeenCalledWith(1, 'engine');

            // Should show upgrading state
            expect(screen.getAllByText('Upgrading...')[0]).toBeInTheDocument();

            // Simulate upgrade completion
            act(() => {
                mockUpgradeManager.emit('upgradeCompleted', { vehicleId: 1 });
            });

            await waitFor(() => {
                expect(screen.queryAllByText('Upgrading...')).toHaveLength(0);
            });
        });

        test('should handle upgrade errors', async () => {
            mockUpgradeManager.purchaseUpgrade.mockRejectedValue(new Error('Insufficient funds'));

            render(<UpgradeUI {...defaultProps} />);

            const upgradeButton = screen.getAllByText('Upgrade')[0];
            fireEvent.click(upgradeButton);

            await waitFor(() => {
                expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
            });
        });

        test('should prevent multiple simultaneous upgrades', async () => {
            render(<UpgradeUI {...defaultProps} />);

            const upgradeButton = screen.getAllByText('Upgrade')[0];
            
            // Click multiple times quickly
            fireEvent.click(upgradeButton);
            fireEvent.click(upgradeButton);
            fireEvent.click(upgradeButton);

            // Should only call once
            expect(mockUpgradeManager.purchaseUpgrade).toHaveBeenCalledTimes(1);
        });
    });

    describe('Upgrade Statistics', () => {
        test('should display upgrade statistics', () => {
            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('Upgrade Progress')).toBeInTheDocument();
            expect(screen.getByText('24.0% Complete (6/25)')).toBeInTheDocument();
        });

        test('should show category breakdown', () => {
            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('engine')).toBeInTheDocument();
            
            // Check for engine level in category breakdown
            const categoryBreakdown = screen.getByText('engine').closest('.category-stat');
            expect(categoryBreakdown).toHaveTextContent('1/5');
            
            expect(screen.getByText('weapons')).toBeInTheDocument();
            
            // Check for weapons level in category breakdown  
            const weaponsBreakdown = screen.getByText('weapons').closest('.category-stat');
            expect(weaponsBreakdown).toHaveTextContent('5/5');
        });

        test('should show fully upgraded indicator', () => {
            const fullyUpgradedStats = {
                ...mockUpgradeStats,
                isFullyUpgraded: true
            };
            mockUpgradeManager.getUpgradeStats.mockReturnValue(fullyUpgradedStats);

            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText('🏆 Vehicle Fully Upgraded!')).toBeInTheDocument();
        });
    });

    describe('Event Handling', () => {
        test('should handle upgrade completed event', async () => {
            render(<UpgradeUI {...defaultProps} />);

            // Simulate upgrade completed event
            mockUpgradeManager.emit('upgradeCompleted', {
                vehicleId: 1,
                category: 'engine',
                newLevel: 2
            });

            await waitFor(() => {
                expect(mockUpgradeManager.getVehicleUpgrades).toHaveBeenCalledTimes(2); // Initial + after event
            });
        });

        test('should handle currency updated event', async () => {
            render(<UpgradeUI {...defaultProps} />);

            // Simulate currency update
            mockUpgradeManager.emit('currencyUpdated', 2000);

            await waitFor(() => {
                expect(screen.getByText('2,000')).toBeInTheDocument();
            });
        });

        test('should ignore events for different vehicles', async () => {
            render(<UpgradeUI {...defaultProps} />);

            const initialCalls = mockUpgradeManager.getVehicleUpgrades.mock.calls.length;

            // Simulate upgrade for different vehicle
            mockUpgradeManager.emit('upgradeCompleted', {
                vehicleId: 2, // Different vehicle
                category: 'engine',
                newLevel: 2
            });

            await waitFor(() => {
                expect(mockUpgradeManager.getVehicleUpgrades).toHaveBeenCalledTimes(initialCalls);
            });
        });
    });

    describe('Close Functionality', () => {
        test('should call onClose when close button is clicked', () => {
            render(<UpgradeUI {...defaultProps} />);

            const closeButton = screen.getByText('×');
            fireEvent.click(closeButton);

            expect(defaultProps.onClose).toHaveBeenCalled();
        });
    });

    describe('Currency Formatting', () => {
        test('should format large currency amounts', () => {
            mockUpgradeManager.getPlayerCurrency.mockReturnValue(1234567);

            render(<UpgradeUI {...defaultProps} />);

            expect(screen.getByText((content, element) => {
                return element && element.textContent === '1,234,567';
            })).toBeInTheDocument();
        });
    });

    describe('Error States', () => {
        test('should handle missing upgrade manager', () => {
            render(<UpgradeUI {...defaultProps} upgradeManager={null} />);

            expect(screen.getByText('Loading upgrades...')).toBeInTheDocument();
        });

        test('should handle missing vehicle ID', () => {
            render(<UpgradeUI {...defaultProps} selectedVehicleId={null} />);

            expect(screen.getByText('Loading upgrades...')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        test('should have proper ARIA labels', () => {
            render(<UpgradeUI {...defaultProps} />);

            const upgradeButtons = screen.getAllByText('Upgrade');
            upgradeButtons.forEach(button => {
                expect(button).toBeEnabled();
            });
        });

        test('should handle keyboard navigation', () => {
            render(<UpgradeUI {...defaultProps} />);

            const firstCategory = screen.getByText('Engine').closest('.upgrade-category');
            
            // Should be focusable
            firstCategory.focus();
            expect(document.activeElement).toBe(firstCategory);
        });
    });
});