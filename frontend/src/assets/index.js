/**
 * Professional Asset Management System
 * Main export file for all asset management components
 */

export { AssetManager, assetManager } from './AssetManager.js';
export { AssetVerifier, assetVerifier } from './AssetVerifier.js';
export { AssetIntegrityChecker, assetIntegrityChecker } from './AssetIntegrityChecker.js';
export { AssetOptimizer, assetOptimizer } from './AssetOptimizer.js';

/**
 * Initialize the complete asset management system
 */
export async function initializeAssetManagement(options = {}) {
    const { assetManager } = await import('./AssetManager.js');
    const { assetOptimizer } = await import('./AssetOptimizer.js');
    
    try {
        console.log('Initializing professional asset management system...');
        
        // Initialize asset manager
        await assetManager.initialize();
        
        // Initialize asset optimizer
        await assetOptimizer.initialize();
        
        console.log('Asset management system initialized successfully');
        
        return {
            assetManager,
            assetOptimizer,
            initialized: true
        };
        
    } catch (error) {
        console.error('Failed to initialize asset management system:', error);
        throw error;
    }
}

/**
 * Run complete asset system verification
 */
export async function runCompleteAssetVerification() {
    const { assetVerifier } = await import('./AssetVerifier.js');
    const { assetIntegrityChecker } = await import('./AssetIntegrityChecker.js');
    
    try {
        console.log('Running complete asset verification...');
        
        // Run basic verification
        const verificationReport = await assetVerifier.runCompleteVerification();
        
        // Run integrity check
        const integrityResults = await assetIntegrityChecker.runFullIntegrityCheck();
        const integrityReport = assetIntegrityChecker.generateIntegrityReport(integrityResults);
        
        const combinedReport = {
            timestamp: new Date().toISOString(),
            verification: verificationReport,
            integrity: integrityReport,
            overallStatus: verificationReport.status === 'PASS' && 
                          integrityReport.summary.successRate >= 95 ? 'PASS' : 'FAIL'
        };
        
        console.log('Complete asset verification completed:', {
            verificationStatus: verificationReport.status,
            integritySuccessRate: integrityReport.summary.successRate + '%',
            overallStatus: combinedReport.overallStatus
        });
        
        return combinedReport;
        
    } catch (error) {
        console.error('Asset verification failed:', error);
        throw error;
    }
}

/**
 * Optimize all assets for current performance requirements
 */
export async function optimizeAssetsForPerformance(performanceMetrics = {}) {
    const { assetOptimizer } = await import('./AssetOptimizer.js');
    
    try {
        console.log('Optimizing assets for performance...');
        
        const defaultMetrics = {
            fps: 60,
            memoryUsage: 0.5,
            ...performanceMetrics
        };
        
        const optimizationResults = await assetOptimizer.optimizeForPerformance(defaultMetrics);
        const optimizationReport = assetOptimizer.generateOptimizationReport(optimizationResults);
        
        console.log('Asset optimization completed:', {
            optimized: optimizationResults.optimized,
            sizeSaved: optimizationReport.summary.sizeSavedFormatted,
            compressionPercentage: optimizationReport.summary.compressionPercentage + '%'
        });
        
        return optimizationReport;
        
    } catch (error) {
        console.error('Asset optimization failed:', error);
        throw error;
    }
}

/**
 * Get comprehensive asset management statistics
 */
export async function getAssetManagementStats() {
    const { assetManager } = await import('./AssetManager.js');
    const { assetOptimizer } = await import('./AssetOptimizer.js');
    
    return {
        assetManager: assetManager.getCacheStats(),
        optimizer: assetOptimizer.getOptimizationStats(),
        timestamp: new Date().toISOString()
    };
}

/**
 * Asset management system health check
 */
export async function performHealthCheck() {
    try {
        const { assetManager } = await import('./AssetManager.js');
        const { assetVerifier } = await import('./AssetVerifier.js');
        
        const healthStatus = {
            timestamp: new Date().toISOString(),
            assetManager: {
                initialized: assetManager.isInitialized,
                totalAssets: assetManager.assets.size,
                cacheSize: assetManager.formatBytes(assetManager.cacheSize),
                failedAssets: assetManager.failedAssets.size
            },
            quickVerification: null,
            overallHealth: 'unknown'
        };
        
        // Run quick verification
        if (assetManager.isInitialized) {
            const quickVerification = await assetVerifier.runQuickVerification();
            healthStatus.quickVerification = {
                status: quickVerification.status,
                criticalAssetsPassed: quickVerification.results.passed.length,
                criticalAssetsFailed: quickVerification.results.failed.length
            };
        }
        
        // Determine overall health
        if (healthStatus.assetManager.initialized && 
            healthStatus.assetManager.failedAssets === 0 &&
            (!healthStatus.quickVerification || healthStatus.quickVerification.status === 'PASS')) {
            healthStatus.overallHealth = 'healthy';
        } else if (healthStatus.assetManager.initialized) {
            healthStatus.overallHealth = 'degraded';
        } else {
            healthStatus.overallHealth = 'unhealthy';
        }
        
        return healthStatus;
        
    } catch (error) {
        return {
            timestamp: new Date().toISOString(),
            overallHealth: 'error',
            error: error.message
        };
    }
}

// Default export with main functions
export default {
    initializeAssetManagement,
    runCompleteAssetVerification,
    optimizeAssetsForPerformance,
    getAssetManagementStats,
    performHealthCheck
};