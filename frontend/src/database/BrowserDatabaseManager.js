/**
 * Browser-compatible Database Manager
 * Uses localStorage for browser environments and SQLite for Electron
 */

class BrowserDatabaseManager {
  constructor() {
    this.isElectron = this.checkElectronEnvironment();
    this.storage = this.isElectron ? null : this.initBrowserStorage();
    this.db = null;
  }

  checkElectronEnvironment() {
    try {
      return typeof window !== 'undefined' && 
             window.process && 
             window.process.type === 'renderer';
    } catch (error) {
      return false;
    }
  }

  initBrowserStorage() {
    // Initialize browser storage with default structure
    const defaultData = {
      players: [],
      vehicles: [],
      levels: [],
      achievements: [],
      settings: {},
      scores: []
    };

    // Check if data exists, if not initialize
    Object.keys(defaultData).forEach(key => {
      if (!localStorage.getItem(`zcg_${key}`)) {
        localStorage.setItem(`zcg_${key}`, JSON.stringify(defaultData[key]));
      }
    });

    return {
      get: (key) => {
        try {
          return JSON.parse(localStorage.getItem(`zcg_${key}`)) || [];
        } catch (error) {
          console.warn(`Error reading ${key} from localStorage:`, error);
          return [];
        }
      },
      set: (key, data) => {
        try {
          localStorage.setItem(`zcg_${key}`, JSON.stringify(data));
          return true;
        } catch (error) {
          console.error(`Error writing ${key} to localStorage:`, error);
          return false;
        }
      },
      clear: () => {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('zcg_')) {
            localStorage.removeItem(key);
          }
        });
      }
    };
  }

  async initialize() {
    if (this.isElectron) {
      // In Electron, use IPC to communicate with main process
      try {
        const { ipcRenderer } = window.require('electron');
        this.db = {
          query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
          run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
          get: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
          all: (sql, params) => ipcRenderer.invoke('db-all', sql, params)
        };
        return true;
      } catch (error) {
        console.warn('Electron IPC not available, falling back to browser storage');
        this.isElectron = false;
        this.storage = this.initBrowserStorage();
      }
    }
    return true;
  }

  // Player operations
  async createPlayer(playerData) {
    if (this.isElectron && this.db) {
      return await this.db.run(
        'INSERT INTO players (name, level, experience, currency, created_at) VALUES (?, ?, ?, ?, ?)',
        [playerData.name, playerData.level || 1, playerData.experience || 0, playerData.currency || 1000, new Date().toISOString()]
      );
    } else {
      const players = this.storage.get('players');
      const newPlayer = {
        id: Date.now(),
        ...playerData,
        level: playerData.level || 1,
        experience: playerData.experience || 0,
        currency: playerData.currency || 1000,
        created_at: new Date().toISOString()
      };
      players.push(newPlayer);
      this.storage.set('players', players);
      return { id: newPlayer.id };
    }
  }

  async getPlayer(playerId) {
    if (this.isElectron && this.db) {
      return await this.db.get('SELECT * FROM players WHERE id = ?', [playerId]);
    } else {
      const players = this.storage.get('players');
      return players.find(p => p.id === playerId);
    }
  }

  async updatePlayer(playerId, updates) {
    if (this.isElectron && this.db) {
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), playerId];
      return await this.db.run(`UPDATE players SET ${setClause} WHERE id = ?`, values);
    } else {
      const players = this.storage.get('players');
      const playerIndex = players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        players[playerIndex] = { ...players[playerIndex], ...updates };
        this.storage.set('players', players);
        return { changes: 1 };
      }
      return { changes: 0 };
    }
  }

  async getAllPlayers() {
    if (this.isElectron && this.db) {
      return await this.db.all('SELECT * FROM players ORDER BY created_at DESC');
    } else {
      return this.storage.get('players').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  // Vehicle operations
  async saveVehicle(vehicleData) {
    if (this.isElectron && this.db) {
      return await this.db.run(
        'INSERT OR REPLACE INTO vehicles (player_id, vehicle_type, upgrades, customization, stats) VALUES (?, ?, ?, ?, ?)',
        [vehicleData.player_id, vehicleData.vehicle_type, JSON.stringify(vehicleData.upgrades), JSON.stringify(vehicleData.customization), JSON.stringify(vehicleData.stats)]
      );
    } else {
      const vehicles = this.storage.get('vehicles');
      const existingIndex = vehicles.findIndex(v => v.player_id === vehicleData.player_id && v.vehicle_type === vehicleData.vehicle_type);
      
      if (existingIndex !== -1) {
        vehicles[existingIndex] = vehicleData;
      } else {
        vehicles.push({ id: Date.now(), ...vehicleData });
      }
      
      this.storage.set('vehicles', vehicles);
      return { id: vehicleData.id || Date.now() };
    }
  }

  async getPlayerVehicles(playerId) {
    if (this.isElectron && this.db) {
      const vehicles = await this.db.all('SELECT * FROM vehicles WHERE player_id = ?', [playerId]);
      return vehicles.map(v => ({
        ...v,
        upgrades: JSON.parse(v.upgrades || '{}'),
        customization: JSON.parse(v.customization || '{}'),
        stats: JSON.parse(v.stats || '{}')
      }));
    } else {
      return this.storage.get('vehicles').filter(v => v.player_id === playerId);
    }
  }

  // Level operations
  async saveLevelProgress(levelData) {
    if (this.isElectron && this.db) {
      return await this.db.run(
        'INSERT OR REPLACE INTO levels (player_id, level_id, completed, best_time, best_score, objectives_completed) VALUES (?, ?, ?, ?, ?, ?)',
        [levelData.player_id, levelData.level_id, levelData.completed ? 1 : 0, levelData.best_time, levelData.best_score, JSON.stringify(levelData.objectives_completed)]
      );
    } else {
      const levels = this.storage.get('levels');
      const existingIndex = levels.findIndex(l => l.player_id === levelData.player_id && l.level_id === levelData.level_id);
      
      if (existingIndex !== -1) {
        levels[existingIndex] = { ...levels[existingIndex], ...levelData };
      } else {
        levels.push({ id: Date.now(), ...levelData });
      }
      
      this.storage.set('levels', levels);
      return { id: levelData.id || Date.now() };
    }
  }

  async getPlayerLevelProgress(playerId) {
    if (this.isElectron && this.db) {
      const levels = await this.db.all('SELECT * FROM levels WHERE player_id = ?', [playerId]);
      return levels.map(l => ({
        ...l,
        completed: Boolean(l.completed),
        objectives_completed: JSON.parse(l.objectives_completed || '[]')
      }));
    } else {
      return this.storage.get('levels').filter(l => l.player_id === playerId);
    }
  }

  // Achievement operations
  async unlockAchievement(playerId, achievementId) {
    if (this.isElectron && this.db) {
      return await this.db.run(
        'INSERT OR IGNORE INTO achievements (player_id, achievement_id, unlocked_at) VALUES (?, ?, ?)',
        [playerId, achievementId, new Date().toISOString()]
      );
    } else {
      const achievements = this.storage.get('achievements');
      const existing = achievements.find(a => a.player_id === playerId && a.achievement_id === achievementId);
      
      if (!existing) {
        achievements.push({
          id: Date.now(),
          player_id: playerId,
          achievement_id: achievementId,
          unlocked_at: new Date().toISOString()
        });
        this.storage.set('achievements', achievements);
        return { changes: 1 };
      }
      
      return { changes: 0 };
    }
  }

  async getPlayerAchievements(playerId) {
    if (this.isElectron && this.db) {
      return await this.db.all('SELECT * FROM achievements WHERE player_id = ?', [playerId]);
    } else {
      return this.storage.get('achievements').filter(a => a.player_id === playerId);
    }
  }

  // Settings operations
  async saveSettings(playerId, settings) {
    if (this.isElectron && this.db) {
      return await this.db.run(
        'INSERT OR REPLACE INTO settings (player_id, settings_data) VALUES (?, ?)',
        [playerId, JSON.stringify(settings)]
      );
    } else {
      const allSettings = this.storage.get('settings');
      allSettings[playerId] = settings;
      this.storage.set('settings', allSettings);
      return { changes: 1 };
    }
  }

  async getSettings(playerId) {
    if (this.isElectron && this.db) {
      const result = await this.db.get('SELECT settings_data FROM settings WHERE player_id = ?', [playerId]);
      return result ? JSON.parse(result.settings_data) : {};
    } else {
      const allSettings = this.storage.get('settings');
      return allSettings[playerId] || {};
    }
  }

  // Score operations
  async saveScore(scoreData) {
    if (this.isElectron && this.db) {
      return await this.db.run(
        'INSERT INTO scores (player_id, level_id, score, time, zombies_killed, distance_traveled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [scoreData.player_id, scoreData.level_id, scoreData.score, scoreData.time, scoreData.zombies_killed, scoreData.distance_traveled, new Date().toISOString()]
      );
    } else {
      const scores = this.storage.get('scores');
      scores.push({
        id: Date.now(),
        ...scoreData,
        created_at: new Date().toISOString()
      });
      this.storage.set('scores', scores);
      return { id: Date.now() };
    }
  }

  async getHighScores(levelId = null, limit = 10) {
    if (this.isElectron && this.db) {
      const query = levelId 
        ? 'SELECT * FROM scores WHERE level_id = ? ORDER BY score DESC LIMIT ?'
        : 'SELECT * FROM scores ORDER BY score DESC LIMIT ?';
      const params = levelId ? [levelId, limit] : [limit];
      return await this.db.all(query, params);
    } else {
      const scores = this.storage.get('scores');
      let filteredScores = levelId ? scores.filter(s => s.level_id === levelId) : scores;
      return filteredScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }
  }

  // Utility methods
  async backup() {
    if (this.isElectron && this.db) {
      // Electron backup would be handled by main process
      return { success: true, message: 'Backup handled by main process' };
    } else {
      // Browser backup - export all data
      const data = {};
      ['players', 'vehicles', 'levels', 'achievements', 'settings', 'scores'].forEach(key => {
        data[key] = this.storage.get(key);
      });
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zombie-car-game-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return { success: true, message: 'Backup downloaded' };
    }
  }

  async restore(data) {
    if (this.isElectron && this.db) {
      // Electron restore would be handled by main process
      return { success: false, message: 'Restore must be handled by main process' };
    } else {
      try {
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key]) || typeof data[key] === 'object') {
            this.storage.set(key, data[key]);
          }
        });
        return { success: true, message: 'Data restored successfully' };
      } catch (error) {
        return { success: false, message: `Restore failed: ${error.message}` };
      }
    }
  }

  async close() {
    // No cleanup needed for browser storage
    if (this.isElectron && this.db) {
      // Database connection would be managed by main process
    }
  }
}

export default BrowserDatabaseManager;