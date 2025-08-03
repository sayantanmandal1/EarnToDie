/**
 * Real-time Performance Metrics Display Component
 * Shows live performance data with charts and alerts
 */
import React, { useState, useEffect, useRef } from 'react';
import './PerformanceMetricsDisplay.css';

const PerformanceMetricsDisplay = ({
    performanceMonitor,
    isVisible = false,
    position = 'top-right',
    compact = false,
    onClose = () => {}
}) => {
    const [metrics, setMetrics] = useState({});
    const [alerts, setAlerts] = useState([]);
    const [selectedTab, setSelectedTab] = useState('overview');
    const [chartData, setChartData] = useState({
        fps: [],
        memory: [],
        frameTime: []
    });
    
    const canvasRef = useRef(null);
    const updateIntervalRef = useRef(null);
    
    // Chart configuration
    const chartConfig = {
        width: 300,
        height: 100,
        maxDataPoints: 60,
        colors: {
            fps: '#00ff00',
            memory: '#ff8800',
            frameTime: '#0088ff',
            background: 'rgba(0, 0, 0, 0.8)',
            grid: 'rgba(255, 255, 255, 0.1)',
            text: '#ffffff'
        }
    };
    
    useEffect(() => {
        if (isVisible && performanceMonitor) {
            startUpdating();
        } else {
            stopUpdating();
        }
        
        return () => stopUpdating();
    }, [isVisible, performanceMonitor]);
    
    /**
     * Start updating metrics
     */
    const startUpdating = () => {
        updateIntervalRef.current = setInterval(() => {
            if (performanceMonitor) {
                const currentMetrics = performanceMonitor.getMetrics();
                setMetrics(currentMetrics);
                setAlerts(currentMetrics.alerts.slice(-10)); // Last 10 alerts
                updateChartData(currentMetrics);
            }
        }, 100);
    };
    
    /**
     * Stop updating metrics
     */
    const stopUpdating = () => {
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }
    };
    
    /**
     * Update chart data
     */
    const updateChartData = (currentMetrics) => {
        setChartData(prev => {
            const newData = { ...prev };
            
            // Add new data points
            newData.fps.push(currentMetrics.fps.current);
            newData.memory.push(currentMetrics.memory.used);
            newData.frameTime.push(currentMetrics.frameTime.current);
            
            // Limit data points
            Object.keys(newData).forEach(key => {
                if (newData[key].length > chartConfig.maxDataPoints) {
                    newData[key].shift();
                }
            });
            
            return newData;
        });
    };
    
    /**
     * Draw performance charts
     */
    useEffect(() => {
        if (canvasRef.current && chartData.fps.length > 0) {
            drawCharts();
        }
    }, [chartData, selectedTab]);
    
    const drawCharts = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { width, height } = chartConfig;
        
        canvas.width = width;
        canvas.height = height;
        
        // Clear canvas
        ctx.fillStyle = chartConfig.colors.background;
        ctx.fillRect(0, 0, width, height);
        
        // Draw grid
        drawGrid(ctx, width, height);
        
        // Draw chart based on selected tab
        switch (selectedTab) {
            case 'fps':
                drawLineChart(ctx, chartData.fps, chartConfig.colors.fps, 0, 120, 'FPS');
                break;
            case 'memory':
                drawLineChart(ctx, chartData.memory, chartConfig.colors.memory, 0, 500, 'Memory (MB)');
                break;
            case 'frametime':
                drawLineChart(ctx, chartData.frameTime, chartConfig.colors.frameTime, 0, 50, 'Frame Time (ms)');
                break;
            default:
                drawMultiChart(ctx);
                break;
        }
    };
    
    const drawGrid = (ctx, width, height) => {
        ctx.strokeStyle = chartConfig.colors.grid;
        ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Vertical lines
        for (let i = 0; i <= 6; i++) {
            const x = (width / 6) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    };
    
    const drawLineChart = (ctx, data, color, min, max, label) => {
        if (data.length < 2) return;
        
        const { width, height } = chartConfig;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
            const y = height - (normalizedValue * height);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = chartConfig.colors.text;
        ctx.font = '12px monospace';
        ctx.fillText(label, 5, 15);
        
        // Draw current value
        const currentValue = data[data.length - 1];
        ctx.fillText(`${currentValue.toFixed(1)}`, width - 60, 15);
    };
    
    const drawMultiChart = (ctx) => {
        const { width, height } = chartConfig;
        
        // Draw FPS (normalized to 0-120)
        if (chartData.fps.length > 1) {
            ctx.strokeStyle = chartConfig.colors.fps;
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            chartData.fps.forEach((value, index) => {
                const x = (index / (chartData.fps.length - 1)) * width;
                const y = height - ((value / 120) * height);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // Draw Memory (normalized to 0-500MB)
        if (chartData.memory.length > 1) {
            ctx.strokeStyle = chartConfig.colors.memory;
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            chartData.memory.forEach((value, index) => {
                const x = (index / (chartData.memory.length - 1)) * width;
                const y = height - ((value / 500) * height);
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // Draw legend
        ctx.fillStyle = chartConfig.colors.text;
        ctx.font = '10px monospace';
        ctx.fillText('FPS', 5, height - 25);
        ctx.fillStyle = chartConfig.colors.fps;
        ctx.fillRect(25, height - 30, 10, 2);
        
        ctx.fillStyle = chartConfig.colors.text;
        ctx.fillText('MEM', 5, height - 10);
        ctx.fillStyle = chartConfig.colors.memory;
        ctx.fillRect(25, height - 15, 10, 2);
    };    /**

     * Get performance level color
     */
    const getPerformanceLevelColor = (level) => {
        switch (level) {
            case 'excellent': return '#00ff00';
            case 'good': return '#88ff00';
            case 'fair': return '#ffaa00';
            case 'poor': return '#ff4400';
            default: return '#ffffff';
        }
    };
    
    /**
     * Get alert severity color
     */
    const getAlertSeverityColor = (severity) => {
        switch (severity) {
            case 'high': return '#ff0000';
            case 'medium': return '#ff8800';
            case 'low': return '#ffff00';
            case 'info': return '#00aaff';
            default: return '#ffffff';
        }
    };
    
    /**
     * Format timestamp
     */
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    };
    
    /**
     * Format memory size
     */
    const formatMemory = (mb) => {
        if (mb < 1024) {
            return `${Math.round(mb)}MB`;
        } else {
            return `${(mb / 1024).toFixed(1)}GB`;
        }
    };
    
    if (!isVisible) {
        return null;
    }
    
    const performanceLevel = metrics.performanceLevel || 'unknown';
    const performanceLevelColor = getPerformanceLevelColor(performanceLevel);
    
    return (
        <div className={`performance-metrics-display ${position} ${compact ? 'compact' : ''}`}>
            <div className="metrics-header">
                <h3 className="metrics-title">Performance Monitor</h3>
                <div className="metrics-controls">
                    <div 
                        className="performance-level"
                        style={{ color: performanceLevelColor }}
                    >
                        {performanceLevel.toUpperCase()}
                    </div>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
            </div>
            
            {!compact && (
                <div className="metrics-tabs">
                    <button 
                        className={`tab ${selectedTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setSelectedTab('overview')}
                    >
                        Overview
                    </button>
                    <button 
                        className={`tab ${selectedTab === 'fps' ? 'active' : ''}`}
                        onClick={() => setSelectedTab('fps')}
                    >
                        FPS
                    </button>
                    <button 
                        className={`tab ${selectedTab === 'memory' ? 'active' : ''}`}
                        onClick={() => setSelectedTab('memory')}
                    >
                        Memory
                    </button>
                    <button 
                        className={`tab ${selectedTab === 'frametime' ? 'active' : ''}`}
                        onClick={() => setSelectedTab('frametime')}
                    >
                        Frame Time
                    </button>
                    <button 
                        className={`tab ${selectedTab === 'alerts' ? 'active' : ''}`}
                        onClick={() => setSelectedTab('alerts')}
                    >
                        Alerts ({alerts.length})
                    </button>
                </div>
            )}
            
            <div className="metrics-content">
                {selectedTab === 'overview' && (
                    <div className="overview-tab">
                        <div className="metrics-grid">
                            <div className="metric-item">
                                <span className="metric-label">FPS</span>
                                <span className="metric-value">
                                    {Math.round(metrics.fps?.current || 0)}
                                </span>
                                <span className="metric-average">
                                    avg: {Math.round(metrics.fps?.average || 0)}
                                </span>
                            </div>
                            
                            <div className="metric-item">
                                <span className="metric-label">Frame Time</span>
                                <span className="metric-value">
                                    {(metrics.frameTime?.current || 0).toFixed(1)}ms
                                </span>
                                <span className="metric-average">
                                    avg: {(metrics.frameTime?.average || 0).toFixed(1)}ms
                                </span>
                            </div>
                            
                            <div className="metric-item">
                                <span className="metric-label">Memory</span>
                                <span className="metric-value">
                                    {formatMemory(metrics.memory?.used || 0)}
                                </span>
                                <span className="metric-average">
                                    / {formatMemory(metrics.memory?.total || 0)}
                                </span>
                            </div>
                            
                            <div className="metric-item">
                                <span className="metric-label">Draw Calls</span>
                                <span className="metric-value">
                                    {metrics.drawCalls?.current || 0}
                                </span>
                                <span className="metric-average">
                                    avg: {Math.round(metrics.drawCalls?.average || 0)}
                                </span>
                            </div>
                            
                            <div className="metric-item">
                                <span className="metric-label">Triangles</span>
                                <span className="metric-value">
                                    {Math.round((metrics.triangles?.current || 0) / 1000)}K
                                </span>
                                <span className="metric-average">
                                    avg: {Math.round((metrics.triangles?.average || 0) / 1000)}K
                                </span>
                            </div>
                            
                            <div className="metric-item">
                                <span className="metric-label">GC Count</span>
                                <span className="metric-value">
                                    {metrics.memory?.gcCount || 0}
                                </span>
                            </div>
                        </div>
                        
                        <div className="chart-container">
                            <canvas ref={canvasRef} className="performance-chart" />
                        </div>
                    </div>
                )}
                
                {(selectedTab === 'fps' || selectedTab === 'memory' || selectedTab === 'frametime') && (
                    <div className="chart-tab">
                        <div className="chart-container">
                            <canvas ref={canvasRef} className="performance-chart" />
                        </div>
                        
                        <div className="chart-stats">
                            {selectedTab === 'fps' && (
                                <>
                                    <div>Current: {Math.round(metrics.fps?.current || 0)} FPS</div>
                                    <div>Average: {Math.round(metrics.fps?.average || 0)} FPS</div>
                                    <div>Min: {Math.round(metrics.fps?.min || 0)} FPS</div>
                                    <div>Max: {Math.round(metrics.fps?.max || 0)} FPS</div>
                                </>
                            )}
                            
                            {selectedTab === 'memory' && (
                                <>
                                    <div>Used: {formatMemory(metrics.memory?.used || 0)}</div>
                                    <div>Total: {formatMemory(metrics.memory?.total || 0)}</div>
                                    <div>Heap Limit: {formatMemory(metrics.memory?.heap || 0)}</div>
                                    <div>GC Count: {metrics.memory?.gcCount || 0}</div>
                                </>
                            )}
                            
                            {selectedTab === 'frametime' && (
                                <>
                                    <div>Current: {(metrics.frameTime?.current || 0).toFixed(2)}ms</div>
                                    <div>Average: {(metrics.frameTime?.average || 0).toFixed(2)}ms</div>
                                    <div>Min: {(metrics.frameTime?.min || 0).toFixed(2)}ms</div>
                                    <div>Max: {(metrics.frameTime?.max || 0).toFixed(2)}ms</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
                
                {selectedTab === 'alerts' && (
                    <div className="alerts-tab">
                        <div className="alerts-list">
                            {alerts.length === 0 ? (
                                <div className="no-alerts">No recent alerts</div>
                            ) : (
                                alerts.map((alert, index) => (
                                    <div 
                                        key={index} 
                                        className="alert-item"
                                        style={{ borderLeftColor: getAlertSeverityColor(alert.severity) }}
                                    >
                                        <div className="alert-header">
                                            <span className="alert-type">{alert.type.replace('_', ' ')}</span>
                                            <span className="alert-time">{formatTimestamp(alert.timestamp)}</span>
                                        </div>
                                        <div className="alert-details">
                                            {alert.value !== undefined && (
                                                <span>Value: {alert.value.toFixed(2)}</span>
                                            )}
                                            {alert.threshold !== undefined && (
                                                <span>Threshold: {alert.threshold}</span>
                                            )}
                                            {alert.reason && (
                                                <span>Reason: {alert.reason}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {compact && (
                <div className="compact-metrics">
                    <div className="compact-item">
                        <span className="compact-label">FPS:</span>
                        <span className="compact-value">{Math.round(metrics.fps?.current || 0)}</span>
                    </div>
                    <div className="compact-item">
                        <span className="compact-label">MEM:</span>
                        <span className="compact-value">{Math.round(metrics.memory?.used || 0)}MB</span>
                    </div>
                    <div className="compact-item">
                        <span className="compact-label">MS:</span>
                        <span className="compact-value">{(metrics.frameTime?.current || 0).toFixed(1)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceMetricsDisplay;