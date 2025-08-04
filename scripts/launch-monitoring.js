#!/usr/bin/env node

/**
 * Launch Day Monitoring System
 * Real-time monitoring and response system for game launch
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class LaunchMonitoringSystem {
    constructor() {
        this.monitoringActive = false;
        this.startTime = null;
        this.metrics = {
            downloads: 0,
            activePlayers: 0,
            crashReports: 0,
            supportTickets: 0,
            reviewScore: 0,
            socialMentions: 0
        };
        
        this.alerts = [];
        this.thresholds = {
            crashRate: 0.05, // 5% crash rate threshold
            negativeReviews: 0.3, // 30% negative reviews threshold
            supportTicketRate: 0.1, // 10% support ticket rate threshold
            serverResponseTime: 5000 // 5 second response time threshold
        };
        
        this.platforms = {
            steam: { enabled: true, apiKey: process.env.STEAM_API_KEY },
            epic: { enabled: true, apiKey: process.env.EPIC_API_KEY },
            gog: { enabled: true, apiKey: process.env.GOG_API_KEY },
            itch: { enabled: true, apiKey: process.env.ITCH_API_KEY }
        };
        
        this.monitoringInterval = 60000; // 1 minute
        this.reportInterval = 300000; // 5 minutes
    }

    async startLaunchMonitoring() {
        console.log('🚀 Starting Launch Day Monitoring System...\n');
        
        try {
            this.monitoringActive = true;
            this.startTime = Date.now();
            
            // Initialize monitoring systems
            await this.initializeMonitoring();
            
            // Start monitoring loops
            this.startMetricsCollection();
            this.startAlertSystem();
            this.startReporting();
            
            // Set up emergency procedures
            this.setupEmergencyProcedures();
            
            console.log('✅ Launch monitoring system active');
            console.log('📊 Real-time dashboard available at: http://localhost:3001/dashboard');
            console.log('🚨 Emergency hotline: +1-XXX-XXX-XXXX\n');
            
            // Keep the process running
            await this.runMonitoringLoop();
            
        } catch (error) {
            console.error('💥 Launch monitoring failed to start:', error);
            await this.sendEmergencyAlert('Launch monitoring system failure', error);
            throw error;
        }
    }

    async initializeMonitoring() {
        console.log('🔧 Initializing monitoring systems...');
        
        // Create monitoring directories
        await fs.mkdir('monitoring/logs', { recursive: true });
        await fs.mkdir('monitoring/reports', { recursive: true });
        await fs.mkdir('monitoring/alerts', { recursive: true });
        
        // Initialize log files
        const logFiles = [
            'monitoring/logs/downloads.log',
            'monitoring/logs/crashes.log',
            'monitoring/logs/support.log',
            'monitoring/logs/reviews.log',
            'monitoring/logs/performance.log'
        ];
        
        for (const logFile of logFiles) {
            await fs.writeFile(logFile, `# Launch Monitoring Log - ${new Date().toISOString()}\n`);
        }
        
        // Test platform connections
        await this.testPlatformConnections();
        
        // Initialize dashboard
        await this.createMonitoringDashboard();
        
        console.log('  ✓ Monitoring systems initialized');
    }

    async testPlatformConnections() {
        console.log('  🔗 Testing platform connections...');
        
        for (const [platform, config] of Object.entries(this.platforms)) {
            if (config.enabled && config.apiKey) {
                try {
                    await this.testPlatformAPI(platform, config.apiKey);
                    console.log(`    ✓ ${platform.toUpperCase()} connection successful`);
                } catch (error) {
                    console.log(`    ⚠️  ${platform.toUpperCase()} connection failed: ${error.message}`);
                    this.alerts.push({
                        type: 'warning',
                        platform: platform,
                        message: `Platform API connection failed: ${error.message}`,
                        timestamp: Date.now()
                    });
                }
            } else {
                console.log(`    ⚠️  ${platform.toUpperCase()} not configured`);
            }
        }
    }

    async testPlatformAPI(platform, apiKey) {
        // Mock API test - in real implementation, this would test actual platform APIs
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() > 0.1) { // 90% success rate for testing
                    resolve();
                } else {
                    reject(new Error('API connection timeout'));
                }
            }, 1000);
        });
    }

    startMetricsCollection() {
        console.log('📊 Starting metrics collection...');
        
        setInterval(async () => {
            if (!this.monitoringActive) return;
            
            try {
                await this.collectPlatformMetrics();
                await this.collectPerformanceMetrics();
                await this.collectSupportMetrics();
                await this.collectSocialMetrics();
                
                // Log metrics
                await this.logMetrics();
                
            } catch (error) {
                console.error('Error collecting metrics:', error);
                this.alerts.push({
                    type: 'error',
                    message: `Metrics collection failed: ${error.message}`,
                    timestamp: Date.now()
                });
            }
        }, this.monitoringInterval);
    }

    async collectPlatformMetrics() {
        // Collect download and player metrics from each platform
        for (const [platform, config] of Object.entries(this.platforms)) {
            if (!config.enabled) continue;
            
            try {
                const metrics = await this.getPlatformMetrics(platform);
                
                // Update global metrics
                this.metrics.downloads += metrics.downloads || 0;
                this.metrics.activePlayers += metrics.activePlayers || 0;
                
                // Log platform-specific metrics
                await this.logPlatformMetrics(platform, metrics);
                
            } catch (error) {
                console.error(`Failed to collect ${platform} metrics:`, error);
            }
        }
    }

    async getPlatformMetrics(platform) {
        // Mock metrics - in real implementation, this would call actual platform APIs
        return {
            downloads: Math.floor(Math.random() * 100) + 50,
            activePlayers: Math.floor(Math.random() * 500) + 100,
            reviews: Math.floor(Math.random() * 20) + 5,
            averageRating: 4.2 + (Math.random() * 0.6),
            refunds: Math.floor(Math.random() * 5)
        };
    }

    async collectPerformanceMetrics() {
        // Collect crash reports and performance data
        try {
            const crashData = await this.getCrashReports();
            const performanceData = await this.getPerformanceMetrics();
            
            this.metrics.crashReports = crashData.totalCrashes;
            
            // Check crash rate threshold
            const crashRate = crashData.totalCrashes / Math.max(this.metrics.activePlayers, 1);
            if (crashRate > this.thresholds.crashRate) {
                this.alerts.push({
                    type: 'critical',
                    message: `High crash rate detected: ${(crashRate * 100).toFixed(2)}%`,
                    data: crashData,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('Failed to collect performance metrics:', error);
        }
    }

    async getCrashReports() {
        // Mock crash data - in real implementation, this would query crash reporting system
        return {
            totalCrashes: Math.floor(Math.random() * 10),
            uniqueCrashes: Math.floor(Math.random() * 5),
            topCrashes: [
                { error: 'NullPointerException in GameLoop', count: 3 },
                { error: 'Memory allocation failure', count: 2 }
            ]
        };
    }

    async getPerformanceMetrics() {
        // Mock performance data
        return {
            averageFPS: 58 + (Math.random() * 4),
            averageLoadTime: 2.5 + (Math.random() * 1.5),
            memoryUsage: 1.2 + (Math.random() * 0.8)
        };
    }

    async collectSupportMetrics() {
        // Collect support ticket and user feedback data
        try {
            const supportData = await this.getSupportMetrics();
            this.metrics.supportTickets = supportData.totalTickets;
            
            // Check support ticket rate
            const ticketRate = supportData.totalTickets / Math.max(this.metrics.downloads, 1);
            if (ticketRate > this.thresholds.supportTicketRate) {
                this.alerts.push({
                    type: 'warning',
                    message: `High support ticket rate: ${(ticketRate * 100).toFixed(2)}%`,
                    data: supportData,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('Failed to collect support metrics:', error);
        }
    }

    async getSupportMetrics() {
        // Mock support data
        return {
            totalTickets: Math.floor(Math.random() * 20),
            openTickets: Math.floor(Math.random() * 10),
            averageResponseTime: 2.5 + (Math.random() * 2),
            topIssues: [
                { issue: 'Game won\'t start', count: 5 },
                { issue: 'Performance issues', count: 3 },
                { issue: 'Audio problems', count: 2 }
            ]
        };
    }

    async collectSocialMetrics() {
        // Collect social media mentions and sentiment
        try {
            const socialData = await this.getSocialMetrics();
            this.metrics.socialMentions = socialData.totalMentions;
            
            // Monitor sentiment
            if (socialData.negativeSentiment > 0.4) {
                this.alerts.push({
                    type: 'warning',
                    message: `High negative sentiment detected: ${(socialData.negativeSentiment * 100).toFixed(1)}%`,
                    data: socialData,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('Failed to collect social metrics:', error);
        }
    }

    async getSocialMetrics() {
        // Mock social data
        return {
            totalMentions: Math.floor(Math.random() * 100) + 50,
            positiveSentiment: 0.6 + (Math.random() * 0.3),
            negativeSentiment: 0.1 + (Math.random() * 0.2),
            neutralSentiment: 0.3,
            topHashtags: ['#ZombieCarGame', '#IndieGame', '#ZombieApocalypse']
        };
    }

    startAlertSystem() {
        console.log('🚨 Starting alert system...');
        
        setInterval(async () => {
            if (!this.monitoringActive) return;
            
            // Process pending alerts
            const criticalAlerts = this.alerts.filter(alert => alert.type === 'critical');
            const warningAlerts = this.alerts.filter(alert => alert.type === 'warning');
            
            if (criticalAlerts.length > 0) {
                await this.handleCriticalAlerts(criticalAlerts);
            }
            
            if (warningAlerts.length > 0) {
                await this.handleWarningAlerts(warningAlerts);
            }
            
            // Clear processed alerts
            this.alerts = this.alerts.filter(alert => 
                Date.now() - alert.timestamp < 300000 // Keep alerts for 5 minutes
            );
            
        }, 30000); // Check every 30 seconds
    }

    async handleCriticalAlerts(alerts) {
        console.log(`🚨 CRITICAL ALERTS: ${alerts.length} issues detected`);
        
        for (const alert of alerts) {
            console.log(`  ❌ ${alert.message}`);
            
            // Send immediate notifications
            await this.sendEmergencyNotification(alert);
            
            // Log critical alert
            await this.logAlert('critical', alert);
            
            // Trigger automated responses if configured
            await this.triggerAutomatedResponse(alert);
        }
    }

    async handleWarningAlerts(alerts) {
        console.log(`⚠️  WARNING ALERTS: ${alerts.length} issues detected`);
        
        for (const alert of alerts) {
            console.log(`  ⚠️  ${alert.message}`);
            
            // Send warning notifications
            await this.sendWarningNotification(alert);
            
            // Log warning alert
            await this.logAlert('warning', alert);
        }
    }

    async sendEmergencyNotification(alert) {
        // In real implementation, this would send SMS, email, Slack notifications, etc.
        console.log(`📱 Emergency notification sent: ${alert.message}`);
        
        // Save notification record
        const notification = {
            type: 'emergency',
            alert: alert,
            timestamp: Date.now(),
            recipients: ['developer@zombiecargame.com', '+1-XXX-XXX-XXXX']
        };
        
        await fs.appendFile(
            'monitoring/alerts/emergency.log',
            JSON.stringify(notification) + '\n'
        );
    }

    async sendWarningNotification(alert) {
        // Send less urgent notifications
        console.log(`📧 Warning notification sent: ${alert.message}`);
        
        const notification = {
            type: 'warning',
            alert: alert,
            timestamp: Date.now(),
            recipients: ['developer@zombiecargame.com']
        };
        
        await fs.appendFile(
            'monitoring/alerts/warnings.log',
            JSON.stringify(notification) + '\n'
        );
    }

    async triggerAutomatedResponse(alert) {
        // Automated responses to critical issues
        switch (alert.type) {
            case 'critical':
                if (alert.message.includes('crash rate')) {
                    await this.enableSafeMode();
                } else if (alert.message.includes('server')) {
                    await this.scaleServerResources();
                }
                break;
        }
    }

    async enableSafeMode() {
        console.log('🛡️  Enabling safe mode due to high crash rate');
        // In real implementation, this would disable problematic features
    }

    async scaleServerResources() {
        console.log('📈 Scaling server resources due to high load');
        // In real implementation, this would trigger auto-scaling
    }

    startReporting() {
        console.log('📋 Starting automated reporting...');
        
        setInterval(async () => {
            if (!this.monitoringActive) return;
            
            try {
                await this.generateStatusReport();
                await this.updateDashboard();
                
            } catch (error) {
                console.error('Failed to generate report:', error);
            }
        }, this.reportInterval);
    }

    async generateStatusReport() {
        const runtime = Date.now() - this.startTime;
        const runtimeHours = Math.floor(runtime / (1000 * 60 * 60));
        const runtimeMinutes = Math.floor((runtime % (1000 * 60 * 60)) / (1000 * 60));
        
        const report = {
            timestamp: new Date().toISOString(),
            runtime: `${runtimeHours}h ${runtimeMinutes}m`,
            metrics: this.metrics,
            alerts: {
                critical: this.alerts.filter(a => a.type === 'critical').length,
                warnings: this.alerts.filter(a => a.type === 'warning').length
            },
            status: this.getOverallStatus()
        };
        
        // Save report
        const reportPath = `monitoring/reports/status-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        // Console summary
        console.log(`\n📊 Status Report (${report.runtime} runtime):`);
        console.log(`   Downloads: ${this.metrics.downloads}`);
        console.log(`   Active Players: ${this.metrics.activePlayers}`);
        console.log(`   Crash Reports: ${this.metrics.crashReports}`);
        console.log(`   Support Tickets: ${this.metrics.supportTickets}`);
        console.log(`   Overall Status: ${report.status}\n`);
    }

    getOverallStatus() {
        const criticalAlerts = this.alerts.filter(a => a.type === 'critical').length;
        const warningAlerts = this.alerts.filter(a => a.type === 'warning').length;
        
        if (criticalAlerts > 0) return '🔴 CRITICAL';
        if (warningAlerts > 3) return '🟡 WARNING';
        return '🟢 HEALTHY';
    }

    async createMonitoringDashboard() {
        const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Zombie Car Game - Launch Monitoring Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: #ffffff;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: #2d2d2d;
            border-radius: 10px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #ff6b35;
        }
        .metric-label {
            font-size: 0.9em;
            color: #cccccc;
            margin-top: 5px;
        }
        .alerts-section {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .alert {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
        }
        .alert.critical {
            background: #ff4444;
            color: white;
        }
        .alert.warning {
            background: #ffaa00;
            color: black;
        }
        .status-indicator {
            display: inline-block;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .status-healthy { background: #00ff00; }
        .status-warning { background: #ffaa00; }
        .status-critical { background: #ff4444; }
        .last-updated {
            text-align: center;
            color: #888;
            font-size: 0.8em;
        }
    </style>
    <script>
        function updateDashboard() {
            fetch('/api/metrics')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('downloads').textContent = data.downloads;
                    document.getElementById('players').textContent = data.activePlayers;
                    document.getElementById('crashes').textContent = data.crashReports;
                    document.getElementById('tickets').textContent = data.supportTickets;
                    document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
                })
                .catch(error => console.error('Failed to update dashboard:', error));
        }
        
        setInterval(updateDashboard, 60000); // Update every minute
        updateDashboard(); // Initial load
    </script>
</head>
<body>
    <div class="header">
        <h1>🚀 Zombie Car Game - Launch Monitoring</h1>
        <div class="status-indicator status-healthy"></div>
        <span>System Status: Healthy</span>
    </div>
    
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value" id="downloads">0</div>
            <div class="metric-label">Total Downloads</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="players">0</div>
            <div class="metric-label">Active Players</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="crashes">0</div>
            <div class="metric-label">Crash Reports</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="tickets">0</div>
            <div class="metric-label">Support Tickets</div>
        </div>
    </div>
    
    <div class="alerts-section">
        <h2>🚨 Active Alerts</h2>
        <div id="alerts">
            <p>No active alerts</p>
        </div>
    </div>
    
    <div class="last-updated">
        Last updated: <span id="lastUpdated">Never</span>
    </div>
</body>
</html>
        `;
        
        await fs.writeFile('monitoring/dashboard.html', dashboardHTML);
        console.log('  ✓ Monitoring dashboard created');
    }

    async updateDashboard() {
        // Update dashboard with current metrics
        // In real implementation, this would serve the dashboard via HTTP server
    }

    setupEmergencyProcedures() {
        console.log('🆘 Setting up emergency procedures...');
        
        // Handle process termination gracefully
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down monitoring system...');
            this.monitoringActive = false;
            
            // Generate final report
            await this.generateFinalReport();
            
            console.log('✅ Monitoring system shut down gracefully');
            process.exit(0);
        });
        
        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            console.error('💥 Uncaught exception in monitoring system:', error);
            await this.sendEmergencyAlert('Monitoring system crash', error);
            process.exit(1);
        });
    }

    async generateFinalReport() {
        const runtime = Date.now() - this.startTime;
        const finalReport = {
            timestamp: new Date().toISOString(),
            totalRuntime: runtime,
            finalMetrics: this.metrics,
            totalAlerts: this.alerts.length,
            summary: 'Launch monitoring session completed'
        };
        
        await fs.writeFile(
            'monitoring/reports/final-report.json',
            JSON.stringify(finalReport, null, 2)
        );
        
        console.log('📋 Final monitoring report saved');
    }

    async sendEmergencyAlert(title, error) {
        const alert = {
            title: title,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        await fs.appendFile(
            'monitoring/alerts/emergency.log',
            JSON.stringify(alert) + '\n'
        );
    }

    async logMetrics() {
        const logEntry = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics
        };
        
        await fs.appendFile(
            'monitoring/logs/metrics.log',
            JSON.stringify(logEntry) + '\n'
        );
    }

    async logPlatformMetrics(platform, metrics) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            platform: platform,
            metrics: metrics
        };
        
        await fs.appendFile(
            `monitoring/logs/${platform}.log`,
            JSON.stringify(logEntry) + '\n'
        );
    }

    async logAlert(type, alert) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: type,
            alert: alert
        };
        
        await fs.appendFile(
            `monitoring/logs/alerts.log`,
            JSON.stringify(logEntry) + '\n'
        );
    }

    async runMonitoringLoop() {
        // Keep the monitoring system running
        while (this.monitoringActive) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Public API methods
    async stopMonitoring() {
        console.log('🛑 Stopping launch monitoring...');
        this.monitoringActive = false;
        await this.generateFinalReport();
    }

    getMetrics() {
        return { ...this.metrics };
    }

    getAlerts() {
        return [...this.alerts];
    }

    getStatus() {
        return {
            active: this.monitoringActive,
            runtime: this.startTime ? Date.now() - this.startTime : 0,
            status: this.getOverallStatus(),
            metrics: this.metrics,
            alerts: this.alerts.length
        };
    }
}

// CLI Interface
async function main() {
    const monitor = new LaunchMonitoringSystem();
    
    try {
        await monitor.startLaunchMonitoring();
    } catch (error) {
        console.error('💥 Launch monitoring failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = LaunchMonitoringSystem;