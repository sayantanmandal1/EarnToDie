# Professional Audio Asset Sourcing Guide

## Overview

This document provides comprehensive guidelines for sourcing, acquiring, and integrating high-quality audio assets for the Zombie Car Game. The audio system is designed to support professional-grade audio with specific technical requirements and quality standards.

## Audio Categories and Requirements

### 1. Engine Audio Assets

#### V8 Engine Sounds
- **Startup Sequences**
  - Cold start (3-4 seconds)
  - Warm start (2-3 seconds)
  - Format: 44.1kHz, 16-bit, Stereo
  - Bitrate: 192 kbps minimum
  - Dynamic range: High (minimal compression)

- **Idle Loops**
  - RPM range: 800-1200 RPM
  - Duration: 5-10 seconds (seamless loop)
  - Variations: Normal, rough idle, smooth idle
  - Format: 44.1kHz, 16-bit, Stereo

- **Rev Sequences**
  - Low RPM: 1200-3000 RPM (2-3 seconds)
  - Mid RPM: 3000-5000 RPM (2-3 seconds)
  - High RPM: 5000-7000 RPM (2-4 seconds)
  - Redline: 7000+ RPM (1-2 seconds)

#### V6 Engine Sounds
- Similar structure to V8 but with characteristic V6 sound
- Slightly higher pitch and different harmonic content
- RPM ranges: 750-6500 RPM

#### Diesel Engine Sounds
- Characteristic diesel knock and rumble
- Lower RPM ranges: 600-4000 RPM
- Turbo whistle and blow-off sounds
- Longer startup sequences (4-5 seconds)

#### Transmission and Mechanical
- Manual gear shifts (up/down)
- Automatic transmission shifts
- Clutch engagement/disengagement
- Turbocharger whistle and blow-off
- Supercharger whine

### 2. Impact and Collision Audio

#### Vehicle Collision Sounds
- **Light Impacts**
  - Metal deformation and creaking
  - Duration: 0.5-1.5 seconds
  - Multiple variations for different materials

- **Heavy Impacts**
  - Metal crushing and tearing
  - Glass shattering (windshield, side windows)
  - Duration: 1-3 seconds
  - High dynamic range for impact intensity

- **Tire and Brake Sounds**
  - Tire screeching on different surfaces (asphalt, concrete, gravel)
  - Brake squealing and grinding
  - Tire blowouts and deflation

#### Zombie Impact Sounds
- **Soft Impacts** (low speed collisions)
  - Flesh impact with minimal bone involvement
  - Duration: 0.3-0.8 seconds
  - Gore level: Low to medium

- **Hard Impacts** (high speed collisions)
  - Bone cracking and breaking
  - Flesh tearing and splattering
  - Duration: 0.5-1.5 seconds
  - Gore level: Medium to high

### 3. Zombie Audio Assets

#### Vocalizations
- **Groans and Moans**
  - Low-frequency, menacing groans
  - Variations: Distant, close, aggressive
  - Duration: 2-5 seconds each
  - Multiple pitch variations

- **Attack Sounds**
  - Aggressive growls and snarls
  - Attack screams and roars
  - Duration: 1-3 seconds
  - High intensity and urgency

- **Death Sounds**
  - Final death rattles
  - Gurgling and choking sounds
  - Duration: 2-4 seconds
  - Satisfying conclusion sounds

#### Movement Audio
- **Footsteps**
  - Shambling walk (slow, dragging)
  - Running footsteps (fast zombies)
  - Different surface materials
  - Loopable sequences

- **Ambient Horde Sounds**
  - Distant zombie crowds
  - Multiple overlapping voices
  - Duration: 10-30 seconds (loopable)
  - Spatial positioning capability

### 4. Music and Orchestral Assets

#### Main Menu Music
- **Orchestral Theme**
  - Epic, cinematic orchestration
  - Full orchestra with emphasis on strings and brass
  - Duration: 3-4 minutes (loopable)
  - Key: Minor key for dark atmosphere
  - Tempo: 80-100 BPM

- **Electronic Alternative**
  - Dark electronic/industrial theme
  - Synthesizers, electronic drums, processed sounds
  - Duration: 3-5 minutes (loopable)
  - Complementary to orchestral theme

#### Gameplay Music
- **Calm Exploration**
  - Ambient orchestral or electronic
  - Low intensity, atmospheric
  - Duration: 4-6 minutes (loopable)
  - Adaptive layers for dynamic intensity

- **Building Tension**
  - Gradually increasing intensity
  - Dissonant harmonies and rhythmic complexity
  - Duration: 3-4 minutes
  - Smooth transitions to action music

- **High-Intensity Action**
  - Fast-paced, driving rhythm
  - Hybrid orchestral/electronic
  - Duration: 3-5 minutes (loopable)
  - Multiple intensity layers

- **Horror Ambient**
  - Atmospheric soundscapes
  - Minimal melodic content
  - Emphasis on texture and atmosphere
  - Duration: 5-10 minutes (loopable)

#### Special Moment Music
- **Victory Fanfare**
  - Triumphant orchestral sting
  - Duration: 10-20 seconds
  - Major key resolution

- **Game Over Sting**
  - Dramatic, final-sounding
  - Duration: 5-10 seconds
  - Minor key, descending motion

### 5. User Interface Audio

#### Button and Menu Sounds
- **Click Sounds**
  - Clean, satisfying click
  - Duration: 0.1-0.3 seconds
  - Multiple variations to avoid repetition

