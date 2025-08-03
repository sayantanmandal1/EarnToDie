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
    useEffect(() =>