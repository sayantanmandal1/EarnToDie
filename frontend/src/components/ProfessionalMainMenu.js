/**
 * Professional Main Menu System
 * Features cinematic intro, smooth transitions, comprehensive settings, and profile display
 */

import React, { useState, useEffect, useRef } from 'react';
import './ProfessionalMainMenu.css';

export const ProfessionalMainMenu = ({ 
    onStartGame, 
    onLoadGame, 
    onSettings, 
    onProfile, 
    onQuit,
    gameData = {},
    audioManager,
    visualEffectsManager 
}) => {
    // State management
    const [currentScreen, setCurrentScreen] = useState('intro');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [introComplete, setIntroComplete] = useState(false);
    const [menuAnimations, setMenuAnimations] = useState({
        logoScale: 0,
        menuItemsOpacity: 0,
        backgroundParallax: 0
    });

    // Refs for DOM manipulation
    const menuRef = useRef(null);
    const introVideoRef = useRef(null);
    const backgroundCanvasRef = useRef(null);
    const audioContextRef = useRef(null);

    // Animation state
    const [particleSystem, setParticleSystem] = useState(null);
    const [backgroundEffects, setBackgroundEffects] = useState({
        particles: [],
        fogIntensity: 0.3,
        lightningFlashes: 0
    });

    // Menu screens
    const screens = {
        intro: 'intro',
        main: 'main',
        newGame: 'newGame',
        loadGame: 'loadGame',
        settings: 'settings',
        profile: 'profile',
        credits: 'credits'
    };

    /**
     * Initialize the main menu system
     */
    useEffect(() => {
        initializeMainMenu();
        return () => cleanup();
    }, []);

    /**
     * Initialize main menu components
     */
    const initializeMainMenu = async () => {
        try {
            // Initialize background effects
            await initializeBackgroundEffects();
            
            // Initialize audio
            await initializeMenuAudio();
            
            // Start intro sequence
            if (!introComplete) {
                startIntroSequence();
            } else {
                setCurrentScreen('main');
                startMainMenuAnimations();
            }

        } catch (error) {
            console.error('Failed to initialize main menu:', error);
            // Fallback to basic menu
            setCurrentScreen('main');
            setIntroComplete(true);
        }
    };

    /**
     * Initialize background effects
     */
    const initializeBackgroundEffects = async () => {
        if (!backgroundCanvasRef.current) return;

        const canvas = backgroundCanvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Initialize particle system
        const particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2,
                color: `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`
            });
        }

        setBackgroundEffects(prev => ({ ...prev, particles }));
        
        // Start background animation loop
        startBackgroundAnimation(ctx, particles);
    };

    /**
     * Start background animation loop
     */
    const startBackgroundAnimation = (ctx, particles) => {
        const animate = () => {
            // Clear canvas
            ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            // Update and draw particles
            particles.forEach(particle => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Wrap around screen
                if (particle.x < 0) particle.x = ctx.canvas.width;
                if (particle.x > ctx.canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = ctx.canvas.height;
                if (particle.y > ctx.canvas.height) particle.y = 0;

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();
            });

            // Add occasional lightning flash
            if (Math.random() < 0.001) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }

            requestAnimationFrame(animate);
        };

        animate();
    };

    /**
     * Initialize menu audio
     */
    const initializeMenuAudio = async () => {
        if (!audioManager) return;

        try {
            // Load menu music
            await audioManager.loadSound('menu_ambient', '/audio/menu/ambient_music.ogg');
            await audioManager.loadSound('menu_hover', '/audio/menu/button_hover.ogg');
            await audioManager.loadSound('menu_click', '/audio/menu/button_click.ogg');
            await audioManager.loadSound('menu_transition', '/audio/menu/screen_transition.ogg');

            // Start ambient music
            audioManager.playSound('menu_ambient', {
                loop: true,
                volume: 0.3,
                fadeIn: 2000
            });

        } catch (error) {
            console.warn('Failed to initialize menu audio:', error);
        }
    };

    /**
     * Start intro sequence
     */
    const startIntroSequence = () => {
        setCurrentScreen('intro');
        
        // Intro sequence timeline
        const introTimeline = [
            { time: 0, action: () => fadeInLogo() },
            { time: 2000, action: () => showGameTitle() },
            { time: 4000, action: () => showSubtitle() },
            { time: 6000, action: () => startParticleEffects() },
            { time: 8000, action: () => completeIntro() }
        ];

        introTimeline.forEach(({ time, action }) => {
            setTimeout(action, time);
        });
    };

    /**
     * Fade in logo animation
     */
    const fadeInLogo = () => {
        setMenuAnimations(prev => ({
            ...prev,
            logoScale: 1
        }));
    };

    /**
     * Show game title
     */
    const showGameTitle = () => {
        // Trigger title animation
        const titleElement = document.querySelector('.intro-title');
        if (titleElement) {
            titleElement.classList.add('animate-in');
        }
    };

    /**
     * Show subtitle
     */
    const showSubtitle = () => {
        const subtitleElement = document.querySelector('.intro-subtitle');
        if (subtitleElement) {
            subtitleElement.classList.add('animate-in');
        }
    };

    /**
     * Start particle effects
     */
    const startParticleEffects = () => {
        setBackgroundEffects(prev => ({
            ...prev,
            fogIntensity: 0.6
        }));
    };

    /**
     * Complete intro sequence
     */
    const completeIntro = () => {
        setIntroComplete(true);
        transitionToScreen('main');
    };

    /**
     * Start main menu animations
     */
    const startMainMenuAnimations = () => {
        // Stagger menu item animations
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('animate-in');
            }, index * 200);
        });

        setMenuAnimations(prev => ({
            ...prev,
            menuItemsOpacity: 1
        }));
    };

    /**
     * Transition between screens
     */
    const transitionToScreen = (screenName) => {
        if (isTransitioning) return;

        setIsTransitioning(true);

        // Play transition sound
        if (audioManager) {
            audioManager.playSound('menu_transition', { volume: 0.5 });
        }

        // Fade out current screen
        const currentElement = menuRef.current;
        if (currentElement) {
            currentElement.classList.add('fade-out');
        }

        setTimeout(() => {
            setCurrentScreen(screenName);
            
            // Fade in new screen
            setTimeout(() => {
                if (currentElement) {
                    currentElement.classList.remove('fade-out');
                    currentElement.classList.add('fade-in');
                }
                
                setIsTransitioning(false);

                // Start screen-specific animations
                if (screenName === 'main') {
                    startMainMenuAnimations();
                }
            }, 100);
        }, 500);
    };

    /**
     * Handle menu item hover
     */
    const handleMenuHover = (itemName) => {
        if (audioManager) {
            audioManager.playSound('menu_hover', { volume: 0.3 });
        }

        // Add hover effect
        const item = document.querySelector(`[data-menu-item="${itemName}"]`);
        if (item) {
            item.classList.add('hover-effect');
        }
    };

    /**
     * Handle menu item click
     */
    const handleMenuClick = (action, itemName) => {
        if (audioManager) {
            audioManager.playSound('menu_click', { volume: 0.5 });
        }

        // Remove hover effect
        const item = document.querySelector(`[data-menu-item="${itemName}"]`);
        if (item) {
            item.classList.remove('hover-effect');
            item.classList.add('click-effect');
        }

        // Execute action after animation
        setTimeout(() => {
            if (typeof action === 'function') {
                action();
            } else if (typeof action === 'string') {
                transitionToScreen(action);
            }
        }, 200);
    };

    /**
     * Skip intro sequence
     */
    const skipIntro = () => {
        setIntroComplete(true);
        transitionToScreen('main');
    };

    /**
     * Cleanup resources
     */
    const cleanup = () => {
        if (audioManager) {
            audioManager.stopSound('menu_ambient');
        }
    };

    /**
     * Render intro screen
     */
    const renderIntroScreen = () => (
        <div className="intro-screen">
            <canvas 
                ref={backgroundCanvasRef}
                className="background-canvas"
            />
            
            <div className="intro-content">
                <div 
                    className="intro-logo"
                    style={{ 
                        transform: `scale(${menuAnimations.logoScale})`,
                        transition: 'transform 2s ease-out'
                    }}
                >
                    <img src="/assets/logo.png" alt="Game Logo" />
                </div>
                
                <h1 className="intro-title">
                    ZOMBIE CAR GAME
                </h1>
                
                <p className="intro-subtitle">
                    Survive the Apocalypse
                </p>
                
                <div className="intro-effects">
                    <div className="particle-overlay"></div>
                    <div className="fog-overlay" style={{ opacity: backgroundEffects.fogIntensity }}></div>
                </div>
            </div>
            
            <button 
                className="skip-intro-btn"
                onClick={skipIntro}
            >
                Skip Intro
            </button>
        </div>
    );

    /**
     * Render main menu screen
     */
    const renderMainMenuScreen = () => (
        <div className="main-menu-screen">
            <canvas 
                ref={backgroundCanvasRef}
                className="background-canvas"
            />
            
            <div className="menu-header">
                <div className="game-logo">
                    <img src="/assets/logo-small.png" alt="Game Logo" />
                </div>
                <h1 className="game-title">ZOMBIE CAR GAME</h1>
            </div>
            
            <div className="menu-content">
                <nav className="main-menu-nav">
                    <button 
                        className="menu-item primary"
                        data-menu-item="new-game"
                        onMouseEnter={() => handleMenuHover('new-game')}
                        onClick={() => handleMenuClick(onStartGame, 'new-game')}
                    >
                        <span className="menu-icon">🎮</span>
                        <span className="menu-text">New Game</span>
                        <span className="menu-arrow">→</span>
                    </button>
                    
                    <button 
                        className="menu-item"
                        data-menu-item="continue"
                        onMouseEnter={() => handleMenuHover('continue')}
                        onClick={() => handleMenuClick(onLoadGame, 'continue')}
                        disabled={!gameData.hasSaveGame}
                    >
                        <span className="menu-icon">📁</span>
                        <span className="menu-text">Continue</span>
                        <span className="menu-arrow">→</span>
                    </button>
                    
                    <button 
                        className="menu-item"
                        data-menu-item="profile"
                        onMouseEnter={() => handleMenuHover('profile')}
                        onClick={() => handleMenuClick('profile', 'profile')}
                    >
                        <span className="menu-icon">👤</span>
                        <span className="menu-text">Profile</span>
                        <span className="menu-arrow">→</span>
                    </button>
                    
                    <button 
                        className="menu-item"
                        data-menu-item="settings"
                        onMouseEnter={() => handleMenuHover('settings')}
                        onClick={() => handleMenuClick('settings', 'settings')}
                    >
                        <span className="menu-icon">⚙️</span>
                        <span className="menu-text">Settings</span>
                        <span className="menu-arrow">→</span>
                    </button>
                    
                    <button 
                        className="menu-item"
                        data-menu-item="credits"
                        onMouseEnter={() => handleMenuHover('credits')}
                        onClick={() => handleMenuClick('credits', 'credits')}
                    >
                        <span className="menu-icon">🎬</span>
                        <span className="menu-text">Credits</span>
                        <span className="menu-arrow">→</span>
                    </button>
                    
                    <button 
                        className="menu-item exit"
                        data-menu-item="quit"
                        onMouseEnter={() => handleMenuHover('quit')}
                        onClick={() => handleMenuClick(onQuit, 'quit')}
                    >
                        <span className="menu-icon">🚪</span>
                        <span className="menu-text">Quit</span>
                        <span className="menu-arrow">→</span>
                    </button>
                </nav>
                
                <div className="menu-sidebar">
                    <div className="game-stats">
                        <h3>Quick Stats</h3>
                        <div className="stat-item">
                            <span className="stat-label">Zombies Killed:</span>
                            <span className="stat-value">{gameData.zombiesKilled || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Distance Traveled:</span>
                            <span className="stat-value">{gameData.distanceTraveled || 0} km</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Best Score:</span>
                            <span className="stat-value">{gameData.bestScore || 0}</span>
                        </div>
                    </div>
                    
                    <div className="recent-achievements">
                        <h3>Recent Achievements</h3>
                        {gameData.recentAchievements?.slice(0, 3).map((achievement, index) => (
                            <div key={index} className="achievement-item">
                                <span className="achievement-icon">{achievement.icon}</span>
                                <span className="achievement-name">{achievement.name}</span>
                            </div>
                        )) || <p className="no-achievements">No achievements yet</p>}
                    </div>
                </div>
            </div>
            
            <div className="menu-footer">
                <div className="version-info">
                    Version {gameData.version || '1.0.0'}
                </div>
                <div className="social-links">
                    <a href="#" className="social-link">Discord</a>
                    <a href="#" className="social-link">Twitter</a>
                    <a href="#" className="social-link">Steam</a>
                </div>
            </div>
        </div>
    );

    /**
     * Render profile screen
     */
    const renderProfileScreen = () => (
        <div className="profile-screen">
            <div className="screen-header">
                <button 
                    className="back-button"
                    onClick={() => transitionToScreen('main')}
                >
                    ← Back
                </button>
                <h2>Player Profile</h2>
            </div>
            
            <div className="profile-content">
                <div className="profile-info">
                    <div className="player-avatar">
                        <img src={gameData.playerAvatar || '/assets/default-avatar.png'} alt="Player Avatar" />
                    </div>
                    <div className="player-details">
                        <h3>{gameData.playerName || 'Survivor'}</h3>
                        <p className="player-level">Level {gameData.playerLevel || 1}</p>
                        <div className="experience-bar">
                            <div 
                                className="experience-fill"
                                style={{ width: `${(gameData.experience || 0) % 1000 / 10}%` }}
                            ></div>
                        </div>
                        <p className="experience-text">
                            {(gameData.experience || 0) % 1000}/1000 XP
                        </p>
                    </div>
                </div>
                
                <div className="detailed-stats">
                    <h3>Detailed Statistics</h3>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <h4>Combat</h4>
                            <div className="stat-item">
                                <span>Zombies Killed:</span>
                                <span>{gameData.zombiesKilled || 0}</span>
                            </div>
                            <div className="stat-item">
                                <span>Headshots:</span>
                                <span>{gameData.headshots || 0}</span>
                            </div>
                            <div className="stat-item">
                                <span>Accuracy:</span>
                                <span>{gameData.accuracy || 0}%</span>
                            </div>
                        </div>
                        
                        <div className="stat-card">
                            <h4>Exploration</h4>
                            <div className="stat-item">
                                <span>Distance Traveled:</span>
                                <span>{gameData.distanceTraveled || 0} km</span>
                            </div>
                            <div className="stat-item">
                                <span>Areas Discovered:</span>
                                <span>{gameData.areasDiscovered || 0}</span>
                            </div>
                            <div className="stat-item">
                                <span>Secrets Found:</span>
                                <span>{gameData.secretsFound || 0}</span>
                            </div>
                        </div>
                        
                        <div className="stat-card">
                            <h4>Survival</h4>
                            <div className="stat-item">
                                <span>Games Played:</span>
                                <span>{gameData.gamesPlayed || 0}</span>
                            </div>
                            <div className="stat-item">
                                <span>Survival Time:</span>
                                <span>{gameData.totalSurvivalTime || 0} min</span>
                            </div>
                            <div className="stat-item">
                                <span>Best Streak:</span>
                                <span>{gameData.bestStreak || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="achievements-section">
                    <h3>Achievements ({gameData.achievementsUnlocked || 0}/{gameData.totalAchievements || 50})</h3>
                    <div className="achievements-grid">
                        {gameData.achievements?.map((achievement, index) => (
                            <div 
                                key={index} 
                                className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                            >
                                <div className="achievement-icon">{achievement.icon}</div>
                                <div className="achievement-info">
                                    <h4>{achievement.name}</h4>
                                    <p>{achievement.description}</p>
                                    {achievement.unlocked && (
                                        <span className="unlock-date">
                                            Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )) || <p>No achievements data available</p>}
                    </div>
                </div>
            </div>
        </div>
    );

    /**
     * Render settings screen
     */
    const renderSettingsScreen = () => (
        <div className="settings-screen">
            <div className="screen-header">
                <button 
                    className="back-button"
                    onClick={() => transitionToScreen('main')}
                >
                    ← Back
                </button>
                <h2>Settings</h2>
            </div>
            
            <div className="settings-content">
                <div className="settings-tabs">
                    <button className="settings-tab active">Graphics</button>
                    <button className="settings-tab">Audio</button>
                    <button className="settings-tab">Controls</button>
                    <button className="settings-tab">Gameplay</button>
                </div>
                
                <div className="settings-panel">
                    {/* Settings content would be rendered here based on active tab */}
                    <p>Settings panel content will be implemented in the next phase</p>
                </div>
            </div>
        </div>
    );

    /**
     * Render credits screen
     */
    const renderCreditsScreen = () => (
        <div className="credits-screen">
            <div className="screen-header">
                <button 
                    className="back-button"
                    onClick={() => transitionToScreen('main')}
                >
                    ← Back
                </button>
                <h2>Credits</h2>
            </div>
            
            <div className="credits-content">
                <div className="credits-scroll">
                    <div className="credits-section">
                        <h3>Development Team</h3>
                        <p>Game Designer: [Your Name]</p>
                        <p>Lead Developer: [Your Name]</p>
                        <p>AI Assistant: Kiro</p>
                    </div>
                    
                    <div className="credits-section">
                        <h3>Special Thanks</h3>
                        <p>Three.js Community</p>
                        <p>React Development Team</p>
                        <p>Open Source Contributors</p>
                    </div>
                    
                    <div className="credits-section">
                        <h3>Assets</h3>
                        <p>Audio: Various Creative Commons sources</p>
                        <p>Graphics: Custom created</p>
                        <p>Fonts: Google Fonts</p>
                    </div>
                </div>
            </div>
        </div>
    );

    /**
     * Main render method
     */
    return (
        <div 
            ref={menuRef}
            className={`professional-main-menu ${currentScreen} ${isTransitioning ? 'transitioning' : ''}`}
        >
            {currentScreen === 'intro' && renderIntroScreen()}
            {currentScreen === 'main' && renderMainMenuScreen()}
            {currentScreen === 'profile' && renderProfileScreen()}
            {currentScreen === 'settings' && renderSettingsScreen()}
            {currentScreen === 'credits' && renderCreditsScreen()}
            
            {/* Global overlay effects */}
            <div className="global-effects">
                <div className="vignette-overlay"></div>
                <div className="noise-overlay"></div>
            </div>
        </div>
    );
};

export default ProfessionalMainMenu;