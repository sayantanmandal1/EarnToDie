/**
 * Asset Integrity Checking Tool
 * Provides comprehensive asset verification and integrity checking
 */

import { assetManager } from './AssetManager.js';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class AssetIntegrityChecker {
    constructor() {
        this.logger = electronIntegration.getLogger();
        this.checksumCache = new Map();
        this.verificationResults = new Map();
    }

    /**
     * Run comprehensive integrity check on all assets
     */
    async runFullIntegrityCheck() {
        this.logger.info('Starting comprehensive asset integrity check...');
        
        const startTime = Date.now();
        const results = {
            timestamp: new Date().toISOString(),
            totalAssets: 0,
            verified: 0,
            failed: 0,
            corrupted: 0,
            missing: 0,
            details: [],
            duration: 0
        };

        try {
            // Ensure asset manager is initialized
            if (!assetManager.isInitialized) {
                await assetManager.initialize();
            }

            const manifest = assetManager.assetManifest;
            if (!manifest || !manifest.assets) {
                throw new Error('Asset manifest not available');
            }

            // Count total assets
            results.totalAssets = this.countTotalAssets(manifest);
            this.logger.info(`Checking integrity of ${results.totalAssets} assets...`);

            // Check each asset category
            for (const [category, subcategories] of Object.entries(manifest.assets)) {
                for (const [subcategory, assets] of Object.entries(subcategories)) {
                    for (const [name, assetInfo] of Object.entries(assets)) {
                        const checkResult = await this.checkAssetIntegrity(
                            category, subcategory, name, assetInfo
                        );
                        
                        results.details.push(checkResult);
                        
                        switch (checkResult.status) {
                            case 'verified':
                                results.verified++;
                                break;
                            case 'failed':
                                results.failed++;
                                break;
                            case 'corrupted':
                                results.corrupted++;
                                break;
                            case 'missing':
                                results.missing++;
                                break;
                        }
                    }
                }
            }

            results.duration = Date.now() - startTime;
            
            this.logger.info('Asset integrity check completed:', {
                duration: results.duration,
                verified: results.verified,
                failed: results.failed,
                corrupted: results.corrupted,
                missing: results.missing
            });

            return results;

        } catch (error) {
            this.logger.error('Asset integrity check failed:', error);
            throw error;
        }
    }

    /**
     * Check integrity of a single asset
     */
    async checkAssetIntegrity(category, subcategory, name, assetInfo) {
        const assetKey = `${category}/${subcategory}/${name}`;
        const assetPath = electronIntegration.getAssetPath(assetInfo.path);
        
        const result = {
            assetKey,
            category,
            subcategory,
            name,
            path: assetInfo.path,
            critical: assetInfo.critical || false,
            status: 'unknown',
            message: '',
            checksum: null,
            size: 0,
            timestamp: Date.now()
        };

        try {
            // Check if asset file exists and is accessible
            const response = await fetch(assetPath, { method: 'HEAD' });
            
            if (!response.ok) {
                result.status = 'missing';
                result.message = `Asset file not accessible: HTTP ${response.status}`;
                return result;
            }

            // Get file size
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
                result.size = parseInt(contentLength);
            }

            // Verify file size if specified in manifest
            if (assetInfo.size && result.size !== assetInfo.size) {
                result.status = 'corrupted';
                result.message = `Size mismatch: expected ${assetInfo.size}, got ${result.size}`;
                return result;
            }

            // Calculate and verify checksum
            if (assetInfo.checksum || assetInfo.hash) {
                const expectedChecksum = assetInfo.checksum || assetInfo.hash;
                const actualChecksum = await this.calculateChecksum(assetPath);
                
                result.checksum = actualChecksum;
                
                if (actualChecksum !== expectedChecksum) {
                    result.status = 'corrupted';
                    result.message = `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`;
                    return result;
                }
            }

            // Perform content-specific integrity checks
            const contentCheck = await this.performContentIntegrityCheck(
                category, assetPath, assetInfo
            );
            
            if (!contentCheck.valid) {
                result.status = 'corrupted';
                result.message = contentCheck.message;
                return result;
            }

            // Asset passed all checks
            result.status = 'verified';
            result.message = 'Asset integrity verified';
            
            return result;

        } catch (error) {
            result.status = 'failed';
            result.message = `Integrity check failed: ${error.message}`;
            return result;
        }
    }

    /**
     * Calculate checksum for asset file
     */
    async calculateChecksum(assetPath) {
        try {
            const response = await fetch(assetPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch asset: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return `sha256-${hashHex}`;

        } catch (error) {
            this.logger.warn(`Failed to calculate checksum for ${assetPath}:`, error);
            return null;
        }
    }

    /**
     * Perform content-specific integrity checks
     */
    async performContentIntegrityCheck(category, assetPath, assetInfo) {
        try {
            switch (category) {
                case 'audio':
                    return await this.checkAudioIntegrity(assetPath);
                case 'textures':
                    return await this.checkImageIntegrity(assetPath);
                case 'models':
                    return await this.checkModelIntegrity(assetPath);
                case 'data':
                    return await this.checkDataIntegrity(assetPath);
                case 'shaders':
                    return await this.checkShaderIntegrity(assetPath);
                case 'fonts':
                    return await this.checkFontIntegrity(assetPath);
                default:
                    return { valid: true, message: 'No specific content check available' };
            }
        } catch (error) {
            return { valid: false, message: `Content check failed: ${error.message}` };
        }
    }

    /**
     * Check audio file integrity
     */
    async checkAudioIntegrity(assetPath) {
        try {
            const response = await fetch(assetPath);
            if (!response.ok) {
                return { valid: false, message: `Failed to fetch audio: ${response.status}` };
            }

            const arrayBuffer = await response.arrayBuffer();
            
            // Try to decode audio if Web Audio API is available
            if (window.AudioContext || window.webkitAudioContext) {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    await audioContext.decodeAudioData(arrayBuffer.slice());
                    audioContext.close();
                    return { valid: true, message: 'Audio file decoded successfully' };
                } catch (decodeError) {
                    return { valid: false, message: `Audio decode failed: ${decodeError.message}` };
                }
            }

            // Basic format validation for common audio formats
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Check MP3 header
            if (uint8Array[0] === 0xFF && (uint8Array[1] & 0xE0) === 0xE0) {
                return { valid: true, message: 'Valid MP3 format detected' };
            }
            
            // Check WAV header
            if (uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && 
                uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
                return { valid: true, message: 'Valid WAV format detected' };
            }
            
            // Check OGG header
            if (uint8Array[0] === 0x4F && uint8Array[1] === 0x67 && 
                uint8Array[2] === 0x67 && uint8Array[3] === 0x53) {
                return { valid: true, message: 'Valid OGG format detected' };
            }

            return { valid: false, message: 'Unknown or invalid audio format' };

        } catch (error) {
            return { valid: false, message: `Audio integrity check failed: ${error.message}` };
        }
    }

    /**
     * Check image file integrity
     */
    async checkImageIntegrity(assetPath) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    resolve({ 
                        valid: true, 
                        message: `Valid image: ${img.naturalWidth}x${img.naturalHeight}` 
                    });
                } else {
                    resolve({ 
                        valid: false, 
                        message: 'Image has invalid dimensions' 
                    });
                }
            };
            
            img.onerror = () => {
                resolve({ 
                    valid: false, 
                    message: 'Failed to load image' 
                });
            };
            
            img.crossOrigin = 'anonymous';
            img.src = assetPath;
        });
    }

    /**
     * Check 3D model file integrity
     */
    async checkModelIntegrity(assetPath) {
        try {
            const response = await fetch(assetPath);
            if (!response.ok) {
                return { valid: false, message: `Failed to fetch model: ${response.status}` };
            }

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Check GLB format (binary glTF)
            if (uint8Array[0] === 0x67 && uint8Array[1] === 0x6C && 
                uint8Array[2] === 0x54 && uint8Array[3] === 0x46) {
                
                // Verify GLB structure
                const view = new DataView(arrayBuffer);
                const version = view.getUint32(4, true);
                const length = view.getUint32(8, true);
                
                if (version === 2 && length === arrayBuffer.byteLength) {
                    return { valid: true, message: 'Valid GLB format' };
                } else {
                    return { valid: false, message: 'Invalid GLB structure' };
                }
            }
            
            // Check glTF format (JSON)
            try {
                const text = new TextDecoder().decode(arrayBuffer);
                const gltf = JSON.parse(text);
                
                if (gltf.asset && gltf.asset.version) {
                    return { valid: true, message: 'Valid glTF format' };
                } else {
                    return { valid: false, message: 'Invalid glTF structure' };
                }
            } catch (jsonError) {
                return { valid: false, message: 'Unknown model format' };
            }

        } catch (error) {
            return { valid: false, message: `Model integrity check failed: ${error.message}` };
        }
    }

    /**
     * Check JSON data file integrity
     */
    async checkDataIntegrity(assetPath) {
        try {
            const response = await fetch(assetPath);
            if (!response.ok) {
                return { valid: false, message: `Failed to fetch data: ${response.status}` };
            }

            const text = await response.text();
            
            try {
                const data = JSON.parse(text);
                
                if (typeof data === 'object' && data !== null) {
                    return { valid: true, message: 'Valid JSON data' };
                } else {
                    return { valid: false, message: 'JSON data is not an object' };
                }
            } catch (parseError) {
                return { valid: false, message: `Invalid JSON: ${parseError.message}` };
            }

        } catch (error) {
            return { valid: false, message: `Data integrity check failed: ${error.message}` };
        }
    }

    /**
     * Check shader file integrity
     */
    async checkShaderIntegrity(assetPath) {
        try {
            const response = await fetch(assetPath);
            if (!response.ok) {
                return { valid: false, message: `Failed to fetch shader: ${response.status}` };
            }

            const source = await response.text();
            
            if (source.trim().length === 0) {
                return { valid: false, message: 'Shader source is empty' };
            }

            // Basic shader syntax validation
            const hasMainFunction = /void\s+main\s*\(\s*\)/.test(source);
            if (!hasMainFunction) {
                return { valid: false, message: 'Shader missing main function' };
            }

            return { valid: true, message: 'Shader source appears valid' };

        } catch (error) {
            return { valid: false, message: `Shader integrity check failed: ${error.message}` };
        }
    }

    /**
     * Check font file integrity
     */
    async checkFontIntegrity(assetPath) {
        try {
            const response = await fetch(assetPath);
            if (!response.ok) {
                return { valid: false, message: `Failed to fetch font: ${response.status}` };
            }

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Check WOFF2 format
            if (uint8Array[0] === 0x77 && uint8Array[1] === 0x4F && 
                uint8Array[2] === 0x46 && uint8Array[3] === 0x32) {
                return { valid: true, message: 'Valid WOFF2 font format' };
            }
            
            // Check WOFF format
            if (uint8Array[0] === 0x77 && uint8Array[1] === 0x4F && 
                uint8Array[2] === 0x46 && uint8Array[3] === 0x46) {
                return { valid: true, message: 'Valid WOFF font format' };
            }
            
            // Check TTF format
            if ((uint8Array[0] === 0x00 && uint8Array[1] === 0x01 && 
                 uint8Array[2] === 0x00 && uint8Array[3] === 0x00) ||
                (uint8Array[0] === 0x74 && uint8Array[1] === 0x72 && 
                 uint8Array[2] === 0x75 && uint8Array[3] === 0x65)) {
                return { valid: true, message: 'Valid TTF font format' };
            }

            return { valid: false, message: 'Unknown font format' };

        } catch (error) {
            return { valid: false, message: `Font integrity check failed: ${error.message}` };
        }
    }

    /**
     * Count total assets in manifest
     */
    countTotalAssets(manifest) {
        let count = 0;
        
        for (const subcategories of Object.values(manifest.assets)) {
            for (const assets of Object.values(subcategories)) {
                count += Object.keys(assets).length;
            }
        }
        
        return count;
    }

    /**
     * Generate integrity report
     */
    generateIntegrityReport(results) {
        const report = {
            ...results,
            summary: {
                successRate: results.totalAssets > 0 ? 
                    Math.round((results.verified / results.totalAssets) * 100) : 0,
                criticalAssetsFailed: results.details.filter(
                    detail => detail.critical && detail.status !== 'verified'
                ).length,
                categories: this.getCategoryBreakdown(results.details)
            }
        };

        return report;
    }

    /**
     * Get breakdown by category
     */
    getCategoryBreakdown(details) {
        const breakdown = {};
        
        for (const detail of details) {
            if (!breakdown[detail.category]) {
                breakdown[detail.category] = {
                    total: 0,
                    verified: 0,
                    failed: 0,
                    corrupted: 0,
                    missing: 0
                };
            }
            
            breakdown[detail.category].total++;
            breakdown[detail.category][detail.status]++;
        }
        
        return breakdown;
    }

    /**
     * Save integrity report to file
     */
    async saveIntegrityReport(report, format = 'json') {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let filename, content;
            
            if (format === 'json') {
                filename = `asset-integrity-${timestamp}.json`;
                content = JSON.stringify(report, null, 2);
            } else {
                filename = `asset-integrity-${timestamp}.txt`;
                content = this.generateTextReport(report);
            }
            
            // In Electron environment, save to user data directory
            if (electronIntegration.isElectron) {
                // TODO: Implement file saving through Electron IPC
                this.logger.info(`Integrity report would be saved as: ${filename}`);
            }
            
            return { filename, content };
            
        } catch (error) {
            this.logger.error('Failed to save integrity report:', error);
            throw error;
        }
    }

    /**
     * Generate human-readable text report
     */
    generateTextReport(report) {
        const lines = [];
        
        lines.push('='.repeat(60));
        lines.push('ZOMBIE CAR GAME - ASSET INTEGRITY REPORT');
        lines.push('='.repeat(60));
        lines.push('');
        
        lines.push(`Report Date: ${report.timestamp}`);
        lines.push(`Duration: ${report.duration}ms`);
        lines.push(`Success Rate: ${report.summary.successRate}%`);
        lines.push('');
        
        lines.push('SUMMARY:');
        lines.push(`  Total Assets: ${report.totalAssets}`);
        lines.push(`  Verified: ${report.verified}`);
        lines.push(`  Failed: ${report.failed}`);
        lines.push(`  Corrupted: ${report.corrupted}`);
        lines.push(`  Missing: ${report.missing}`);
        lines.push(`  Critical Assets Failed: ${report.summary.criticalAssetsFailed}`);
        lines.push('');
        
        lines.push('CATEGORY BREAKDOWN:');
        for (const [category, stats] of Object.entries(report.summary.categories)) {
            lines.push(`  ${category.toUpperCase()}:`);
            lines.push(`    Total: ${stats.total}`);
            lines.push(`    Verified: ${stats.verified}`);
            lines.push(`    Failed: ${stats.failed}`);
            lines.push(`    Corrupted: ${stats.corrupted}`);
            lines.push(`    Missing: ${stats.missing}`);
        }
        lines.push('');
        
        // Show failed assets
        const failedAssets = report.details.filter(d => d.status !== 'verified');
        if (failedAssets.length > 0) {
            lines.push('FAILED ASSETS:');
            for (const asset of failedAssets) {
                lines.push(`  [${asset.status.toUpperCase()}] ${asset.assetKey}`);
                lines.push(`    Path: ${asset.path}`);
                lines.push(`    Message: ${asset.message}`);
                if (asset.critical) {
                    lines.push(`    ⚠️  CRITICAL ASSET`);
                }
                lines.push('');
            }
        }
        
        lines.push('='.repeat(60));
        
        return lines.join('\n');
    }
}

// Export singleton instance
export const assetIntegrityChecker = new AssetIntegrityChecker();