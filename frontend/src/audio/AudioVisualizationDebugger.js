/**
 * Audio Visualization and Debugging System
 * Advanced visualization and debugging tools for audio systems
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class AudioVisualizationDebugger extends EventEmitter {
    constructor(audioManagementSystem, options = {}) {
        super();
        
        this.audioSystem = audioManagementSystem;
        this.options = {
            // Visualization settings
            enableSpectrum: options.enableSpectrum !== false,
            enableWaveform: options.enableWaveform !== false,
            enableVolumeMeters: options.enableVolumeMeters !== false,
            enableSpatialVisualization: options.enableSpatialVisualization !== false,
            
            // Debug settings
            enablePerformanceGraphs: options.enablePerformanceGraphs !== false,
            enableAudioAnalysis: options.enableAudioAnalysis !== false,
            enableNetworkMonitoring: options.enableNetworkMonitoring !== false,
            
            // Display settings
            canvasWidth: options.canvasWidth || 800,
            canvasHeight: options.canvasHeight || 400,
            backgroundColor: options.backgroundColor || '#1a1a1a',
            primaryColor: options.primaryColor || '#00ff00',
            secondaryColor: options.secondaryColor || '#ffff00',
            warningColor: options.warningColor || '#ff8800',
            errorColor: options.errorColor || '#ff0000',
            
            // Update rates
            visualizationFPS: options.visualizationFPS || 60,
            debugUpdateRate: options.debugUpdateRate || 10, // Hz
            
            // Analysis settings
            fftSize: options.fftSize || 2048,
            smoothingTimeConstant: options.smoothingTimeConstant || 0.8,
            
            ...options
        };
        
        // Canvas and rendering
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;
        
        // Visualization data
        this.visualizationData = {
            spectrum: null,
            waveform: null,
            volumeLevel: 0,
            peakLevel: 0,
            spatialSources: new Map()
        };
        
        // Debug data
        this.debugData = {
            performance: [],
            audioAnalysis: {},
            networkStats: {},
            systemInfo: {},
            errorLog: []
        };
        
        // Performance tracking
        this.performanceTracker = {
            frameCount: 0,
            lastFrameTime: 0,
            fps: 0,
            renderTime: 0,
            maxRenderTime: 0
        };
        
        // Audio analysis
        this.audioAnalyzer = {
            frequencyBins: null,
            peakFrequency: 0,
            spectralCentroid: 0,
            spectralRolloff: 0,
            zeroCrossingRate: 0,
            rms: 0,
            dynamicRange: 0
        };
        
        // Network monitoring
        this.networkMonitor = {
            bytesLoaded: 0,
            bytesTotal: 0,
            loadingSpeed: 0,
            connectionQuality: 'good',
            latency: 0
        };
        
        this.logger = electronIntegration.getLogger();
        this.isRunning = false;
        
        // Bind to audio system events
        this.bindAudioSystemEvents();
    }

    /**
     * Bind to audio system events
     */
    bindAudioSystemEvents() {
        this.audioSystem.on('visualizationUpdate', (data) => {
            this.updateVisualizationData(data);
        });
        
        this.audioSystem.on('performanceUpdate', (data) => {
            this.updatePerformanceData(data);
        });
        
        this.audioSystem.on('assetLoaded', (data) => {
            this.trackAssetLoading(data);
        });
        
        this.audioSystem.on('assetLoadError', (data) => {
            this.trackLoadingError(data);
        });
    }

    /**
     * Initialize visualization system
     */
    async initialize(canvasElement) {
        try {
            this.logger.info('Initializing Audio Visualization Debugger...');
            
            // Set up canvas
            if (canvasElement) {
                this.canvas = canvasElement;
            } else {
                this.canvas = this.createCanvas();
            }
            
            this.ctx = this.canvas.getContext('2d');
            this.setupCanvas();
            
            // Initialize visualization data arrays
            this.initializeVisualizationArrays();
            
            // Set up debug data collection
            this.setupDebugDataCollection();
            
            // Initialize audio analysis
            this.initializeAudioAnalysis();
            
            this.logger.info('Audio Visualization Debugger initialized');
            this.emit('initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize Audio Visualization Debugger:', error);
            throw error;
        }
    }

    /**
     * Create canvas element
     */
    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = this.options.canvasWidth;
        canvas.height = this.options.canvasHeight;
        canvas.style.border = '1px solid #333';
        canvas.style.backgroundColor = this.options.backgroundColor;
        return canvas;
    }

    /**
     * Set up canvas properties
     */
    setupCanvas() {
        this.canvas.width = this.options.canvasWidth;
        this.canvas.height = this.options.canvasHeight;
        
        // Set up context properties
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.strokeStyle = this.options.primaryColor;
        this.ctx.lineWidth = 1;
        this.ctx.font = '12px monospace';
    }

    /**
     * Initialize visualization data arrays
     */
    initializeVisualizationArrays() {
        const bufferLength = this.options.fftSize / 2;
        
        this.visualizationData.spectrum = new Uint8Array(bufferLength);
        this.visualizationData.waveform = new Uint8Array(this.options.fftSize);
        
        this.audioAnalyzer.frequencyBins = new Float32Array(bufferLength);
    }

    /**
     * Set up debug data collection
     */
    setupDebugDataCollection() {
        // Start debug data collection
        this.debugInterval = setInterval(() => {
            this.collectDebugData();
        }, 1000 / this.options.debugUpdateRate);
        
        // Collect system info
        this.collectSystemInfo();
    }

    /**
     * Initialize audio analysis
     */
    initializeAudioAnalysis() {
        // Set up analysis parameters
        this.audioAnalyzer.sampleRate = this.audioSystem.audioContext?.sampleRate || 44100;
        this.audioAnalyzer.nyquistFrequency = this.audioAnalyzer.sampleRate / 2;
    }

    /**
     * Start visualization
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('Audio Visualization Debugger already running');
            return;
        }
        
        this.logger.info('Starting Audio Visualization Debugger...');
        
        this.isRunning = true;
        this.startRenderLoop();
        
        this.emit('started');
        this.logger.info('Audio Visualization Debugger started');
    }

    /**
     * Stop visualization
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.logger.info('Stopping Audio Visualization Debugger...');
        
        this.isRunning = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.debugInterval) {
            clearInterval(this.debugInterval);
            this.debugInterval = null;
        }
        
        this.emit('stopped');
        this.logger.info('Audio Visualization Debugger stopped');
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = (timestamp) => {
            if (!this.isRunning) return;
            
            const startTime = performance.now();
            
            // Update performance tracking
            this.updatePerformanceTracking(timestamp);
            
            // Clear canvas
            this.clearCanvas();
            
            // Render visualizations
            this.renderVisualizations();
            
            // Render debug information
            this.renderDebugInfo();
            
            // Track render time
            const renderTime = performance.now() - startTime;
            this.performanceTracker.renderTime = renderTime;
            this.performanceTracker.maxRenderTime = Math.max(
                this.performanceTracker.maxRenderTime,
                renderTime
            );
            
            // Continue loop
            this.animationFrame = requestAnimationFrame(render);
        };
        
        this.animationFrame = requestAnimationFrame(render);
    }

    /**
     * Update performance tracking
     */
    updatePerformanceTracking(timestamp) {
        this.performanceTracker.frameCount++;
        
        if (timestamp - this.performanceTracker.lastFrameTime >= 1000) {
            this.performanceTracker.fps = this.performanceTracker.frameCount;
            this.performanceTracker.frameCount = 0;
            this.performanceTracker.lastFrameTime = timestamp;
        }
    }

    /**
     * Clear canvas
     */
    clearCanvas() {
        this.ctx.fillStyle = this.options.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render all visualizations
     */
    renderVisualizations() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Calculate layout
        const spectrumHeight = height * 0.4;
        const waveformHeight = height * 0.3;
        const metersHeight = height * 0.15;
        const debugHeight = height * 0.15;
        
        let yOffset = 0;
        
        // Render spectrum analyzer
        if (this.options.enableSpectrum && this.visualizationData.spectrum) {
            this.renderSpectrum(0, yOffset, width, spectrumHeight);
            yOffset += spectrumHeight;
        }
        
        // Render waveform
        if (this.options.enableWaveform && this.visualizationData.waveform) {
            this.renderWaveform(0, yOffset, width, waveformHeight);
            yOffset += waveformHeight;
        }
        
        // Render volume meters
        if (this.options.enableVolumeMeters) {
            this.renderVolumeMeters(0, yOffset, width, metersHeight);
            yOffset += metersHeight;
        }
        
        // Render spatial visualization
        if (this.options.enableSpatialVisualization) {
            this.renderSpatialVisualization(width * 0.7, 10, width * 0.25, height * 0.25);
        }
    }

    /**
     * Render spectrum analyzer
     */
    renderSpectrum(x, y, width, height) {
        if (!this.visualizationData.spectrum) return;
        
        const barWidth = width / this.visualizationData.spectrum.length;
        
        this.ctx.fillStyle = this.options.primaryColor;
        
        for (let i = 0; i < this.visualizationData.spectrum.length; i++) {
            const barHeight = (this.visualizationData.spectrum[i] / 255) * height;
            
            this.ctx.fillRect(
                x + i * barWidth,
                y + height - barHeight,
                barWidth - 1,
                barHeight
            );
        }
        
        // Draw frequency labels
        this.drawFrequencyLabels(x, y, width, height);
        
        // Draw title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('Spectrum Analyzer', x + 10, y + 20);
    }

    /**
     * Draw frequency labels
     */
    drawFrequencyLabels(x, y, width, height) {
        const sampleRate = this.audioAnalyzer.sampleRate;
        const nyquist = sampleRate / 2;
        
        this.ctx.fillStyle = '#888888';
        this.ctx.font = '10px monospace';
        
        // Draw frequency markers
        const frequencies = [100, 1000, 5000, 10000];
        
        frequencies.forEach(freq => {
            if (freq <= nyquist) {
                const xPos = x + (freq / nyquist) * width;
                
                this.ctx.beginPath();
                this.ctx.moveTo(xPos, y);
                this.ctx.lineTo(xPos, y + height);
                this.ctx.strokeStyle = '#444444';
                this.ctx.stroke();
                
                this.ctx.fillText(
                    freq >= 1000 ? `${freq / 1000}k` : `${freq}`,
                    xPos + 2,
                    y + height - 5
                );
            }
        });
    }

    /**
     * Render waveform
     */
    renderWaveform(x, y, width, height) {
        if (!this.visualizationData.waveform) return;
        
        const sliceWidth = width / this.visualizationData.waveform.length;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.options.secondaryColor;
        this.ctx.lineWidth = 2;
        
        let xPos = x;
        
        for (let i = 0; i < this.visualizationData.waveform.length; i++) {
            const v = this.visualizationData.waveform[i] / 128.0;
            const yPos = y + (v * height) / 2;
            
            if (i === 0) {
                this.ctx.moveTo(xPos, yPos);
            } else {
                this.ctx.lineTo(xPos, yPos);
            }
            
            xPos += sliceWidth;
        }
        
        this.ctx.stroke();
        
        // Draw center line
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#444444';
        this.ctx.lineWidth = 1;
        this.ctx.moveTo(x, y + height / 2);
        this.ctx.lineTo(x + width, y + height / 2);
        this.ctx.stroke();
        
        // Draw title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Waveform', x + 10, y + 20);
    }

    /**
     * Render volume meters
     */
    renderVolumeMeters(x, y, width, height) {
        const meterWidth = width * 0.8;
        const meterHeight = height * 0.3;
        const meterY = y + height * 0.1;
        
        // Volume level meter
        this.renderMeter(
            x + 10, meterY,
            meterWidth, meterHeight,
            this.visualizationData.volumeLevel / 128,
            'Volume'
        );
        
        // Peak level meter
        this.renderMeter(
            x + 10, meterY + meterHeight + 10,
            meterWidth, meterHeight,
            this.visualizationData.peakLevel / 128,
            'Peak'
        );
    }

    /**
     * Render individual meter
     */
    renderMeter(x, y, width, height, level, label) {
        // Background
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x, y, width, height);
        
        // Level bar
        const levelWidth = width * level;
        const color = level > 0.8 ? this.options.errorColor :
                     level > 0.6 ? this.options.warningColor :
                     this.options.primaryColor;
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, levelWidth, height);
        
        // Border
        this.ctx.strokeStyle = '#666666';
        this.ctx.strokeRect(x, y, width, height);
        
        // Label
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(label, x, y - 5);
        
        // Value
        this.ctx.fillText(
            `${(level * 100).toFixed(1)}%`,
            x + width - 40,
            y + height - 3
        );
    }

    /**
     * Render spatial visualization
     */
    renderSpatialVisualization(x, y, width, height) {
        // Background circle
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        const radius = Math.min(width, height) / 2 - 10;
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#444444';
        this.ctx.stroke();
        
        // Draw spatial sources
        for (const [sourceId, sourceData] of this.visualizationData.spatialSources) {
            this.renderSpatialSource(centerX, centerY, radius, sourceData);
        }
        
        // Draw listener position (center)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.options.primaryColor;
        this.ctx.fill();
        
        // Title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Spatial Audio', x, y - 5);
    }

    /**
     * Render spatial audio source
     */
    renderSpatialSource(centerX, centerY, radius, sourceData) {
        const { x: srcX, y: srcY, volume, distance } = sourceData;
        
        // Calculate position on circle
        const angle = Math.atan2(srcY, srcX);
        const normalizedDistance = Math.min(distance / 100, 1); // Normalize to 0-1
        const sourceRadius = radius * normalizedDistance;
        
        const posX = centerX + Math.cos(angle) * sourceRadius;
        const posY = centerY + Math.sin(angle) * sourceRadius;
        
        // Draw source
        this.ctx.beginPath();
        this.ctx.arc(posX, posY, 2 + volume * 3, 0, 2 * Math.PI);
        this.ctx.fillStyle = this.options.secondaryColor;
        this.ctx.fill();
        
        // Draw connection line
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.lineTo(posX, posY);
        this.ctx.strokeStyle = '#666666';
        this.ctx.setLineDash([2, 2]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * Render debug information
     */
    renderDebugInfo() {
        if (!this.options.enablePerformanceGraphs) return;
        
        const debugX = 10;
        const debugY = this.canvas.height - 100;
        const debugWidth = 300;
        const debugHeight = 80;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(debugX, debugY, debugWidth, debugHeight);
        
        // Performance info
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px monospace';
        
        const lines = [
            `FPS: ${this.performanceTracker.fps}`,
            `Render: ${this.performanceTracker.renderTime.toFixed(2)}ms`,
            `Max Render: ${this.performanceTracker.maxRenderTime.toFixed(2)}ms`,
            `Audio Latency: ${(this.audioAnalyzer.latency * 1000).toFixed(1)}ms`,
            `Sources: ${this.audioSystem.streamingSources?.size || 0}`,
            `Buffers: ${this.audioSystem.audioBuffers?.size || 0}`
        ];
        
        lines.forEach((line, index) => {
            this.ctx.fillText(line, debugX + 5, debugY + 15 + index * 12);
        });
        
        // Performance graph
        this.renderPerformanceGraph(debugX + 150, debugY + 5, 140, 70);
    }

    /**
     * Render performance graph
     */
    renderPerformanceGraph(x, y, width, height) {
        if (this.debugData.performance.length < 2) return;
        
        const data = this.debugData.performance.slice(-50); // Last 50 points
        const maxValue = Math.max(...data.map(d => d.cpuUsage || 0));
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.options.primaryColor;
        this.ctx.lineWidth = 1;
        
        data.forEach((point, index) => {
            const xPos = x + (index / (data.length - 1)) * width;
            const yPos = y + height - (point.cpuUsage / maxValue) * height;
            
            if (index === 0) {
                this.ctx.moveTo(xPos, yPos);
            } else {
                this.ctx.lineTo(xPos, yPos);
            }
        });
        
        this.ctx.stroke();
    }

    /**
     * Update visualization data
     */
    updateVisualizationData(data) {
        if (data.frequencyData) {
            this.visualizationData.spectrum = new Uint8Array(data.frequencyData);
        }
        
        if (data.waveformData) {
            this.visualizationData.waveform = new Uint8Array(data.waveformData);
        }
        
        this.visualizationData.volumeLevel = data.volumeLevel || 0;
        this.visualizationData.peakLevel = data.peakLevel || 0;
        
        // Perform audio analysis
        this.performAudioAnalysis();
    }

    /**
     * Perform advanced audio analysis
     */
    performAudioAnalysis() {
        if (!this.visualizationData.spectrum) return;
        
        const spectrum = this.visualizationData.spectrum;
        const sampleRate = this.audioAnalyzer.sampleRate;
        
        // Calculate spectral centroid
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < spectrum.length; i++) {
            const frequency = (i / spectrum.length) * (sampleRate / 2);
            const magnitude = spectrum[i];
            
            weightedSum += frequency * magnitude;
            magnitudeSum += magnitude;
        }
        
        this.audioAnalyzer.spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
        
        // Find peak frequency
        let maxMagnitude = 0;
        let peakIndex = 0;
        
        for (let i = 0; i < spectrum.length; i++) {
            if (spectrum[i] > maxMagnitude) {
                maxMagnitude = spectrum[i];
                peakIndex = i;
            }
        }
        
        this.audioAnalyzer.peakFrequency = (peakIndex / spectrum.length) * (sampleRate / 2);
        
        // Calculate RMS
        let sumSquares = 0;
        for (let i = 0; i < spectrum.length; i++) {
            sumSquares += spectrum[i] * spectrum[i];
        }
        this.audioAnalyzer.rms = Math.sqrt(sumSquares / spectrum.length);
        
        // Update debug data
        this.debugData.audioAnalysis = {
            spectralCentroid: this.audioAnalyzer.spectralCentroid,
            peakFrequency: this.audioAnalyzer.peakFrequency,
            rms: this.audioAnalyzer.rms,
            timestamp: Date.now()
        };
    }

    /**
     * Update performance data
     */
    updatePerformanceData(data) {
        this.debugData.performance.push({
            timestamp: Date.now(),
            cpuUsage: data.cpuLoad || 0,
            memoryUsage: data.memoryUsage || 0,
            activeSourceCount: data.activeSourceCount || 0
        });
        
        // Limit history size
        if (this.debugData.performance.length > 100) {
            this.debugData.performance.shift();
        }
    }

    /**
     * Track asset loading
     */
    trackAssetLoading(data) {
        this.networkMonitor.bytesLoaded += data.size || 0;
        
        // Calculate loading speed
        const now = Date.now();
        if (this.networkMonitor.lastLoadTime) {
            const timeDiff = (now - this.networkMonitor.lastLoadTime) / 1000;
            const sizeDiff = data.size || 0;
            this.networkMonitor.loadingSpeed = sizeDiff / timeDiff;
        }
        this.networkMonitor.lastLoadTime = now;
    }

    /**
     * Track loading errors
     */
    trackLoadingError(data) {
        this.debugData.errorLog.push({
            timestamp: Date.now(),
            type: 'loading_error',
            assetId: data.assetId,
            error: data.error.message
        });
        
        // Limit error log size
        if (this.debugData.errorLog.length > 50) {
            this.debugData.errorLog.shift();
        }
    }

    /**
     * Collect debug data
     */
    collectDebugData() {
        // Collect system info periodically
        this.debugData.systemInfo = {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            audioContextState: this.audioSystem.audioContext?.state,
            sampleRate: this.audioSystem.audioContext?.sampleRate,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Collect system information
     */
    collectSystemInfo() {
        this.debugData.systemInfo = {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }

    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    /**
     * Get canvas element
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Get debug data
     */
    getDebugData() {
        return {
            ...this.debugData,
            performanceTracker: { ...this.performanceTracker },
            audioAnalyzer: { ...this.audioAnalyzer },
            networkMonitor: { ...this.networkMonitor }
        };
    }

    /**
     * Export debug data
     */
    exportDebugData() {
        const exportData = {
            timestamp: Date.now(),
            debugData: this.getDebugData(),
            audioSystemStats: this.audioSystem.getPerformanceStats(),
            audioSettings: this.audioSystem.getSettings()
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Take screenshot of visualization
     */
    takeScreenshot() {
        if (!this.canvas) return null;
        
        return this.canvas.toDataURL('image/png');
    }

    /**
     * Dispose of the visualization debugger
     */
    dispose() {
        this.stop();
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        this.removeAllListeners();
        this.logger.info('Audio Visualization Debugger disposed');
    }
}

export default AudioVisualizationDebugger;