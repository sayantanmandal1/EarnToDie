# EarnToDie - Zombie Car Game

A modern, browser-based zombie apocalypse car game inspired by "Earn to Die" with enhanced features and professional production quality. Drive through zombie-infested terrain, earn points by eliminating zombies, and upgrade your vehicles to survive increasingly challenging levels.

![Game Screenshot](https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Zombie+Car+Game)

## 🎮 Game Features

### 🚗 Vehicle System
- **12+ Unique Vehicles** - From family sedans to monster trucks and tanks
- **Comprehensive Upgrade System** - Engine, armor, weapons, fuel, and tire upgrades
- **Visual Upgrade Effects** - See your improvements with dynamic visual changes
- **Realistic Physics** - Cannon.js powered vehicle physics and handling

### 🧟 Zombie Variety
- **20+ Zombie Types** - Walkers, runners, spitters, bosses, and special variants
- **Advanced AI Behaviors** - Pack hunting, stealth, rage modes, and special abilities
- **Boss Encounters** - Epic boss zombies with unique mechanics and rewards
- **Dynamic Spawning** - Intelligent spawn system with difficulty scaling

### 🏆 Progression System
- **Scoring & Currency** - Earn points and convert to currency for upgrades
- **Achievement System** - Unlock achievements for special accomplishments
- **Level Progression** - Multiple levels with increasing difficulty
- **Save System** - Local storage with cloud synchronization

### 🎵 Audio & Visuals
- **Spatial Audio** - 3D positioned sounds using Web Audio API
- **Dynamic Music** - Intensity-based background music system
- **Particle Effects** - Explosions, impacts, and environmental effects
- **Performance Optimization** - Automatic quality adjustment for smooth gameplay

### ⚙️ Technical Features
- **Modern Web Technologies** - Three.js, React, and WebGL
- **Performance Management** - LOD system, object pooling, and quality settings
- **Error Handling** - Graceful degradation and crash recovery
- **Cross-Browser Support** - Works on Chrome, Firefox, Safari, and Edge

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Modern web browser with WebGL support
- 4GB RAM minimum
- 2GB disk space

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/EarnToDie.git
   cd EarnToDie
   ```

2. **Start the game:**
   ```bash
   chmod +x scripts/final-deployment.sh
   ./scripts/final-deployment.sh
   cd deployment
   ./start.sh
   ```

3. **Play the game:**
   - Open your browser to http://localhost:3000
   - API available at http://localhost:8080
   - Monitoring dashboard at http://localhost:3001

### Development Setup

1. **Frontend Development:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

2. **Backend Development:**
   ```bash
   cd backend
   go mod tidy
   go run main.go
   ```

3. **Database Setup:**
   ```bash
   docker-compose up postgres redis -d
   ```

## 🎯 How to Play

1. **Select Your Vehicle** - Choose from 12+ unique vehicles in the garage
2. **Upgrade Your Ride** - Spend currency on engine, armor, weapons, fuel, and tire upgrades
3. **Choose a Level** - Select from multiple challenging levels
4. **Drive and Survive** - Navigate through zombie hordes while earning points
5. **Upgrade and Repeat** - Use earned currency to improve your vehicle for harder levels

### Controls
- **W/↑** - Accelerate
- **S/↓** - Brake/Reverse
- **A/←** - Turn Left
- **D/→** - Turn Right
- **Space** - Handbrake
- **P** - Pause Game
- **M** - Toggle Music

## 🏗️ Architecture

### Frontend (React + Three.js)
```
src/
├── engine/          # Game engine and core systems
├── vehicles/        # Vehicle management and physics
├── zombies/         # Zombie AI and behavior systems
├── combat/          # Collision detection and damage
├── scoring/         # Points, currency, and achievements
├── levels/          # Level management and terrain
├── audio/           # Spatial audio and sound effects
├── components/      # React UI components
├── save/            # Save system and cloud sync
├── performance/     # Optimization and quality settings
└── error/           # Error handling and recovery
```

### Backend (Go)
```
backend/
├── internal/
│   ├── api/         # HTTP API endpoints
│   ├── database/    # Database connection and models
│   ├── services/    # Business logic services
│   └── middleware/  # Authentication and validation
├── migrations/      # Database schema migrations
└── main.go         # Application entry point
```

### Infrastructure
- **PostgreSQL** - Player data and game state
- **Redis** - Session management and caching
- **Docker** - Containerized deployment
- **Nginx** - Static file serving and reverse proxy
- **Grafana/Prometheus** - Monitoring and metrics

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd backend
go test ./...

# Run integration tests
./scripts/run-tests.sh
```

### Test Coverage
- **Scoring System** - ✅ Complete (89/89 tests passing)
- **Vehicle System** - ✅ Core functionality tested
- **Save System** - ✅ Local storage and API integration
- **Audio System** - ✅ Spatial audio and effects
- **Performance** - ⚠️ Device detection and optimization
- **Integration** - ⚠️ End-to-end workflows

See [TEST_SUMMARY.md](frontend/TEST_SUMMARY.md) for detailed test results.

## 📊 Performance

The game is optimized for various device capabilities:

- **High-End Devices** - Ultra quality with all effects enabled
- **Mid-Range Devices** - High quality with selective optimizations
- **Low-End Devices** - Automatic quality reduction for smooth gameplay
- **Mobile Devices** - Touch controls and battery optimization

### Performance Features
- **Level-of-Detail (LOD)** - Reduces polygon count for distant objects
- **Object Pooling** - Reuses zombie and particle objects
- **Frustum Culling** - Only renders objects in camera view
- **Texture Optimization** - Compressed textures and atlasing
- **Dynamic Quality** - Automatic adjustment based on frame rate

## 🔧 Configuration

### Environment Variables
```bash
# Frontend (.env)
REACT_APP_API_URL=http://localhost:8080
REACT_APP_ENVIRONMENT=development

# Backend (.env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zombie_game
DB_USER=gameuser
DB_PASSWORD=gamepass
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

### Game Settings
- **Graphics Quality** - Ultra, High, Medium, Low, Potato
- **Audio Settings** - Master, Effects, Music volume controls
- **Control Mapping** - Customizable key bindings
- **Performance** - FPS limit, VSync, quality presets

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- **Frontend** - ESLint + Prettier configuration
- **Backend** - Go fmt and go vet
- **Commits** - Conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Three.js** - 3D graphics library
- **Cannon.js** - Physics engine
- **React** - UI framework
- **Go** - Backend language
- **Docker** - Containerization
- **PostgreSQL** - Database
- **Redis** - Caching

## 📞 Support

- **Issues** - [GitHub Issues](https://github.com/yourusername/EarnToDie/issues)
- **Discussions** - [GitHub Discussions](https://github.com/yourusername/EarnToDie/discussions)
- **Documentation** - [Wiki](https://github.com/yourusername/EarnToDie/wiki)

## 🗺️ Roadmap

### Version 1.1
- [ ] Multiplayer support
- [ ] Mobile app version
- [ ] Steam integration
- [ ] Workshop support for custom vehicles

### Version 1.2
- [ ] VR support
- [ ] Advanced weather system
- [ ] Procedural level generation
- [ ] Mod support

---

**Made with ❤️ by the EarnToDie Team**

*Drive fast, kill zombies, upgrade everything!* 🧟‍♂️🚗💨