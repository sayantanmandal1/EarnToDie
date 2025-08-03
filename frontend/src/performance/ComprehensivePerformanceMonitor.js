/**
 * Comprehensive Performance Monitor
 * Real-time performance metrics, automatic quality adjustment, and debugging tools
 */
class ComprehensivePerformanceMonitor {
    constructor(gameEngine, renderingOptimizer) {
        this.gameEngine = gameEngine;
        this.renderingOptimizer = renderingOptimizer;
        
        // Performance metrics storage
        this.metrics = {
            fps: { current: 60, history: [], average: 60, min: 60, max: 60 },
            frameTime: { current: 16.67, history: [], average: 16.67, min: 16.67, max: 16.67 },
            drawCalls: { current: 0, history: [], average: 0, min: 0, max: 0 },
            triangles: { current: 0, history: [], average: 0, min: 0, max: 0 },
            memory: { 
                used: 0, 
                total: 0, 
                heap: 0, 
                history: [], 
                average: 0, 
                gcCount: 0,
                gcTime: 0
            },
            gpu: {
                usage: 0,
                memory: 0,
                temperature: 0,
                history: []
            },
            network: {
                latency: 0,
                bandwidth: 0,
                packetsLost: 0,
                history: []
            }
        };
        
        // Monitoring configuration
        this.config = {
            enabled: true,
            updateInterval: 100, // 100ms
            historyLength: 300, // 30 seconds at 100ms intervals
            alertThresholds: {
                lowFPS: 30,
                highFrameTime: 33.33,
                highMemory: 512, // MB
                highDrawCalls: 1000
            },
            autoQualityAdjustment: true,
            debugMode: false
        };
        
        // Performance state
        this.state = {
            isMonitoring: false,
            lastUpdate: 0,
            performanceLevel: 'good', // 'excellent', 'good', 'fair', 'poor'
            alerts: [],
            profilerData: new Map()
        };
        
        this.initialize();
    }    /**

     * Initialize the performance monitor
     */
    initialize() {
        this.setupPerformanceObservers();
        this.setupMemoryMonitoring();
        this.setupGPUMonitoring();
        this.setupNetworkMonitoring();
        this.setupAutomaticQualityAdjustment();
        this.startMonitoring();
        
        console.log('Comprehensive Performance Monitor initialized');
    }
    
