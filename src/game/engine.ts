import { Obstacle, ObstacleType, Collectible, CollectibleType, GameState, GameStats, PlayerSkin } from './types';
import { ParticleSystem } from './particles';
import { soundEngine } from './sound';
import { SKINS } from './skins';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Viewport & Scale
  public readonly V_WIDTH = 960;
  public readonly V_HEIGHT = 480;
  public readonly GROUND_Y = 410;

  // Game State
  public state: GameState = 'TITLE';
  private skin: PlayerSkin = SKINS[0];

  // Stats
  public stats: GameStats = {
    score: 0,
    highScore: 0,
    distanceMeters: 0,
    coins: 0,
    combo: 1,
    maxCombo: 1,
    obstaclesCleared: 0,
    speed: 6.2,
    hasShield: false,
    canDoubleJump: false,
  };

  // Player Physics
  private player = {
    x: 130,
    y: 410 - 40,
    baseWidth: 38,
    baseHeight: 38,
    width: 38,
    height: 38,
    vy: 0,
    isGrounded: true,
    isDucking: false,
    jumpHoldTimer: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    airJumpsLeft: 0,
    squashX: 1,
    squashY: 1,
    tilt: 0,
    blinkTimer: 0,
    isBlinking: false,
    shieldAngle: 0,
  };

  // Systems
  private particles = new ParticleSystem();
  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private nextObstacleDistance: number = 240;
  private obstacleIdCounter: number = 0;

  // Parallax & Time of Day
  private bgOffsetFar: number = 0;
  private bgOffsetMid: number = 0;
  private groundOffset: number = 0;
  private themeCycle: number = 0; // 0: Sky Blue, 1: Sunset, 2: Cyber Night

  // Juice & Feedback
  private trauma: number = 0;
  private hitstopFrames: number = 0;
  private comboTimer: number = 0;
  private speedTierNotification: string | null = null;
  private speedTierTimer: number = 0;

  // Controls input state
  private keys = {
    jump: false,
    duck: false,
  };

  // Callbacks for HUD
  public onStatsUpdate?: (stats: GameStats) => void;
  public onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    // Load High Score
    try {
      const savedHighScore = localStorage.getItem('dash_high_score');
      if (savedHighScore) {
        this.stats.highScore = parseInt(savedHighScore, 10) || 0;
      }
    } catch {
      // ignore
    }

    this.setupListeners();
    this.resize();
    this.resetGame(false);
  }

  public setSkin(skinId: string) {
    const found = SKINS.find(s => s.id === skinId);
    if (found) this.skin = found;
  }

  public getSkin(): PlayerSkin {
    return this.skin;
  }

  private setupListeners() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    soundEngine.stopMusic();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleResize = () => {
    this.resize();
  };

  private handleBlur = () => {
    this.keys.jump = false;
    this.keys.duck = false;
    if (this.state === 'PLAYING') {
      this.pauseGame();
    }
  };

  public resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.parentElement?.getBoundingClientRect() || {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  // --- Input Handlers ---
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (this.state === 'TITLE') {
        this.startGame();
        return;
      }
      if (this.state === 'GAME_OVER') {
        this.startGame();
        return;
      }
      if (this.state === 'PLAYING') {
        this.triggerJumpPress();
      }
    }

    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      if (this.state === 'PLAYING') {
        this.triggerDuckPress();
      }
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (this.state === 'PLAYING') {
        this.pauseGame();
      } else if (this.state === 'PAUSED') {
        this.resumeGame();
      }
    }

    if (e.code === 'KeyM') {
      const nextSound = !soundEngine.getSoundEnabled();
      soundEngine.setSoundEnabled(nextSound);
      soundEngine.setMusicEnabled(nextSound);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.keys.jump = false;
      this.player.jumpHoldTimer = 0;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.keys.duck = false;
      this.player.isDucking = false;
    }
  };

  // Touch / Mobile / Pointer triggers
  public triggerJumpPress() {
    this.keys.jump = true;
    this.player.jumpBufferTimer = 6; // 6 frames buffer

    if (this.player.isGrounded || this.player.coyoteTimer > 0) {
      this.executeJump(false);
    } else if (this.player.airJumpsLeft > 0) {
      this.executeJump(true);
    }
  }

  public triggerJumpRelease() {
    this.keys.jump = false;
    this.player.jumpHoldTimer = 0;
  }

  public triggerDuckPress() {
    this.keys.duck = true;
    this.player.isDucking = true;
    if (this.player.isGrounded) {
      soundEngine.playDuck();
    } else {
      // Fast fall
      this.player.vy = Math.max(this.player.vy, 9);
    }
  }

  public triggerDuckRelease() {
    this.keys.duck = false;
    this.player.isDucking = false;
  }

  private executeJump(isDouble: boolean) {
    const jumpPower = isDouble ? -10.5 : -11.8;
    this.player.vy = jumpPower;
    this.player.isGrounded = false;
    this.player.coyoteTimer = 0;
    this.player.jumpBufferTimer = 0;
    this.player.jumpHoldTimer = 10; // max variable frames

    // Squash & stretch takeoff
    this.player.squashX = 0.75;
    this.player.squashY = 1.35;

    if (isDouble) {
      this.player.airJumpsLeft--;
      this.stats.canDoubleJump = this.player.airJumpsLeft > 0;
      soundEngine.playDoubleJump();
      this.particles.emitJumpBurst(this.player.x + 19, this.player.y + 38, '#38bdf8');
    } else {
      soundEngine.playJump();
      this.particles.emitJumpBurst(this.player.x + 19, this.player.y + 38, this.skin.primaryColor);
    }
  }

  // --- Game Flow ---
  public startGame() {
    this.resetGame(true);
    this.state = 'PLAYING';
    this.onStateChange?.(this.state);
    soundEngine.playClick();
    soundEngine.startMusic();
  }

  public pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.onStateChange?.(this.state);
    soundEngine.stopMusic();
  }

  public resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.onStateChange?.(this.state);
    soundEngine.startMusic();
  }

  public restartGame() {
    this.startGame();
  }

  public returnToTitle() {
    this.resetGame(false);
    this.state = 'TITLE';
    this.onStateChange?.(this.state);
    soundEngine.stopMusic();
  }

  private resetGame(activePlay: boolean) {
    this.stats.score = 0;
    this.stats.distanceMeters = 0;
    this.stats.coins = 0;
    this.stats.combo = 1;
    this.stats.maxCombo = 1;
    this.stats.obstaclesCleared = 0;
    this.stats.speed = 6.2;
    this.stats.hasShield = false;
    this.stats.canDoubleJump = false;

    this.player.y = this.GROUND_Y - 40;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.isDucking = false;
    this.player.airJumpsLeft = 0;
    this.player.squashX = 1;
    this.player.squashY = 1;
    this.player.tilt = 0;
    this.player.coyoteTimer = 0;
    this.player.jumpBufferTimer = 0;

    this.obstacles = [];
    this.collectibles = [];
    this.particles.clear();
    this.trauma = 0;
    this.hitstopFrames = 0;
    this.nextObstacleDistance = 260;
    this.speedTierNotification = null;

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  // --- Main Loop ---
  public startLoop() {
    if (this.animFrameId !== null) return;
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      const rawDt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      const dt = Math.min(rawDt, 0.05); // Frame clamp to prevent spiral of death

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // --- Simulation Update ---
  private update(dt: number) {
    const dtFactor = dt * 60; // 1.0 at 60fps

    // Screen Shake decay
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 2.8);
    }

    // Hitstop freeze
    if (this.hitstopFrames > 0) {
      this.hitstopFrames -= dtFactor;
      return;
    }

    // Background scrolling
    const currentSpeed = this.state === 'PLAYING' ? this.stats.speed : 1.5;
    this.groundOffset = (this.groundOffset + currentSpeed * dtFactor) % 40;
    this.bgOffsetMid = (this.bgOffsetMid + currentSpeed * 0.3 * dtFactor) % this.V_WIDTH;
    this.bgOffsetFar = (this.bgOffsetFar + currentSpeed * 0.1 * dtFactor) % this.V_WIDTH;

    // Particles always update
    this.particles.update(dtFactor);

    // Idle title screen updates
    if (this.state === 'TITLE') {
      this.updateTitleWorld(dtFactor);
      return;
    }

    if (this.state !== 'PLAYING') return;

    // --- Active Gameplay Update ---
    this.stats.distanceMeters += (this.stats.speed * dtFactor) / 20;
    this.stats.score = Math.floor(this.stats.distanceMeters + this.stats.coins * 30 + this.stats.obstaclesCleared * 20);

    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      try {
        localStorage.setItem('dash_high_score', String(this.stats.highScore));
      } catch {
        // ignore
      }
    }

    // Speed curve & tiers
    const prevSpeed = this.stats.speed;
    this.stats.speed = Math.min(13.5, 6.2 + Math.sqrt(this.stats.score) * 0.14);
    if (Math.floor(this.stats.speed) > Math.floor(prevSpeed)) {
      this.speedTierNotification = `Speed Lv.${Math.floor(this.stats.speed) - 5}!`;
      this.speedTierTimer = 60;
      soundEngine.playSpeedUp();
    }
    if (this.speedTierTimer > 0) {
      this.speedTierTimer -= dtFactor;
      if (this.speedTierTimer <= 0) this.speedTierNotification = null;
    }
    soundEngine.updateMusicSpeed(this.stats.speed / 6.2);

    // Player Height based on Ducking
    if (this.player.isDucking && this.player.isGrounded) {
      this.player.height = 24;
      this.player.width = 44;
    } else {
      this.player.height = 38;
      this.player.width = 38;
    }

    // Variable jump sustaining
    if (this.keys.jump && this.player.jumpHoldTimer > 0) {
      this.player.vy -= 0.35 * dtFactor;
      this.player.jumpHoldTimer -= dtFactor;
    }

    // Gravity
    const gravity = this.player.isDucking ? 0.95 : 0.65;
    this.player.vy += gravity * dtFactor;
    this.player.vy = Math.min(this.player.vy, 16); // terminal velocity

    // Move player Y
    this.player.y += this.player.vy * dtFactor;

    // Ground collision
    const targetGroundY = this.GROUND_Y - this.player.height;
    if (this.player.y >= targetGroundY) {
      const wasAirborne = !this.player.isGrounded;
      this.player.y = targetGroundY;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.coyoteTimer = 7; // reset coyote time
      this.player.airJumpsLeft = this.stats.canDoubleJump ? 1 : 0;

      // Landing impacts
      if (wasAirborne) {
        soundEngine.playLand();
        this.player.squashX = 1.35;
        this.player.squashY = 0.65;
        this.particles.emitLandPuff(this.player.x + 19, this.GROUND_Y, this.player.width);

        // Jump buffering check
        if (this.player.jumpBufferTimer > 0) {
          this.executeJump(false);
        }
      }

      // Running dust while on ground
      if (Math.random() < 0.35) {
        this.particles.emitRunDust(this.player.x + 4, this.GROUND_Y, 'rgba(255, 255, 255, 0.4)');
      }
    } else {
      this.player.isGrounded = false;
      if (this.player.coyoteTimer > 0) {
        this.player.coyoteTimer -= dtFactor;
      }
    }

    // Jump buffer timer
    if (this.player.jumpBufferTimer > 0) {
      this.player.jumpBufferTimer -= dtFactor;
    }

    // Squash recovery
    this.player.squashX += (1 - this.player.squashX) * 0.22 * dtFactor;
    this.player.squashY += (1 - this.player.squashY) * 0.22 * dtFactor;

    // Player tilt
    const targetTilt = this.player.isGrounded ? 0 : (this.player.vy / 16) * 0.25;
    this.player.tilt += (targetTilt - this.player.tilt) * 0.3 * dtFactor;

    // Shield rotation
    if (this.stats.hasShield) {
      this.player.shieldAngle += 0.05 * dtFactor;
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dtFactor;
      if (this.comboTimer <= 0) {
        this.stats.combo = 1;
      }
    }

    // Update Obstacles & Collectibles
    this.updateObstaclesAndCollectibles(dtFactor);

    // Inform HUD
    this.onStatsUpdate?.({ ...this.stats });
  }

  private updateTitleWorld(dtFactor: number) {
    // Subtle breathing bounce on title screen
    const time = performance.now() / 300;
    this.player.y = this.GROUND_Y - 40 + Math.sin(time) * 3;
    this.player.squashY = 1 + Math.sin(time) * 0.05;
    this.player.squashX = 1 - Math.sin(time) * 0.05;
  }

  private updateObstaclesAndCollectibles(dtFactor: number) {
    const moveAmount = this.stats.speed * dtFactor;

    // Spawn new obstacles
    this.nextObstacleDistance -= moveAmount;
    if (this.nextObstacleDistance <= 0) {
      this.spawnObstaclePattern();
      // Safe gap dynamic with speed
      const minGap = 200 + this.stats.speed * 12;
      const randomGap = Math.random() * 140;
      this.nextObstacleDistance = minGap + randomGap;
    }

    // Update existing obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= moveAmount;

      if (obs.type === 'ROLLING_BOULDER' && obs.rotation !== undefined) {
        obs.rotation -= 0.12 * dtFactor;
      }
      if (obs.type === 'FLYING_DRONE' && obs.floatOffset !== undefined) {
        obs.floatOffset += 0.06 * dtFactor;
        obs.y = 295 + Math.sin(obs.floatOffset) * 16;
      }

      // Check collision
      if (this.checkCollision(obs)) {
        if (this.stats.hasShield) {
          // Shield absorbs hit
          this.stats.hasShield = false;
          soundEngine.playShieldBreak();
          this.trauma = 0.4;
          this.particles.emitDeathExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, '#38bdf8');
          this.obstacles.splice(i, 1);
          continue;
        } else {
          // Crash & Game Over!
          this.triggerGameOver();
          return;
        }
      }

      // Passed obstacle successfully
      if (!obs.passed && obs.x + obs.width < this.player.x) {
        obs.passed = true;
        this.stats.obstaclesCleared++;
        this.stats.combo = Math.min(8, this.stats.combo + 1);
        if (this.stats.combo > this.stats.maxCombo) {
          this.stats.maxCombo = this.stats.combo;
        }
        this.comboTimer = 160; // ~2.6 seconds to keep combo alive
      }

      // Despawn off-screen
      if (obs.x + obs.width < -60) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.x -= moveAmount;
      col.floatAngle += 0.08 * dtFactor;

      // Check pickup
      const pCenterX = this.player.x + this.player.width / 2;
      const pCenterY = this.player.y + this.player.height / 2;
      const dist = Math.hypot(pCenterX - col.x, pCenterY - (col.y + Math.sin(col.floatAngle) * 5));

      if (dist < col.radius + this.player.width / 2) {
        // Collect!
        if (col.type === 'STAR') {
          this.stats.coins++;
          soundEngine.playCoin();
          this.particles.emitCoinSparkles(col.x, col.y);
        } else if (col.type === 'SHIELD') {
          this.stats.hasShield = true;
          soundEngine.playShieldPickup();
          this.particles.emitDeathExplosion(col.x, col.y, '#38bdf8');
        } else if (col.type === 'DOUBLE_JUMP') {
          this.stats.canDoubleJump = true;
          this.player.airJumpsLeft = 1;
          soundEngine.playShieldPickup();
          this.particles.emitDeathExplosion(col.x, col.y, '#a855f7');
        }
        this.collectibles.splice(i, 1);
        continue;
      }

      if (col.x + col.radius < -40) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  private spawnObstaclePattern() {
    this.obstacleIdCounter++;
    const types: ObstacleType[] = ['SPIKE_LOW', 'PILLAR_TALL', 'DOUBLE_SPIKE', 'FLYING_DRONE', 'ROLLING_BOULDER'];
    // Difficulty gate
    let availableTypes: ObstacleType[] = ['SPIKE_LOW'];
    if (this.stats.score > 80) availableTypes.push('PILLAR_TALL', 'DOUBLE_SPIKE');
    if (this.stats.score > 250) availableTypes.push('FLYING_DRONE');
    if (this.stats.score > 400) availableTypes.push('ROLLING_BOULDER');

    const chosenType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const spawnX = this.V_WIDTH + 40;

    let obs: Obstacle;
    switch (chosenType) {
      case 'SPIKE_LOW':
        obs = {
          id: this.obstacleIdCounter,
          type: 'SPIKE_LOW',
          x: spawnX,
          y: this.GROUND_Y - 36,
          width: 32,
          height: 36,
          passed: false,
          color: '#8b5cf6',
          accentColor: '#7c3aed',
        };
        break;
      case 'PILLAR_TALL':
        obs = {
          id: this.obstacleIdCounter,
          type: 'PILLAR_TALL',
          x: spawnX,
          y: this.GROUND_Y - 65,
          width: 34,
          height: 65,
          passed: false,
          color: '#6366f1',
          accentColor: '#4f46e5',
        };
        break;
      case 'DOUBLE_SPIKE':
        obs = {
          id: this.obstacleIdCounter,
          type: 'DOUBLE_SPIKE',
          x: spawnX,
          y: this.GROUND_Y - 38,
          width: 62,
          height: 38,
          passed: false,
          color: '#a855f7',
          accentColor: '#9333ea',
        };
        break;
      case 'FLYING_DRONE':
        obs = {
          id: this.obstacleIdCounter,
          type: 'FLYING_DRONE',
          x: spawnX,
          y: 295,
          width: 44,
          height: 26,
          passed: false,
          color: '#ec4899',
          accentColor: '#db2777',
          floatOffset: Math.random() * Math.PI * 2,
        };
        break;
      case 'ROLLING_BOULDER':
        obs = {
          id: this.obstacleIdCounter,
          type: 'ROLLING_BOULDER',
          x: spawnX,
          y: this.GROUND_Y - 38,
          width: 38,
          height: 38,
          passed: false,
          color: '#f97316',
          accentColor: '#ea580c',
          rotation: 0,
        };
        break;
    }
    this.obstacles.push(obs);

    // Spawn bonus collectible on top of or after obstacle
    if (Math.random() < 0.45) {
      const colTypes: CollectibleType[] = ['STAR'];
      if (!this.stats.hasShield && Math.random() < 0.12) colTypes.push('SHIELD');
      if (!this.stats.canDoubleJump && Math.random() < 0.15) colTypes.push('DOUBLE_JUMP');

      const colType = colTypes[Math.floor(Math.random() * colTypes.length)];
      this.collectibles.push({
        id: Math.random(),
        type: colType,
        x: spawnX + obs.width / 2 + (Math.random() * 80 - 40),
        y: obs.type === 'FLYING_DRONE' ? this.GROUND_Y - 25 : this.GROUND_Y - 110,
        radius: 12,
        collected: false,
        floatAngle: Math.random() * Math.PI * 2,
      });
    }
  }

  private checkCollision(obs: Obstacle): boolean {
    // Generous hitbox inset (anti-frustration pixel margin)
    const inset = 4;
    const pLeft = this.player.x + inset;
    const pRight = this.player.x + this.player.width - inset;
    const pTop = this.player.y + inset;
    const pBottom = this.player.y + this.player.height - 2;

    const oLeft = obs.x + inset;
    const oRight = obs.x + obs.width - inset;
    const oTop = obs.y + inset;
    const oBottom = obs.y + obs.height;

    return pRight > oLeft && pLeft < oRight && pBottom > oTop && pTop < oBottom;
  }

  private triggerGameOver() {
    this.state = 'GAME_OVER';
    soundEngine.stopMusic();
    soundEngine.playHit();

    // Hitstop & visceral camera trauma
    this.hitstopFrames = 5; // ~80ms simulation pause
    this.trauma = 0.95;

    // Death explosion
    this.particles.emitDeathExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      this.skin.primaryColor
    );

    this.onStateChange?.(this.state);
  }

  // --- Rendering ---
  public render() {
    const { ctx, canvas } = this;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Viewport scaling: Fit virtual 960x480 into viewport
    const scale = Math.min(width / this.V_WIDTH, height / this.V_HEIGHT);
    const offsetX = (width - this.V_WIDTH * scale) / 2;
    const offsetY = (height - this.V_HEIGHT * scale) / 2;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Dark backdrop for letterbox border
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Apply viewport bounds & camera shake
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Clip to virtual playfield
    ctx.beginPath();
    ctx.rect(0, 0, this.V_WIDTH, this.V_HEIGHT);
    ctx.clip();

    // Camera Shake
    if (this.trauma > 0) {
      const shakeAmount = Math.pow(this.trauma, 2) * 18;
      const shakeAngle = Math.pow(this.trauma, 2) * 0.04;
      const rx = (Math.random() - 0.5) * shakeAmount;
      const ry = (Math.random() - 0.5) * shakeAmount;
      ctx.translate(rx, ry);
      ctx.translate(this.V_WIDTH / 2, this.V_HEIGHT / 2);
      ctx.rotate((Math.random() - 0.5) * shakeAngle);
      ctx.translate(-this.V_WIDTH / 2, -this.V_HEIGHT / 2);
    }

    // Draw Parallax Sky & Mountains
    this.drawBackground(ctx);

    // Draw Collectibles
    this.drawCollectibles(ctx);

    // Draw Obstacles
    this.drawObstacles(ctx);

    // Draw Ground
    this.drawGround(ctx);

    // Draw Particles
    this.particles.draw(ctx);

    // Draw Player (if not dead or in hitstop)
    if (this.state !== 'GAME_OVER' || this.hitstopFrames > 0) {
      this.drawPlayer(ctx);
    }

    // Telegraphed Windups / Indicators
    this.drawTelegraphs(ctx);

    ctx.restore();
    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    // Dynamic Sky Gradient based on score
    const themeIndex = Math.floor(this.stats.score / 500) % 3;
    let skyTop = '#0284c7';
    let skyBottom = '#bae6fd';
    let mountainColor = '#38bdf8';
    let hillColor = '#0284c7';

    if (themeIndex === 1) {
      // Sunset
      skyTop = '#4c1d95';
      skyBottom = '#fdba74';
      mountainColor = '#831843';
      hillColor = '#9a3412';
    } else if (themeIndex === 2) {
      // Cyber Night
      skyTop = '#090d16';
      skyBottom = '#1e1b4b';
      mountainColor = '#1e1e38';
      hillColor = '#312e81';
    }

    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.GROUND_Y);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);

    // Distant Stars / Clouds
    ctx.save();
    if (themeIndex === 2) {
      // Starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 123 + this.bgOffsetFar * 0.1) % this.V_WIDTH);
        const sy = (i * 47) % (this.GROUND_Y - 140);
        ctx.fillRect(sx, sy, (i % 3 === 0 ? 2 : 1.5), (i % 3 === 0 ? 2 : 1.5));
      }
    } else {
      // Stylized Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      const clouds = [
        { x: 120, y: 70, w: 90, h: 28 },
        { x: 380, y: 110, w: 140, h: 36 },
        { x: 690, y: 60, w: 110, h: 32 },
        { x: 920, y: 95, w: 100, h: 30 },
      ];
      for (const c of clouds) {
        const cx = (c.x - this.bgOffsetFar + this.V_WIDTH * 2) % (this.V_WIDTH + 140) - 70;
        ctx.beginPath();
        ctx.roundRect(cx, c.y, c.w, c.h, 14);
        ctx.fill();
      }
    }
    ctx.restore();

    // Far Mountains (Parallax 1)
    ctx.fillStyle = mountainColor;
    ctx.beginPath();
    ctx.moveTo(0, this.GROUND_Y);
    for (let x = 0; x <= this.V_WIDTH + 100; x += 100) {
      const peakX = x - (this.bgOffsetFar % 100);
      const peakY = this.GROUND_Y - 120 - Math.sin(x * 0.02) * 50;
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(peakX + 50, this.GROUND_Y - 70);
    }
    ctx.lineTo(this.V_WIDTH, this.GROUND_Y);
    ctx.closePath();
    ctx.fill();

    // Mid Hills (Parallax 2)
    ctx.fillStyle = hillColor;
    ctx.beginPath();
    ctx.moveTo(0, this.GROUND_Y);
    for (let x = 0; x <= this.V_WIDTH + 80; x += 80) {
      const hx = x - (this.bgOffsetMid % 80);
      const hy = this.GROUND_Y - 60 - Math.cos(x * 0.03) * 35;
      ctx.quadraticCurveTo(hx + 20, hy, hx + 40, this.GROUND_Y - 45);
    }
    ctx.lineTo(this.V_WIDTH, this.GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  private drawGround(ctx: CanvasRenderingContext2D) {
    const gy = this.GROUND_Y;
    const gHeight = this.V_HEIGHT - gy;

    // Ground base strip
    const groundGrad = ctx.createLinearGradient(0, gy, 0, this.V_HEIGHT);
    groundGrad.addColorStop(0, '#15803d'); // Deep green
    groundGrad.addColorStop(0.15, '#166534');
    groundGrad.addColorStop(1, '#0f172a'); // Earth bedrock
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gy, this.V_WIDTH, gHeight);

    // Top neon lawn edge
    ctx.fillStyle = '#22c55e'; // Bright green surface trim
    ctx.fillRect(0, gy, this.V_WIDTH, 6);

    // Scrolling dashed runway lines on ground for intense speed perception
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    const stripeWidth = 24;
    const stripeGap = 32;
    const totalStep = stripeWidth + stripeGap;
    for (let x = -totalStep; x < this.V_WIDTH + totalStep; x += totalStep) {
      const sx = x - this.groundOffset;
      ctx.fillRect(sx, gy + 14, stripeWidth, 4);
      ctx.fillRect(sx + 10, gy + 32, stripeWidth * 0.7, 3);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const { x, y, width, height, squashX, squashY, tilt } = this.player;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(tilt);
    ctx.scale(squashX, squashY);

    // Drop shadow
    if (this.player.isGrounded) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, height / 2 + 2, width * 0.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer glow / body
    ctx.fillStyle = this.skin.accentColor;
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, 7);
    ctx.fill();

    // Body inner facet
    ctx.fillStyle = this.skin.primaryColor;
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, 5);
    ctx.fill();

    // Eye (expressive, looks forward)
    const eyeX = width / 2 - 12;
    const eyeY = -height / 2 + (this.player.isDucking ? 6 : 10);
    const eyeWidth = 8;
    const eyeHeight = this.player.isDucking ? 3 : 11;

    ctx.fillStyle = this.skin.eyeColor;
    ctx.beginPath();
    ctx.roundRect(eyeX, eyeY, eyeWidth, eyeHeight, 3);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeX + eyeWidth - 2.5, eyeY + eyeHeight / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Small sweat drop / expression if obstacle close
    if (this.obstacles.length > 0 && this.obstacles[0].x - x < 120 && this.obstacles[0].x > x) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(eyeX - 4, eyeY - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shield Aura
    if (this.stats.hasShield) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(width, height) * 0.75, 0, Math.PI * 2);
      ctx.stroke();

      // Shield orbit sparks
      const sa = this.player.shieldAngle;
      ctx.fillStyle = '#ffffff';
      const orbX = Math.cos(sa) * (width * 0.75);
      const orbY = Math.sin(sa) * (height * 0.75);
      ctx.beginPath();
      ctx.arc(orbX, orbY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawObstacles(ctx: CanvasRenderingContext2D) {
    for (const obs of this.obstacles) {
      ctx.save();

      if (obs.type === 'SPIKE_LOW' || obs.type === 'DOUBLE_SPIKE') {
        const spikeCount = obs.type === 'DOUBLE_SPIKE' ? 2 : 1;
        const spikeWidth = obs.width / spikeCount;

        for (let s = 0; s < spikeCount; s++) {
          const sx = obs.x + s * spikeWidth;
          // Crystal spike
          ctx.fillStyle = obs.color;
          ctx.beginPath();
          ctx.moveTo(sx + spikeWidth / 2, obs.y);
          ctx.lineTo(sx + spikeWidth, obs.y + obs.height);
          ctx.lineTo(sx, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();

          // Highlight edge
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx + spikeWidth / 2, obs.y);
          ctx.lineTo(sx, obs.y + obs.height);
          ctx.stroke();
        }
      } else if (obs.type === 'PILLAR_TALL') {
        // Monolith pillar
        ctx.fillStyle = obs.accentColor;
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
        ctx.fill();

        ctx.fillStyle = obs.color;
        ctx.beginPath();
        ctx.roundRect(obs.x + 3, obs.y + 3, obs.width - 6, obs.height - 6, 3);
        ctx.fill();

        // Glowing runes / stripes
        ctx.fillStyle = '#e0e7ff';
        ctx.fillRect(obs.x + 6, obs.y + 14, obs.width - 12, 4);
        ctx.fillRect(obs.x + 6, obs.y + 32, obs.width - 12, 4);
        ctx.fillRect(obs.x + 6, obs.y + 50, obs.width - 12, 4);
      } else if (obs.type === 'FLYING_DRONE') {
        // Drone core
        ctx.fillStyle = obs.color;
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
        ctx.fill();

        // Rotor blades
        const rotorSpin = (performance.now() / 40) % 20;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(obs.x - 6, obs.y + 4);
        ctx.lineTo(obs.x + obs.width + 6, obs.y + 4);
        ctx.stroke();

        // Red sensor scanner
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(obs.x + 10, obs.y + obs.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(obs.x + 9, obs.y + obs.height / 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'ROLLING_BOULDER') {
        const radius = obs.width / 2;
        const centerX = obs.x + radius;
        const centerY = obs.y + radius;

        ctx.translate(centerX, centerY);
        ctx.rotate(obs.rotation || 0);

        ctx.fillStyle = obs.color;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        // Spikes on boulder
        ctx.fillStyle = obs.accentColor;
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
          ctx.lineTo(Math.cos(a + 0.1) * (radius + 6), Math.sin(a + 0.1) * (radius + 6));
          ctx.lineTo(Math.cos(a + 0.2) * radius, Math.sin(a + 0.2) * radius);
          ctx.fill();
        }

        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawCollectibles(ctx: CanvasRenderingContext2D) {
    for (const col of this.collectibles) {
      const y = col.y + Math.sin(col.floatAngle) * 5;

      ctx.save();
      ctx.translate(col.x, y);

      if (col.type === 'STAR') {
        // Gold glowing star
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        this.drawStar(ctx, 0, 0, 5, col.radius, col.radius * 0.5);
      } else if (col.type === 'SHIELD') {
        // Shield orb
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, col.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(0, 0, col.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (col.type === 'DOUBLE_JUMP') {
        // Feather / wings symbol
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#9333ea';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(0, 0, col.radius, col.radius * 0.6, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private drawTelegraphs(ctx: CanvasRenderingContext2D) {
    // Show upcoming flying drone warning exclamation on the right border
    for (const obs of this.obstacles) {
      if (obs.type === 'FLYING_DRONE' && obs.x > this.V_WIDTH - 60 && obs.x < this.V_WIDTH + 80) {
        ctx.save();
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.fillText('⚠ DUCK / LEAP', this.V_WIDTH - 150, obs.y + 18);
        ctx.restore();
      }
    }

    // Speed tier banner notification
    if (this.speedTierNotification) {
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.speedTierNotification, this.V_WIDTH / 2, 70);
      ctx.restore();
    }
  }
}
