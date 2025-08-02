/**
 * Asset Verification Tool for Zombie Car Game
 * Verifies integrity and completeness of all game assets
 */

import { assetManager } from './AssetManager.js';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class AssetVerifier {
    constructor() {
        this.logger = electronIntegration.getLogger();
        this.verificationResults = {
            passed: [],
            failed: [],
            missing: [],
            warnings: []
        };
    }

    /**
     * Run complete asset verification
     */
    async runCompleteVerification() {
        this.logger.info('Starting complete asset verification...');
        
        const startTime = Date.now();
        this.resetResults();
        
        try {
            // Initialize asset manager if not already done
            if (!assetManager.isInitialized) {
                await assetManager.initialize();
            }
            
            // Verify manifest
            await this.verifyManifest();
            
            // Verify critical assets
            await this.verifyCriticalAssets();
            
            // Verify asset integrity
            await this.verifyAssetIntegrity();
            
            // Verify asset accessibility
            await this.verifyAssetAccessibility();
            
            // Generate report
            const report = this.generateVerificationReport(Date.now() - startTime);
            
            this.logger.info('Asset verification completed:', {
                duration: Date.now() - startTime,
                passed: this.verificationResults.passed.length,
                failed: this.verificationResults.failed.length,
                missing: this.verificationResults.missing.length,
                warnings: this.verificationResults.warnings.length
            });
            
            return report;
            
        } catch (error) {
            this.logger.error('Asset verification failed:', error);
            throw error;
        }
    }

    /**
     * Reset verification results
     */
    resetResults() {
        this.verificationResults = {
            passed: [],
            failed: [],
            missing: [],
            warnings: []
        };
    }

    /**
     * Verify asset manifest
     */
    async verifyManifest() {
        this.logger.info('Verifying asset manifest...');
        
        try {
            const manifest = assetManager.assetManifest;
            
            if (!manifest) {
                this.addFailure('manifest', 'Asset manifest not loaded');
                return;
            }
            
            // Check manifest structure
            if (!manifest.version) {
                this.addFailure('manifest', 'Manifest missing version');
            }
            
            if (!manifest.assets) {
                this.addFailure('manifest', 'Manifest missing assets section');
                return;
            }
            
            // Verify required categories
            const requiredCategories = ['audio', 'textures', 'models', 'data'];
            for (const category of requiredCategories) {
                if (!manifest.assets[category]) {
                    this.addFailure('manifest', `Missing required category: ${category}`);
                } else {
                    this.addSuccess('manifest', `Category ${category} present`);
                }
            }
            
            // Count total assets
            const totalAssets = this.countAssetsInManifest(manifest);
            if (totalAssets === 0) {
                this.addFailure('manifest', 'No assets defined in manifest');
            } else {
                this.addSuccess('manifest', `Manifest contains ${totalAssets} assets`);
            }
            
        } catch (error) {
            this.addFailure('manifest', `Manifest verification error: ${error.message}`);
        }
    }

    /**
     * Verify critical assets are available
     */
    async verifyCriticalAssets() {
        this.logger.info('Verifying critical assets...');
        
        try {
            const criticalAssets = assetManager.getCriticalAssets();
            
            if (criticalAssets.length === 0) {
                this.addWarning('critical-assets', 'No critical assets defined');
                return;
            }
            
            this.logger.info(`Checking ${criticalAssets.length} critical assets...`);
            
            for (const asset of criticalAssets) {
                const assetKey = `${asset.category}/${asset.subcategory}/${asset.name}`;
                
                try {
                    // Try to load the asset
                    await assetManager.loadAsset(asset.category, asset.subcategory, asset.name);
                    this.addSuccess('critical-assets', `Critical asset loaded: ${assetKey}`);
                    
                } catch (error) {
                    this.addFailure('critical-assets', `Failed to load critical asset ${assetKey}: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.addFailure('critical-assets', `Critical asset verification error: ${error.message}`);
        }
    }

    /**
     * Verify asset integrity
     */
    async verifyAssetIntegrity() {
        this.logger.info('Verifying asset integrity...');
        
        try {
            const loadedAssets = Array.from(assetManager.assets.keys());
            
            for (const assetKey of loadedAssets) {
                try {
                    const isValid = await assetManager.verifyAssetIntegrity(assetKey);
                    
                    if (isValid) {
                        this.addSuccess('integrity', `Asset integrity verified: ${assetKey}`);
                    } else {
                        this.addFailure('integrity', `Asset integrity check failed: ${assetKey}`);
                    }
                    
                } catch (error) {
                    this.addFailure('integrity', `Integrity check error for ${assetKey}: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.addFailure('integrity', `Asset integrity verification error: ${error.message}`);
        }
    }

    /**
     * Verify asset accessibility
     */
    async verifyAssetAccessibility() {
        this.logger.info('Verifying asset accessibility...');
        
        try {
            const manifest = assetManager.assetManifest;
            if (!manifest) return;
            
            // Check a sample of non-critical assets
            const sampleAssets = this.getSampleAssets(manifest, 10);
            
            for (const asset of sampleAssets) {
                const assetKey = `${asset.category}/${asset.subcategory}/${asset.name}`;
                const fullPath = electronIntegration.getAssetPath(asset.info.path);
                
                try {
                    // Test if asset is accessible
                    const response = await fetch(fullPath, { method: 'HEAD' });
                    
                    if (response.ok) {
                        this.addSuccess('accessibility', `Asset accessible: ${assetKey}`);
                    } else {
                        this.addFailure('accessibility', `Asset not accessible (${response.status}): ${assetKey}`);
                    }
                    
                } catch (error) {
                    this.addFailure('accessibility', `Asset accessibility error ${assetKey}: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.addFailure('accessibility', `Asset accessibility verification error: ${error.message}`);
        }
    }

    /**
     * Get sample assets for testing
     */
    getSampleAssets(manifest, count = 10) {
        const allAssets = [];
        
        for (const [category, subcategories] of Object.entries(manifest.assets)) {
            for (const [subcategory, assets] of Object.entries(subcategories)) {
                for (const [name, info] of Object.entries(assets)) {
                    if (!info.critical) { // Only sample non-critical assets
                        allAssets.push({ category, subcategory, name, info });
                    }
                }
            }
        }
        
        // Shuffle and take sample
        const shuffled = allAssets.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    /**
     * Count assets in manifest
     */
    countAssetsInManifest(manifest) {
        let count = 0;
        
        for (const subcategories of Object.values(manifest.assets)) {
            for (const assets of Object.values(subcategories)) {
                count += Object.keys(assets).length;
            }
        }
        
        return count;
    }

    /**
     * Add success result
     */
    addSuccess(category, message) {
        this.verificationResults.passed.push({
            category,
            message,
            timestamp: Date.now()
        });
    }

    /**
     * Add failure result
     */
    addFailure(category, message) {
        this.verificationResults.failed.push({
            category,
            message,
            timestamp: Date.now()
        });
    }

    /**
     * Add missing asset result
     */
    addMissing(category, message) {
        this.verificationResults.missing.push({
            category,
            message,
            timestamp: Date.now()
        });
    }

    /**
     * Add warning result
     */
    addWarning(category, message) {
        this.verificationResults.warnings.push({
            category,
            message,
            timestamp: Date.now()
        });
    }

    /**
     * Generate verification report
     */
    generateVerificationReport(duration) {
        const report = {
            timestamp: new Date().toISOString(),
            duration,
            summary: {
                total: this.verificationResults.passed.length + 
                       this.verificationResults.failed.length + 
                       this.verificationResults.missing.length,
                passed: this.verificationResults.passed.length,
                failed: this.verificationResults.failed.length,
                missing: this.verificationResults.missing.length,
                warnings: this.verificationResults.warnings.length
            },
            results: this.verificationResults,
            status: this.verificationResults.failed.length === 0 && 
                   this.verificationResults.missing.length === 0 ? 'PASS' : 'FAIL',
            assetManagerStats: assetManager.getCacheStats()
        };
        
        return report;
    }

    /**
     * Generate human-readable report
     */
    generateTextReport(report) {
        const lines = [];
        
        lines.push('='.repeat(60));
        lines.push('ZOMBIE CAR GAME - ASSET VERIFICATION REPORT');
        lines.push('='.repeat(60));
        lines.push('');
        
        lines.push(`Verification Date: ${report.timestamp}`);
        lines.push(`Duration: ${report.duration}ms`);
        lines.push(`Status: ${report.status}`);
        lines.push('');
        
        lines.push('SUMMARY:');
        lines.push(`  Total Checks: ${report.summary.total}`);
        lines.push(`  Passed: ${report.summary.passed}`);
        lines.push(`  Failed: ${report.summary.failed}`);
        lines.push(`  Missing: ${report.summary.missing}`);
        lines.push(`  Warnings: ${report.summary.warnings}`);
        lines.push('');
        
        if (report.results.failed.length > 0) {
            lines.push('FAILURES:');
            report.results.failed.forEach(failure => {
                lines.push(`  [${failure.category}] ${failure.message}`);
            });
            lines.push('');
        }
        
        if (report.results.missing.length > 0) {
            lines.push('MISSING ASSETS:');
            report.results.missing.forEach(missing => {
                lines.push(`  [${missing.category}] ${missing.message}`);
            });
            lines.push('');
        }
        
        if (report.results.warnings.length > 0) {
            lines.push('WARNINGS:');
            report.results.warnings.forEach(warning => {
                lines.push(`  [${warning.category}] ${warning.message}`);
            });
            lines.push('');
        }
        
        lines.push('ASSET MANAGER STATISTICS:');
        lines.push(`  Total Assets Loaded: ${report.assetManagerStats.totalAssets}`);
        lines.push(`  Cache Size: ${assetManager.formatBytes(report.assetManagerStats.cacheSize)}`);
        lines.push(`  Cache Utilization: ${report.assetManagerStats.utilizationPercentage}%`);
        lines.push(`  Failed Assets: ${report.assetManagerStats.failedAssets}`);
        lines.push('');
        
        lines.push('='.repeat(60));
        
        return lines.join('\n');
    }

    /**
     * Save verification report to file
     */
    async saveReport(report, format = 'json') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let filename, content;
            
            if (format === 'json') {
                filename = `asset-verification-${timestamp}.json`;
                content = JSON.stringify(report, null, 2);
            } else {
                filename = `asset-verification-${timestamp}.txt`;
                content = this.generateTextReport(report);
            }
            
            // In Electron environment, we could save to user data directory
            if (electronIntegration.isElectron) {
                // TODO: Implement file saving through Electron IPC
                this.logger.info(`Report would be saved as: ${filename}`);
            }
            
            return { filename, content };
            
        } catch (error) {
            this.logger.error('Failed to save verification report:', error);
            throw error;
        }
    }

    /**
     * Quick verification for essential assets only
     */
    async runQuickVerification() {
        this.logger.info('Running quick asset verification...');
        
        const startTime = Date.now();
        this.resetResults();
        
        try {
            // Only verify critical assets
            await this.verifyCriticalAssets();
            
            const report = this.generateVerificationReport(Date.now() - startTime);
            
            this.logger.info('Quick verification completed:', {
                duration: Date.now() - startTime,
                status: report.status
            });
            
            return report;
            
        } catch (error) {
            this.logger.error('Quick verification failed:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const assetVerifier = new AssetVerifier();