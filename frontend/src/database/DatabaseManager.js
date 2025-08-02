/**
 * Local SQLite Database Manager for Zombie Car Game
 * Handles all local data storage including player progress, vehicles, levels, and achievements
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

export class DatabaseManager {
    constructor(options = {}) {
        this.options = {
            dbPath: options.dbPath || this.getDefaultDbPath(),
            enableWAL: options.enableWAL !== false,
            enableForeignKeys: options.enableForeignKeys !== false,
            timeout: options.timeout || 5000,
            verbose: options.verbose || false,
            ...options
        };

        this.db = null;
        this.isInitialized = false;
        this.migrations = [];
        
        console.log('DatabaseManager initialized with options:', this.options);
    }

    /**
     * Get default database path based on platform
     */
    getDefaultDbPath() {
        const { app } = require('electron');
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'zombie-car-game.db');
    }

    /**
     * Initialize database connection and schema
     */
    async initialize() {
        try {
            // Ensure database directory exists
            const dbDir = path.dirname(this.options.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Open database connection
            this.db = new Database(this.options.dbPath, {
                verbose: this.options.verbose ? console.log : null,
                timeout: this.options.timeout
            });

            // Configure database
            this.configurePragmas();

            // Run migrations
            await this.runMigrations();

            this.isInitialized = true;
            console.log('Database initialized successfully:', this.options.dbPath);

        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Configure SQLite pragmas for optimal performance
     */
    configurePragmas() {
        if (this.options.enableWAL) {
            this.db.pragma('journal_mode = WAL');
        }
        
        if (this.options.enableForeignKeys) {
            this.db.pragma('foreign_keys = ON');
        }

        // Performance optimizations
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 10000');
        this.db.pragma('temp_store = memory');
        this.db.pragma('mmap_size = 268435456'); // 256MB
    }

    /**
     * Run database migrations
     */
    async runMigrations() {
        // Create migrations table if it doesn't exist
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version TEXT UNIQUE NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Define migrations
        const migrations = [
            {
                version: '001_initial_schema',
                sql: this.getInitialSchemaSql()
            },
            {
                version: '002_add_indexes',
                sql: this.getIndexesSql()
            },
            {
                version: '003_add_achievements',
                sql: this.getAchievementsSql()
            }
        ];

        // Apply migrations
        for (const migration of migrations) {
            const existing = this.db.prepare('SELECT version FROM migrations WHERE version = ?').get(migration.version);
            
            if (!existing) {
                console.log(`Applying migration: ${migration.version}`);
                
                const transaction = this.db.transaction(() => {
                    this.db.exec(migration.sql);
                    this.db.prepare('INSERT INTO migrations (version) VALUES (?)').run(migration.version);
                });
                
                transaction();
                console.log(`Migration ${migration.version} applied successfully`);
            }
        }
    }

    /**
     * Get initial database schema SQL
     */
    getInitialSchemaSql() {
        return `
            -- Player Profile
            CREATE TABLE IF NOT EXISTS player_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL DEFAULT 'Player',
                level INTEGER NOT NULL DEFAULT 1,
                experience INTEGER NOT NULL DEFAULT 0,
                total_currency INTEGER NOT NULL DEFAULT 0,
                total_distance REAL NOT NULL DEFAULT 0,
                total_zombies_killed INTEGER NOT NULL DEFAULT 0,
                total_play_time INTEGER NOT NULL DEFAULT 0,
                settings TEXT, -- JSON
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Vehicle Ownership and Upgrades
            CREATE TABLE IF NOT EXISTS player_vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                vehicle_type TEXT NOT NULL,
                is_owned BOOLEAN NOT NULL DEFAULT 0,
                upgrade_levels TEXT, -- JSON: {engine: 1, armor: 2, ...}
                customization TEXT, -- JSON: {color: '#ff0000', decals: [...]}
                total_distance REAL NOT NULL DEFAULT 0,
                total_kills INTEGER NOT NULL DEFAULT 0,
                purchase_date DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES player_profile(id) ON DELETE CASCADE
            );

            -- Level Progress
            CREATE TABLE IF NOT EXISTS level_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                level_id TEXT NOT NULL,
                best_score INTEGER NOT NULL DEFAULT 0,
                best_time REAL,
                completion_count INTEGER NOT NULL DEFAULT 0,
                stars_earned INTEGER NOT NULL DEFAULT 0,
                is_completed BOOLEAN NOT NULL DEFAULT 0,
                first_completed_at DATETIME,
                last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES player_profile(id) ON DELETE CASCADE,
                UNIQUE(player_id, level_id)
            );

            -- Game Sessions
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                level_id TEXT NOT NULL,
                vehicle_type TEXT NOT NULL,
                score INTEGER NOT NULL DEFAULT 0,
                distance REAL NOT NULL DEFAULT 0,
                zombies_killed INTEGER NOT NULL DEFAULT 0,
                play_time INTEGER NOT NULL DEFAULT 0,
                completed BOOLEAN NOT NULL DEFAULT 0,
                session_data TEXT, -- JSON: detailed session stats
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                ended_at DATETIME,
                FOREIGN KEY (player_id) REFERENCES player_profile(id) ON DELETE CASCADE
            );

            -- Save Games
            CREATE TABLE IF NOT EXISTS save_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                save_name TEXT NOT NULL,
                save_data TEXT NOT NULL, -- JSON: complete game state
                screenshot BLOB, -- Optional screenshot
                level_id TEXT,
                vehicle_type TEXT,
                score INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES player_profile(id) ON DELETE CASCADE
            );

            -- Statistics
            CREATE TABLE IF NOT EXISTS player_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                stat_name TEXT NOT NULL,
                stat_value REAL NOT NULL DEFAULT 0,
                stat_type TEXT NOT NULL DEFAULT 'counter', -- counter, gauge, timer
                category TEXT NOT NULL DEFAULT 'general',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES player_profile(id) ON DELETE CASCADE,
                UNIQUE(player_id, stat_name)
            );

            -- Insert default player profile if none exists
            INSERT OR IGNORE INTO player_profile (id, username) VALUES (1, 'Player');
        `;
    }

    /**
     * Get database indexes SQL
     */
    getIndexesSql() {
        return `
            -- Performance indexes
            CREATE INDEX IF NOT EXISTS idx_player_vehicles_player_id ON player_vehicles(player_id);
            CREATE INDEX IF NOT EXISTS idx_player_vehicles_type ON player_vehicles(vehicle_type);
            CREATE INDEX IF NOT EXISTS idx_level_progress_player_id ON level_progress(player_id);
            CREATE INDEX IF NOT EXISTS idx_level_progress_level_id ON level_progress(level_id);
            CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON game_sessions(player_id);
            CREATE INDEX IF NOT EXISTS idx_game_sessions_level_id ON game_sessions(level_id);
            CREATE INDEX IF NOT EXISTS idx_game_sessions_started_at ON game_sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_save_games_player_id ON save_games(player_id);
            CREATE INDEX IF NOT EXISTS idx_player_statistics_player_id ON player_statistics(player_id);
            CREATE INDEX IF NOT EXISTS idx_player_statistics_category ON player_statistics(category);
        `;
    }

    /**
     * Get achievements schema SQL
     */
    getAchievementsSql() {
        return `
            -- Achievements
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                achievement_id TEXT NOT NULL,
                achievement_name TEXT NOT NULL,
                achievement_description TEXT,
                progress INTEGER NOT NULL DEFAULT 0,
                target INTEGER NOT NULL DEFAULT 1,
                is_unlocked BOOLEAN NOT NULL DEFAULT 0,
                unlocked_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player_id) REFERENCES player_profile(id) ON DELETE CASCADE,
                UNIQUE(player_id, achievement_id)
            );

            CREATE INDEX IF NOT EXISTS idx_achievements_player_id ON achievements(player_id);
            CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(is_unlocked);
        `;
    }

    /**
     * Player Profile Operations
     */
    
    getPlayerProfile(playerId = 1) {
        const stmt = this.db.prepare('SELECT * FROM player_profile WHERE id = ?');
        const profile = stmt.get(playerId);
        
        if (profile && profile.settings) {
            try {
                profile.settings = JSON.parse(profile.settings);
            } catch (e) {
                profile.settings = {};
            }
        }
        
        return profile;
    }

    updatePlayerProfile(playerId, updates) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'settings' && typeof value === 'object') {
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(value));
            } else {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(playerId);
        
        const sql = `UPDATE player_profile SET ${fields.join(', ')} WHERE id = ?`;
        const stmt = this.db.prepare(sql);
        return stmt.run(...values);
    }

    /**
     * Vehicle Operations
     */
    
    getPlayerVehicles(playerId = 1) {
        const stmt = this.db.prepare('SELECT * FROM player_vehicles WHERE player_id = ?');
        const vehicles = stmt.all(playerId);
        
        return vehicles.map(vehicle => {
            if (vehicle.upgrade_levels) {
                try {
                    vehicle.upgrade_levels = JSON.parse(vehicle.upgrade_levels);
                } catch (e) {
                    vehicle.upgrade_levels = {};
                }
            }
            
            if (vehicle.customization) {
                try {
                    vehicle.customization = JSON.parse(vehicle.customization);
                } catch (e) {
                    vehicle.customization = {};
                }
            }
            
            return vehicle;
        });
    }

    addPlayerVehicle(playerId, vehicleData) {
        const stmt = this.db.prepare(`
            INSERT INTO player_vehicles (
                player_id, vehicle_type, is_owned, upgrade_levels, customization, purchase_date
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        return stmt.run(
            playerId,
            vehicleData.vehicle_type,
            vehicleData.is_owned || false,
            JSON.stringify(vehicleData.upgrade_levels || {}),
            JSON.stringify(vehicleData.customization || {})
        );
    }

    updatePlayerVehicle(vehicleId, updates) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(updates)) {
            if ((key === 'upgrade_levels' || key === 'customization') && typeof value === 'object') {
                fields.push(`${key} = ?`);
                values.push(JSON.stringify(value));
            } else {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(vehicleId);
        
        const sql = `UPDATE player_vehicles SET ${fields.join(', ')} WHERE id = ?`;
        const stmt = this.db.prepare(sql);
        return stmt.run(...values);
    }

    /**
     * Level Progress Operations
     */
    
    getLevelProgress(playerId = 1, levelId = null) {
        if (levelId) {
            const stmt = this.db.prepare('SELECT * FROM level_progress WHERE player_id = ? AND level_id = ?');
            return stmt.get(playerId, levelId);
        } else {
            const stmt = this.db.prepare('SELECT * FROM level_progress WHERE player_id = ? ORDER BY last_played_at DESC');
            return stmt.all(playerId);
        }
    }

    updateLevelProgress(playerId, levelId, progressData) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO level_progress (
                player_id, level_id, best_score, best_time, completion_count, 
                stars_earned, is_completed, first_completed_at, last_played_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `);
        
        return stmt.run(
            playerId,
            levelId,
            progressData.best_score || 0,
            progressData.best_time || null,
            progressData.completion_count || 0,
            progressData.stars_earned || 0,
            progressData.is_completed || false,
            progressData.first_completed_at || null
        );
    }

    /**
     * Game Session Operations
     */
    
    startGameSession(playerId, sessionData) {
        const stmt = this.db.prepare(`
            INSERT INTO game_sessions (
                player_id, level_id, vehicle_type, started_at
            ) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        const result = stmt.run(playerId, sessionData.level_id, sessionData.vehicle_type);
        return result.lastInsertRowid;
    }

    endGameSession(sessionId, sessionData) {
        const stmt = this.db.prepare(`
            UPDATE game_sessions SET 
                score = ?, distance = ?, zombies_killed = ?, play_time = ?, 
                completed = ?, session_data = ?, ended_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        return stmt.run(
            sessionData.score || 0,
            sessionData.distance || 0,
            sessionData.zombies_killed || 0,
            sessionData.play_time || 0,
            sessionData.completed || false,
            JSON.stringify(sessionData.session_data || {}),
            sessionId
        );
    }

    /**
     * Save Game Operations
     */
    
    getSaveGames(playerId = 1) {
        const stmt = this.db.prepare(`
            SELECT id, player_id, save_name, level_id, vehicle_type, score, created_at, updated_at
            FROM save_games WHERE player_id = ? ORDER BY updated_at DESC
        `);
        return stmt.all(playerId);
    }

    getSaveGame(saveId) {
        const stmt = this.db.prepare('SELECT * FROM save_games WHERE id = ?');
        const save = stmt.get(saveId);
        
        if (save && save.save_data) {
            try {
                save.save_data = JSON.parse(save.save_data);
            } catch (e) {
                console.error('Failed to parse save data:', e);
            }
        }
        
        return save;
    }

    createSaveGame(playerId, saveData) {
        const stmt = this.db.prepare(`
            INSERT INTO save_games (
                player_id, save_name, save_data, screenshot, level_id, vehicle_type, score
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        return stmt.run(
            playerId,
            saveData.save_name,
            JSON.stringify(saveData.save_data),
            saveData.screenshot || null,
            saveData.level_id || null,
            saveData.vehicle_type || null,
            saveData.score || 0
        );
    }

    deleteSaveGame(saveId) {
        const stmt = this.db.prepare('DELETE FROM save_games WHERE id = ?');
        return stmt.run(saveId);
    }

    /**
     * Statistics Operations
     */
    
    getPlayerStatistics(playerId = 1, category = null) {
        if (category) {
            const stmt = this.db.prepare('SELECT * FROM player_statistics WHERE player_id = ? AND category = ?');
            return stmt.all(playerId, category);
        } else {
            const stmt = this.db.prepare('SELECT * FROM player_statistics WHERE player_id = ?');
            return stmt.all(playerId);
        }
    }

    updateStatistic(playerId, statName, value, statType = 'counter', category = 'general') {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO player_statistics (
                player_id, stat_name, stat_value, stat_type, category, updated_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        return stmt.run(playerId, statName, value, statType, category);
    }

    incrementStatistic(playerId, statName, increment = 1, category = 'general') {
        const stmt = this.db.prepare(`
            INSERT INTO player_statistics (player_id, stat_name, stat_value, category, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(player_id, stat_name) DO UPDATE SET
                stat_value = stat_value + ?,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        return stmt.run(playerId, statName, increment, category, increment);
    }

    /**
     * Achievement Operations
     */
    
    getAchievements(playerId = 1, unlockedOnly = false) {
        let sql = 'SELECT * FROM achievements WHERE player_id = ?';
        if (unlockedOnly) {
            sql += ' AND is_unlocked = 1';
        }
        sql += ' ORDER BY unlocked_at DESC, created_at ASC';
        
        const stmt = this.db.prepare(sql);
        return stmt.all(playerId);
    }

    updateAchievementProgress(playerId, achievementId, progress, target = null) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO achievements (
                player_id, achievement_id, achievement_name, achievement_description,
                progress, target, is_unlocked, unlocked_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        const isUnlocked = progress >= (target || 1);
        const unlockedAt = isUnlocked ? new Date().toISOString() : null;
        
        return stmt.run(
            playerId,
            achievementId,
            '', // Will be filled by achievement system
            '', // Will be filled by achievement system
            progress,
            target || 1,
            isUnlocked,
            unlockedAt
        );
    }

    /**
     * Backup and Restore Operations
     */
    
    createBackup() {
        const backupPath = this.options.dbPath + '.backup.' + Date.now();
        this.db.backup(backupPath);
        return backupPath;
    }

    restoreFromBackup(backupPath) {
        if (!fs.existsSync(backupPath)) {
            throw new Error('Backup file not found: ' + backupPath);
        }
        
        // Close current connection
        this.close();
        
        // Replace database file
        fs.copyFileSync(backupPath, this.options.dbPath);
        
        // Reinitialize
        return this.initialize();
    }

    /**
     * Maintenance Operations
     */
    
    vacuum() {
        this.db.exec('VACUUM');
    }

    analyze() {
        this.db.exec('ANALYZE');
    }

    getDbInfo() {
        const info = {
            path: this.options.dbPath,
            size: fs.statSync(this.options.dbPath).size,
            pageCount: this.db.pragma('page_count', { simple: true }),
            pageSize: this.db.pragma('page_size', { simple: true }),
            journalMode: this.db.pragma('journal_mode', { simple: true }),
            foreignKeys: this.db.pragma('foreign_keys', { simple: true })
        };
        
        info.sizeFormatted = this.formatBytes(info.size);
        return info;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            console.log('Database connection closed');
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.close();
    }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();