    /**
     * Setup performance observers
     */
    setupPerformanceObservers() {
        // Frame timing observer
        if ('PerformanceObserver' in window) {
            try {
                this.frameObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.entryType === 'measure') {
                            this.recordFrameTime(entry.duration);
                        }
                    });
                });
                this.frameObserver.observe({ entryTypes: ['measure'] });
            } catch (error) {
                console.warn('PerformanceObserver not fully supported:', error);
            }
        }
        
        // Long task observer
        if ('PerformanceObserver' in window) {
            try {
                this.longTaskObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        this.recordLongTask(entry);
                    });
                });
                this.longTaskObserver.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.warn('Long task observer not supported:', error);
            }
        }
    }
    
    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        this.memoryMonitor = {
            enabled: 'memory' in performance,
            gcDetection: {
                lastHeapSize: 0,
                gcThreshold: 10 * 1024 * 1024, // 10MB
                gcCount: 0
            }
        };
        
        if (this.memoryMonitor.enabled) {
            this.memoryMonitor.gcDetection.lastHeapSize = performance.memory.usedJSHeapSize;
        }
    }
    
    /**
     * Setup GPU monitoring (experimental)
     */
    setupGPUMonitoring() {
        this.gpuMonitor = {
            enabled: false,
            adapter: null,
            device: null
        };
        
        // Try to get GPU info via WebGPU (experimental)
        if ('gpu' in navigator) {
            navigator.gpu.requestAdapter().then(adapter => {
                if (adapter) {
                    this.gpuMonitor.adapter = adapter;
                    this.gpuMonitor.enabled = true;
                }
            }).catch(error => {
                console.warn('WebGPU not available:', error);
            });
        }
    }
    
    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        this.networkMonitor = {
            enabled: 'connection' in navigator,
            connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
        };
        
        if (this.networkMonitor.enabled) {
            this.networkMonitor.connection.addEventListener('change', () => {
                this.updateNetworkMetrics();
            });
        }
    }  
  /**
     * Setup automatic quality adjustment
     */
    setupAutomaticQualityAdjustment() {
        this.qualityAdjuster = {
            enabled: this.config.autoQualityAdjustment,
            lastAdjustment: 0,
            adjustmentCooldown: 5000, // 5 seconds
            performanceHistory: [],
            adjustmentRules: [
                {
                    condition: (metrics) => metrics.fps.average < 25,
                    action: 'decrease',
                    priority: 'high',
                    description: 'Very low FPS detected'
                },
                {
                    condition: (metrics) => metrics.memory.used > 400,
                    action: 'decrease',
                    priority: 'medium',
                    description: 'High memory usage detected'
                },
                {
                    condition: (metrics) => metrics.fps.average > 55 && metrics.memory.used < 200,
                    action: 'increase',
                    priority: 'low',
                    description: 'Good performance, can increase quality'
                }
            ]
        };
    }
    
    /**
     * Start monitoring
     */
    startMonitoring() {
        if (this.state.isMonitoring) return;
        
        this.state.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.updateMetrics();
        }, this.config.updateInterval);
        
        // Start frame timing
        this.frameTimer = {
            lastFrameTime: performance.now(),
            frameCount: 0
        };
        
        this.startFrameLoop();
    }
    
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.state.isMonitoring) return;
        
        this.state.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        if (this.frameObserver) {
            this.frameObserver.disconnect();
        }
        
        if (this.longTaskObserver) {
            this.longTaskObserver.disconnect();
        }
    }
    
    /**
     * Start frame timing loop
     */
    startFrameLoop() {
        const frameLoop = () => {
            if (!this.state.isMonitoring) return;
            
            const now = performance.now();
            const frameTime = now - this.frameTimer.lastFrameTime;
            
            this.recordFrameTime(frameTime);
            this.frameTimer.lastFrameTime = now;
            this.frameTimer.frameCount++;
            
            requestAnimationFrame(frameLoop);
        };
        
        requestAnimationFrame(frameLoop);
    }
    
    /**
     * Update all metrics
     */
    updateMetrics() {
        const now = performance.now();
        if (now - this.state.lastUpdate < this.config.updateInterval) return;
        
        this.state.lastUpdate = now;
        
        this.updateFPSMetrics();
        this.updateMemoryMetrics();
        this.updateRenderingMetrics();
        this.updateGPUMetrics();
        this.updateNetworkMetrics();
        this.updatePerformanceLevel();
        this.checkAlerts();
        this.performAutomaticQualityAdjustment();
        this.updateProfilerData();
    }    /
