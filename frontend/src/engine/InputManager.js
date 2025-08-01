/**
 * Input manager for handling keyboard and mouse controls
 */
export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Key states
    this.keys = {};
    this.keysPressed = {};
    this.keysReleased = {};
    
    // Mouse states
    this.mouse = {
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: 0,
      buttons: {},
      buttonsPressed: {},
      buttonsReleased: {},
      wheel: 0
    };
    
    // Touch states (for mobile support)
    this.touches = [];
    
    // Event listeners
    this.boundHandlers = {};
    
    // Input configuration
    this.keyMap = {
      // Movement keys
      FORWARD: ['KeyW', 'ArrowUp'],
      BACKWARD: ['KeyS', 'ArrowDown'],
      LEFT: ['KeyA', 'ArrowLeft'],
      RIGHT: ['KeyD', 'ArrowRight'],
      
      // Action keys
      BRAKE: ['Space'],
      BOOST: ['ShiftLeft', 'ShiftRight'],
      HORN: ['KeyH'],
      
      // UI keys
      PAUSE: ['Escape'],
      MENU: ['Tab'],
      
      // Debug keys
      DEBUG: ['F1'],
      RESET: ['KeyR']
    };
  }

  /**
   * Initialize input event listeners
   */
  initialize() {
    this._setupKeyboardListeners();
    this._setupMouseListeners();
    this._setupTouchListeners();
    this._setupContextMenu();
    
    console.log('InputManager initialized');
  }

  /**
   * Update input states (call once per frame)
   */
  update() {
    // Clear frame-specific states
    this.keysPressed = {};
    this.keysReleased = {};
    this.mouse.buttonsPressed = {};
    this.mouse.buttonsReleased = {};
    this.mouse.deltaX = 0;
    this.mouse.deltaY = 0;
    this.mouse.wheel = 0;
  }

  /**
   * Check if a key is currently held down
   */
  isKeyDown(action) {
    const codes = this.keyMap[action];
    if (!codes) return false;
    
    return codes.some(code => this.keys[code]);
  }

  /**
   * Check if a key was just pressed this frame
   */
  isKeyPressed(action) {
    const codes = this.keyMap[action];
    if (!codes) return false;
    
    return codes.some(code => this.keysPressed[code]);
  }

  /**
   * Check if a key was just released this frame
   */
  isKeyReleased(action) {
    const codes = this.keyMap[action];
    if (!codes) return false;
    
    return codes.some(code => this.keysReleased[code]);
  }

  /**
   * Check if a mouse button is currently held down
   */
  isMouseDown(button = 0) {
    return this.mouse.buttons[button] || false;
  }

  /**
   * Check if a mouse button was just pressed this frame
   */
  isMousePressed(button = 0) {
    return this.mouse.buttonsPressed[button] || false;
  }

  /**
   * Check if a mouse button was just released this frame
   */
  isMouseReleased(button = 0) {
    return this.mouse.buttonsReleased[button] || false;
  }

  /**
   * Get normalized mouse position (-1 to 1)
   */
  getMousePosition() {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (this.mouse.x / rect.width) * 2 - 1,
      y: -(this.mouse.y / rect.height) * 2 + 1
    };
  }

  /**
   * Get mouse movement delta
   */
  getMouseDelta() {
    return {
      x: this.mouse.deltaX,
      y: this.mouse.deltaY
    };
  }

  /**
   * Get mouse wheel delta
   */
  getWheelDelta() {
    return this.mouse.wheel;
  }

  /**
   * Get movement input as normalized vector
   */
  getMovementInput() {
    const input = { x: 0, y: 0 };
    
    if (this.isKeyDown('LEFT')) input.x -= 1;
    if (this.isKeyDown('RIGHT')) input.x += 1;
    if (this.isKeyDown('FORWARD')) input.y += 1;
    if (this.isKeyDown('BACKWARD')) input.y -= 1;
    
    // Normalize diagonal movement
    const length = Math.sqrt(input.x * input.x + input.y * input.y);
    if (length > 1) {
      input.x /= length;
      input.y /= length;
    }
    
    return input;
  }

  /**
   * Check if brake is pressed
   */
  isBraking() {
    return this.isKeyDown('BRAKE');
  }

  /**
   * Check if boost is pressed
   */
  isBoosting() {
    return this.isKeyDown('BOOST');
  }

  /**
   * Dispose of event listeners
   */
  dispose() {
    this._removeKeyboardListeners();
    this._removeMouseListeners();
    this._removeTouchListeners();
    
    console.log('InputManager disposed');
  }

  /**
   * Setup keyboard event listeners
   */
  _setupKeyboardListeners() {
    this.boundHandlers.keydown = this._onKeyDown.bind(this);
    this.boundHandlers.keyup = this._onKeyUp.bind(this);
    
    document.addEventListener('keydown', this.boundHandlers.keydown);
    document.addEventListener('keyup', this.boundHandlers.keyup);
  }

  /**
   * Setup mouse event listeners
   */
  _setupMouseListeners() {
    this.boundHandlers.mousedown = this._onMouseDown.bind(this);
    this.boundHandlers.mouseup = this._onMouseUp.bind(this);
    this.boundHandlers.mousemove = this._onMouseMove.bind(this);
    this.boundHandlers.wheel = this._onWheel.bind(this);
    this.boundHandlers.contextmenu = this._onContextMenu.bind(this);
    
    this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
  }

  /**
   * Setup touch event listeners for mobile support
   */
  _setupTouchListeners() {
    this.boundHandlers.touchstart = this._onTouchStart.bind(this);
    this.boundHandlers.touchend = this._onTouchEnd.bind(this);
    this.boundHandlers.touchmove = this._onTouchMove.bind(this);
    
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchstart);
    this.canvas.addEventListener('touchend', this.boundHandlers.touchend);
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchmove);
  }

  /**
   * Setup context menu prevention
   */
  _setupContextMenu() {
    this.canvas.addEventListener('contextmenu', this._onContextMenu.bind(this));
  }

  /**
   * Handle keydown events
   */
  _onKeyDown(event) {
    const code = event.code;
    
    if (!this.keys[code]) {
      this.keysPressed[code] = true;
    }
    this.keys[code] = true;
    
    // Prevent default for game keys
    if (this._isGameKey(code)) {
      event.preventDefault();
    }
  }

  /**
   * Handle keyup events
   */
  _onKeyUp(event) {
    const code = event.code;
    
    this.keys[code] = false;
    this.keysReleased[code] = true;
    
    // Prevent default for game keys
    if (this._isGameKey(code)) {
      event.preventDefault();
    }
  }

  /**
   * Handle mousedown events
   */
  _onMouseDown(event) {
    const button = event.button;
    
    if (!this.mouse.buttons[button]) {
      this.mouse.buttonsPressed[button] = true;
    }
    this.mouse.buttons[button] = true;
    
    event.preventDefault();
  }

  /**
   * Handle mouseup events
   */
  _onMouseUp(event) {
    const button = event.button;
    
    this.mouse.buttons[button] = false;
    this.mouse.buttonsReleased[button] = true;
    
    event.preventDefault();
  }

  /**
   * Handle mousemove events
   */
  _onMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const newX = event.clientX - rect.left;
    const newY = event.clientY - rect.top;
    
    this.mouse.deltaX = newX - this.mouse.x;
    this.mouse.deltaY = newY - this.mouse.y;
    this.mouse.x = newX;
    this.mouse.y = newY;
  }

  /**
   * Handle wheel events
   */
  _onWheel(event) {
    this.mouse.wheel = event.deltaY;
    event.preventDefault();
  }

  /**
   * Handle touch start events
   */
  _onTouchStart(event) {
    this.touches = Array.from(event.touches);
    event.preventDefault();
  }

  /**
   * Handle touch end events
   */
  _onTouchEnd(event) {
    this.touches = Array.from(event.touches);
    event.preventDefault();
  }

  /**
   * Handle touch move events
   */
  _onTouchMove(event) {
    this.touches = Array.from(event.touches);
    event.preventDefault();
  }

  /**
   * Handle context menu events
   */
  _onContextMenu(event) {
    event.preventDefault();
  }

  /**
   * Check if a key code is used for game controls
   */
  _isGameKey(code) {
    return Object.values(this.keyMap).some(codes => codes.includes(code));
  }

  /**
   * Remove keyboard event listeners
   */
  _removeKeyboardListeners() {
    if (this.boundHandlers.keydown) {
      document.removeEventListener('keydown', this.boundHandlers.keydown);
    }
    if (this.boundHandlers.keyup) {
      document.removeEventListener('keyup', this.boundHandlers.keyup);
    }
  }

  /**
   * Remove mouse event listeners
   */
  _removeMouseListeners() {
    if (this.boundHandlers.mousedown) {
      this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
    }
    if (this.boundHandlers.mouseup) {
      this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
    }
    if (this.boundHandlers.mousemove) {
      this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
    }
    if (this.boundHandlers.wheel) {
      this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    }
    if (this.boundHandlers.contextmenu) {
      this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
    }
  }

  /**
   * Remove touch event listeners
   */
  _removeTouchListeners() {
    if (this.boundHandlers.touchstart) {
      this.canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
    }
    if (this.boundHandlers.touchend) {
      this.canvas.removeEventListener('touchend', this.boundHandlers.touchend);
    }
    if (this.boundHandlers.touchmove) {
      this.canvas.removeEventListener('touchmove', this.boundHandlers.touchmove);
    }
  }
}