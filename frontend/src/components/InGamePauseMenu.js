/**
 * In-Game Pause Menu Component
 * Provides pause functionality with game state preservation
 */
import React, { useState, useEffect, useRef } from 'react';
import './InGamePauseMenu.css';

const InGamePauseMenu = ({
    isVisible = false,
    gameState = {},
    settings = {},
    onResume = () => {},
    onSaveGame = () => {},
    onLoadGame = () => {},
    onSettings = () => {},
    onMainMenu = () => {},
    onQuitGame = () => {},
    audioManager = null
}) => {
    // Component state
    const [selectedOption, setSelectedOption] = useState(0);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [saveSlots, setSaveSlots] = useState([]);
    const [showSaveMenu, setShowSaveMenu] = useState(false);
    const [showLoadMenu, setShowLoadMenu] = useState(false);

    // Refs
    const menuRef = useRef(null);
    const backgroundRef = useRef(null);

    // Menu options
    const menuOptions = [
        { id: 'resume', label: 'Resume Game', action: handleResume },
        { id: 'save', label: 'Save Game', action: handleSaveGame },
        { id: 'load', label: 'Load Game', action: handleLoadGame },
        { id: 'settings', label: 'Settings', action: handleSettings },
        { id: 'mainmenu', label: 'Main Menu', action: handleMainMenu },
        { id: 'quit', label: 'Quit Game', action: handleQuitGame }
    ];

    /**
     * Initialize pause menu
     */
    useEffect(() => {
        if (isVisible) {
            initializePauseMenu();
            loadSaveSlots();
        }
    }, [isVisible]);

    /**
     * Handle keyboard navigation
     */
    useEffect(() => {
        if (isVisible) {
            const handleKeyPress = (event) => {
                switch (event.key) {
                    case 'ArrowUp':
                        event.preventDefault();
                        navigateUp();
                        break;
                    case 'ArrowDown':
                        event.preventDefault();
                        navigateDown();
                        break;
                    case 'Enter':
                        event.preventDefault();
                        selectCurrentOption();
                        break;
                    case 'Escape':
                        event.preventDefault();
                        if (showConfirmDialog) {
                            setShowConfirmDialog(false);
                        } else if (showSaveMenu || showLoadMenu) {
                            setShowSaveMenu(false);
                            setShowLoadMenu(false);
                        } else {
                            handleResume();
                        }
                        break;
                }
            };

            document.addEventListener('keydown', handleKeyPress);
            return () => document.removeEventListener('keydown', handleKeyPress);
        }
    }, [isVisible, selectedOption, showConfirmDialog, showSaveMenu, showLoadMenu]);

    /**
     * Initialize pause menu
     */
    const initializePauseMenu = () => {
        setSelectedOption(0);
        setShowConfirmDialog(false);
        setShowSaveMenu(false);
        setShowLoadMenu(false);

        // Play pause sound
        if (audioManager) {
            audioManager.playSound('menu_pause', { volume: 0.5 });
        }

        // Focus the menu for keyboard navigation
        if (menuRef.current) {
            menuRef.current.focus();
        }
    };

    /**
     * Load available save slots
     */
    const loadSaveSlots = () => {
        try {
            const slots = [];
            for (let i = 1; i <= 5; i++) {
                const saveData = localStorage.getItem(`zombieCarGame_save_${i}`);
                if (saveData) {
                    const parsed = JSON.parse(saveData);
                    slots.push({
                        slot: i,
                        timestamp: parsed.timestamp,
                        level: parsed.level || 1,
                        progress: parsed.progress || 0,
                        playtime: parsed.playtime || 0
                    });
                } else {
                    slots.push({
                        slot: i,
                        empty: true
                    });
                }
            }
            setSaveSlots(slots);
        } catch (error) {
            console.error('Failed to load save slots:', error);
            setSaveSlots([]);
        }
    };

    /**
     * Navigate up in menu
     */
    const navigateUp = () => {
        setSelectedOption(prev => {
            const newIndex = prev > 0 ? prev - 1 : menuOptions.length - 1;
            playNavigationSound();
            return newIndex;
        });
    };

    /**
     * Navigate down in menu
     */
    const navigateDown = () => {
        setSelectedOption(prev => {
            const newIndex = prev < menuOptions.length - 1 ? prev + 1 : 0;
            playNavigationSound();
            return newIndex;
        });
    };

    /**
     * Select current menu option
     */
    const selectCurrentOption = () => {
        const option = menuOptions[selectedOption];
        if (option && option.action) {
            playSelectSound();
            option.action();
        }
    };

    /**
     * Play navigation sound
     */
    const playNavigationSound = () => {
        if (audioManager) {
            audioManager.playSound('menu_navigate', { volume: 0.3 });
        }
    };

    /**
     * Play select sound
     */
    const playSelectSound = () => {
        if (audioManager) {
            audioManager.playSound('menu_select', { volume: 0.4 });
        }
    };

    /**
     * Handle resume game
     */
    function handleResume() {
        if (audioManager) {
            audioManager.playSound('menu_resume', { volume: 0.5 });
        }
        onResume();
    }

    /**
     * Handle save game
     */
    function handleSaveGame() {
        setShowSaveMenu(true);
    }

    /**
     * Handle load game
     */
    function handleLoadGame() {
        setShowLoadMenu(true);
    }

    /**
     * Handle settings
     */
    function handleSettings() {
        onSettings();
    }

    /**
     * Handle main menu
     */
    function handleMainMenu() {
        setConfirmAction(() => () => {
            if (audioManager) {
                audioManager.playSound('menu_confirm', { volume: 0.5 });
            }
            onMainMenu();
        });
        setShowConfirmDialog(true);
    }

    /**
     * Handle quit game
     */
    function handleQuitGame() {
        setConfirmAction(() => () => {
            if (audioManager) {
                audioManager.playSound('menu_confirm', { volume: 0.5 });
            }
            onQuitGame();
        });
        setShowConfirmDialog(true);
    }

    /**
     * Handle save to slot
     */
    const handleSaveToSlot = (slotNumber) => {
        try {
            const saveData = {
                timestamp: Date.now(),
                gameState: gameState,
                level: gameState.currentLevel || 1,
                progress: gameState.progress || 0,
                playtime: gameState.playtime || 0,
                playerData: gameState.playerData || {},
                vehicleData: gameState.vehicleData || {},
                settings: settings
            };

            localStorage.setItem(`zombieCarGame_save_${slotNumber}`, JSON.stringify(saveData));
            
            if (audioManager) {
                audioManager.playSound('menu_save', { volume: 0.6 });
            }

            // Refresh save slots
            loadSaveSlots();
            setShowSaveMenu(false);

            // Call the save callback
            onSaveGame(slotNumber, saveData);
        } catch (error) {
            console.error('Failed to save game:', error);
            if (audioManager) {
                audioManager.playSound('menu_error', { volume: 0.5 });
            }
        }
    };

    /**
     * Handle load from slot
     */
    const handleLoadFromSlot = (slotNumber) => {
        try {
            const saveData = localStorage.getItem(`zombieCarGame_save_${slotNumber}`);
            if (saveData) {
                const parsed = JSON.parse(saveData);
                
                if (audioManager) {
                    audioManager.playSound('menu_load', { volume: 0.6 });
                }

                setShowLoadMenu(false);
                onLoadGame(slotNumber, parsed);
            }
        } catch (error) {
            console.error('Failed to load game:', error);
            if (audioManager) {
                audioManager.playSound('menu_error', { volume: 0.5 });
            }
        }
    };

    /**
     * Handle confirm dialog
     */
    const handleConfirm = () => {
        if (confirmAction) {
            confirmAction();
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };

    /**
     * Handle cancel dialog
     */
    const handleCancel = () => {
        if (audioManager) {
            audioManager.playSound('menu_cancel', { volume: 0.4 });
        }
        setShowConfirmDialog(false);
        setConfirmAction(null);
    };

    /**
     * Format playtime
     */
    const formatPlaytime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    };

    /**
     * Format timestamp
     */
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="pause-menu-overlay">
            <div className="pause-menu-background" ref={backgroundRef} />
            
            <div className="pause-menu-container" ref={menuRef} tabIndex={-1}>
                <div className="pause-menu-header">
                    <h1 className="pause-menu-title">Game Paused</h1>
                    <div className="pause-menu-subtitle">
                        Level {gameState.currentLevel || 1} • {formatPlaytime(gameState.playtime || 0)}
                    </div>
                </div>

                {!showSaveMenu && !showLoadMenu && !showConfirmDialog && (
                    <div className="pause-menu-options">
                        {menuOptions.map((option, index) => (
                            <div
                                key={option.id}
                                className={`pause-menu-option ${index === selectedOption ? 'selected' : ''}`}
                                onClick={() => {
                                    setSelectedOption(index);
                                    option.action();
                                }}
                                onMouseEnter={() => setSelectedOption(index)}
                            >
                                <span className="option-icon">
                                    {index === selectedOption ? '▶' : ''}
                                </span>
                                <span className="option-label">{option.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {showSaveMenu && (
                    <div className="save-load-menu">
                        <h2 className="save-load-title">Save Game</h2>
                        <div className="save-slots">
                            {saveSlots.map((slot) => (
                                <div
                                    key={slot.slot}
                                    className={`save-slot ${slot.empty ? 'empty' : 'occupied'}`}
                                    onClick={() => handleSaveToSlot(slot.slot)}
                                >
                                    <div className="slot-number">Slot {slot.slot}</div>
                                    {slot.empty ? (
                                        <div className="slot-empty">Empty Slot</div>
                                    ) : (
                                        <div className="slot-info">
                                            <div className="slot-level">Level {slot.level}</div>
                                            <div className="slot-progress">{Math.round(slot.progress * 100)}% Complete</div>
                                            <div className="slot-timestamp">{formatTimestamp(slot.timestamp)}</div>
                                            <div className="slot-playtime">{formatPlaytime(slot.playtime)}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="save-load-actions">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowSaveMenu(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {showLoadMenu && (
                    <div className="save-load-menu">
                        <h2 className="save-load-title">Load Game</h2>
                        <div className="save-slots">
                            {saveSlots.filter(slot => !slot.empty).map((slot) => (
                                <div
                                    key={slot.slot}
                                    className="save-slot occupied"
                                    onClick={() => handleLoadFromSlot(slot.slot)}
                                >
                                    <div className="slot-number">Slot {slot.slot}</div>
                                    <div className="slot-info">
                                        <div className="slot-level">Level {slot.level}</div>
                                        <div className="slot-progress">{Math.round(slot.progress * 100)}% Complete</div>
                                        <div className="slot-timestamp">{formatTimestamp(slot.timestamp)}</div>
                                        <div className="slot-playtime">{formatPlaytime(slot.playtime)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="save-load-actions">
                            <button 
                                className="cancel-button"
                                onClick={() => setShowLoadMenu(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {showConfirmDialog && (
                    <div className="confirm-dialog">
                        <div className="confirm-content">
                            <h3 className="confirm-title">Confirm Action</h3>
                            <p className="confirm-message">
                                Are you sure you want to continue? Any unsaved progress will be lost.
                            </p>
                            <div className="confirm-actions">
                                <button 
                                    className="confirm-button"
                                    onClick={handleConfirm}
                                >
                                    Confirm
                                </button>
                                <button 
                                    className="cancel-button"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pause-menu-footer">
                    <div className="controls-hint">
                        Use ↑↓ to navigate • Enter to select • Esc to resume
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InGamePauseMenu;