**
     * Record frame time
     */
    recordFrameTime(frameTime) {
        this.metrics.frameTime.current = frameTime;
        this.addToHistory('frameTime', frameTime);
        
        // Calculate FPS from frame time
        const fps = 1000 / frameTime;
        this.metrics.fps.current = fps;
        this.addToHistory('fps', fps);
    }
    
    /**
     * Record long task
     */
    recordLongTask(entry) {
        const alert = {
            type: 'longtask',
            timestamp: Date.now(),
            duration: entry.duration,
            startTime: entry.startTime,
            severity: entry.duration > 100 ? 'high' : 'medium'
        };
        
        this.addAlert(alert);
    }
    
    /**
     * Update FPS metrics
     */
    updateFPSMetrics() {
        const fps = this.metrics.fps;
        if (fps.history.length > 0) {
            fps.average = fps.history.reduce((a, b) => a + b, 0) / fps.history.length;
            fps.min = Math.min(...fps.history);
            fps.max = Math.max(...fps.history);
        }
    }
    
    /**
     * Update memory metrics
     */
    updateMemoryMetrics() {
        if (!this.memoryMonitor.enabled) return;
        
        const memory = performance.memory;
        const metrics = this.metrics.memory;
        
        metrics.used = memory.usedJSHeapSize / (1024 * 1024); // MB
        metrics.total = memory.totalJSHeapSize / (1024 * 1024); // MB
        metrics.heap = memory.jsHeapSizeLimit / (1024 * 1024); // MB
        
        this.addToHistory('memory', metrics.used);
        
        // Detect garbage collection
        this.detectGarbageCollection(memory.usedJSHeapSize);
        
        // Calculate average
        if (metrics.history.length > 0) {
            metrics.average = metrics.history.reduce((a, b) => a + b, 0) / metrics.history.length;
        }
    }
    
    /**
     * Detect garbage collection
     */
    detectGarbageCollection(currentHeapSize) {
        const gcDetection = this.memoryMonitor.gcDetection;
        const heapDrop = gcDetection.lastHeapSize - currentHeapSize;
        
        if (heapDrop > gcDetection.gcThreshold) {
            gcDetection.gcCount++;
            this.metrics.memory.gcCount = gcDetection.gcCount;
            
            const alert = {
                type: 'gc',
                timestamp: Date.now(),
                heapDrop: heapDrop / (1024 * 1024), // MB
                severity: 'low'
            };
            
            this.addAlert(alert);
        }
        
        gcDetection.lastHeapSize = currentHeapSize;
    }
    
    /**
     * Update rendering metrics
     */
    updateRenderingMetrics() {
        if (this.renderingOptimizer) {
            const renderMetrics = this.renderingOptimizer.getPerformanceMetrics();
            
            this.metrics.drawCalls.current = renderMetrics.drawCalls;
            this.metrics.triangles.current = renderMetrics.triangles;
            
            this.addToHistory('drawCalls', renderMetrics.drawCalls);
            this.addToHistory('triangles', renderMetrics.triangles);
            
            // Calculate averages
            this.calculateAverages('drawCalls');
            this.calculateAverages('triangles');
        }
    } 
   /**
     * Update GPU metrics
     */
    updateGPUMetrics() {
        if (!this.gpuMonitor.enabled) return;
        
        // GPU metrics are limited in web browsers
        // This is a placeholder for future WebGPU features
        const gpu = this.metrics.gpu;
        
        // Estimate GPU usage based on rendering complexity
        const drawCalls = this.metrics.drawCalls.current;
        const triangles = this.metrics.triangles.current;
        
        gpu.usage = Math.min(100, (drawCalls / 10) + (triangles / 100000) * 50);
        this.addToHistory('gpu', gpu.usage);
    }
    
    /**
     * Update network metrics
     */
    updateNetworkMetrics() {
        if (!this.networkMonitor.enabled) return;
        
        const connection = this.networkMonitor.connection;
        const network = this.metrics.network;
        
        network.bandwidth = connection.downlink || 0;
        network.latency = connection.rtt || 0;
        
        this.addToHistory('network', {
            bandwidth: network.bandwidth,
            latency: network.latency
        });
    }
    
    /**
     * Update performance level
     */
    updatePerformanceLevel() {
        const fps = this.metrics.fps.average;
        const memory = this.metrics.memory.used;
        const frameTime = this.metrics.frameTime.average;
        
        let level = 'good';
        
        if (fps >= 55 && memory < 200 && frameTime < 20) {
            level = 'excellent';
        } else if (fps >= 45 && memory < 300 && frameTime < 25) {
            level = 'good';
        } else if (fps >= 30 && memory < 400 && frameTime < 35) {
            level = 'fair';
        } else {
            level = 'poor';
        }
        
        if (level !== this.state.performanceLevel) {
            this.state.performanceLevel = level;
            this.onPerformanceLevelChange(level);
        }
    }
    
    /**
     * Check for performance alerts
     */
    checkAlerts() {
        const thresholds = this.config.alertThresholds;
        const metrics = this.metrics;
        
        // Low FPS alert
        if (metrics.fps.average < thresholds.lowFPS) {
            this.addAlert({
                type: 'low_fps',
                timestamp: Date.now(),
                value: metrics.fps.average,
                threshold: thresholds.lowFPS,
                severity: 'high'
            });
        }
        
        // High frame time alert
        if (metrics.frameTime.average > thresholds.highFrameTime) {
            this.addAlert({
                type: 'high_frametime',
                timestamp: Date.now(),
                value: metrics.frameTime.average,
                threshold: thresholds.highFrameTime,
                severity: 'medium'
            });
        }
        
        // High memory usage alert
        if (metrics.memory.used > thresholds.highMemory) {
            this.addAlert({
                type: 'high_memory',
                timestamp: Date.now(),
                value: metrics.memory.used,
                threshold: thresholds.highMemory,
                severity: 'medium'
            });
        }
        
        // High draw calls alert
        if (metrics.drawCalls.current > thresholds.highDrawCalls) {
            this.addAlert({
                type: 'high_drawcalls',
                timestamp: Date.now(),
                value: metrics.drawCalls.current,
                threshold: thresholds.highDrawCalls,
                severity: 'low'
            });
        }
    }    /
