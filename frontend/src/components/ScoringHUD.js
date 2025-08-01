import React, { useState, useEffect } from 'react';
import './ScoringHUD.css';

/**
 * ScoringHUD displays real-time scoring information including points, combo, and achievements
 */
export const ScoringHUD = ({ scoringSystem, isVisible = true }) => {
    const [scoreData, setScoreData] = useState({
        totalPoints: 0,
        zombiesKilled: 0,
        currentCombo: 0,
        comboMultiplier: 1.0,
        distanceTraveled: 0,
        timeElapsed: 0,
        achievements: []
    });
    
    const [recentPoints, setRecentPoints] = useState([]);
    const [recentAchievements, setRecentAchievements] = useState([]);
    const [comboAnimation, setComboAnimation] = useState(false);

    useEffect(() => {
        if (!scoringSystem) return;

        // Listen for scoring events
        const handlePointsScored = (data) => {
            setScoreData(prev => ({
                ...prev,
                totalPoints: data.totalPoints,
                zombiesKilled: prev.zombiesKilled + 1
            }));
            
            // Add floating point animation
            addFloatingPoints(data.comboPoints, data.multiplier > 1);
        };

        const handleComboUpdate = (data) => {
            setScoreData(prev => ({
                ...prev,
                currentCombo: data.combo,
                comboMultiplier: data.multiplier
            }));
            
            // Trigger combo animation
            if (data.combo > 3) {
                setComboAnimation(true);
                setTimeout(() => setComboAnimation(false), 500);
            }
        };

        const handleComboEnded = () => {
            setScoreData(prev => ({
                ...prev,
                currentCombo: 0,
                comboMultiplier: 1.0
            }));
        };

        const handleAchievementUnlocked = (achievement) => {
            setScoreData(prev => ({
                ...prev,
                achievements: [...prev.achievements, achievement],
                totalPoints: prev.totalPoints + achievement.points
            }));
            
            // Add achievement notification
            addAchievementNotification(achievement);
        };

        const handleBonusPoints = (data) => {
            setScoreData(prev => ({
                ...prev,
                totalPoints: data.totalPoints
            }));
            
            addFloatingPoints(data.points, false, data.type);
        };

        // Register event listeners
        scoringSystem.on('pointsScored', handlePointsScored);
        scoringSystem.on('comboUpdate', handleComboUpdate);
        scoringSystem.on('comboEnded', handleComboEnded);
        scoringSystem.on('achievementUnlocked', handleAchievementUnlocked);
        scoringSystem.on('bonusPoints', handleBonusPoints);

        // Update timer
        const updateTimer = setInterval(() => {
            const stats = scoringSystem.getSessionStats();
            setScoreData(prev => ({
                ...prev,
                distanceTraveled: stats.distanceTraveled,
                timeElapsed: stats.timeElapsed
            }));
        }, 1000);

        return () => {
            scoringSystem.off('pointsScored', handlePointsScored);
            scoringSystem.off('comboUpdate', handleComboUpdate);
            scoringSystem.off('comboEnded', handleComboEnded);
            scoringSystem.off('achievementUnlocked', handleAchievementUnlocked);
            scoringSystem.off('bonusPoints', handleBonusPoints);
            clearInterval(updateTimer);
        };
    }, [scoringSystem]);

    const addFloatingPoints = (points, isCombo, type = null) => {
        const id = Date.now() + Math.random();
        const pointData = {
            id,
            points,
            isCombo,
            type,
            timestamp: Date.now()
        };
        
        setRecentPoints(prev => [...prev, pointData]);
        
        // Remove after animation
        setTimeout(() => {
            setRecentPoints(prev => prev.filter(p => p.id !== id));
        }, 2000);
    };

    const addAchievementNotification = (achievement) => {
        const id = Date.now() + Math.random();
        const achievementData = {
            id,
            ...achievement,
            timestamp: Date.now()
        };
        
        setRecentAchievements(prev => [...prev, achievementData]);
        
        // Remove after display time
        setTimeout(() => {
            setRecentAchievements(prev => prev.filter(a => a.id !== id));
        }, 5000);
    };

    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const formatDistance = (meters) => {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)}km`;
        }
        return `${Math.floor(meters)}m`;
    };

    const getComboColor = (combo) => {
        if (combo >= 25) return '#ff0080'; // Pink for legendary
        if (combo >= 15) return '#ff4000'; // Red-orange for incredible
        if (combo >= 10) return '#ff8000'; // Orange for amazing
        if (combo >= 5) return '#ffff00';  // Yellow for great
        if (combo >= 3) return '#80ff00';  // Green for good
        return '#ffffff';                   // White for normal
    };

    if (!isVisible) return null;

    return (
        <div className="scoring-hud">
            {/* Main Score Display */}
            <div className="score-main">
                <div className="score-value">
                    {scoreData.totalPoints.toLocaleString()}
                </div>
                <div className="score-label">SCORE</div>
            </div>

            {/* Stats Panel */}
            <div className="stats-panel">
                <div className="stat-item">
                    <div className="stat-value">{scoreData.zombiesKilled}</div>
                    <div className="stat-label">KILLS</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{formatDistance(scoreData.distanceTraveled)}</div>
                    <div className="stat-label">DISTANCE</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{formatTime(scoreData.timeElapsed)}</div>
                    <div className="stat-label">TIME</div>
                </div>
            </div>

            {/* Combo Display */}
            {scoreData.currentCombo > 0 && (
                <div className={`combo-display ${comboAnimation ? 'combo-pulse' : ''}`}>
                    <div 
                        className="combo-text"
                        style={{ color: getComboColor(scoreData.currentCombo) }}
                    >
                        {scoreData.currentCombo}x COMBO!
                    </div>
                    <div className="combo-multiplier">
                        {scoreData.comboMultiplier.toFixed(1)}x MULTIPLIER
                    </div>
                </div>
            )}

            {/* Floating Points */}
            <div className="floating-points-container">
                {recentPoints.map(point => (
                    <div
                        key={point.id}
                        className={`floating-points ${point.isCombo ? 'combo-points' : ''} ${point.type ? `bonus-${point.type}` : ''}`}
                    >
                        +{point.points}
                        {point.type && <span className="bonus-type">{point.type.toUpperCase()}</span>}
                    </div>
                ))}
            </div>

            {/* Achievement Notifications */}
            <div className="achievement-notifications">
                {recentAchievements.map(achievement => (
                    <div key={achievement.id} className="achievement-notification">
                        <div className="achievement-icon">🏆</div>
                        <div className="achievement-content">
                            <div className="achievement-title">ACHIEVEMENT UNLOCKED!</div>
                            <div className="achievement-name">{achievement.name}</div>
                            <div className="achievement-description">{achievement.description}</div>
                            <div className="achievement-points">+{achievement.points} points</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Currency Preview */}
            <div className="currency-preview">
                <div className="currency-icon">💰</div>
                <div className="currency-amount">
                    {scoringSystem ? Math.floor(scoringSystem.calculateCurrency().totalCurrency) : 0}
                </div>
            </div>
        </div>
    );
};

export default ScoringHUD;