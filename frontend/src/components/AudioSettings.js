import React, { useState, useEffect } from 'react';
import './AudioSettings.css';

/**
 * AudioSettings component for controlling audio volumes and settings
 */
const AudioSettings = ({ audioManager, onClose }) => {
    const [volumes, setVolumes] = useState({
        master: 1.0,
        effects: 1.0,
        music: 1.0,
        engine: 1.0
    });
    
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(true);
    const [occlusionEnabled, setOcclusionEnabled] = useState(true);
    
    // Load current settings when component mounts
    useEffect(() => {
        if (audioManager) {
            setVolumes({
                master: audioManager.getVolume('master'),
                effects: audioManager.getVolume('effects'),
                music: audioManager.getVolume('music'),
                engine: audioManager.getVolume('engine')
            });
            setAudioEnabled(audioManager.isEnabled);
            
            // Get spatial audio settings if available
            if (audioManager.spatialAudio) {
                setSpatialAudioEnabled(true);
                setOcclusionEnabled(audioManager.spatialAudio.occlusionEnabled);
            }
        }
    }, [audioManager]);

    // Handle volume changes
    const handleVolumeChange = (category, value) => {
        const newVolume = parseFloat(value);
        setVolumes(prev => ({
            ...prev,
            [category]: newVolume
        }));
        
        if (audioManager) {
            audioManager.setVolume(category, newVolume);
        }
    };

    // Handle audio enable/disable
    const handleAudioToggle = (enabled) => {
        setAudioEnabled(enabled);
        if (audioManager) {
            audioManager.setEnabled(enabled);
        }
    };

    // Handle spatial audio toggle
    const handleSpatialAudioToggle = (enabled) => {
        setSpatialAudioEnabled(enabled);
        // Implementation would depend on how spatial audio is integrated
    };

    // Handle occlusion toggle
    const handleOcclusionToggle = (enabled) => {
        setOcclusionEnabled(enabled);
        if (audioManager && audioManager.spatialAudio) {
            audioManager.spatialAudio.setOcclusionEnabled(enabled);
        }
    };

    // Test audio function
    const testAudio = (category) => {
        if (!audioManager || !audioEnabled) return;
        
        switch (category) {
            case 'effects':
                audioManager.playSound('button_click');
                break;
            case 'music':
                // Play a short music sample
                audioManager.playMusic('menu', false);
                setTimeout(() => audioManager.stopMusic(false), 2000);
                break;
            case 'engine':
                // Play engine sound sample
                audioManager.playSound('engine_rev');
                break;
            default:
                audioManager.playSound('button_click');
        }
    };

    // Reset to defaults
    const resetToDefaults = () => {
        const defaultVolumes = {
            master: 1.0,
            effects: 1.0,
            music: 1.0,
            engine: 1.0
        };
        
        setVolumes(defaultVolumes);
        setAudioEnabled(true);
        setSpatialAudioEnabled(true);
        setOcclusionEnabled(true);
        
        if (audioManager) {
            Object.entries(defaultVolumes).forEach(([category, volume]) => {
                audioManager.setVolume(category, volume);
            });
            audioManager.setEnabled(true);
            if (audioManager.spatialAudio) {
                audioManager.spatialAudio.setOcclusionEnabled(true);
            }
        }
    };

    return (
        <div className="audio-settings-overlay">
            <div className="audio-settings-panel">
                <div className="audio-settings-header">
                    <h2>Audio Settings</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="audio-settings-content">
                    {/* Master Audio Toggle */}
                    <div className="setting-group">
                        <div className="setting-row">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={audioEnabled}
                                    onChange={(e) => handleAudioToggle(e.target.checked)}
                                />
                                Enable Audio
                            </label>
                        </div>
                    </div>

                    {/* Volume Controls */}
                    <div className="setting-group">
                        <h3>Volume Controls</h3>
                        
                        {/* Master Volume */}
                        <div className="volume-control">
                            <label>Master Volume</label>
                            <div className="volume-slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volumes.master}
                                    onChange={(e) => handleVolumeChange('master', e.target.value)}
                                    disabled={!audioEnabled}
                                    className="volume-slider"
                                />
                                <span className="volume-value">
                                    {Math.round(volumes.master * 100)}%
                                </span>
                                <button
                                    className="test-button"
                                    onClick={() => testAudio('master')}
                                    disabled={!audioEnabled}
                                >
                                    Test
                                </button>
                            </div>
                        </div>

                        {/* Sound Effects Volume */}
                        <div className="volume-control">
                            <label>Sound Effects</label>
                            <div className="volume-slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volumes.effects}
                                    onChange={(e) => handleVolumeChange('effects', e.target.value)}
                                    disabled={!audioEnabled}
                                    className="volume-slider"
                                />
                                <span className="volume-value">
                                    {Math.round(volumes.effects * 100)}%
                                </span>
                                <button
                                    className="test-button"
                                    onClick={() => testAudio('effects')}
                                    disabled={!audioEnabled}
                                >
                                    Test
                                </button>
                            </div>
                        </div>

                        {/* Music Volume */}
                        <div className="volume-control">
                            <label>Music</label>
                            <div className="volume-slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volumes.music}
                                    onChange={(e) => handleVolumeChange('music', e.target.value)}
                                    disabled={!audioEnabled}
                                    className="volume-slider"
                                />
                                <span className="volume-value">
                                    {Math.round(volumes.music * 100)}%
                                </span>
                                <button
                                    className="test-button"
                                    onClick={() => testAudio('music')}
                                    disabled={!audioEnabled}
                                >
                                    Test
                                </button>
                            </div>
                        </div>

                        {/* Engine Volume */}
                        <div className="volume-control">
                            <label>Engine Sounds</label>
                            <div className="volume-slider-container">
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volumes.engine}
                                    onChange={(e) => handleVolumeChange('engine', e.target.value)}
                                    disabled={!audioEnabled}
                                    className="volume-slider"
                                />
                                <span className="volume-value">
                                    {Math.round(volumes.engine * 100)}%
                                </span>
                                <button
                                    className="test-button"
                                    onClick={() => testAudio('engine')}
                                    disabled={!audioEnabled}
                                >
                                    Test
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Audio Settings */}
                    <div className="setting-group">
                        <h3>Advanced Settings</h3>
                        
                        <div className="setting-row">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={spatialAudioEnabled}
                                    onChange={(e) => handleSpatialAudioToggle(e.target.checked)}
                                    disabled={!audioEnabled}
                                />
                                3D Spatial Audio
                            </label>
                            <span className="setting-description">
                                Enables positional audio effects for immersive sound
                            </span>
                        </div>

                        <div className="setting-row">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={occlusionEnabled}
                                    onChange={(e) => handleOcclusionToggle(e.target.checked)}
                                    disabled={!audioEnabled || !spatialAudioEnabled}
                                />
                                Audio Occlusion
                            </label>
                            <span className="setting-description">
                                Sounds are muffled when blocked by objects
                            </span>
                        </div>
                    </div>

                    {/* Audio Quality Information */}
                    <div className="setting-group">
                        <h3>Audio Information</h3>
                        <div className="audio-info">
                            <div className="info-row">
                                <span>Audio Context State:</span>
                                <span className={`status ${audioManager?.audioContext?.state || 'unknown'}`}>
                                    {audioManager?.audioContext?.state || 'Unknown'}
                                </span>
                            </div>
                            <div className="info-row">
                                <span>Sample Rate:</span>
                                <span>{audioManager?.audioContext?.sampleRate || 'Unknown'} Hz</span>
                            </div>
                            <div className="info-row">
                                <span>Audio Buffers Loaded:</span>
                                <span>{audioManager?.audioBuffers?.size || 0}</span>
                            </div>
                            <div className="info-row">
                                <span>Active Sources:</span>
                                <span>{audioManager?.activeSources?.size || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="setting-group">
                        <div className="control-buttons">
                            <button
                                className="reset-button"
                                onClick={resetToDefaults}
                            >
                                Reset to Defaults
                            </button>
                            <button
                                className="apply-button"
                                onClick={onClose}
                            >
                                Apply & Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AudioSettings;