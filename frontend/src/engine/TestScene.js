import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Test scene for demonstrating game engine functionality
 */
export class TestScene {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.testObjects = [];
    this.testCube = null;
    this.ground = null;
  }

  /**
   * Initialize the test scene
   */
  async initialize() {
    this._createGround();
    this._createTestCube();
    this._createTestSphere();
    this._setupCamera();
    
    console.log('Test scene initialized');
  }

  /**
   * Update test scene
   */
  update(deltaTime) {
    // Rotate the test cube
    if (this.testCube) {
      this.testCube.mesh.rotation.x += deltaTime;
      this.testCube.mesh.rotation.y += deltaTime * 0.5;
    }

    // Sync physics bodies with meshes
    this.testObjects.forEach(obj => {
      if (obj.mesh && obj.body) {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
      }
    });

    // Handle input for cube movement
    this._handleInput();
  }

  /**
   * Create ground plane
   */
  _createGround() {
    // Visual ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x8B4513,
      side: THREE.DoubleSide
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;

    // Physics ground
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);

    this.gameEngine.addObject(groundMesh, groundBody);
    
    this.ground = { mesh: groundMesh, body: groundBody };
  }

  /**
   * Create test cube
   */
  _createTestCube() {
    // Visual cube
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ff00,
      shininess: 100
    });
    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cubeMesh.position.set(0, 5, 0);
    cubeMesh.castShadow = true;

    // Physics cube
    const cubeShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
    const cubeBody = new CANNON.Body({ mass: 1 });
    cubeBody.addShape(cubeShape);
    cubeBody.position.set(0, 5, 0);

    this.gameEngine.addObject(cubeMesh, cubeBody);
    
    this.testCube = { mesh: cubeMesh, body: cubeBody };
    this.testObjects.push(this.testCube);
  }

  /**
   * Create test sphere
   */
  _createTestSphere() {
    // Visual sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff0000,
      shininess: 100
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.set(5, 8, 0);
    sphereMesh.castShadow = true;

    // Physics sphere
    const sphereShape = new CANNON.Sphere(1);
    const sphereBody = new CANNON.Body({ mass: 1 });
    sphereBody.addShape(sphereShape);
    sphereBody.position.set(5, 8, 0);

    this.gameEngine.addObject(sphereMesh, sphereBody);
    
    const testSphere = { mesh: sphereMesh, body: sphereBody };
    this.testObjects.push(testSphere);
  }

  /**
   * Setup camera position
   */
  _setupCamera() {
    this.gameEngine.camera.position.set(10, 10, 10);
    this.gameEngine.camera.lookAt(0, 0, 0);
  }

  /**
   * Handle input for testing
   */
  _handleInput() {
    if (!this.testCube) return;

    const input = this.gameEngine.inputManager;
    const force = new CANNON.Vec3();

    // Apply forces based on input
    if (input.isKeyDown('FORWARD')) {
      force.z -= 10;
    }
    if (input.isKeyDown('BACKWARD')) {
      force.z += 10;
    }
    if (input.isKeyDown('LEFT')) {
      force.x -= 10;
    }
    if (input.isKeyDown('RIGHT')) {
      force.x += 10;
    }

    // Apply force to cube
    if (force.length() > 0) {
      this.testCube.body.applyForce(force, this.testCube.body.position);
    }

    // Reset cube position on R key
    if (input.isKeyPressed('RESET')) {
      this.testCube.body.position.set(0, 5, 0);
      this.testCube.body.velocity.set(0, 0, 0);
      this.testCube.body.angularVelocity.set(0, 0, 0);
    }

    // Add impulse on space
    if (input.isKeyPressed('BRAKE')) {
      this.testCube.body.applyImpulse(new CANNON.Vec3(0, 10, 0), this.testCube.body.position);
    }
  }

  /**
   * Dispose of test scene
   */
  dispose() {
    this.testObjects.forEach(obj => {
      this.gameEngine.removeObject(obj.mesh, obj.body);
    });
    
    if (this.ground) {
      this.gameEngine.removeObject(this.ground.mesh, this.ground.body);
    }
    
    this.testObjects = [];
    this.testCube = null;
    this.ground = null;
    
    console.log('Test scene disposed');
  }
}