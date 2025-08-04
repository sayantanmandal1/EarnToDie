#!/usr/bin/env node

/**
 * Final Verification System
 * Comprehensive pre-release verification and quality assurance
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class FinalVerificationSystem {
    constructor() {
        this.verificationResults = {
            assets: { passed: 0, failed: 0, warnings: 0, details: [] },
            builds: { passed: 0, failed: 0, warnings: 0, details: [] },
            tests: { passed: 0, failed: 0, warnings: 0, details: [] },
            performance: { passed: 0, failed: 0, warnings: 0, details: [] },
            compatibility: { passed: 0, failed: 0, warnings: 0, details: [] },
            documentation: { passed: 0, failed: 0, warnings: 0, details: [] },
            distribution: { passed: 0, failed: 0, warnings: 0, details: [] }
        };
        
        this.criticalIssues = [];
        this.warnings = [];
        this.recommendations = [];
        
        this.startTime = Date.now();
    }

    async runCompleteVerification() {
        console.log('🔍 Starting Final Verification Process...\n');
        
        try {
            // Run all verification phases
            await this.verifyAssetIntegrity();
            await this.verifyBuildSystem();
            await this.runComprehensiveTests();
            await this.verifyPerformance();
            await this.verifyCompatibility();
            await this.verifyDocumentation();
            await this.verifyDistribution();
            
            // Generate final report
            await this.generateVerificationReport();
            
            // Determine release readiness
            const releaseReady = this.assessReleaseReadiness();
            
            console.log('\n' + '='.repeat(80));
            if (releaseReady) {
                console.log('✅ VERIFICATION PASSED - READY FOR RELEASE');
            } else {
                console.log('❌ VERIFICATION FAILED - CRITICAL ISSUES FOUND');
            }
            console.log('='.repeat(80));
            
            return releaseReady;
            
        } catch (error) {
            console.error('💥 Verification process failed:', error);
            this.criticalIssues.push({
                category: 'system',
                severity: 'critical',
                message: `Verification system failure: ${error.message}`,
                details: error.stack
            });
            return false;
        }
    }

    async verifyAssetIntegrity() {
        console.log('📦 Verifying Asset Integrity...');
        
        try {
            // Check if asset verification system exists
            const assetVerifierPath = path.join(__dirname, '..', 'frontend', 'src', 'assets', 'AssetVerificationSystem.js');
            
            try {
                await fs.access(assetVerifierPath);
                console.log('  ✓ Asset verification system found');
                this.verificationResults.assets.passed++;
            } catch (error) {
                console.log('  ❌ Asset verification system missing');
                this.criticalIssues.push({
                    category: 'assets',
                    severity: 'critical',
                    message: 'Asset verification system not found',
                    file: assetVerifierPath
                });
                this.verificationResults.assets.failed++;
                return;
            }

            // Verify critical asset directories
            const assetDirs = [
                'frontend/public/assets',
                'frontend/src/assets',
                'marketing/screenshots'
            ];

            for (const dir of assetDirs) {
                try {
                    const stats = await fs.stat(dir);
                    if (stats.isDirectory()) {
                        console.log(`  ✓ Asset directory exists: ${dir}`);
                        this.verificationResults.assets.passed++;
                    }
                } catch (error) {
                    console.log(`  ⚠️  Asset directory missing: ${dir}`);
                    this.warnings.push({
                        category: 'assets',
                        severity: 'warning',
                        message: `Asset directory missing: ${dir}`,
                        recommendation: 'Create missing asset directories'
                    });
                    this.verificationResults.assets.warnings++;
                }
            }

            // Check for placeholder assets
            const placeholderCheck = await this.checkForPlaceholders();
            if (placeholderCheck.found > 0) {
                console.log(`  ⚠️  Found ${placeholderCheck.found} placeholder assets`);
                this.warnings.push({
                    category: 'assets',
                    severity: 'warning',
                    message: `${placeholderCheck.found} placeholder assets found`,
                    details: placeholderCheck.files,
                    recommendation: 'Replace placeholder assets with final versions'
                });
                this.verificationResults.assets.warnings++;
            } else {
                console.log('  ✓ No placeholder assets found');
                this.verificationResults.assets.passed++;
            }

            // Verify asset manifest
            try {
                const manifestPath = path.join(__dirname, '..', 'frontend', 'src', 'assets', 'manifest.json');
                await fs.access(manifestPath);
                console.log('  ✓ Asset manifest exists');
                this.verificationResults.assets.passed++;
            } catch (error) {
                console.log('  ⚠️  Asset manifest missing');
                this.warnings.push({
                    category: 'assets',
                    severity: 'warning',
                    message: 'Asset manifest missing',
                    recommendation: 'Generate asset manifest for integrity checking'
                });
                this.verificationResults.assets.warnings++;
            }

        } catch (error) {
            console.error('  💥 Asset verification failed:', error.message);
            this.criticalIssues.push({
                category: 'assets',
                severity: 'critical',
                message: `Asset verification failed: ${error.message}`
            });
            this.verificationResults.assets.failed++;
        }
    }

    async checkForPlaceholders() {
        const placeholderPatterns = [
            /placeholder/i,
            /temp/i,
            /test/i,
            /dummy/i,
            /sample/i
        ];

        const found = [];
        const searchDirs = ['frontend/public', 'frontend/src/assets'];

        for (const dir of searchDirs) {
            try {
                const files = await this.getAllFiles(dir);
                for (const file of files) {
                    const filename = path.basename(file);
                    if (placeholderPatterns.some(pattern => pattern.test(filename))) {
                        found.push(file);
                    }
                }
            } catch (error) {
                // Directory might not exist, skip
            }
        }

        return { found: found.length, files: found };
    }

    async getAllFiles(dir) {
        const files = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...await this.getAllFiles(fullPath));
                } else {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            // Directory doesn't exist or can't be read
        }
        
        return files;
    }

    async verifyBuildSystem() {
        console.log('🔨 Verifying Build System...');
        
        try {
            // Check package.json
            const packagePath = path.join(__dirname, '..', 'frontend', 'package.json');
            const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'));
            
            // Verify build scripts
            const requiredScripts = [
                'build',
                'build:prod',
                'test',
                'lint'
            ];

            for (const script of requiredScripts) {
                if (packageData.scripts && packageData.scripts[script]) {
                    console.log(`  ✓ Build script exists: ${script}`);
                    this.verificationResults.builds.passed++;
                } else {
                    console.log(`  ❌ Missing build script: ${script}`);
                    this.criticalIssues.push({
                        category: 'build',
                        severity: 'critical',
                        message: `Missing build script: ${script}`,
                        file: packagePath
                    });
                    this.verificationResults.builds.failed++;
                }
            }

            // Test build process
            console.log('  🔄 Testing build process...');
            try {
                execSync('npm run build:prod', { 
                    cwd: path.join(__dirname, '..', 'frontend'),
                    stdio: 'pipe',
                    timeout: 300000 // 5 minutes
                });
                console.log('  ✓ Production build successful');
                this.verificationResults.builds.passed++;
            } catch (error) {
                console.log('  ❌ Production build failed');
                this.criticalIssues.push({
                    category: 'build',
                    severity: 'critical',
                    message: 'Production build failed',
                    details: error.message
                });
                this.verificationResults.builds.failed++;
            }

            // Verify build output
            const distPath = path.join(__dirname, '..', 'frontend', 'dist');
            try {
                const distStats = await fs.stat(distPath);
                if (distStats.isDirectory()) {
                    console.log('  ✓ Build output directory exists');
                    this.verificationResults.builds.passed++;
                    
                    // Check for essential files
                    const essentialFiles = ['index.html', 'main.js'];
                    for (const file of essentialFiles) {
                        try {
                            await fs.access(path.join(distPath, file));
                            console.log(`  ✓ Essential file exists: ${file}`);
                            this.verificationResults.builds.passed++;
                        } catch (error) {
                            console.log(`  ❌ Missing essential file: ${file}`);
                            this.criticalIssues.push({
                                category: 'build',
                                severity: 'critical',
                                message: `Missing essential build file: ${file}`
                            });
                            this.verificationResults.builds.failed++;
                        }
                    }
                }
            } catch (error) {
                console.log('  ❌ Build output directory missing');
                this.criticalIssues.push({
                    category: 'build',
                    severity: 'critical',
                    message: 'Build output directory missing'
                });
                this.verificationResults.builds.failed++;
            }

        } catch (error) {
            console.error('  💥 Build system verification failed:', error.message);
            this.criticalIssues.push({
                category: 'build',
                severity: 'critical',
                message: `Build system verification failed: ${error.message}`
            });
            this.verificationResults.builds.failed++;
        }
    }

    async runComprehensiveTests() {
        console.log('🧪 Running Comprehensive Tests...');
        
        try {
            // Run unit tests
            console.log('  🔄 Running unit tests...');
            try {
                const testOutput = execSync('npm test -- --watchAll=false --coverage', {
                    cwd: path.join(__dirname, '..', 'frontend'),
                    stdio: 'pipe',
                    timeout: 180000 // 3 minutes
                });
                
                console.log('  ✓ Unit tests passed');
                this.verificationResults.tests.passed++;
                
                // Parse coverage if available
                const coverageMatch = testOutput.toString().match(/All files\s+\|\s+(\d+\.?\d*)/);
                if (coverageMatch) {
                    const coverage = parseFloat(coverageMatch[1]);
                    if (coverage >= 80) {
                        console.log(`  ✓ Test coverage: ${coverage}%`);
                        this.verificationResults.tests.passed++;
                    } else {
                        console.log(`  ⚠️  Test coverage low: ${coverage}%`);
                        this.warnings.push({
                            category: 'tests',
                            severity: 'warning',
                            message: `Test coverage below 80%: ${coverage}%`,
                            recommendation: 'Increase test coverage for better quality assurance'
                        });
                        this.verificationResults.tests.warnings++;
                    }
                }
                
            } catch (error) {
                console.log('  ❌ Unit tests failed');
                this.criticalIssues.push({
                    category: 'tests',
                    severity: 'critical',
                    message: 'Unit tests failed',
                    details: error.message
                });
                this.verificationResults.tests.failed++;
            }

            // Run linting
            console.log('  🔄 Running code linting...');
            try {
                execSync('npm run lint', {
                    cwd: path.join(__dirname, '..', 'frontend'),
                    stdio: 'pipe',
                    timeout: 60000 // 1 minute
                });
                console.log('  ✓ Code linting passed');
                this.verificationResults.tests.passed++;
            } catch (error) {
                console.log('  ⚠️  Code linting issues found');
                this.warnings.push({
                    category: 'tests',
                    severity: 'warning',
                    message: 'Code linting issues found',
                    details: error.message,
                    recommendation: 'Fix linting issues for code quality'
                });
                this.verificationResults.tests.warnings++;
            }

            // Check for test files
            const testDirs = [
                'frontend/src/__tests__',
                'frontend/src/components/__tests__',
                'frontend/src/systems/__tests__'
            ];

            let testFileCount = 0;
            for (const dir of testDirs) {
                try {
                    const files = await this.getAllFiles(dir);
                    const testFiles = files.filter(file => file.endsWith('.test.js') || file.endsWith('.spec.js'));
                    testFileCount += testFiles.length;
                } catch (error) {
                    // Directory might not exist
                }
            }

            if (testFileCount > 0) {
                console.log(`  ✓ Found ${testFileCount} test files`);
                this.verificationResults.tests.passed++;
            } else {
                console.log('  ⚠️  No test files found');
                this.warnings.push({
                    category: 'tests',
                    severity: 'warning',
                    message: 'No test files found',
                    recommendation: 'Add comprehensive test suite for quality assurance'
                });
                this.verificationResults.tests.warnings++;
            }

        } catch (error) {
            console.error('  💥 Test verification failed:', error.message);
            this.criticalIssues.push({
                category: 'tests',
                severity: 'critical',
                message: `Test verification failed: ${error.message}`
            });
            this.verificationResults.tests.failed++;
        }
    }

    async verifyPerformance() {
        console.log('⚡ Verifying Performance...');
        
        try {
            // Check for performance monitoring systems
            const performanceFiles = [
                'frontend/src/performance/PerformanceManager.js',
                'frontend/src/performance/ComprehensivePerformanceMonitor.js'
            ];

            for (const file of performanceFiles) {
                try {
                    await fs.access(file);
                    console.log(`  ✓ Performance system exists: ${path.basename(file)}`);
                    this.verificationResults.performance.passed++;
                } catch (error) {
                    console.log(`  ⚠️  Performance system missing: ${path.basename(file)}`);
                    this.warnings.push({
                        category: 'performance',
                        severity: 'warning',
                        message: `Performance system missing: ${file}`,
                        recommendation: 'Implement performance monitoring for production'
                    });
                    this.verificationResults.performance.warnings++;
                }
            }

            // Check build size
            try {
                const distPath = path.join(__dirname, '..', 'frontend', 'dist');
                const buildSize = await this.calculateDirectorySize(distPath);
                const buildSizeMB = buildSize / (1024 * 1024);
                
                if (buildSizeMB < 100) {
                    console.log(`  ✓ Build size acceptable: ${buildSizeMB.toFixed(2)} MB`);
                    this.verificationResults.performance.passed++;
                } else if (buildSizeMB < 200) {
                    console.log(`  ⚠️  Build size large: ${buildSizeMB.toFixed(2)} MB`);
                    this.warnings.push({
                        category: 'performance',
                        severity: 'warning',
                        message: `Build size is large: ${buildSizeMB.toFixed(2)} MB`,
                        recommendation: 'Consider optimizing assets and code splitting'
                    });
                    this.verificationResults.performance.warnings++;
                } else {
                    console.log(`  ❌ Build size too large: ${buildSizeMB.toFixed(2)} MB`);
                    this.criticalIssues.push({
                        category: 'performance',
                        severity: 'critical',
                        message: `Build size too large: ${buildSizeMB.toFixed(2)} MB`,
                        recommendation: 'Optimize build size before release'
                    });
                    this.verificationResults.performance.failed++;
                }
            } catch (error) {
                console.log('  ⚠️  Could not calculate build size');
                this.warnings.push({
                    category: 'performance',
                    severity: 'warning',
                    message: 'Could not calculate build size',
                    details: error.message
                });
                this.verificationResults.performance.warnings++;
            }

            // Check for optimization systems
            const optimizationSystems = [
                'frontend/src/assets/AssetOptimizer.js',
                'frontend/src/performance/LODSystem.js',
                'frontend/src/performance/ObjectPool.js'
            ];

            for (const system of optimizationSystems) {
                try {
                    await fs.access(system);
                    console.log(`  ✓ Optimization system exists: ${path.basename(system)}`);
                    this.verificationResults.performance.passed++;
                } catch (error) {
                    console.log(`  ⚠️  Optimization system missing: ${path.basename(system)}`);
                    this.warnings.push({
                        category: 'performance',
                        severity: 'warning',
                        message: `Optimization system missing: ${system}`,
                        recommendation: 'Implement performance optimizations'
                    });
                    this.verificationResults.performance.warnings++;
                }
            }

        } catch (error) {
            console.error('  💥 Performance verification failed:', error.message);
            this.criticalIssues.push({
                category: 'performance',
                severity: 'critical',
                message: `Performance verification failed: ${error.message}`
            });
            this.verificationResults.performance.failed++;
        }
    }

    async calculateDirectorySize(dirPath) {
        let totalSize = 0;
        
        try {
            const files = await this.getAllFiles(dirPath);
            for (const file of files) {
                try {
                    const stats = await fs.stat(file);
                    totalSize += stats.size;
                } catch (error) {
                    // File might not exist or be accessible
                }
            }
        } catch (error) {
            // Directory might not exist
        }
        
        return totalSize;
    }

    async verifyCompatibility() {
        console.log('🌐 Verifying Compatibility...');
        
        try {
            // Check for cross-platform systems
            const compatibilityFiles = [
                'frontend/src/platform/CrossPlatformManager.js',
                'frontend/src/platform/CrossPlatformIntegration.js'
            ];

            for (const file of compatibilityFiles) {
                try {
                    await fs.access(file);
                    console.log(`  ✓ Cross-platform system exists: ${path.basename(file)}`);
                    this.verificationResults.compatibility.passed++;
                } catch (error) {
                    console.log(`  ⚠️  Cross-platform system missing: ${path.basename(file)}`);
                    this.warnings.push({
                        category: 'compatibility',
                        severity: 'warning',
                        message: `Cross-platform system missing: ${file}`,
                        recommendation: 'Implement cross-platform compatibility'
                    });
                    this.verificationResults.compatibility.warnings++;
                }
            }

            // Check Electron configuration
            try {
                const electronMainPath = path.join(__dirname, '..', 'frontend', 'electron', 'main.js');
                await fs.access(electronMainPath);
                console.log('  ✓ Electron main process configured');
                this.verificationResults.compatibility.passed++;
            } catch (error) {
                console.log('  ⚠️  Electron main process missing');
                this.warnings.push({
                    category: 'compatibility',
                    severity: 'warning',
                    message: 'Electron main process missing',
                    recommendation: 'Configure Electron for desktop distribution'
                });
                this.verificationResults.compatibility.warnings++;
            }

            // Check responsive design
            try {
                const responsiveFiles = await this.getAllFiles('frontend/src');
                const cssFiles = responsiveFiles.filter(file => file.endsWith('.css'));
                
                let hasResponsiveCSS = false;
                for (const cssFile of cssFiles) {
                    const content = await fs.readFile(cssFile, 'utf8');
                    if (content.includes('@media') || content.includes('responsive')) {
                        hasResponsiveCSS = true;
                        break;
                    }
                }

                if (hasResponsiveCSS) {
                    console.log('  ✓ Responsive design implemented');
                    this.verificationResults.compatibility.passed++;
                } else {
                    console.log('  ⚠️  No responsive design found');
                    this.warnings.push({
                        category: 'compatibility',
                        severity: 'warning',
                        message: 'No responsive design found',
                        recommendation: 'Implement responsive design for different screen sizes'
                    });
                    this.verificationResults.compatibility.warnings++;
                }
            } catch (error) {
                console.log('  ⚠️  Could not verify responsive design');
                this.verificationResults.compatibility.warnings++;
            }

        } catch (error) {
            console.error('  💥 Compatibility verification failed:', error.message);
            this.criticalIssues.push({
                category: 'compatibility',
                severity: 'critical',
                message: `Compatibility verification failed: ${error.message}`
            });
            this.verificationResults.compatibility.failed++;
        }
    }

    async verifyDocumentation() {
        console.log('📚 Verifying Documentation...');
        
        try {
            // Check for essential documentation
            const requiredDocs = [
                'README.md',
                'docs/USER_MANUAL.md',
                'docs/TECHNICAL_DOCUMENTATION.md',
                'docs/TROUBLESHOOTING_GUIDE.md',
                'docs/SYSTEM_REQUIREMENTS.md'
            ];

            for (const doc of requiredDocs) {
                try {
                    const content = await fs.readFile(doc, 'utf8');
                    if (content.length > 100) {
                        console.log(`  ✓ Documentation exists: ${doc}`);
                        this.verificationResults.documentation.passed++;
                    } else {
                        console.log(`  ⚠️  Documentation too short: ${doc}`);
                        this.warnings.push({
                            category: 'documentation',
                            severity: 'warning',
                            message: `Documentation too short: ${doc}`,
                            recommendation: 'Expand documentation content'
                        });
                        this.verificationResults.documentation.warnings++;
                    }
                } catch (error) {
                    console.log(`  ❌ Missing documentation: ${doc}`);
                    this.criticalIssues.push({
                        category: 'documentation',
                        severity: 'critical',
                        message: `Missing documentation: ${doc}`,
                        recommendation: 'Create missing documentation'
                    });
                    this.verificationResults.documentation.failed++;
                }
            }

            // Check for code documentation
            const sourceFiles = await this.getAllFiles('frontend/src');
            const jsFiles = sourceFiles.filter(file => file.endsWith('.js') && !file.includes('test'));
            
            let documentedFiles = 0;
            for (const file of jsFiles.slice(0, 10)) { // Sample first 10 files
                try {
                    const content = await fs.readFile(file, 'utf8');
                    if (content.includes('/**') || content.includes('//')) {
                        documentedFiles++;
                    }
                } catch (error) {
                    // File might not be readable
                }
            }

            const documentationRatio = documentedFiles / Math.min(jsFiles.length, 10);
            if (documentationRatio > 0.7) {
                console.log(`  ✓ Code documentation adequate: ${Math.round(documentationRatio * 100)}%`);
                this.verificationResults.documentation.passed++;
            } else {
                console.log(`  ⚠️  Code documentation low: ${Math.round(documentationRatio * 100)}%`);
                this.warnings.push({
                    category: 'documentation',
                    severity: 'warning',
                    message: `Code documentation low: ${Math.round(documentationRatio * 100)}%`,
                    recommendation: 'Add more inline code documentation'
                });
                this.verificationResults.documentation.warnings++;
            }

        } catch (error) {
            console.error('  💥 Documentation verification failed:', error.message);
            this.criticalIssues.push({
                category: 'documentation',
                severity: 'critical',
                message: `Documentation verification failed: ${error.message}`
            });
            this.verificationResults.documentation.failed++;
        }
    }

    async verifyDistribution() {
        console.log('🚀 Verifying Distribution Setup...');
        
        try {
            // Check distribution configurations
            const distributionConfigs = [
                'distribution/steam/steam_config.json',
                'distribution/platforms/distribution_setup.js',
                'marketing/MARKETING_MATERIALS.md'
            ];

            for (const config of distributionConfigs) {
                try {
                    await fs.access(config);
                    console.log(`  ✓ Distribution config exists: ${path.basename(config)}`);
                    this.verificationResults.distribution.passed++;
                } catch (error) {
                    console.log(`  ❌ Missing distribution config: ${config}`);
                    this.criticalIssues.push({
                        category: 'distribution',
                        severity: 'critical',
                        message: `Missing distribution config: ${config}`,
                        recommendation: 'Create missing distribution configuration'
                    });
                    this.verificationResults.distribution.failed++;
                }
            }

            // Check for marketing materials
            try {
                const screenshotDir = 'marketing/screenshots';
                await fs.access(screenshotDir);
                console.log('  ✓ Marketing screenshot directory exists');
                this.verificationResults.distribution.passed++;
            } catch (error) {
                console.log('  ⚠️  Marketing screenshot directory missing');
                this.warnings.push({
                    category: 'distribution',
                    severity: 'warning',
                    message: 'Marketing screenshot directory missing',
                    recommendation: 'Generate marketing screenshots'
                });
                this.verificationResults.distribution.warnings++;
            }

            // Check for update system
            try {
                const updateSystemPath = 'src/updates/AutoUpdateSystem.js';
                await fs.access(updateSystemPath);
                console.log('  ✓ Auto-update system exists');
                this.verificationResults.distribution.passed++;
            } catch (error) {
                console.log('  ⚠️  Auto-update system missing');
                this.warnings.push({
                    category: 'distribution',
                    severity: 'warning',
                    message: 'Auto-update system missing',
                    recommendation: 'Implement auto-update functionality'
                });
                this.verificationResults.distribution.warnings++;
            }

            // Check for analytics system
            try {
                const analyticsPath = 'src/analytics/TelemetrySystem.js';
                await fs.access(analyticsPath);
                console.log('  ✓ Analytics system exists');
                this.verificationResults.distribution.passed++;
            } catch (error) {
                console.log('  ⚠️  Analytics system missing');
                this.warnings.push({
                    category: 'distribution',
                    severity: 'warning',
                    message: 'Analytics system missing',
                    recommendation: 'Implement analytics for user insights'
                });
                this.verificationResults.distribution.warnings++;
            }

        } catch (error) {
            console.error('  💥 Distribution verification failed:', error.message);
            this.criticalIssues.push({
                category: 'distribution',
                severity: 'critical',
                message: `Distribution verification failed: ${error.message}`
            });
            this.verificationResults.distribution.failed++;
        }
    }

    assessReleaseReadiness() {
        const totalCritical = this.criticalIssues.length;
        const totalWarnings = this.warnings.length;
        
        // Release is ready if no critical issues
        const releaseReady = totalCritical === 0;
        
        console.log(`\n📊 Verification Summary:`);
        console.log(`   Critical Issues: ${totalCritical}`);
        console.log(`   Warnings: ${totalWarnings}`);
        console.log(`   Recommendations: ${this.recommendations.length}`);
        
        return releaseReady;
    }

    async generateVerificationReport() {
        console.log('\n📋 Generating Verification Report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.startTime,
            summary: {
                release_ready: this.criticalIssues.length === 0,
                critical_issues: this.criticalIssues.length,
                warnings: this.warnings.length,
                recommendations: this.recommendations.length
            },
            results: this.verificationResults,
            critical_issues: this.criticalIssues,
            warnings: this.warnings,
            recommendations: this.recommendations
        };

        // Save detailed JSON report
        await fs.writeFile(
            'verification-report.json',
            JSON.stringify(report, null, 2)
        );

        // Generate human-readable report
        const readableReport = this.generateReadableReport(report);
        await fs.writeFile('VERIFICATION_REPORT.md', readableReport);

        console.log('  ✓ Verification report saved to VERIFICATION_REPORT.md');
        console.log('  ✓ Detailed data saved to verification-report.json');
    }

    generateReadableReport(report) {
        const duration = Math.round(report.duration / 1000);
        
        let markdown = `# Final Verification Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}  
**Duration:** ${duration} seconds  
**Release Ready:** ${report.summary.release_ready ? '✅ YES' : '❌ NO'}

## Summary

- **Critical Issues:** ${report.summary.critical_issues}
- **Warnings:** ${report.summary.warnings}  
- **Recommendations:** ${report.summary.recommendations}

## Verification Results

`;

        // Add results by category
        for (const [category, results] of Object.entries(report.results)) {
            const total = results.passed + results.failed + results.warnings;
            const passRate = total > 0 ? Math.round((results.passed / total) * 100) : 0;
            
            markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}
- **Passed:** ${results.passed}
- **Failed:** ${results.failed}
- **Warnings:** ${results.warnings}
- **Pass Rate:** ${passRate}%

`;
        }

        // Add critical issues
        if (report.critical_issues.length > 0) {
            markdown += `## Critical Issues

`;
            for (const issue of report.critical_issues) {
                markdown += `### ${issue.category.toUpperCase()}: ${issue.message}
${issue.details ? `**Details:** ${issue.details}` : ''}
${issue.recommendation ? `**Recommendation:** ${issue.recommendation}` : ''}

`;
            }
        }

        // Add warnings
        if (report.warnings.length > 0) {
            markdown += `## Warnings

`;
            for (const warning of report.warnings) {
                markdown += `### ${warning.category.toUpperCase()}: ${warning.message}
${warning.details ? `**Details:** ${warning.details}` : ''}
${warning.recommendation ? `**Recommendation:** ${warning.recommendation}` : ''}

`;
            }
        }

        // Add recommendations
        if (report.recommendations.length > 0) {
            markdown += `## Recommendations

`;
            for (const rec of report.recommendations) {
                markdown += `- ${rec.message}
`;
            }
        }

        markdown += `
## Next Steps

${report.summary.release_ready ? 
`✅ **Ready for Release**
- All critical checks passed
- Address warnings for improved quality
- Proceed with release process` :
`❌ **Not Ready for Release**
- Fix all critical issues before release
- Address warnings for better quality
- Re-run verification after fixes`}

---
*Generated by Final Verification System*
`;

        return markdown;
    }
}

// CLI Interface
async function main() {
    const verifier = new FinalVerificationSystem();
    
    try {
        const releaseReady = await verifier.runCompleteVerification();
        
        if (releaseReady) {
            console.log('\n🎉 All systems verified - Ready for release!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Critical issues found - Fix before release');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Verification failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = FinalVerificationSystem;