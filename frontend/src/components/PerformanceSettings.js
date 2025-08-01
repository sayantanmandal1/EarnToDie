import React, { useState, useEffect } from 'react';
import './PerformanceSettings.css';

/**
 * Performance Settings Component - UI for managing performance optimization settings
 */
export const PerformanceSettings = ({ gameEngine, onClose }) => {
    const [qualityLevel, setQualityLevel] = useState('high');
    const [autoAdjust, setAutoAdjust] = useState(true);
    const [performanceStats, setPerformanceStats] = useState(null);
    const [benchmarkResults, setBenchmarkResults] = useState(null);
    const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

    useEffect(() => {
        if (!gameEngine?.getPerformanceIntegration()) return;

        const performanceIntegration = gameEngine.getPerformanceIntegration();
        
        // Update stats every second
        const statsInterval = setInterval(() => {
            const stats = performanceIntegration.getPerformanceStats();
            setPerformanceStats(stats);
        }, 1000);

        return () => clearInterval(statsInterval);
    }, [gameEngine]);

    const handleQualityChange = (newQuality) => {
        setQualityLevel(newQuality);
        if (gameEngine?.getPerformanceIntegration()) {
            gameEngine.getPerformanceIntegration().setQualityLevel(newQuality);
        }
    };

    const handleAutoAdjustToggle = () => {
        const newAutoAdjust = !autoAdjust;
        setAutoAdjust(newAutoAdjust);
        
        if (gameEngine?.getPerformanceIntegration()) {
            const performanceManager = gameEngine.getPerformanceIntegration().performanceManager;
            if (performanceManager) {
                performanceManager.autoAdjustEnabled = newAutoAdjust;
                if (newAutoAdjust) {
                    performanceManager.setQualityLevel('auto');
                    setQualityLevel('auto');
                }
            }
        }
    };

    const runBenchmark = async () => {
        if (!gameEngine?.getPerformanceIntegration() || isRunningBenchmark) return;

        setIsRunningBenchmark(true);
        try {
            const results = await gameEngine.getPerformanceIntegration().runBenchmark();
            setBenchmarkResults(results);
        } catch (error) {
            console.error('Benchmark failed:', error);
        } finally {
            setIsRunningBenchmark(false);
        }
    };

    const formatMemoryUsage = (bytes) => {
        if (!bytes) return 'N/A';
        return `${Math.round(bytes)} MB`;
    };

    const getPerformanceColor = (value, thresholds) => {
        if (value >= thresholds.good) return '#4CAF50';
        if (value >= thresholds.warning) return '#FF9800';
        return '#F44336';
    };

    return (
        <div className="performance-settings">
            <div className="performance-settings-header">
                <h2>Performance Settings</h2>
                <button className="close-button" onClick={onClose}>×</button>
            </div>

            <div className="performance-settings-content">
                {/* Quality Settings */}
                <div className="settings-section">
                    <h3>Graphics Quality</h3>
                    <div className="quality-controls">
                        <div className="quality-buttons">
                            {['low', 'medium', 'high', 'auto'].map(level => (
                                <button
                                    key={level}
                                    className={`quality-button ${qualityLevel === level ? 'active' : ''}`}
                                    onClick={() => handleQualityChange(level)}
                                    disabled={autoAdjust && level !== 'auto'}
                                >
                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                            ))}
                        </div>
                        
                        <div className="auto-adjust-control">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={autoAdjust}
                                    onChange={handleAutoAdjustToggle}
                                />
                                Auto-adjust quality based on performance
                            </label>
                        </div>
                    </div>
                </div>

                {/* Performance Statistics */}
                <div className="settings-section">
                    <h3>Performance Statistics</h3>
                    {performanceStats ? (
                        <div className="performance-stats">
                            <div className="stat-row">
                                <span className="stat-label">Frame Rate:</span>
                                <span 
                                    className="stat-value"
                                    style={{ color: getPerformanceColor(performanceStats.manager?.frameRate || 0, { good: 55, warning: 45 }) }}
                                >
                                    {Math.round(performanceStats.manager?.frameRate || 0)} FPS
                                </span>
                            </div>
                            
                            <div className="stat-row">
                                <span className="stat-label">Average FPS:</span>
                                <span 
                                    className="stat-value"
                                    style={{ color: getPerformanceColor(performanceStats.manager?.averageFrameRate || 0, { good: 55, warning: 45 }) }}
                                >
                                    {performanceStats.manager?.averageFrameRate || 0} FPS
                                </span>
                            </div>

                            <div className="stat-row">
                                <span className="stat-label">Quality Level:</span>
                                <span className="stat-value">
                                    {performanceStats.manager?.qualityLevel || 'Unknown'}
                                </span>
                            </div>

                            <div className="stat-row">
                                <span className="stat-label">LOD Objects:</span>
                                <span className="stat-value">
                                    {performanceStats.lod?.totalObjects || 0}
                                </span>
                            </div>

                            <div className="stat-row">
                                <span className="stat-label">Cached Textures:</span>
                                <span className="stat-value">
                                    {performanceStats.textures?.cachedTextures || 0}
                                </span>
                            </div>

                            {performanceStats.manager?.memoryUsage && (
                                <>
                                    <div className="stat-row">
                                        <span className="stat-label">Memory Used:</span>
                                        <span className="stat-value">
                                            {formatMemoryUsage(performanceStats.manager.memoryUsage.used)}
                                        </span>
                                    </div>
                                    
                                    <div className="stat-row">
                                        <span className="stat-label">Memory Total:</span>
                                        <span className="stat-value">
                                            {formatMemoryUsage(performanceStats.manager.memoryUsage.total)}
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="stat-row">
                                <span className="stat-label">Render Calls:</span>
                                <span className="stat-value">
                                    {performanceStats.manager?.renderInfo?.render?.calls || 0}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="loading-stats">Loading performance data...</div>
                    )}
                </div>

                {/* Object Pool Statistics */}
                {performanceStats?.pools && (
                    <div className="settings-section">
                        <h3>Object Pools</h3>
                        <div className="pool-stats">
                            {Object.entries(performanceStats.pools).map(([poolName, stats]) => (
                                <div key={poolName} className="pool-stat">
                                    <div className="pool-name">{poolName.replace('_', ' ')}</div>
                                    <div className="pool-details">
                                        <span>Active: {stats.active}</span>
                                        <span>Pooled: {stats.pooled}</span>
                                        <span>Reused: {stats.reused}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Benchmark Section */}
                <div className="settings-section">
                    <h3>Performance Benchmark</h3>
                    <div className="benchmark-controls">
                        <button
                            className="benchmark-button"
                            onClick={runBenchmark}
                            disabled={isRunningBenchmark}
                        >
                            {isRunningBenchmark ? 'Running Benchmark...' : 'Run Performance Test'}
                        </button>
                    </div>

                    {benchmarkResults && (
                        <div className="benchmark-results">
                            <h4>Benchmark Results</h4>
                            
                            {benchmarkResults.frameRate && (
                                <div className="benchmark-result">
                                    <strong>Frame Rate Test:</strong>
                                    <div>Average: {benchmarkResults.frameRate.average} FPS</div>
                                    <div>Stability: {Math.round(benchmarkResults.frameRate.stability)}%</div>
                                </div>
                            )}

                            {benchmarkResults.memory && (
                                <div className="benchmark-result">
                                    <strong>Memory Test:</strong>
                                    <div>Average Used: {benchmarkResults.memory.averageUsed} MB</div>
                                    <div>Growth Rate: {benchmarkResults.memory.growthRate}%</div>
                                </div>
                            )}

                            {benchmarkResults.rendering && (
                                <div className="benchmark-result">
                                    <strong>Rendering Test:</strong>
                                    <div>Average Time: {benchmarkResults.rendering.averageTime} ms</div>
                                    <div>FPS: {benchmarkResults.rendering.framesPerSecond}</div>
                                </div>
                            )}

                            {benchmarkResults.physics && (
                                <div className="benchmark-result">
                                    <strong>Physics Test:</strong>
                                    <div>Average Step: {benchmarkResults.physics.averageStepTime} ms</div>
                                    <div>Steps/sec: {benchmarkResults.physics.stepsPerSecond}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};