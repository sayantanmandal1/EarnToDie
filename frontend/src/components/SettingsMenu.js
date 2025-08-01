import React, { useState, useEffect } from 'react';
import './SettingsMenu.css';

const SettingsMenu = ({ 
  isVisible = false,
  onClose,
  onSave,
  initialSettings = {}
}) => {
  const [settings, setSettings] = useState({
    // Graphics Settings
    graphics: {
      quality: 'medium',
      shadows: true,
      particles: true,
      antialiasing: true,
      vsync: true,
      fov: 75,
      renderDistance: 1000
    },
    // Audio Settings
    audio: {
      masterVolume: 80,
      effectsVolume: 70,
      musicVolume: 60,
      engineVolume: 75,
      spatialAudio: true,
      audioQuality: 'high'
    },
    // Control Settings
    controls: {
      mouseSensitivity: 50,
      invertY: false,
      keyBindings: {
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        brake: 'Space',
        pause: 'Escape',
        camera: 'KeyC'
      }
    },
    // Gameplay Settings
    gameplay: {
      difficulty: 'normal',
      showHUD: true,
      showMinimap: true,
      autoSave: true,
      tutorials: true
    }
  });

  const [activeTab, setActiveTab] = useState('graphics');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      setSettings(prevSettings => ({
        ...prevSettings,
        ...initialSettings
      }));
    }
  }, [initialSettings]);

  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
    setHasChanges(true);
  };

  const handleKeyBindingChange = (action, key) => {
    setSettings(prev => ({
      ...prev,
      controls: {
        ...prev.controls,
        keyBindings: {
          ...prev.controls.keyBindings,
          [action]: key
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(settings);
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    const defaultSettings = {
      graphics: {
        quality: 'medium',
        shadows: true,
        particles: true,
        antialiasing: true,
        vsync: true,
        fov: 75,
        renderDistance: 1000
      },
      audio: {
        masterVolume: 80,
        effectsVolume: 70,
        musicVolume: 60,
        engineVolume: 75,
        spatialAudio: true,
        audioQuality: 'high'
      },
      controls: {
        mouseSensitivity: 50,
        invertY: false,
        keyBindings: {
          forward: 'KeyW',
          backward: 'KeyS',
          left: 'KeyA',
          right: 'KeyD',
          brake: 'Space',
          pause: 'Escape',
          camera: 'KeyC'
        }
      },
      gameplay: {
        difficulty: 'normal',
        showHUD: true,
        showMinimap: true,
        autoSave: true,
        tutorials: true
      }
    };
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  if (!isVisible) {
    return null;
  }

  const renderGraphicsTab = () => (
    <div className="settings-tab-content">
      <div className="setting-group">
        <label className="setting-label" htmlFor="graphics-quality">Graphics Quality</label>
        <select 
          id="graphics-quality"
          value={settings.graphics?.quality || 'medium'}
          onChange={(e) => handleSettingChange('graphics', 'quality', e.target.value)}
          className="setting-select"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="ultra">Ultra</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="setting-label">Field of View</label>
        <div className="setting-slider-container">
          <input
            type="range"
            min="60"
            max="120"
            value={settings.graphics?.fov || 75}
            onChange={(e) => handleSettingChange('graphics', 'fov', parseInt(e.target.value))}
            className="setting-slider"
          />
          <span className="setting-value">{settings.graphics?.fov || 75}°</span>
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">Render Distance</label>
        <div className="setting-slider-container">
          <input
            type="range"
            min="500"
            max="2000"
            step="100"
            value={settings.graphics?.renderDistance || 1000}
            onChange={(e) => handleSettingChange('graphics', 'renderDistance', parseInt(e.target.value))}
            className="setting-slider"
          />
          <span className="setting-value">{settings.graphics?.renderDistance || 1000}m</span>
        </div>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.graphics?.shadows ?? true}
            onChange={(e) => handleSettingChange('graphics', 'shadows', e.target.checked)}
          />
          <span className="checkmark"></span>
          Enable Shadows
        </label>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.graphics?.particles ?? true}
            onChange={(e) => handleSettingChange('graphics', 'particles', e.target.checked)}
          />
          <span className="checkmark"></span>
          Enable Particle Effects
        </label>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.graphics?.antialiasing ?? true}
            onChange={(e) => handleSettingChange('graphics', 'antialiasing', e.target.checked)}
          />
          <span className="checkmark"></span>
          Anti-aliasing
        </label>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.graphics?.vsync ?? true}
            onChange={(e) => handleSettingChange('graphics', 'vsync', e.target.checked)}
          />
          <span className="checkmark"></span>
          V-Sync
        </label>
      </div>
    </div>
  );

  const renderAudioTab = () => (
    <div className="settings-tab-content">
      <div className="setting-group">
        <label className="setting-label">Master Volume</label>
        <div className="setting-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.audio?.masterVolume || 80}
            onChange={(e) => handleSettingChange('audio', 'masterVolume', parseInt(e.target.value))}
            className="setting-slider"
          />
          <span className="setting-value">{settings.audio?.masterVolume || 80}%</span>
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">Effects Volume</label>
        <div className="setting-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.audio?.effectsVolume || 70}
            onChange={(e) => handleSettingChange('audio', 'effectsVolume', parseInt(e.target.value))}
            className="setting-slider"
          />
          <span className="setting-value">{settings.audio?.effectsVolume || 70}%</span>
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">Music Volume</label>
        <div className="setting-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.audio?.musicVolume || 60}
            onChange={(e) => handleSettingChange('audio', 'musicVolume', parseInt(e.target.value))}
            className="setting-slider"
          />
          <span className="setting-value">{settings.audio?.musicVolume || 60}%</span>
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label">Engine Volume</label>
        <div className="setting-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.audio?.engineVolume || 75}
            onChange={(e) => handleSettingChange('audio', 'engineVolume', parseInt(e.target.value))}
            className="setting-slider"
          />
          <span className="setting-value">{settings.audio?.engineVolume || 75}%</span>
        </div>
      </div>

      <div className="setting-group">
        <label className="setting-label" htmlFor="audio-quality">Audio Quality</label>
        <select 
          id="audio-quality"
          value={settings.audio?.audioQuality || 'high'}
          onChange={(e) => handleSettingChange('audio', 'audioQuality', e.target.value)}
          className="setting-select"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.audio?.spatialAudio ?? true}
            onChange={(e) => handleSettingChange('audio', 'spatialAudio', e.target.checked)}
          />
          <span className="checkmark"></span>
          3D Spatial Audio
        </label>
      </div>
    </div>
  );

  const renderControlsTab = () => (
    <div className="settings-tab-content">
      <div className="setting-group">
        <label className="setting-label">Mouse Sensitivity</label>
        <div className="setting-slider-container">
          <input
            type="range"
            min="1"
            max="100"
            value={settings.controls?.mouseSensitivity || 50}
            onChange={(e) => handleSettingChange('controls', 'mouseSensitivity', parseInt(e.target.value))}
            className="setting-slider"
          />
          <span className="setting-value">{settings.controls?.mouseSensitivity || 50}%</span>
        </div>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.controls?.invertY ?? false}
            onChange={(e) => handleSettingChange('controls', 'invertY', e.target.checked)}
          />
          <span className="checkmark"></span>
          Invert Y-Axis
        </label>
      </div>

      <div className="key-bindings">
        <h4>Key Bindings</h4>
        {Object.entries(settings.controls?.keyBindings || {
          forward: 'KeyW',
          backward: 'KeyS',
          left: 'KeyA',
          right: 'KeyD',
          brake: 'Space',
          pause: 'Escape',
          camera: 'KeyC'
        }).map(([action, key]) => (
          <div key={action} className="key-binding-row">
            <span className="action-name">{action.charAt(0).toUpperCase() + action.slice(1)}</span>
            <button 
              className="key-button"
              onClick={() => {
                // Key binding functionality would be implemented here
                console.log(`Rebinding ${action}`);
              }}
            >
              {key.replace('Key', '').replace('Space', 'Space').replace('Escape', 'ESC')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGameplayTab = () => (
    <div className="settings-tab-content">
      <div className="setting-group">
        <label className="setting-label" htmlFor="difficulty">Difficulty</label>
        <select 
          id="difficulty"
          value={settings.gameplay?.difficulty || 'normal'}
          onChange={(e) => handleSettingChange('gameplay', 'difficulty', e.target.value)}
          className="setting-select"
        >
          <option value="easy">Easy</option>
          <option value="normal">Normal</option>
          <option value="hard">Hard</option>
          <option value="nightmare">Nightmare</option>
        </select>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.gameplay?.showHUD ?? true}
            onChange={(e) => handleSettingChange('gameplay', 'showHUD', e.target.checked)}
          />
          <span className="checkmark"></span>
          Show HUD
        </label>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.gameplay?.showMinimap ?? true}
            onChange={(e) => handleSettingChange('gameplay', 'showMinimap', e.target.checked)}
          />
          <span className="checkmark"></span>
          Show Minimap
        </label>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.gameplay?.autoSave ?? true}
            onChange={(e) => handleSettingChange('gameplay', 'autoSave', e.target.checked)}
          />
          <span className="checkmark"></span>
          Auto-Save
        </label>
      </div>

      <div className="setting-group checkbox-group">
        <label className="setting-checkbox">
          <input
            type="checkbox"
            checked={settings.gameplay?.tutorials ?? true}
            onChange={(e) => handleSettingChange('gameplay', 'tutorials', e.target.checked)}
          />
          <span className="checkmark"></span>
          Show Tutorials
        </label>
      </div>
    </div>
  );

  return (
    <div className="settings-menu-overlay">
      <div className="settings-menu-background" onClick={onClose} />
      
      <div className="settings-menu">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={`tab-button ${activeTab === 'graphics' ? 'active' : ''}`}
            onClick={() => setActiveTab('graphics')}
          >
            🎨 Graphics
          </button>
          <button 
            className={`tab-button ${activeTab === 'audio' ? 'active' : ''}`}
            onClick={() => setActiveTab('audio')}
          >
            🔊 Audio
          </button>
          <button 
            className={`tab-button ${activeTab === 'controls' ? 'active' : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            🎮 Controls
          </button>
          <button 
            className={`tab-button ${activeTab === 'gameplay' ? 'active' : ''}`}
            onClick={() => setActiveTab('gameplay')}
          >
            ⚡ Gameplay
          </button>
        </div>
        
        <div className="settings-content">
          {activeTab === 'graphics' && renderGraphicsTab()}
          {activeTab === 'audio' && renderAudioTab()}
          {activeTab === 'controls' && renderControlsTab()}
          {activeTab === 'gameplay' && renderGameplayTab()}
        </div>
        
        <div className="settings-footer">
          <button 
            className="settings-button secondary"
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
          <div className="footer-right">
            <button 
              className="settings-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className={`settings-button primary ${hasChanges ? 'has-changes' : ''}`}
              onClick={handleSave}
              disabled={!hasChanges}
            >
              {hasChanges ? 'Save Changes' : 'Saved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;