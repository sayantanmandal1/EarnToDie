import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsMenu from '../SettingsMenu';

describe('SettingsMenu Component', () => {
  const mockProps = {
    isVisible: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    initialSettings: {
      graphics: {
        quality: 'high',
        shadows: true,
        particles: true,
        antialiasing: false,
        vsync: true,
        fov: 90,
        renderDistance: 1500
      },
      audio: {
        masterVolume: 75,
        effectsVolume: 80,
        musicVolume: 50,
        engineVolume: 70,
        spatialAudio: true,
        audioQuality: 'medium'
      },
      controls: {
        mouseSensitivity: 60,
        invertY: true,
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
        difficulty: 'hard',
        showHUD: true,
        showMinimap: false,
        autoSave: true,
        tutorials: false
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders settings menu when visible', () => {
    render(<SettingsMenu {...mockProps} />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('🎨 Graphics')).toBeInTheDocument();
    expect(screen.getByText('🔊 Audio')).toBeInTheDocument();
    expect(screen.getByText('🎮 Controls')).toBeInTheDocument();
    expect(screen.getByText('⚡ Gameplay')).toBeInTheDocument();
  });

  test('does not render when not visible', () => {
    const hiddenProps = { ...mockProps, isVisible: false };
    render(<SettingsMenu {...hiddenProps} />);
    
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when background is clicked', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const background = document.querySelector('.settings-menu-background');
    fireEvent.click(background);
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('switches between tabs correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Initially on graphics tab
    expect(screen.getByText('Graphics Quality')).toBeInTheDocument();
    
    // Switch to audio tab
    const audioTab = screen.getByText('🔊 Audio');
    fireEvent.click(audioTab);
    
    expect(screen.getByText('Master Volume')).toBeInTheDocument();
    expect(screen.queryByText('Graphics Quality')).not.toBeInTheDocument();
  });

  test('displays initial graphics settings correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const qualitySelect = screen.getByLabelText('Graphics Quality');
    expect(qualitySelect.value).toBe('high');
    
    const fovSlider = screen.getByDisplayValue('90');
    expect(fovSlider).toBeInTheDocument();
    
    const shadowsCheckbox = screen.getByRole('checkbox', { name: /Enable Shadows/ });
    expect(shadowsCheckbox).toBeChecked();
    
    const antialiasingCheckbox = screen.getByRole('checkbox', { name: /Anti-aliasing/ });
    expect(antialiasingCheckbox).not.toBeChecked();
  });

  test('displays initial audio settings correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Switch to audio tab
    const audioTab = screen.getByText('🔊 Audio');
    fireEvent.click(audioTab);
    
    const masterVolumeSlider = screen.getByDisplayValue('75');
    expect(masterVolumeSlider).toBeInTheDocument();
    
    const spatialAudioCheckbox = screen.getByRole('checkbox', { name: /3D Spatial Audio/ });
    expect(spatialAudioCheckbox).toBeChecked();
  });

  test('displays initial controls settings correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Switch to controls tab
    const controlsTab = screen.getByText('🎮 Controls');
    fireEvent.click(controlsTab);
    
    const sensitivitySlider = screen.getByDisplayValue('60');
    expect(sensitivitySlider).toBeInTheDocument();
    
    const invertYCheckbox = screen.getByRole('checkbox', { name: /Invert Y-Axis/ });
    expect(invertYCheckbox).toBeChecked();
    
    // Check key bindings
    expect(screen.getByText('W')).toBeInTheDocument(); // Forward key
    expect(screen.getByText('Space')).toBeInTheDocument(); // Brake key
  });

  test('displays initial gameplay settings correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Switch to gameplay tab
    const gameplayTab = screen.getByText('⚡ Gameplay');
    fireEvent.click(gameplayTab);
    
    const difficultySelect = screen.getByLabelText('Difficulty');
    expect(difficultySelect.value).toBe('hard');
    
    const hudCheckbox = screen.getByRole('checkbox', { name: /Show HUD/ });
    expect(hudCheckbox).toBeChecked();
    
    const minimapCheckbox = screen.getByRole('checkbox', { name: /Show Minimap/ });
    expect(minimapCheckbox).not.toBeChecked();
  });

  test('updates settings when controls are changed', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Change graphics quality
    const qualitySelect = screen.getByLabelText('Graphics Quality');
    fireEvent.change(qualitySelect, { target: { value: 'ultra' } });
    
    // Save button should be enabled
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
    expect(saveButton).toHaveClass('has-changes');
  });

  test('updates slider values correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const fovSlider = screen.getByDisplayValue('90');
    fireEvent.change(fovSlider, { target: { value: '100' } });
    
    expect(screen.getByText('100°')).toBeInTheDocument();
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  test('updates checkbox values correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const shadowsCheckbox = screen.getByRole('checkbox', { name: /Enable Shadows/ });
    fireEvent.click(shadowsCheckbox);
    
    expect(shadowsCheckbox).not.toBeChecked();
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  test('calls onSave with updated settings when save is clicked', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Make a change
    const qualitySelect = screen.getByLabelText('Graphics Quality');
    fireEvent.change(qualitySelect, { target: { value: 'ultra' } });
    
    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    expect(mockProps.onSave).toHaveBeenCalledTimes(1);
    
    const savedSettings = mockProps.onSave.mock.calls[0][0];
    expect(savedSettings.graphics.quality).toBe('ultra');
  });

  test('resets to default settings when reset is clicked', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Make a change first
    const qualitySelect = screen.getByLabelText('Graphics Quality');
    fireEvent.change(qualitySelect, { target: { value: 'ultra' } });
    
    // Click reset
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    // Should reset to medium (default)
    expect(qualitySelect.value).toBe('medium');
    
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  test('disables save button when no changes are made', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const saveButton = screen.getByText('Saved');
    expect(saveButton).toBeDisabled();
  });

  test('handles missing initial settings gracefully', () => {
    const noSettingsProps = { ...mockProps, initialSettings: {} };
    render(<SettingsMenu {...noSettingsProps} />);
    
    // Should render with default values
    const qualitySelect = screen.getByLabelText('Graphics Quality');
    expect(qualitySelect.value).toBe('medium'); // Default quality
    expect(screen.getByText('75°')).toBeInTheDocument(); // Default FOV
  });

  test('handles undefined initial settings', () => {
    const undefinedSettingsProps = { ...mockProps, initialSettings: undefined };
    render(<SettingsMenu {...undefinedSettingsProps} />);
    
    // Should render without crashing
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('audio tab volume sliders work correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Switch to audio tab
    const audioTab = screen.getByText('🔊 Audio');
    fireEvent.click(audioTab);
    
    const masterVolumeSlider = screen.getByDisplayValue('75');
    fireEvent.change(masterVolumeSlider, { target: { value: '90' } });
    
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  test('controls tab sensitivity slider works correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Switch to controls tab
    const controlsTab = screen.getByText('🎮 Controls');
    fireEvent.click(controlsTab);
    
    const sensitivitySlider = screen.getByDisplayValue('60');
    fireEvent.change(sensitivitySlider, { target: { value: '80' } });
    
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  test('key binding buttons are rendered correctly', () => {
    render(<SettingsMenu {...mockProps} />);
    
    // Switch to controls tab
    const controlsTab = screen.getByText('🎮 Controls');
    fireEvent.click(controlsTab);
    
    expect(screen.getByText('Key Bindings')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
    expect(screen.getByText('Backward')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('Brake')).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText('Camera')).toBeInTheDocument();
  });

  test('key binding buttons can be clicked', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    render(<SettingsMenu {...mockProps} />);
    
    // Switch to controls tab
    const controlsTab = screen.getByText('🎮 Controls');
    fireEvent.click(controlsTab);
    
    const forwardKeyButton = screen.getByText('W');
    fireEvent.click(forwardKeyButton);
    
    expect(consoleSpy).toHaveBeenCalledWith('Rebinding forward');
    
    consoleSpy.mockRestore();
  });

  test('cancel button calls onClose', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('tab buttons have correct active state', () => {
    render(<SettingsMenu {...mockProps} />);
    
    const graphicsTab = screen.getByText('🎨 Graphics');
    const audioTab = screen.getByText('🔊 Audio');
    
    // Graphics tab should be active initially
    expect(graphicsTab).toHaveClass('active');
    expect(audioTab).not.toHaveClass('active');
    
    // Click audio tab
    fireEvent.click(audioTab);
    
    expect(graphicsTab).not.toHaveClass('active');
    expect(audioTab).toHaveClass('active');
  });
});