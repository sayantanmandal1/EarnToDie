import React, { useState, useEffect } from 'react';
import './LevelSelection.css';

/**
 * Level Selection UI Component
 */
const LevelSelection = ({ 
    levelManager, 
    onLevelSelect, 
    onBack,
    playerProgress 
}) => {
    const [availableLevels, setAvailableLevels] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [showRequirements, setShowRequirements] = useState(false);

    useEffect(() => {
        if (levelManager) {
            const levels = levelManager.getAvailableLevels();
            setAvailableLevels(levels);
        }
    }, [levelManager, playerProgress]);

    const handleLevelClick = (level) => {
        if (level.unlocked) {
            setSelectedLevel(level);
        } else {
            setSelectedLevel(level);
            setShowRequirements(true);
        }
    };

    const handleStartLevel = () => {
        if (selectedLevel && selectedLevel.unlocked && onLevelSelect) {
            onLevelSelect(selectedLevel.id);
        }
    };

    const handleCloseRequirements = () => {
        setShowRequirements(false);
        setSelectedLevel(null);
    };

    const formatTime = (seconds) => {
        if (!seconds || seconds === Infinity) return '--:--';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getStarRating = (level) => {
        if (!level.stats) return 0;
        
        // Simple star rating based on completion and performance
        let stars = 0;
        if (level.completed) stars = 1;
        if (level.stats.bestTime < 300) stars = 2; // Under 5 minutes
        if (level.stats.bestScore > 2000) stars = 3; // High score
        
        return stars;
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 1: return '#4CAF50'; // Green
            case 2: return '#8BC34A'; // Light Green
            case 3: return '#FFC107'; // Amber
            case 4: return '#FF9800'; // Orange
            case 5: return '#F44336'; // Red
            case 6: return '#9C27B0'; // Purple
            default: return '#757575'; // Grey
        }
    };

    return (
        <div className="level-selection">
            <div className="level-selection-header">
                <button className="back-button" onClick={onBack}>
                    ← Back
                </button>
                <h1>Select Level</h1>
                <div className="player-info">
                    <span>Level {playerProgress?.level || 1}</span>
                    <span>${playerProgress?.currency || 0}</span>
                </div>
            </div>

            <div className="levels-grid">
                {availableLevels.map((level) => (
                    <div
                        key={level.id}
                        className={`level-card ${level.unlocked ? 'unlocked' : 'locked'} ${
                            selectedLevel?.id === level.id ? 'selected' : ''
                        }`}
                        onClick={() => handleLevelClick(level)}
                    >
                        <div className="level-card-header">
                            <div className="level-number">
                                {level.id.split('-')[1]}
                            </div>
                            <div 
                                className="difficulty-indicator"
                                style={{ backgroundColor: getDifficultyColor(level.difficulty) }}
                            >
                                {level.difficulty}
                            </div>
                        </div>

                        <div className="level-preview">
                            {/* Placeholder for level preview image */}
                            <div className="level-preview-image">
                                <div className="environment-icon">
                                    {level.id === 'level-1' && '🏙️'}
                                    {level.id === 'level-2' && '🛣️'}
                                    {level.id === 'level-3' && '🏭'}
                                    {level.id === 'level-4' && '🏜️'}
                                    {level.id === 'level-5' && '🌲'}
                                    {level.id === 'level-6' && '💀'}
                                </div>
                            </div>
                            
                            {!level.unlocked && (
                                <div className="lock-overlay">
                                    <div className="lock-icon">🔒</div>
                                </div>
                            )}
                        </div>

                        <div className="level-info">
                            <h3 className="level-name">{level.name}</h3>
                            <p className="level-description">{level.description}</p>
                            
                            {level.completed && (
                                <div className="level-stats">
                                    <div className="star-rating">
                                        {[1, 2, 3].map(star => (
                                            <span
                                                key={star}
                                                className={`star ${star <= getStarRating(level) ? 'filled' : ''}`}
                                            >
                                                ⭐
                                            </span>
                                        ))}
                                    </div>
                                    <div className="best-stats">
                                        <span>Best: {formatTime(level.stats?.bestTime)}</span>
                                        <span>Score: {level.stats?.bestScore || 0}</span>
                                    </div>
                                </div>
                            )}

                            <div className="level-rewards">
                                <span className="currency-reward">
                                    💰 ${level.rewards.currency}
                                </span>
                                <span className="exp-reward">
                                    ⭐ {level.rewards.experience} XP
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {selectedLevel && selectedLevel.unlocked && (
                <div className="level-details">
                    <div className="level-details-content">
                        <h2>{selectedLevel.name}</h2>
                        <p>{selectedLevel.description}</p>
                        
                        <div className="objectives-list">
                            <h3>Objectives:</h3>
                            <ul>
                                {selectedLevel.objectives.map((objective, index) => (
                                    <li key={index}>{objective.description}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="level-actions">
                            <button 
                                className="start-level-button"
                                onClick={handleStartLevel}
                            >
                                Start Level
                            </button>
                            <button 
                                className="cancel-button"
                                onClick={() => setSelectedLevel(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRequirements && selectedLevel && !selectedLevel.unlocked && (
                <div className="requirements-modal">
                    <div className="requirements-content">
                        <h2>Level Locked</h2>
                        <p>Complete the following requirements to unlock <strong>{selectedLevel.name}</strong>:</p>
                        
                        <div className="requirements-list">
                            <div className="requirement">
                                <span className="requirement-label">Player Level:</span>
                                <span className={`requirement-value ${
                                    (playerProgress?.level || 1) >= selectedLevel.unlockRequirements.level 
                                        ? 'met' : 'unmet'
                                }`}>
                                    {selectedLevel.unlockRequirements.level}
                                    {(playerProgress?.level || 1) >= selectedLevel.unlockRequirements.level && ' ✓'}
                                </span>
                            </div>
                            
                            <div className="requirement">
                                <span className="requirement-label">Currency:</span>
                                <span className={`requirement-value ${
                                    (playerProgress?.currency || 0) >= selectedLevel.unlockRequirements.currency 
                                        ? 'met' : 'unmet'
                                }`}>
                                    ${selectedLevel.unlockRequirements.currency}
                                    {(playerProgress?.currency || 0) >= selectedLevel.unlockRequirements.currency && ' ✓'}
                                </span>
                            </div>
                            
                            {selectedLevel.unlockRequirements.previousLevels.length > 0 && (
                                <div className="requirement">
                                    <span className="requirement-label">Complete Levels:</span>
                                    <div className="previous-levels">
                                        {selectedLevel.unlockRequirements.previousLevels.map(levelId => {
                                            const isCompleted = playerProgress?.completedLevels?.includes(levelId);
                                            const levelName = availableLevels.find(l => l.id === levelId)?.name || levelId;
                                            return (
                                                <span 
                                                    key={levelId}
                                                    className={`previous-level ${isCompleted ? 'completed' : 'incomplete'}`}
                                                >
                                                    {levelName} {isCompleted && '✓'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            className="close-requirements-button"
                            onClick={handleCloseRequirements}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LevelSelection;