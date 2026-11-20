import * as THREE from 'three';
import { HackerDeskScene } from './scene.js';
import { ParticleSystem } from './particles.js';
import { CameraController } from './camera.js';
import { Terminal } from './terminal.js';
import { ResumeViewer } from './resumeViewer.js';
import { prefersFallback } from './world/places.js';
import { showFallback, hideFallback } from './world/fallbackView.js';
import { openCredits } from './world/credits.js';

class HackerDeskApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.loadingScreen = document.getElementById('loading-screen');
    this.uiButtons = document.getElementById('ui-buttons');
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.cameraController = null;
    this.particleSystem = null;
    this.terminal = null;
    this.resumeViewer = null;
    this.resumeData = null;
    
    this.clock = new THREE.Clock();
    this.isReady = false;
    this.mode = 'desk';
    this.world = null;
    
    this.init();
  }

  async init() {
    // Fetch resume data first
    await this.loadResumeData();
    
    // Setup renderer
    this.setupRenderer();
    
    // Setup camera
    this.setupCamera();
    
    // Create scene
    this.scene = new HackerDeskScene();
    
    // Create particle system
    this.particleSystem = new ParticleSystem(this.scene.getScene());
    
    // Setup camera controller
    this.cameraController = new CameraController(this.camera);
    
    // Setup terminal with resume data
    this.terminal = new Terminal(this.resumeData);
    this.terminal.updatePrompt(); // Update prompt with user's name
    this.terminal.setWalkHandler(() => this.enterWalk());
    this.terminal.setCreditsHandler(() => openCredits());
    document.getElementById('walk-btn')?.addEventListener('click', () => this.enterWalk());
    document.getElementById('credits-btn')?.addEventListener('click', () => openCredits());
    
    // Setup resume viewer
    this.resumeViewer = new ResumeViewer(this.resumeData);
    
    // Handle resize
    window.addEventListener('resize', () => this.onResize());
    
    // Wait a bit for textures to load, then start
    setTimeout(() => {
      this.hideLoadingScreen();
      this.startExperience();
    }, 1000);
    
    // Start render loop
    this.animate();
  }

  async loadResumeData() {
    try {
      const response = await fetch('./resume.json');
      if (!response.ok) {
        throw new Error('Failed to fetch resume data');
      }
      this.resumeData = await response.json();
      console.log('Resume data loaded successfully');
    } catch (error) {
      console.error('Error loading resume data:', error);
      // Provide fallback data
      this.resumeData = {
        identity: {
          name: 'User',
          handle: 'user',
          headline: 'Developer',
          location: 'Earth'
        },
        contact: {
          email: 'contact@example.com',
          phone: 'N/A',
          location: 'Earth',
          linkedin: '',
          github: '',
          website: ''
        },
        terminal: {
          prompt: 'user@portfolio $',
          suggestedCommands: ['help'],
          aliases: {}
        },
        intro: {
          short: 'Resume data not found.',
          lines: ['Resume data not found.'],
          values: []
        },
        skills: {},
        experience: [],
        education: [],
        projects: [],
        certifications: []
      };
    }
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2 for performance
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
  }

  hideLoadingScreen() {
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 500);
  }

  startExperience() {
    this.isReady = true;
    
    // Start camera animation
    this.cameraController.startAnimation();
    
    // Show UI buttons after a short delay
    setTimeout(() => {
      this.uiButtons.classList.add('visible');
    }, 2000);
    
    // Show terminal after camera animation completes
    setTimeout(() => {
      this.terminal.show();
    }, 3500); // Slightly after camera animation
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.world?.resize(width, height);
  }

  showLoader(text) {
    this.loadingScreen.style.display = 'flex';
    this.loadingScreen.classList.remove('hidden');
    const label = this.loadingScreen.querySelector('div') || this.loadingScreen;
    label.textContent = text;
  }

  hideLoader() {
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => {
      if (this.loadingScreen.classList.contains('hidden')) {
        this.loadingScreen.style.display = 'none';
      }
    }, 400);
  }

  async enterWalk(force3d = false) {
    if (this.mode === 'loading') return;
    const pref = prefersFallback();
    if (!force3d && pref.fallback) {
      this.openTextNeighborhood(pref.reduce
        ? 'Reduced motion is on, so this is the text version of the neighborhood.'
        : 'This device looks low-power, so this is the text version of the neighborhood.');
      return;
    }
    hideFallback();
    this.mode = 'loading';
    this.terminal.hide();
    this.uiButtons.classList.remove('visible');
    this.showLoader('Loading the neighborhood…');
    try {
      if (!this.world) {
        const { CareerWorld } = await import('./world/careerWorld.js');
        this.world = new CareerWorld(this.renderer, this.resumeData, {
          reduced: pref.reduce,
          onExit: () => this.exitWalk(),
          onFallback: () => this.openTextNeighborhood('Text version of every stop on the street.'),
          onCredits: () => openCredits(),
        });
        await this.world.load((progress) => {
          this.showLoader(`Loading the neighborhood… ${Math.round(progress * 100)}%`);
        });
      }
      this.hideLoader();
      this.mode = 'world';
      this.world.enter();
    } catch (error) {
      console.error(error);
      this.hideLoader();
      this.mode = 'desk';
      this.uiButtons.classList.add('visible');
      this.terminal.show();
      this.terminal.write('\nThe neighborhood could not be loaded. The terminal still works.\n');
    }
  }

  openTextNeighborhood(reason) {
    if (this.world && this.mode === 'world') this.world.exit();
    this.mode = 'list';
    this.terminal.hide();
    this.uiButtons.classList.remove('visible');
    showFallback(this.resumeData, {
      reason,
      onClose: () => this.exitWalk(),
      onTry3d: () => this.enterWalk(true),
    });
  }

  exitWalk() {
    hideFallback();
    this.world?.exit();
    this.mode = 'desk';
    this.uiButtons.classList.add('visible');
    this.terminal.show();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.isReady) return;

    if (this.mode === 'world' && this.world?.ready) {
      this.world.update(dt);
      this.renderer.render(this.world.scene, this.world.camera);
      return;
    }
    
    const time = Date.now();
    
    // Update camera animation
    this.cameraController.update();
    
    // Update scene animations
    this.scene.update(time);
    
    // Update particles
    this.particleSystem.update();
    
    // Render
    this.renderer.render(this.scene.getScene(), this.camera);
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new HackerDeskApp());
} else {
  new HackerDeskApp();
}
