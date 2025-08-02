const fs = require('fs');
const path = require('path');

// List of all audio files needed based on the error logs
const audioFiles = {
  effects: [
    'engine_start.mp3',
    'engine_idle.mp3', 
    'engine_rev.mp3',
    'tire_screech.mp3',
    'brake_squeal.mp3',
    'zombie_hit_soft.mp3',
    'zombie_hit_hard.mp3',
    'zombie_splat.mp3',
    'metal_impact.mp3',
    'glass_break.mp3',
    'explosion_small.mp3',
    'explosion_large.mp3',
    'zombie_groan.mp3',
    'zombie_scream.mp3',
    'zombie_death.mp3',
    'button_click.mp3',
    'button_hover.mp3',
    'purchase_success.mp3',
    'purchase_fail.mp3',
    'level_complete.mp3',
    'game_over.mp3',
    'wind.mp3',
    'debris.mp3',
    'checkpoint.mp3'
  ],
  music: [
    'menu_theme.mp3',
    'gameplay_calm.mp3',
    'gameplay_intense.mp3',
    'garage_theme.mp3'
  ]
};

// Create directories if they don't exist
const publicDir = path.join(__dirname, 'public');
const audioDir = path.join(publicDir, 'audio');
const effectsDir = path.join(audioDir, 'effects');
const musicDir = path.join(audioDir, 'music');

[audioDir, effectsDir, musicDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create empty placeholder files
Object.entries(audioFiles).forEach(([category, files]) => {
  const categoryDir = path.join(audioDir, category);
  
  files.forEach(filename => {
    const filePath = path.join(categoryDir, filename);
    if (!fs.existsSync(filePath)) {
      // Create an empty file
      fs.writeFileSync(filePath, '');
      console.log(`Created placeholder: ${filePath}`);
    }
  });
});

console.log('Audio placeholder files created successfully!');