- **Hover Sounds**
  - Subtle audio feedback
  - Duration: 0.05-0.15 seconds
  - Non-intrusive

- **Transition Sounds**
  - Menu whooshes and sweeps
  - Duration: 0.5-1.5 seconds
  - Smooth, professional

#### Notification Sounds
- **Achievement Unlocked**
  - Positive, rewarding sound
  - Duration: 1-2 seconds
  - Memorable and satisfying

- **Error/Invalid Action**
  - Clear negative feedback
  - Duration: 0.3-0.8 seconds
  - Not harsh or annoying

### 6. Environmental Audio

#### Weather and Atmosphere
- **Wind**
  - Light breeze to heavy gusts
  - Duration: 20-60 seconds (loopable)
  - Spatial positioning for direction

- **Rain**
  - Light drizzle to heavy downpour
  - Surface impact variations
  - Duration: 30-120 seconds (loopable)

- **Thunder**
  - Distant rumbles to close cracks
  - Duration: 2-8 seconds
  - High dynamic range

#### Destruction and Explosions
- **Small Explosions**
  - Vehicle fires, small debris
  - Duration: 1-3 seconds
  - Sharp attack, long decay

- **Large Explosions**
  - Building collapses, major destruction
  - Duration: 3-8 seconds
  - Full frequency spectrum

## Technical Specifications

### Audio Format Requirements
- **Sample Rate**: 44.1 kHz (minimum), 48 kHz (preferred)
- **Bit Depth**: 16-bit (minimum), 24-bit (preferred for source)
- **Channels**: Mono for effects, Stereo for music and ambience
- **File Format**: WAV (source), MP3 (delivery, 192+ kbps)
- **Dynamic Range**: Minimal compression, preserve natural dynamics

### Quality Standards
- **Signal-to-Noise Ratio**: 90+ dB
- **Frequency Response**: 20 Hz - 20 kHz (±3 dB)
- **THD+N**: <0.1% @ 1 kHz
- **Peak Levels**: -6 dBFS maximum (leave headroom)
- **RMS Levels**: Vary by content type (see mixing guidelines)

### Mixing Guidelines
- **Engine Sounds**: -12 to -18 dBFS RMS
- **Impact Sounds**: -6 to -12 dBFS RMS (high transients)
- **Zombie Vocals**: -15 to -20 dBFS RMS
- **Music**: -16 to -20 dBFS RMS (with -6 dBFS peaks)
- **UI Sounds**: -20 to -25 dBFS RMS

## Sourcing Recommendations

### Professional Audio Libraries
1. **Boom Library** - High-quality vehicle and impact sounds
2. **Zapsplat** - Comprehensive sound effects library
3. **AudioJungle** - Music and sound effects marketplace
4. **Freesound.org** - Creative Commons audio resources
5. **BBC Sound Effects Library** - Professional broadcast quality

### Recording Requirements
If recording custom audio:
- **Equipment**: Professional microphones and preamps
- **Environment**: Controlled acoustic environment
- **Processing**: Minimal processing, preserve natural character
- **Documentation**: Detailed metadata and source information

### Licensing Considerations
- **Commercial Use**: Ensure all assets are cleared for commercial use
- **Attribution**: Track attribution requirements
- **Exclusivity**: Consider exclusive licensing for key assets
- **Territory**: Ensure worldwide licensing rights

## Integration Workflow

### Asset Preparation
1. **Quality Check**: Verify technical specifications
2. **Normalization**: Consistent levels within categories
3. **Metadata**: Add comprehensive metadata tags
4. **Naming Convention**: Follow project naming standards
5. **Format Conversion**: Create delivery formats

### Implementation Process
1. **Asset Import**: Import into asset management system
2. **Integration Testing**: Verify playback and quality
3. **Performance Testing**: Check memory usage and loading times
4. **Quality Assurance**: Full audio system testing
5. **Optimization**: Compress and optimize for delivery

### Version Control
- **Source Files**: Maintain high-quality source versions
- **Delivery Files**: Optimized versions for game integration
- **Backup**: Multiple backup copies of all assets
- **Documentation**: Change logs and version history

## Quality Assurance Checklist

### Technical QA
- [ ] All files meet technical specifications
- [ ] No clipping or digital artifacts
- [ ] Consistent levels within categories
- [ ] Proper file naming and organization
- [ ] Metadata complete and accurate

### Creative QA
- [ ] Audio matches game aesthetic and mood
- [ ] Seamless loops where required
- [ ] Appropriate dynamic range and impact
- [ ] No repetitive or annoying elements
- [ ] Professional production quality

### Integration QA
- [ ] All assets load correctly in game
- [ ] No performance issues or memory leaks
- [ ] Proper spatial positioning and 3D audio
- [ ] Correct triggering and timing
- [ ] Cross-platform compatibility

## Maintenance and Updates

### Regular Reviews
- **Monthly**: Review asset performance and usage
- **Quarterly**: Update and refresh overused assets
- **Annually**: Complete audio system overhaul review

### Asset Lifecycle
- **Addition**: Process for adding new assets
- **Modification**: Updating existing assets
- **Retirement**: Removing outdated or unused assets
- **Archival**: Long-term storage of source materials

---

*This guide should be updated regularly as the project evolves and new requirements emerge. All team members involved in audio production should be familiar with these guidelines.*