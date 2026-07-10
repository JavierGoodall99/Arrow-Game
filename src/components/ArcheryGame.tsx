import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Trophy, ArrowRight, RotateCcw, AlertTriangle, Play, Sparkles, Lock, Flame } from 'lucide-react';
import { Level, Arrow, Target, Obstacle, Particle, Vector2D } from '../types';
import { audio } from '../utils/audio';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y, ARCHER_X, ARCHER_Y } from '../data/levels';
import GameHUD from './GameHUD';

const MAX_PULL_DIST = 180;
const MAX_AIM_POWER = 21.5;

interface ArcheryGameProps {
  level: Level;
  isMuted: boolean;
  onToggleMute: () => void;
  onLevelComplete: (levelId: number, stars: number) => void;
  onBackToSelector: () => void;
}

export default function ArcheryGame({
  level,
  isMuted,
  onToggleMute,
  onLevelComplete,
  onBackToSelector
}: ArcheryGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state
  const [arrowsRemaining, setArrowsRemaining] = useState<number>(level.arrowLimit);
  const [score, setScore] = useState<number>(0);
  const [currentWind, setCurrentWind] = useState<number>(0);
  const [gameState, setGameState] = useState<'aiming' | 'flying' | 'level_cleared' | 'level_failed'>('aiming');
  const [starsEarned, setStarsEarned] = useState<number>(0);

  // Redesign gameplay states
  const [selectedArrowType, setSelectedArrowType] = useState<'standard' | 'heavy' | 'light'>('standard');
  const streakRef = useRef<number>(0);
  const maxStreakRef = useRef<number>(0);
  const shotHistoryRef = useRef<{ hit: boolean, isBullseye: boolean, scorePct: number | null }[]>([]);

  // Aiming vector (slingshot pattern)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Vector2D>({ x: ARCHER_X, y: ARCHER_Y });
  const [dragCurrent, setDragCurrent] = useState<Vector2D>({ x: ARCHER_X, y: ARCHER_Y });

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<Vector2D>({ x: ARCHER_X, y: ARCHER_Y });
  const dragCurrentRef = useRef<Vector2D>({ x: ARCHER_X, y: ARCHER_Y });

  const screenShakeRef = useRef<number>(0);
  const freezeFrameLeftRef = useRef<number>(0);
  const drawDurationRef = useRef<number>(0);
  const [fatigueWarning, setFatigueWarning] = useState<boolean>(false);

  // Refs for animation loop & physical objects (to avoid component re-renders on physics ticks)
  const activeArrowRef = useRef<Arrow | null>(null);
  const stuckArrowsRef = useRef<Arrow[]>([]);
  const targetsRef = useRef<Target[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const levelTimeRef = useRef<number>(0);

  // Initialize wind (Deterministic - no Math.random)
  useEffect(() => {
    setSelectedArrowType('standard');
    if (level.windEnabled) {
      const baseWind = level.baseWind ?? ((level.id * 1.5) % 6 - 3);
      setCurrentWind(baseWind);
    } else {
      setCurrentWind(0);
    }
  }, [level]);

  // Load level targets & obstacles on start (Deterministic - no Math.random)
  useEffect(() => {
    targetsRef.current = level.targets.map((t, idx) => ({
      ...t,
      hit: false,
      initialX: t.x,
      initialY: t.y,
      phase: idx * Math.PI * 0.5 // deterministic starting phase
    }));

    obstaclesRef.current = [...level.obstacles];
    stuckArrowsRef.current = [];
    activeArrowRef.current = null;
    particlesRef.current = [];
    isDraggingRef.current = false;
    dragStartRef.current = { x: ARCHER_X, y: ARCHER_Y };
    dragCurrentRef.current = { x: ARCHER_X, y: ARCHER_Y };
    screenShakeRef.current = 0;
    freezeFrameLeftRef.current = 0;
    drawDurationRef.current = 0;
    setFatigueWarning(false);
    setArrowsRemaining(level.arrowLimit);
    setScore(0);
    setGameState('aiming');
    setStarsEarned(0);
    setIsDragging(false);
    levelTimeRef.current = 0;

    // Reset streak histories
    streakRef.current = 0;
    maxStreakRef.current = 0;
    shotHistoryRef.current = [];

    // Reset sound engine state
    audio.setMute(isMuted);

    // Initial draw to ensure everything looks perfect before interaction
    requestAnimationFrame(drawScene);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [level]);

  // Handle hotkeys (Restart with R, Arrow Selection with 1, 2, 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        handleRestart();
      } else if (e.key === '1') {
        setSelectedArrowType('standard');
      } else if (e.key === '2' && level.id >= 5) {
        setSelectedArrowType('light');
      } else if (e.key === '3' && level.id >= 7) {
        setSelectedArrowType('heavy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [level]);

  // Restart Level (Deterministic)
  const handleRestart = () => {
    targetsRef.current = level.targets.map((t, idx) => ({
      ...t,
      hit: false,
      initialX: t.x,
      initialY: t.y,
      phase: idx * Math.PI * 0.5
    }));
    stuckArrowsRef.current = [];
    activeArrowRef.current = null;
    particlesRef.current = [];
    isDraggingRef.current = false;
    dragStartRef.current = { x: ARCHER_X, y: ARCHER_Y };
    dragCurrentRef.current = { x: ARCHER_X, y: ARCHER_Y };
    screenShakeRef.current = 0;
    freezeFrameLeftRef.current = 0;
    drawDurationRef.current = 0;
    setFatigueWarning(false);
    setArrowsRemaining(level.arrowLimit);
    setScore(0);
    setGameState('aiming');
    setStarsEarned(0);
    setIsDragging(false);
    levelTimeRef.current = 0;

    // Reset streak histories
    streakRef.current = 0;
    maxStreakRef.current = 0;
    shotHistoryRef.current = [];

    if (level.windEnabled) {
      const baseWind = level.baseWind ?? ((level.id * 1.5) % 6 - 3);
      setCurrentWind(baseWind);
    } else {
      setCurrentWind(0);
    }
  };

  // Sound pull creaks at regular draw increments
  const prevTensionRef = useRef<number>(0);
  useEffect(() => {
    if (isDragging) {
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const dist = Math.min(150, Math.sqrt(dx * dx + dy * dy));
      const tension = dist / 150;

      // Click wood sound when tension crosses thresholds
      if (Math.abs(tension - prevTensionRef.current) > 0.15 && tension > 0.1) {
        audio.playCreak(tension);
        prevTensionRef.current = tension;
      }
    } else {
      prevTensionRef.current = 0;
    }
  }, [dragCurrent, isDragging]);

  // Global event listeners to handle dragging anywhere on (and off) the screen
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      handleInteractionMove(e.clientX, e.clientY);
    };

    const handleWindowMouseUp = () => {
      handleInteractionEnd();
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleWindowTouchEnd = () => {
      handleInteractionEnd();
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [isDragging]);

  // Main Loop
  useEffect(() => {
    const tick = () => {
      // 0. Check freeze frame (for hit impact heavy juice)
      if (freezeFrameLeftRef.current > 0) {
        freezeFrameLeftRef.current -= 1;
        // Skip physics, but draw so screen shake visual updates
        drawScene();
        animationFrameId.current = requestAnimationFrame(tick);
        return;
      }

      levelTimeRef.current += 1;

      // Increment or reset draw duration (for stamina muscle fatigue)
      if (isDraggingRef.current) {
        drawDurationRef.current += 1;
        if (drawDurationRef.current > 150) {
          setFatigueWarning((prev) => prev ? prev : true);
        }
      } else {
        drawDurationRef.current = 0;
        setFatigueWarning((prev) => prev ? false : prev);
      }

      // 1. Shift variable wind over time deterministically (no Math.random)
      if (level.windEnabled) {
        if (level.windVariable) {
          const base = level.baseWind ?? 0;
          const amp = level.windAmplitude ?? 2.5;
          const freq = level.windFrequency ?? 0.005;
          const nextWind = base + amp * Math.sin(levelTimeRef.current * freq);
          setCurrentWind(nextWind);
        } else {
          setCurrentWind(level.baseWind ?? 0);
        }
      } else {
        setCurrentWind(0);
      }

      // 2. Physics & State Updating
      updatePhysics();

      // 3. Render Canvas Frame
      drawScene();

      // Loop
      animationFrameId.current = requestAnimationFrame(tick);
    };

    animationFrameId.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState, currentWind]);

  // Physics update logic
  const updatePhysics = () => {
    // A. Update targets position (for floating/moving targets)
    targetsRef.current.forEach((t) => {
      if (t.movementType === 'vertical') {
        const speedMultiplier = 0.02;
        t.y = t.initialY + Math.sin(levelTimeRef.current * t.speed * speedMultiplier + (t.phase || 0)) * t.range;
      } else if (t.movementType === 'horizontal') {
        const speedMultiplier = 0.02;
        t.x = t.initialX + Math.cos(levelTimeRef.current * t.speed * speedMultiplier + (t.phase || 0)) * t.range;
      } else if (t.movementType === 'circular') {
        const speedMultiplier = 0.015;
        const angle = levelTimeRef.current * t.speed * speedMultiplier + (t.phase || 0);
        t.x = t.initialX + Math.cos(angle) * t.range;
        t.y = t.initialY + Math.sin(angle) * (t.range * 0.7); // slightly squashed ellipse for natural range look
      }
    });

    // B. Update particles
    particlesRef.current = particlesRef.current.map((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04; // gravity on particles
      p.life -= 1;
      p.alpha = Math.max(0, p.life / p.maxLife);
      return p;
    }).filter((p) => p.life > 0);

    // C. Update active arrow flight
    const arrow = activeArrowRef.current;
    if (arrow && arrow.active) {
      // Trail particles
      if (levelTimeRef.current % 2 === 0) {
        // Smoke puff colored by arrow type
        let smokeColor = 'rgba(241, 245, 249, 0.4)';
        if (arrow.arrowType === 'heavy') {
          smokeColor = 'rgba(168, 85, 247, 0.4)'; // Purple
        } else if (arrow.arrowType === 'light') {
          smokeColor = 'rgba(6, 182, 212, 0.4)'; // Cyan
        }

        particlesRef.current.push({
          x: arrow.x,
          y: arrow.y,
          vx: (Math.random() * 0.4 - 0.2) - arrow.vx * 0.05,
          vy: (Math.random() * 0.4 - 0.2) - arrow.vy * 0.05,
          size: Math.random() * 3 + 1,
          alpha: 0.6,
          color: smokeColor,
          life: 25,
          maxLife: 25
        });
      }

      // Save trail coordinate (up to 250 coordinates to retain full path after hit)
      arrow.trail.push({ x: arrow.x, y: arrow.y });
      if (arrow.trail.length > 250) {
        arrow.trail.shift();
      }

      // Physics variables modified by arrow type
      let gravity = 0.15;
      let airResistance = 0.994;
      let windInfluenceFactor = 0.0065;

      if (arrow.arrowType === 'heavy') {
        gravity = 0.24; // heavier, steeper arc
        airResistance = 0.992; // slightly faster drop-off
        windInfluenceFactor = 0.0025; // extremely stable under wind pressure
      } else if (arrow.arrowType === 'light') {
        gravity = 0.095; // flatter flight
        airResistance = 0.996; // retains velocity longer
        windInfluenceFactor = 0.0125; // floats high, extremely sensitive to wind
      }

      arrow.vy += gravity;
      arrow.vx *= airResistance;
      arrow.vy *= airResistance;

      // Wind force affects horizontal path
      if (level.windEnabled) {
        arrow.vx += currentWind * windInfluenceFactor;
      }

      // Move arrow
      arrow.x += arrow.vx;
      arrow.y += arrow.vy;

      // Arrow flies rotated in alignment with velocity trajectory
      arrow.angle = Math.atan2(arrow.vy, arrow.vx);

      // --- Collision checks ---

      // 1. Collision with stone or wooden obstacles (Heavy arrows pierce once)
      let hitObstacle = false;
      for (const obs of obstaclesRef.current) {
        if (
          arrow.x >= obs.x &&
          arrow.x <= obs.x + obs.width &&
          arrow.y >= obs.y &&
          arrow.y <= obs.y + obs.height
        ) {
          // If it's a heavy arrow and hasn't pierced this obstacle yet, let it pass through
          if (arrow.arrowType === 'heavy' && (!arrow.piercedObstacles || !arrow.piercedObstacles.includes(obs.id))) {
            if (!arrow.piercedObstacles) {
              arrow.piercedObstacles = [];
            }
            arrow.piercedObstacles.push(obs.id);

            // slow down velocity on pierce
            arrow.vx *= 0.65;
            arrow.vy *= 0.65;

            // Wood / Stone splitter explosion
            const particleColor = obs.type === 'stone' ? 'rgba(156, 163, 175, 0.7)' : 'rgba(146, 64, 14, 0.7)';
            createExplosion(arrow.x, arrow.y, particleColor, 15);
            audio.playHitObstacle();

            screenShakeRef.current = Math.max(screenShakeRef.current, 6.0);
            continue; // Keep flying! Skip stopping arrow
          }

          // Otherwise, standard obstacle stopping
          hitObstacle = true;
          arrow.active = false;
          arrow.stuck = true;
          arrow.stuckType = 'obstacle';
          arrow.stuckObstacleId = obs.id;
          arrow.stuckOffset = {
            x: arrow.x - obs.x,
            y: arrow.y - obs.y
          };
          arrow.impactTime = levelTimeRef.current; // record impact time for post-hit fading trail
          audio.playHitObstacle();

          // Reset streak multiplier on obstacle hit (clean miss)
          streakRef.current = 0;
          shotHistoryRef.current.push({ hit: false, isBullseye: false, scorePct: null });

          // Splinter dust explosion
          const particleColor = obs.type === 'stone' ? 'rgba(156, 163, 175, 0.7)' : 'rgba(146, 64, 14, 0.7)';
          createExplosion(arrow.x, arrow.y, particleColor, 12);
          
          screenShakeRef.current = 8.0; // hard thud shake!
          freezeFrameLeftRef.current = 3; // short physics lag freeze (50ms)
          break;
        }
      }

      // 2. Collision with moving / static targets
      let hitTarget = false;
      if (!hitObstacle) {
        for (const t of targetsRef.current) {
          // Skip targets that have already been hit
          if (t.hit) continue;

          const dx = arrow.x - t.x;
          const dy = arrow.y - t.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= t.radius) {
            hitTarget = true;
            arrow.active = false;
            arrow.stuck = true;
            arrow.stuckType = 'target';
            arrow.stuckTargetId = t.id;
            arrow.impactTime = levelTimeRef.current; // record impact time
            
            // Relative vector of arrow head to the target center
            const hitAngle = Math.atan2(dy, dx);
            arrow.stuckOffset = {
              x: dist * Math.cos(hitAngle),
              y: dist * Math.sin(hitAngle)
            };

            // Calculate scoring rings: center is higher score, border is lower
            const scorePct = dist / t.radius;
            let hitScore = 0;
            let isBullseye = false;

            if (scorePct <= 0.15) {
              // --- Tier 1 Feedback: BULLSEYE ---
              isBullseye = true;
              
              // Increment consecutive bullseye streak multiplier
              streakRef.current += 1;
              if (streakRef.current > maxStreakRef.current) {
                maxStreakRef.current = streakRef.current;
              }
              const currentMultiplier = streakRef.current;
              hitScore = 10 * currentMultiplier;

              // Gold confetti + Red explosion particles
              createExplosion(arrow.x, arrow.y, '#FBBF24', 25);
              createExplosion(arrow.x, arrow.y, '#EF4444', 10);
              
              // Heavy hit-stop & screen shake
              screenShakeRef.current = 16.0;
              freezeFrameLeftRef.current = 6; // satisfying freeze frame (~100ms)

              // Heavy "thunk" perfect audio
              audio.playHitTarget(true);

              shotHistoryRef.current.push({ hit: true, isBullseye: true, scorePct });
            } else {
              // Streak resets on any non-bullseye hit
              streakRef.current = 0;

              if (scorePct <= 0.4) {
                // Inner Red ring (Solid hit)
                hitScore = 6;
                createExplosion(arrow.x, arrow.y, '#EF4444', 15);
                screenShakeRef.current = 9.0;
                freezeFrameLeftRef.current = 4;
                audio.playHitTarget(false);
                shotHistoryRef.current.push({ hit: true, isBullseye: false, scorePct });
              } else {
                // --- Tier 2 Feedback: Near-miss (clipped the outer blue/white ring) ---
                hitScore = scorePct <= 0.7 ? 4 : 2;
                
                // Blue/White sparks particle effect
                const sparkColor = scorePct <= 0.7 ? '#3B82F6' : '#FFFFFF';
                createExplosion(arrow.x, arrow.y, sparkColor, 10);
                createExplosion(arrow.x, arrow.y, '#E2E8F0', 6);

                screenShakeRef.current = 4.0;
                freezeFrameLeftRef.current = 2;

                // Lighter "clip" sound
                audio.playNearMiss();
                shotHistoryRef.current.push({ hit: true, isBullseye: false, scorePct });
              }
            }

            t.hit = true;

            // Score points
            addPoints(hitScore, isBullseye);
            break;
          }
        }
      }

      // 3. Collision with Ground
      if (!hitObstacle && !hitTarget && arrow.y >= GROUND_Y) {
        arrow.active = false;
        arrow.stuck = true;
        arrow.stuckType = 'ground';
        arrow.y = GROUND_Y;
        arrow.impactTime = levelTimeRef.current; // record impact time
        audio.playHitGround();

        // Streak resets on clean miss
        streakRef.current = 0;
        shotHistoryRef.current.push({ hit: false, isBullseye: false, scorePct: null });

        // Dirt explosion
        createExplosion(arrow.x, arrow.y, 'rgba(120, 113, 108, 0.6)', 8);
        screenShakeRef.current = 3.0; // thud shake on floor
      }

      // 4. Bound limits check
      if (!arrow.active) {
        // Arrow stopped flying
        stuckArrowsRef.current.push(arrow);
        activeArrowRef.current = null;
        
        // Advance state back to aiming or trigger end conditions
        evaluateGameState();
      } else if (arrow.x < -50 || arrow.x > GAME_WIDTH + 150 || arrow.y > GAME_HEIGHT + 100) {
        // Flew off limits - clean miss
        streakRef.current = 0;
        shotHistoryRef.current.push({ hit: false, isBullseye: false, scorePct: null });
        activeArrowRef.current = null;
        evaluateGameState();
      }
    }
  };

  // Helper: Trigger custom particles
  const createExplosion = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 0.5;
      particlesRef.current.push({
        x,
        y,
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle) - 1.5, // bias upwards
        size: Math.random() * 3.5 + 1.5,
        alpha: 1,
        color,
        life: Math.floor(Math.random() * 30 + 15),
        maxLife: 45
      });
    }
  };

  // Score points
  const addPoints = (points: number, isBullseye: boolean) => {
    setScore((prev) => {
      const next = prev + points;
      return next;
    });
  };

  // Check end level status (Redesigned rating system)
  const evaluateGameState = () => {
    // Find all level targets hit
    const allTargetsHit = targetsRef.current.every((t) => t.hit);
    
    if (allTargetsHit) {
      // Level cleared successfully!
      // Add bonus score for remaining arrows: +5 pts per arrow
      const finalScore = score + (arrowsRemaining * 5);
      
      // Calculate star rating according to the redesigned skill rules
      let stars = 1;
      
      const shots = shotHistoryRef.current;
      const allHitsNearBullseyeOrBetter = shots.length > 0 && shots.every(s => s.hit && s.scorePct !== null && s.scorePct <= 0.4);
      const allHitsArePerfectBullseyes = shots.length > 0 && shots.every(s => s.isBullseye);

      if (allHitsArePerfectBullseyes) {
        stars = 3; // 3 stars: full consecutive perfect streak intact!
      } else if (allHitsNearBullseyeOrBetter) {
        stars = 2; // 2 stars: all shots hit red ring or bullseye!
      } else {
        stars = 1; // 1 star: cleared (any hits within arrow limit)
      }

      setScore(finalScore);
      setStarsEarned(stars);
      setGameState('level_cleared');
      audio.playLevelUp();
    } else if (arrowsRemaining === 0 && !activeArrowRef.current) {
      // No more arrows, and targets not hit -> Fail!
      setGameState('level_failed');
      audio.playLevelFail();
    } else {
      // Play can continue shooting
      setGameState('aiming');
    }
  };

  // Mouse / Touch Aiming controls
  const handleInteractionStart = (clientX: number, clientY: number) => {
    if (gameState !== 'aiming' || arrowsRemaining <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Slingshot-like grab: click anywhere on the canvas to start aiming
    isDraggingRef.current = true;
    dragStartRef.current = { x: canvasX, y: canvasY };
    dragCurrentRef.current = { x: canvasX, y: canvasY };
    setIsDragging(true);
    setDragStart({ x: canvasX, y: canvasY });
    setDragCurrent({ x: canvasX, y: canvasY });
  };

  const handleInteractionMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    dragCurrentRef.current = { x: canvasX, y: canvasY };
    setDragCurrent({ x: canvasX, y: canvasY });
  };

  const handleInteractionEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    // Calculate launch forces (Angry Birds / slingshot style: pull back to launch forward)
    const dx = dragStartRef.current.x - dragCurrentRef.current.x;
    const dy = dragStartRef.current.y - dragCurrentRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Minimum pull threshold to avoid accidental click-drops
    if (dist < 15) return;

    // Cap pull back distance
    const cappedDist = Math.min(MAX_PULL_DIST, dist);
    const pullAngle = Math.atan2(dy, dx);

    // Speed multiplier (caps around MAX_AIM_POWER px/frame)
    const speedPower = (cappedDist / MAX_PULL_DIST) * MAX_AIM_POWER;
    
    let finalAngle = pullAngle;
    let finalSpeed = speedPower;

    // Apply exact muscle fatigue shivering noise to released arrow
    if (drawDurationRef.current > 150) {
      const fatigueOver = (drawDurationRef.current - 150) / 60;
      const tremorIntensity = Math.min(5.0, fatigueOver * 1.5);
      const shiverAngle = (Math.random() * 2 - 1) * (tremorIntensity * 0.015);
      const shiverPower = (Math.random() * 2 - 1) * (tremorIntensity * 0.35);
      finalAngle += shiverAngle;
      finalSpeed = Math.max(0.5, finalSpeed + shiverPower);
    }

    const vx = finalSpeed * Math.cos(finalAngle);
    const vy = finalSpeed * Math.sin(finalAngle);

    // Spawn and trigger arrow launch
    activeArrowRef.current = {
      id: `arrow_${Date.now()}`,
      x: ARCHER_X,
      y: ARCHER_Y,
      vx,
      vy,
      angle: finalAngle,
      active: true,
      stuck: false,
      trail: [],
      arrowType: selectedArrowType,
      piercedObstacles: []
    };

    // Bow release recoil screen shake!
    screenShakeRef.current = 4.0;

    setArrowsRemaining((prev) => prev - 1);
    setGameState('flying');
    audio.playRelease();
  };

  // Render core assets to Canvas Context
  const drawScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Apply camera screen shake (recoil, hits, muscle fatigue tremor)
    ctx.save();
    let currentShake = screenShakeRef.current;
    if (drawDurationRef.current > 150) {
      // Trembling arm fatigue shakes screen slightly
      const fatigueSec = (drawDurationRef.current - 150) / 60;
      const fatigueTremor = Math.min(4.5, 0.5 + fatigueSec * 1.2);
      currentShake = Math.max(currentShake, fatigueTremor);
    }

    if (currentShake > 0) {
      const shakeX = (Math.random() * 2 - 1) * currentShake;
      const shakeY = (Math.random() * 2 - 1) * currentShake;
      ctx.translate(shakeX, shakeY);

      // decay screen shake
      screenShakeRef.current *= 0.88;
      if (screenShakeRef.current < 0.2) {
        screenShakeRef.current = 0;
      }
    }

    // 1. SKY GRADIENT (Ambient twilight/dawn look based on level difficulty)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    if (level.id >= 8) {
      // Overcast stormy night
      skyGrad.addColorStop(0, '#0F172A'); // deep slate-900
      skyGrad.addColorStop(1, '#1E293B'); // slate-800
    } else if (level.id >= 4) {
      // Warm violet dusk
      skyGrad.addColorStop(0, '#1E1B4B'); // deep indigo-950
      skyGrad.addColorStop(0.6, '#311042'); // purple-950
      skyGrad.addColorStop(1, '#581C87'); // purple-900
    } else {
      // Classic clean sunset range
      skyGrad.addColorStop(0, '#082F49'); // deep sky-950
      skyGrad.addColorStop(0.7, '#0C4A6E'); // sky-900
      skyGrad.addColorStop(1, '#1E293B'); // slate-800
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 2. BACKGROUND MOUNTAINS (Parallax landscape depth)
    ctx.fillStyle = level.id >= 8 ? '#0B0F19' : '#111326';
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT);
    ctx.lineTo(0, 350);
    ctx.quadraticCurveTo(150, 300, 300, 380);
    ctx.quadraticCurveTo(450, 420, 600, 330);
    ctx.quadraticCurveTo(800, 260, GAME_WIDTH, 360);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.fill();

    ctx.fillStyle = level.id >= 8 ? '#141A28' : '#191C36';
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT);
    ctx.lineTo(0, 420);
    ctx.quadraticCurveTo(200, 380, 450, 440);
    ctx.quadraticCurveTo(700, 480, GAME_WIDTH, 410);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.fill();

    // 3. DRAW GROUND
    ctx.fillStyle = level.id >= 8 ? '#1E2433' : '#1E293B'; // rich dark flooring
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

    // Grass blades / highlight line on the floor top
    ctx.strokeStyle = level.id >= 8 ? '#334155' : '#38BDF8'; // cyan glowing top line or steel
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(GAME_WIDTH, GROUND_Y);
    ctx.stroke();

    // Decorative grass tufts
    ctx.fillStyle = level.id >= 8 ? '#334155' : '#1E3A8A';
    for (let i = 50; i < GAME_WIDTH; i += 180) {
      ctx.beginPath();
      ctx.moveTo(i, GROUND_Y);
      ctx.lineTo(i - 5, GROUND_Y - 10);
      ctx.lineTo(i, GROUND_Y - 2);
      ctx.lineTo(i + 4, GROUND_Y - 12);
      ctx.lineTo(i + 8, GROUND_Y);
      ctx.fill();
    }

    // 4. DRAW ARCHER PLATFORM STAND
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillRect(ARCHER_X - 40, ARCHER_Y + 40, 80, GROUND_Y - (ARCHER_Y + 40));
    ctx.strokeRect(ARCHER_X - 40, ARCHER_Y + 40, 80, GROUND_Y - (ARCHER_Y + 40));

    // 5. DRAW TARGETS ( easel stands + Concentric circles )
    targetsRef.current.forEach((t) => {
      // Draw Stand Legs
      ctx.strokeStyle = '#78350F'; // wooden brown
      ctx.lineWidth = 5;
      
      // Left leg
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x - 20, t.y + t.radius + 40);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + 20, t.y + t.radius + 40);
      ctx.stroke();

      // Supporting back beam
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x, t.y + t.radius + 30);
      ctx.stroke();

      // Shadow on ground beneath target
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y + t.radius + 40, 25, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner Target Board Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.arc(t.x + 4, t.y + 4, t.radius, 0, Math.PI * 2);
      ctx.fill();

      // Rings (drawn from outermost to innermost center)
      const colors = t.isBonus ? [
        '#4C1D95', // Rich Purple
        '#020617', // Deep Slate
        '#0891B2', // Cyan
        '#A855F7', // Magenta Purple
        '#EC4899'  // Hot Pink Bullseye!
      ] : [
        '#FFFFFF', // White outer
        '#000000', // Black ring
        '#3B82F6', // Blue ring
        '#EF4444', // Red ring
        '#FBBF24'  // Gold Bullseye
      ];

      colors.forEach((col, idx) => {
        const ringRad = t.radius * (1 - idx * 0.2);
        ctx.fillStyle = col;
        
        const isStroke = col === '#FFFFFF' || col === '#FBBF24' || col === '#4C1D95' || col === '#EC4899';
        if (isStroke) {
          ctx.strokeStyle = t.isBonus ? '#F472B6' : '#475569';
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = 'transparent';
        }

        ctx.beginPath();
        ctx.arc(t.x, t.y, ringRad, 0, Math.PI * 2);
        ctx.fill();
        if (isStroke) {
          ctx.stroke();
        }
      });

      // Struck indicator indicator (golden halo pulsing if hit)
      if (t.hit) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 6. DRAW OBSTACLES (castle stone or wooden walls)
    obstaclesRef.current.forEach((obs) => {
      // Draw Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(obs.x + 6, obs.y + 6, obs.width, obs.height);

      if (obs.type === 'stone') {
        // Castle stone tower drawing
        ctx.fillStyle = '#475569'; // steel/stone gray
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Tower crenellations/battlement teeth
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Brick patterns
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1;
        const rowHeight = 24;
        for (let currY = obs.y + rowHeight; currY < obs.y + obs.height; currY += rowHeight) {
          ctx.beginPath();
          ctx.moveTo(obs.x, currY);
          ctx.lineTo(obs.x + obs.width, currY);
          ctx.stroke();

          // vertical brick lines alternating
          const isOdd = Math.floor((currY - obs.y) / rowHeight) % 2 === 0;
          const brickWidth = 25;
          const startX = isOdd ? obs.x + brickWidth / 2 : obs.x;
          for (let currX = startX; currX < obs.x + obs.width; currX += brickWidth) {
            ctx.beginPath();
            ctx.moveTo(currX, currY - rowHeight);
            ctx.lineTo(currX, currY);
            ctx.stroke();
          }
        }
      } else {
        // Wooden blockade
        ctx.fillStyle = '#78350F'; // warm brown wood
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        
        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // wood grain lines
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 1.5;
        for (let currY = obs.y + 15; currY < obs.y + obs.height; currY += 15) {
          ctx.beginPath();
          ctx.moveTo(obs.x + 2, currY);
          ctx.lineTo(obs.x + obs.width - 2, currY);
          ctx.stroke();
        }
        // Supporting diagonal plank
        ctx.fillStyle = '#92400E';
        ctx.fillRect(obs.x + 5, obs.y + 5, 10, obs.height - 10);
      }
    });

    // 7. DRAW PARTICLES
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 8. DRAW ACTIVE FLIGHT ARROW
    const activeArrow = activeArrowRef.current;
    if (activeArrow && activeArrow.active) {
      drawArrow(ctx, activeArrow.x, activeArrow.y, activeArrow.angle, activeArrow.trail, activeArrow.arrowType || 'standard');
    }

    // 9. DRAW STUCK ARROWS
    stuckArrowsRef.current.forEach((arr) => {
      let renderX = arr.x;
      let renderY = arr.y;

      // If stuck to a target, its position shifts dynamically as the target moves!
      if (arr.stuckType === 'target' && arr.stuckTargetId) {
        const target = targetsRef.current.find((t) => t.id === arr.stuckTargetId);
        if (target) {
          renderX = target.x + (arr.stuckOffset?.x || 0);
          renderY = target.y + (arr.stuckOffset?.y || 0);
        }
      } else if (arr.stuckType === 'obstacle' && arr.stuckObstacleId) {
        const obs = obstaclesRef.current.find((o) => o.id === arr.stuckObstacleId);
        if (obs) {
          renderX = obs.x + (arr.stuckOffset?.x || 0);
          renderY = obs.y + (arr.stuckOffset?.y || 0);
        }
      }

      drawArrow(ctx, renderX, renderY, arr.angle, [], arr.arrowType || 'standard');

      // Draw fading trajectory trail for 60 frames (~1 second) after impact
      if (arr.trail && arr.trail.length > 1 && arr.impactTime !== undefined) {
        const elapsed = levelTimeRef.current - arr.impactTime;
        if (elapsed < 60) {
          const alpha = Math.max(0, 0.45 * (1 - elapsed / 60));
          ctx.save();
          
          let trailColor = `rgba(251, 191, 36, ${alpha})`; // Standard: Gold
          if (arr.arrowType === 'heavy') {
            trailColor = `rgba(168, 85, 247, ${alpha})`; // Heavy: Purple
          } else if (arr.arrowType === 'light') {
            trailColor = `rgba(6, 182, 212, ${alpha})`; // Light: Cyan
          }

          ctx.strokeStyle = trailColor;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(arr.trail[0].x, arr.trail[0].y);
          for (let i = 1; i < arr.trail.length; i++) {
            ctx.lineTo(arr.trail[i].x, arr.trail[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    });

    // 10. DRAW ARCHER & AIMING TRAJECTORY PREVIEW
    let aimAngle = 0;
    let aimPower = 0;

    if (isDraggingRef.current) {
      // Slingshot angle
      const dx = dragStartRef.current.x - dragCurrentRef.current.x;
      const dy = dragStartRef.current.y - dragCurrentRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const cappedDist = Math.min(MAX_PULL_DIST, dist);
      
      aimAngle = Math.atan2(dy, dx);
      aimPower = (cappedDist / MAX_PULL_DIST) * MAX_AIM_POWER;

      // Add Muscle Fatigue shivering to the aiming preview coordinates
      if (drawDurationRef.current > 150) {
        const fatigueOver = (drawDurationRef.current - 150) / 60; // seconds over limit
        const tremorIntensity = Math.min(5.0, fatigueOver * 1.5);
        const shiverAngle = Math.sin(levelTimeRef.current * 0.4) * (tremorIntensity * 0.015);
        const shiverPower = Math.cos(levelTimeRef.current * 0.55) * (tremorIntensity * 0.35);
        aimAngle += shiverAngle;
        aimPower = Math.max(0, aimPower + shiverPower);
      }

      // Draw Trajectory preview (if permitted in level specs)
      if (level.allowTrajectory && aimPower > 0) {
        drawTrajectory(ctx, ARCHER_X, ARCHER_Y, aimPower * Math.cos(aimAngle), aimPower * Math.sin(aimAngle));
      }
    }

    drawArcher(ctx, ARCHER_X, ARCHER_Y, aimAngle, aimPower, isDraggingRef.current);

    // Restore camera matrix from screen shake save
    ctx.restore();
  };

  // Trajectory path prediction physics matching exactly the flight loop
  const drawTrajectory = (ctx: CanvasRenderingContext2D, startX: number, startY: number, vx: number, vy: number) => {
    let x = startX;
    let y = startY;
    let currVx = vx;
    let currVy = vy;

    // Apply exact ballistics properties of selectedArrowType
    let gravity = 0.15;
    let airResistance = 0.994;
    let windInfluenceFactor = 0.0065;

    if (selectedArrowType === 'heavy') {
      gravity = 0.24;
      airResistance = 0.992;
      windInfluenceFactor = 0.0025;
    } else if (selectedArrowType === 'light') {
      gravity = 0.095;
      airResistance = 0.996;
      windInfluenceFactor = 0.0125;
    }

    ctx.save();
    
    let previewColor = 'rgba(251, 191, 36, 0.65)'; // Gold
    if (selectedArrowType === 'heavy') {
      previewColor = 'rgba(168, 85, 247, 0.7)'; // Purple
    } else if (selectedArrowType === 'light') {
      previewColor = 'rgba(6, 182, 212, 0.7)'; // Cyan
    }

    ctx.strokeStyle = previewColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Run simulation 110 steps forward
    for (let step = 0; step < 110; step++) {
      currVy += gravity;
      currVx *= airResistance;
      currVy *= airResistance;

      if (level.windEnabled) {
        currVx += currentWind * windInfluenceFactor;
      }

      x += currVx;
      y += currVy;

      ctx.lineTo(x, y);

      // Stop trajectory arc if it plunges below ground to look tidy
      if (y >= GROUND_Y) {
        break;
      }
    }
    ctx.stroke();
    ctx.restore();
  };

  // Draw arrow shape
  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, trail: Vector2D[] = [], arrowType: 'standard' | 'heavy' | 'light' = 'standard') => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Arrow shafts (colored/styled by type)
    let shaftColor = '#E2E8F0'; // steel
    let shaftWidth = 2.5;
    let headColor = '#94A3B8';
    let fletchColor = '#EF4444'; // Orange-Red standard

    if (arrowType === 'heavy') {
      shaftColor = '#4B5563'; // dark iron grey
      shaftWidth = 3.8; // thicker shaft
      headColor = '#7C3AED'; // violet heavy broadhead
      fletchColor = '#DC2626'; // crimson
    } else if (arrowType === 'light') {
      shaftColor = '#FEF08A'; // light yellow bamboo
      shaftWidth = 1.8; // thin light shaft
      headColor = '#06B6D4'; // cyan sleek light head
      fletchColor = '#0891B2'; // cyan fletchings
    }

    ctx.strokeStyle = shaftColor;
    ctx.lineWidth = shaftWidth;
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(15, 0);
    ctx.stroke();

    // Arrow Fletchings (three flight feathers at back)
    ctx.fillStyle = fletchColor;
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(-30, 4);
    ctx.lineTo(-24, 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(-30, -4);
    ctx.lineTo(-24, -4);
    ctx.closePath();
    ctx.fill();

    // Arrow Head (triangle/shape at front)
    ctx.fillStyle = headColor;
    ctx.beginPath();
    if (arrowType === 'heavy') {
      // Large heavy diamond broadhead
      ctx.moveTo(18, 0);
      ctx.lineTo(7, -5.5);
      ctx.lineTo(9, 0);
      ctx.lineTo(7, 5.5);
    } else {
      // Standard sleek triangle head
      ctx.moveTo(15, 0);
      ctx.lineTo(7, -3.5);
      ctx.lineTo(7, 3.5);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Render motion trail lines
    if (trail.length > 1) {
      ctx.save();
      let smokeColor = 'rgba(148, 163, 184, 0.18)';
      if (arrowType === 'heavy') {
        smokeColor = 'rgba(139, 92, 246, 0.14)';
      } else if (arrowType === 'light') {
        smokeColor = 'rgba(34, 211, 238, 0.16)';
      }
      ctx.strokeStyle = smokeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  // Render the vector skeletal archer
  const drawArcher = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    aimAngle: number,
    aimPower: number,
    drawing: boolean
  ) => {
    ctx.save();
    // Move to archer base standing reference
    ctx.translate(x, y);

    // 1. Stand legs (thin black line art)
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Left leg
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, 35);
    ctx.stroke();

    // Right leg
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(12, 35);
    ctx.stroke();

    // 2. Torso (body line)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -28);
    ctx.stroke();

    // 3. Head (solid circles)
    ctx.fillStyle = '#FBBF24'; // bright yellow stylized skin
    ctx.beginPath();
    ctx.arc(0, -38, 10, 0, Math.PI * 2);
    ctx.fill();

    // Cute Archer Archery Bandana/Helmet cap (green/forest theme)
    ctx.fillStyle = '#065F46'; // deep emerald emerald green cap
    ctx.beginPath();
    ctx.arc(0, -39, 10, Math.PI, 0); // top half
    ctx.closePath();
    ctx.fill();
    // Bandana trailing ribbon
    ctx.strokeStyle = '#047857';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -39);
    ctx.quadraticCurveTo(-18, -36, -20, -42);
    ctx.stroke();

    // 4. DRAW BOW & ARROW GRIP
    // Rotate arm bone coordinates based on launch aiming angle!
    ctx.translate(0, -18); // move origin to shoulder pivot height
    
    // Default resting angle if not actively pulling bow
    const activeAngle = drawing ? aimAngle : -Math.PI / 8; 
    const pullTension = drawing ? (aimPower / MAX_AIM_POWER) * 20 : 0; // visual string draw displacement (max 20px)

    ctx.save();
    ctx.rotate(activeAngle);

    // Draw Bow (curved arc attached to holding arm)
    ctx.strokeStyle = '#92400E'; // stout rich wood
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(28, 0, 35, -Math.PI * 0.4, Math.PI * 0.4); // arc curve
    ctx.stroke();

    // Metallic reinforcement on bow grip center
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(28, 0, 8, -Math.PI * 0.1, Math.PI * 0.1);
    ctx.stroke();

    // Draw Bowstring (stretches with pull tension)
    ctx.strokeStyle = '#F1F5F9'; // high contrast string white
    ctx.lineWidth = 1.5;
    
    // Top tip of bow
    const bowTopX = 28 + Math.cos(-Math.PI * 0.4) * 35;
    const bowTopY = Math.sin(-Math.PI * 0.4) * 35;
    
    // Bottom tip of bow
    const bowBotX = 28 + Math.cos(Math.PI * 0.4) * 35;
    const bowBotY = Math.sin(Math.PI * 0.4) * 35;

    // Nock position (where arrow sits on string) pulled backwards
    const nockX = 28 - pullTension;
    const nockY = 0;

    ctx.beginPath();
    ctx.moveTo(bowTopX, bowTopY);
    ctx.lineTo(nockX, nockY); // String pulled back to hand
    ctx.lineTo(bowBotX, bowBotY);
    ctx.stroke();

    // 5. Drawing hand & arrow visual resting on the string
    if (drawing) {
      // Draw arrow nocked on bowstring (so they see the arrow before firing!)
      ctx.save();
      ctx.translate(28, 0);
      drawArrow(ctx, -pullTension, 0, 0); // arrow rests rotated inside bow shoulder frame
      ctx.restore();
    }

    // 6. Draw Archer holding Arm (extending forward to bow center)
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(26, 0); // holding arm directly to bow center
    ctx.stroke();

    // 7. Drawing shoulder Arm (holds string nock)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Draw arm bending back to the pulled string position
    const handX = 28 - pullTension;
    const handY = 0;
    ctx.lineTo(handX - 6, handY + 6); // elbow bend
    ctx.lineTo(handX, handY); // hand on string
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  };

  return (
    <div className="flex flex-col items-center justify-center font-sans relative w-full max-w-5xl mx-auto px-1 sm:px-4">
      
      {/* Game HUD */}
      <div className="w-full mb-4 z-10">
        <GameHUD
          level={level}
          arrowsRemaining={arrowsRemaining}
          score={score}
          targetsHitCount={targetsRef.current.filter((t) => t.hit).length}
          totalTargetsCount={targetsRef.current.length}
          currentWind={currentWind}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onRestart={handleRestart}
          onPause={() => {}}
          onBackToSelector={onBackToSelector}
        />
      </div>

      {/* Physics Canvas Stage */}
      <div className="relative w-full canvas-container rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80">
        <canvas
          id="archery-canvas"
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="w-full h-auto bg-slate-900 block cursor-crosshair select-none"
          onMouseDown={(e) => handleInteractionStart(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY);
            }
          }}
        />

        {/* Floating Arrow Selection & Streak Combos Overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pointer-events-none select-none z-10">
          {/* Arrow Selector Rack */}
          <div className="pointer-events-auto bg-slate-950/85 border border-slate-800/80 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl backdrop-blur-md">
            {/* Standard Arrow Button */}
            <button
              onClick={() => setSelectedArrowType('standard')}
              className={`px-3 py-2 rounded-xl flex items-center gap-2 font-display text-[11px] sm:text-xs font-bold transition-all border cursor-pointer select-none ${
                selectedArrowType === 'standard'
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              STANDARD <span className="opacity-40 font-mono font-normal ml-0.5 hidden sm:inline">(1)</span>
            </button>

            {/* Light Arrow Button */}
            {level.id >= 5 ? (
              <button
                onClick={() => setSelectedArrowType('light')}
                className={`px-3 py-2 rounded-xl flex items-center gap-2 font-display text-[11px] sm:text-xs font-bold transition-all border cursor-pointer select-none ${
                  selectedArrowType === 'light'
                    ? 'bg-cyan-400 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                LIGHT <span className="opacity-40 font-mono font-normal ml-0.5 hidden sm:inline">(2)</span>
              </button>
            ) : (
              <div className="px-3 py-2 rounded-xl flex items-center gap-1.5 font-display text-[11px] sm:text-xs font-semibold text-slate-600 bg-slate-900/30 border border-slate-900/20 cursor-not-allowed">
                <Lock className="w-3 h-3" />
                LIGHT <span className="font-mono text-[9px] opacity-65 ml-0.5">(Lvl 5)</span>
              </div>
            )}

            {/* Heavy Arrow Button */}
            {level.id >= 7 ? (
              <button
                onClick={() => setSelectedArrowType('heavy')}
                className={`px-3 py-2 rounded-xl flex items-center gap-2 font-display text-[11px] sm:text-xs font-bold transition-all border cursor-pointer select-none ${
                  selectedArrowType === 'heavy'
                    ? 'bg-purple-500 text-white border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                HEAVY <span className="opacity-40 font-mono font-normal ml-0.5 hidden sm:inline">(3)</span>
              </button>
            ) : (
              <div className="px-3 py-2 rounded-xl flex items-center gap-1.5 font-display text-[11px] sm:text-xs font-semibold text-slate-600 bg-slate-900/30 border border-slate-900/20 cursor-not-allowed">
                <Lock className="w-3 h-3" />
                HEAVY <span className="font-mono text-[9px] opacity-65 ml-0.5">(Lvl 7)</span>
              </div>
            )}
          </div>

          {/* Streak Multiplier Bubble */}
          <AnimatePresence>
            {streakRef.current > 1 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1.1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                className="bg-amber-400 text-slate-950 font-display font-black text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.55)] border border-amber-300 border-t-2"
              >
                <Flame className="w-4 h-4 fill-slate-950 animate-bounce text-red-600" />
                <span className="tracking-wide uppercase font-extrabold">{streakRef.current}x MULTIPLIER!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating overlays while aiming */}
        {gameState === 'aiming' && arrowsRemaining > 0 && !isDragging && (
          <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 text-center pointer-events-none select-none animate-pulse-slow">
            <div className="px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold text-slate-300 shadow-xl tracking-wider">
              DRAG BACK & RELEASE TO SHOOT
            </div>
          </div>
        )}

        {/* Fatigue Warning Banner */}
        <AnimatePresence>
          {fatigueWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -10, x: '-50%' }}
              className="absolute top-6 left-1/2 pointer-events-none select-none z-10"
            >
              <div className="px-4 py-2 rounded-xl bg-red-950/90 border border-red-500/40 text-[11px] font-mono font-bold text-red-200 shadow-lg flex items-center gap-2 tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                MUSCLE FATIGUE: BOW SHAKING!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Overlays: Level Cleared or Level Failed */}
        <AnimatePresence>
          {gameState === 'level_cleared' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-20 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="max-w-md w-full bg-slate-900 border border-emerald-500/30 p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6"
              >
                {/* Crown/Trophy Badge */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                  <Trophy className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">Range Completed</div>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                    SUCCESSFUL HIT!
                  </h3>
                </div>

                {/* Stars presentation */}
                <div className="flex justify-center items-center gap-3">
                  {[1, 2, 3].map((s) => (
                    <motion.div
                      key={s}
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: s <= starsEarned ? 1.15 : 0.85, rotate: 0 }}
                      transition={{ delay: 0.2 + s * 0.12, type: 'spring' }}
                    >
                      <Star
                        className={`w-10 h-10 ${
                          s <= starsEarned
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                            : 'text-slate-800'
                        }`}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Stars explanation label */}
                <div className="text-xs text-slate-400 font-sans tracking-wide leading-relaxed py-1">
                  {starsEarned === 3 && (
                    <span className="text-amber-400 font-semibold flex items-center justify-center gap-1.5 bg-amber-400/5 border border-amber-400/10 py-1.5 px-3 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 fill-amber-400" />
                      GRANDMASTER: Perfect Bullseye Streak!
                    </span>
                  )}
                  {starsEarned === 2 && (
                    <span className="text-cyan-400 font-semibold flex items-center justify-center gap-1.5 bg-cyan-400/5 border border-cyan-400/10 py-1.5 px-3 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 fill-cyan-400" />
                      SHARPSHOOTER: All shots hit Red or Bullseyes!
                    </span>
                  )}
                  {starsEarned === 1 && (
                    <span className="text-slate-300 bg-slate-900 border border-slate-800 py-1.5 px-3 rounded-xl block">
                      CLEARED: All target pins successfully struck!
                    </span>
                  )}
                </div>

                {/* Score Summary */}
                <div className="py-4 px-6 rounded-2xl bg-slate-950/50 border border-slate-800/60 font-mono text-sm text-slate-300 space-y-2">
                  <div className="flex justify-between">
                    <span>Base Hits Score:</span>
                    <span className="text-white font-bold">{score - (arrowsRemaining * 5)} pts</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Arrow Bonus ({arrowsRemaining} left):</span>
                    <span className="font-bold">+{arrowsRemaining * 5} pts</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between text-base">
                    <span className="font-display font-bold text-slate-200">Total Score:</span>
                    <span className="text-amber-400 font-extrabold text-glow">{score} pts</span>
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleRestart}
                    className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 font-display font-bold text-xs sm:text-sm text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2 select-none"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RETRY
                  </button>

                  <button
                    onClick={() => onLevelComplete(level.id, starsEarned)}
                    className="px-5 py-3.5 bg-amber-400 hover:bg-amber-300 font-display font-bold text-xs sm:text-sm text-slate-950 hover:shadow-lg hover:shadow-amber-400/20 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none"
                  >
                    NEXT LEVEL
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'level_failed' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-20 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 15 }}
                className="max-w-md w-full bg-slate-900 border border-rose-500/30 p-6 sm:p-8 rounded-3xl shadow-2xl text-center space-y-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono tracking-widest text-rose-500 uppercase font-bold">Failed Objective</div>
                  <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                    OUT OF ARROWS!
                  </h3>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-sans max-w-xs mx-auto">
                  All target pins must be struck to clear the range. Practice drawing with optimal arc adjustments.
                </p>

                {/* Score achieved vs Target goal */}
                <div className="py-3 px-5 rounded-xl bg-slate-950/50 border border-slate-800/60 font-mono text-xs text-slate-400 space-y-1.5 max-w-xs mx-auto">
                  <div className="flex justify-between">
                    <span>Minimum Target:</span>
                    <span className="text-slate-300 font-bold">{level.targetScore} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Score:</span>
                    <span className="text-rose-400 font-bold">{score} pts</span>
                  </div>
                </div>

                {/* CTA buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={onBackToSelector}
                    className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 font-display font-bold text-xs sm:text-sm text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer select-none"
                  >
                    LEVELS
                  </button>

                  <button
                    onClick={handleRestart}
                    className="px-5 py-3.5 bg-rose-500 hover:bg-rose-400 text-white font-display font-bold text-xs sm:text-sm hover:shadow-lg hover:shadow-rose-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 select-none"
                  >
                    <RotateCcw className="w-4 h-4" />
                    RETRY STAGE
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick hotkeys overlay */}
      <div className="w-full text-center text-[10px] font-mono text-slate-500 mt-3 hidden sm:block">
        TIPS: PULL FURTHER BACK TO INCREASE SPEED • PRESS <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-sans font-bold">R</kbd> TO INSTANTLY RETRY STAGE
      </div>
    </div>
  );
}
