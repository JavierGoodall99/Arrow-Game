export interface Vector2D {
  x: number;
  y: number;
}

export interface Target {
  id: string;
  x: number;
  y: number;
  radius: number;
  movementType: 'static' | 'horizontal' | 'vertical' | 'circular';
  speed: number;
  range: number; // Max distance for oscillation
  initialX: number;
  initialY: number;
  phase?: number; // for circular or offset oscillation
  hit: boolean;
  scoreMultiplier?: number;
  isBonus?: boolean;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'stone' | 'wood' | 'shrub';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Arrow {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  active: boolean;
  stuck: boolean;
  stuckTargetId?: string;
  stuckObstacleId?: string;
  stuckOffset?: Vector2D; // Relative to the target/obstacle or ground
  stuckType?: 'target' | 'obstacle' | 'ground' | 'offscreen';
  trail: Vector2D[];
  arrowType?: 'standard' | 'heavy' | 'light';
  piercedObstacles?: string[];
  impactTime?: number;
}

export interface Level {
  id: number;
  name: string;
  description: string;
  targets: (Omit<Target, 'hit' | 'initialX' | 'initialY'> & { isBonus?: boolean })[];
  obstacles: Obstacle[];
  arrowLimit: number;
  windEnabled: boolean;
  windVariable: boolean; // Changes force during aim
  allowTrajectory: boolean;
  targetScore: number;
  starRatings: {
    three: number;
    two: number;
    one: number;
  };
  baseWind?: number;
  windAmplitude?: number;
  windFrequency?: number;
}

export type GameScreen = 'welcome' | 'level_select' | 'playing';
