export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type ObstacleType = 
  | 'SPIKE_LOW'      // Low ground hazard, easy jump
  | 'PILLAR_TALL'    // Tall monolith obstacle, full jump required
  | 'DOUBLE_SPIKE'   // Two hurdles together, requires timed apex
  | 'FLYING_DRONE'   // Airborne hovering hazard, player can duck under or jump over
  | 'ROLLING_BOULDER'; // Dynamic rotating obstacle moving at slight relative speed

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
  color: string;
  accentColor: string;
  rotation?: number;
  floatOffset?: number;
}

export type CollectibleType = 'STAR' | 'SHIELD' | 'DOUBLE_JUMP';

export interface Collectible {
  id: number;
  type: CollectibleType;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  floatAngle: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'circle' | 'square' | 'spark';
}

export interface PlayerSkin {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  eyeColor: string;
  trailColor: string;
  unlockScore: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  selectedSkinId: string;
}

export interface GameStats {
  score: number;
  highScore: number;
  distanceMeters: number;
  coins: number;
  combo: number;
  maxCombo: number;
  obstaclesCleared: number;
  speed: number;
  hasShield: boolean;
  canDoubleJump: boolean;
}
