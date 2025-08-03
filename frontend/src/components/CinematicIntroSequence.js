/**
 * Cinematic Intro Sequence
 * High-quality visual intro with animations, effects, and audio
 */

import React, { useState, useEffect, useRef } from 'react';
import './CinematicIntroSequence.css';

export const CinematicIntroSequence = ({
    onComplete,
    onSkip,
    audioManager,
    visualEffectsManager,
    skipEnabled = true
}) => {
    // State management
    const [currentScene, setCurrentScene] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [sceneProgress, setSceneProgress] = useState(0);
    const [subtitles, setSubtitles] = useState('');
    const [effects, setEffects] = useState({
        fadeOpacity: 1,
        logoScale: 0,
        textOpacity: 0,
        particleIntensity: 0,
        cameraShake: 0
    });

    // Refs for DOM manipulation
    const canvasRef = useRef(null);
    const audioRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Intro sequence scenes
    const scenes = [
        {
            id: 'studio_logo',
            duration: 3000,
            audio: '/audio/intro/studio_logo.ogg',
            elements: [
                { type: 'logo', src: '/assets/studio_logo.png', delay: 500 },
                { type: 'text', content: 'Kiro Games Presents', delay: 1000 }
            ]
        },
        {
            id: 'game_logo',
            duration: 4000,
            audio: '/audio/intro/dramatic_reveal.ogg',
            elements: [
                { type: 'logo', src: '/assets/game_logo.png', delay: 0 },
                { type: 'title', content: 'ZOMBIE CAR GAME', delay: 1500 },
                { type: 'subtitle', content: 'Survive the Apocalypse', delay: 2500 }
            ]
        },
        {
            id: 'world_intro',
            duration: 6000,
            audio: '/audio/intro/world_ambience.ogg',
            subtitles: [
                { time: 0, text: 'The world has fallen to chaos...' },
                { time: 2000, text: 'Cities lie in ruins...' },
                { time: 4000, text: 'Only the strong survive...' }
            ],
            elements: [
                { type: 'background', src: '/assets/intro/apocalypse_city.jpg', delay: 0 },
                { type: 'overlay', effect: 'fire_particles', delay: 1000 },
                { type: 'overlay', effect: 'smoke_clouds', delay: 2000 }
            ]
        },
        {
            id: 'gameplay_preview',
            duration: 5000,
            audio: '/audio/intro/action_music.ogg',
            subtitles: [
                { time: 0, text: 'Drive through the wasteland...' },
                { time: 2000, text: 'Fight the undead hordes...' },
                { time: 3500, text: 'Upgrade your vehicle...' }
            ],
            elements: [
                { type: 'video', src: '/assets/intro/gameplay_preview.mp4', delay: 0 }
            ]
        },
        {
            id: 'final_logo',
            duration: 3000,
            audio: '/audio/intro/final_sting.ogg',
            elements: [
                { type: 'logo', src: '/assets/game_logo_final.png', delay: 0 },
                { type: 'text', content: 'Press any key to continue', delay: 2000 }
            ]
        }
    ];

    /**
     * Initialize intro sequence
     */
    useEffect(() => {
        if (isPlaying) {
            initializeIntro();
            startIntroSequence();
        }

        return () => cleanup();
    }, []);

    /**
     * Handle keyboard input
     */
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (skipEnabled && (event.key === 'Escape' || event.key === ' ')) {
                skipIntro();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [skipEnabled]);

    /**
     * Initialize intro sequence
     */
    const initializeIntro = async () => {
        try {
            // Initialize canvas
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            // Preload audio
            if (audioManager) {
                for (const scene of scenes) {
                    if (scene.audio) {
                        await audioManager.loadSound(`intro_${scene.id}`, scene.audio);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to initialize intro:', error);
        }
    };

    /**
     * Start intro sequence
     */
    const startIntroSequence = () => {
        playScene(0);
    };

    /**
     * Play specific scene
     */
    const playScene = (sceneIndex) => {
        if (sceneIndex >= scenes.length) {
            completeIntro();
            return;
        }

        const scene = scenes[sceneIndex];
        setCurrentScene(sceneIndex);
        setSceneProgress(0);

        // Play scene audio
        if (audioManager && scene.audio) {
            audioManager.playSound(`intro_${scene.id}`, {
                volume: 0.8,
                onComplete: () => {
                    setTimeout(() => playScene(sceneIndex + 1), 500);
                }
            });
        }

        // Handle scene elements
        scene.elements?.forEach((element, index) => {
            setTimeout(() => {
                animateElement(element);
            }, element.delay || 0);
        });

        // Handle subtitles
        scene.subtitles?.forEach((subtitle) => {
            setTimeout(() => {
                setSubtitles(subtitle.text);
                setTimeout(() => setSubtitles(''), 1500);
            }, subtitle.time);
        });

        // Auto-advance to next scene
        setTimeout(() => {
            if (sceneIndex < scenes.length - 1) {
                playScene(sceneIndex + 1);
            } else {
                completeIntro();
            }
        }, scene.duration);
    };

    /**
     * Animate scene element
     */
    const animateElement = (element) => {
        switch (element.type) {
            case 'logo':
                setEffects(prev => ({ ...prev, logoScale: 1 }));
                break;
            case 'text':
            case 'title':
            case 'subtitle':
                setEffects(prev => ({ ...prev, textOpacity: 1 }));
                break;
            case 'overlay':
                if (element.effect === 'fire_particles') {
                    setEffects(prev => ({ ...prev, particleIntensity: 0.8 }));
                }
                break;
            default:
                break;
        }
    };

    /**
     * Skip intro sequence
     */
    const skipIntro = () => {
        setIsPlaying(false);
        if (audioManager) {
            scenes.forEach(scene => {
                if (scene.audio) {
                    audioManager.stopSound(`intro_${scene.id}`);
                }
            });
        }
        if (onSkip) {
            onSkip();
        }
    };

    /**
     * Complete intro sequence
     */
    const completeIntro = () => {
        setIsPlaying(false);
        if (onComplete) {
            onComplete();
        }
    };

    /**
     * Cleanup resources
     */
    const cleanup = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioManager) {
            scenes.forEach(scene => {
                if (scene.audio) {
                    audioManager.stopSound(`intro_${scene.id}`);
                }
            });
        }
    };

    if (!isPlaying) {
        return null;
    }

    return (
        <div className="cinematic-intro-sequence">
            <canvas
                ref={canvasRef}
                className="intro-canvas"
            />

            <div className="intro-overlay">
                <div
                    className="fade-overlay"
                    style={{ opacity: effects.fadeOpacity }}
                />

                <div className="scene-content">
                    <div
                        className="intro-logo"
                        style={{
                            transform: `scale(${effects.logoScale})`,
                            opacity: effects.logoScale
                        }}
                    >
                        <img src="/assets/game_logo.png" alt="Game Logo" />
                    </div>

                    <div
                        className="intro-text"
                        style={{ opacity: effects.textOpacity }}
                    >
                        <h1>ZOMBIE CAR GAME</h1>
                        <p>Survive the Apocalypse</p>
                    </div>
                </div>

                {subtitles && (
                    <div className="subtitles">
                        {subtitles}
                    </div>
                )}

                {skipEnabled && (
                    <button
                        className="skip-button"
                        onClick={skipIntro}
                    >
                        Skip Intro (ESC)
                    </button>
                )}
            </div>
        </div>
    );
};

export default CinematicIntroSequence;