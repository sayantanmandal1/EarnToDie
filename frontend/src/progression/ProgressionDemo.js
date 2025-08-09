import ProgressionManager from './ProgressionManager.js'
import ZombieCarSaveManager from '../save/ZombieCarSaveManager.js'

/**
 * Demo class to showcase the Distance-Based Progression and Currency System
 */
class ProgressionDemo {
  constructor() {
    this.saveManager = new ZombieCarSaveManager()
    this.progressionManager = new ProgressionManager(this.saveManager)
    
    // Demo state
    this.isRunning = false
    this.vehicle = {
      type: 'STARTER_CAR',
      upgrades: { engine: 1, fuel: 0, armor: 0, weapon: 0 },
      fuel: 100,
      health: 100,
      maxFuel: 100,
      maxHealth: 100
    }
    
    this.position = { x: 0, y: 0 }
    this.speed = 2 // pixels per update
    
    // Bind methods
    this.update = this.update.bind(this)
    this.startRun = this.startRun.bind(this)
    this.endRun = this.endRun.bind(this)
    this.reset = this.reset.bind(this)
    
    // Set up event listeners
    this.setupEventListeners()
  }

  /**
   * Set up event listeners for progression events
   */
  setupEventListeners() {
    // Listen for milestone events
    this.progressionManager.addEventListener('milestone_reached', (event) => {
      console.log(`🎯 Milestone reached: ${event.detail.distance}m - Bonus: $${event.detail.bonus}`)
      this.updateDisplay()
    })

    // Listen for run end events
    this.progressionManager.addEventListener('run_ended', (event) => {
      console.log(`🏁 Run ended: ${event.detail.endReason}`)
      console.log(`Distance: ${event.detail.distance}m, Money earned: $${event.detail.totalMoney}`)
      this.updateDisplay()
    })

    // Listen for currency events
    this.progressionManager.getCurrencySystem().addEventListener('money_added', (event) => {
      console.log(`💰 Money added: $${event.detail.amount} (${event.detail.source})`)
    })
  }

  /**
   * Start a new run
   */
  startRun() {
    if (this.isRunning) return

    // Reset vehicle state
    this.vehicle.fuel = this.vehicle.maxFuel
    this.vehicle.health = this.vehicle.maxHealth
    this.position = { x: 0, y: 0 }

    // Start progression tracking
    this.progressionManager.startRun(this.position, this.vehicle)
    this.isRunning = true

    console.log('🚗 Starting new run!')
    this.updateDisplay()

    // Start the update loop
    this.updateLoop()
  }

  /**
   * End the current run
   */
  endRun(reason = 'manual_end') {
    if (!this.isRunning) return

    this.isRunning = false
    const results = this.progressionManager.endRun(reason)
    
    if (results) {
      console.log(`Run Results:`, results)
    }
    
    this.updateDisplay()
  }

  /**
   * Update loop for the demo
   */
  updateLoop() {
    if (!this.isRunning) return

    this.update()
    
    // Continue loop
    setTimeout(() => this.updateLoop(), 50) // 20 FPS
  }

  /**
   * Update the demo state
   */
  update() {
    if (!this.isRunning) return

    // Move vehicle forward
    this.position.x += this.speed

    // Consume fuel (1 fuel per 10 distance units)
    this.vehicle.fuel -= this.speed / 10

    // Random chance of taking damage
    if (Math.random() < 0.001) {
      this.vehicle.health -= Math.random() * 10
      console.log(`💥 Vehicle took damage! Health: ${Math.floor(this.vehicle.health)}`)
    }

    // Update progression
    this.progressionManager.updateProgress(this.position, this.vehicle)

    // Update display periodically
    if (Math.floor(this.position.x) % 100 === 0) {
      this.updateDisplay()
    }
  }

  /**
   * Reset all progression data
   */
  reset() {
    this.endRun('manual_end')
    this.progressionManager.reset()
    console.log('🔄 Progression data reset!')
    this.updateDisplay()
  }

  /**
   * Simulate spending money on upgrades
   */
  buyUpgrade(type, cost) {
    const currencySystem = this.progressionManager.getCurrencySystem()
    
    if (currencySystem.canAfford(cost)) {
      const success = currencySystem.spendMoney(cost, `${type}_upgrade`)
      if (success) {
        this.vehicle.upgrades[type] = (this.vehicle.upgrades[type] || 0) + 1
        console.log(`⬆️ Upgraded ${type} to level ${this.vehicle.upgrades[type]}`)
        this.updateDisplay()
        return true
      }
    } else {
      console.log(`❌ Cannot afford ${type} upgrade ($${cost})`)
    }
    return false
  }

  /**
   * Update the display with current stats
   */
  updateDisplay() {
    const stats = this.progressionManager.getProgressionStats()
    const currentRun = this.progressionManager.getCurrentRunStats()
    const recentRuns = this.progressionManager.getRecentRuns(3)

    console.log('\n📊 PROGRESSION STATS:')
    console.log(`Money: $${stats.currentMoney}`)
    console.log(`Total Distance: ${stats.totalDistance}m`)
    console.log(`Best Distance: ${stats.bestDistance}m`)
    console.log(`Total Runs: ${stats.totalRuns}`)
    console.log(`Average Distance: ${Math.floor(stats.averageDistance)}m`)

    if (currentRun) {
      console.log('\n🏃 CURRENT RUN:')
      console.log(`Distance: ${currentRun.distance}m`)
      console.log(`Fuel: ${Math.floor(this.vehicle.fuel)}/${this.vehicle.maxFuel}`)
      console.log(`Health: ${Math.floor(this.vehicle.health)}/${this.vehicle.maxHealth}`)
      console.log(`Milestones: ${currentRun.milestones.length}`)
    }

    if (recentRuns.length > 0) {
      console.log('\n📈 RECENT RUNS:')
      recentRuns.forEach((run, index) => {
        console.log(`${index + 1}. ${run.distance}m (${run.endReason}) - $${run.totalMoney}`)
      })
    }

    console.log('\n🔧 VEHICLE UPGRADES:')
    Object.entries(this.vehicle.upgrades).forEach(([type, level]) => {
      console.log(`${type}: Level ${level}`)
    })
    console.log('---')
  }

  /**
   * Get current progression manager instance
   */
  getProgressionManager() {
    return this.progressionManager
  }

  /**
   * Get current vehicle state
   */
  getVehicle() {
    return this.vehicle
  }

  /**
   * Get current position
   */
  getPosition() {
    return this.position
  }
}

export default ProgressionDemo