**
     * Perform automatic quality adjustment
     */
    performAutomaticQualityAdjustment() {
        if (!this.qualityAdjuster.enabled) return;
        
        const now = Date.now();
        if (now - this.qualityAdjuster.lastAdjustment < this.qualityAdjuster.adjustmentCooldown) {
            return;
        }
        
        const metrics = this.metrics;
        const rules = this.qualityAdjuster.adjustmentRules;
        
        // Check adjustment rules
        for (const rule of rules) {
            if (rule.condition(metrics)) {
                this.executeQualityAdjustment(rule);
                this.qualityAdjuster.lastAdjustment = now;
                break;
            }
        }
    }
    
    /**
     * Execute quality adjustment
     */
    executeQualityAdjustment(rule) {
        if (!this.renderingOptimizer) return;
        
        const currentQuality = this.renderingOptimizer.getQualitySettings();
        let newQuality = currentQuality.level;
        
        if (rule.action === 'decrease') {
            this.renderingOptimizer.decreaseQuality();
            newQuality = this.renderingOptimizer.getQualitySettings().level;
        } else if (rule.action === 'increase') {
            this.renderingOptimizer.increaseQuality();
            newQuality = this.renderingOptimizer.getQualitySettings().level;
        }
        
        console.log(`Quality adjusted: ${currentQuality.level} → ${newQuality} (${rule.description})`);
        
        this.addAlert({
            type: 'quality_adjustment',
            timestamp: Date.now(),
            from: currentQuality.level,
            to: newQuality,
            reason: rule.description,
            severity: 'info'
        });
    }
    
    /**
     * Update profiler data
     */
    updateProfilerData() {
        if (!this.config.debugMode) return;
        
        const now = Date.now();
        const profilerEntry = {
            timestamp: now,
            fps: this.metrics.fps.current,
            frameTime: this.metrics.frameTime.current,
            memory: this.metrics.memory.used,
            drawCalls: this.metrics.drawCalls.current,
            triangles: this.metrics.triangles.current,
            performanceLevel: this.state.performanceLevel
        };
        
        this.state.profilerData.set(now, profilerEntry);
        
        // Limit profiler data size
        if (this.state.profilerData.size > 1000) {
            const oldestKey = this.state.profilerData.keys().next().value;
            this.state.profilerData.delete(oldestKey);
        }
    }
    
    /**
     * Add value to metric history
     */
    addToHistory(metricName, value) {
        const metric = this.metrics[metricName];
        if (!metric || !metric.history) return;
        
        metric.history.push(value);
        
        if (metric.history.length > this.config.historyLength) {
            metric.history.shift();
        }
    }
    
    /**
     * Calculate averages for a metric
     */
    calculateAverages(metricName) {
        const metric = this.metrics[metricName];
        if (!metric || !metric.history || metric.history.length === 0) return;
        
        metric.average = metric.history.reduce((a, b) => a + b, 0) / metric.history.length;
        metric.min = Math.min(...metric.history);
        metric.max = Math.max(...metric.history);
    }
    
    /**
     * Add alert
     */
    addAlert(alert) {
        // Prevent duplicate alerts
        const isDuplicate = this.state.alerts.some(existing => 
            existing.type === alert.type && 
            Date.now() - existing.timestamp < 5000
        );
        
        if (isDuplicate) return;
        
        this.state.alerts.push(alert);
        
        // Limit alert history
        if (this.state.alerts.length > 100) {
            this.state.alerts.shift();
        }
        
        // Emit alert event
        this.onAlert(alert);
    } 
   /**
     * Performance level change callback
     */
    onPerformanceLevelChange(level) {
        console.log(`Performance level changed to: ${level}`);
        
        if (this.gameEngine && this.gameEngine.emit) {
            this.gameEngine.emit('performanceLevelChanged', level);
        }
    }
    
    /**
     * Alert callback
     */
    onAlert(alert) {
        if (this.config.debugMode) {
            console.warn('Performance Alert:', alert);
        }
        
        if (this.gameEngine && this.gameEngine.emit) {
            this.gameEngine.emit('performanceAlert', alert);
        }
    }
    
    /**
     * Get current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            performanceLevel: this.state.performanceLevel,
            alerts: [...this.state.alerts],
            isMonitoring: this.state.isMonitoring
        };
    }
    
    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        return {
            fps: {
                current: Math.round(this.metrics.fps.current),
                average: Math.round(this.metrics.fps.average),
                min: Math.round(this.metrics.fps.min),
                max: Math.round(this.metrics.fps.max)
            },
            frameTime: {
                current: Math.round(this.metrics.frameTime.current * 100) / 100,
                average: Math.round(this.metrics.frameTime.average * 100) / 100
            },
            memory: {
                used: Math.round(this.metrics.memory.used),
                total: Math.round(this.metrics.memory.total),
                gcCount: this.metrics.memory.gcCount
            },
            rendering: {
                drawCalls: this.metrics.drawCalls.current,
                triangles: this.metrics.triangles.current
            },
            level: this.state.performanceLevel,
            alertCount: this.state.alerts.length
        };
    }
    
    /**
     * Get profiler data
     */
    getProfilerData() {
        return Array.from(this.state.profilerData.values());
    }
    
    /**
     * Force garbage collection (if available)
     */
    forceGarbageCollection() {
        if (window.gc) {
            window.gc();
            console.log('Forced garbage collection');
        } else {
            console.warn('Garbage collection not available');
        }
    }
    
    /**
     * Reset metrics
     */
    resetMetrics() {
        Object.keys(this.metrics).forEach(key => {
            const metric = this.metrics[key];
            if (metric.history) {
                metric.history = [];
            }
            if (typeof metric.current === 'number') {
                metric.current = 0;
            }
        });
        
        this.state.alerts = [];
        this.state.profilerData.clear();
        
        console.log('Performance metrics reset');
    }
    
    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (enabled && !this.state.isMonitoring) {
            this.startMonitoring();
        } else if (!enabled && this.state.isMonitoring) {
            this.stopMonitoring();
        }
    }
    
    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.config.debugMode = enabled;
        console.log(`Performance debug mode: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.autoQualityAdjustment !== undefined) {
            this.qualityAdjuster.enabled = newConfig.autoQualityAdjustment;
        }
    }
    
    /**
     * Dispose of the monitor
     */
    dispose() {
        this.stopMonitoring();
        
        if (this.networkMonitor.enabled && this.networkMonitor.connection) {
            this.networkMonitor.connection.removeEventListener('change', this.updateNetworkMetrics);
        }
        
        this.state.profilerData.clear();
        console.log('Performance monitor disposed');
    }
}

export default ComprehensivePerformanceMonitor;