import { Level } from '../types';

export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 550;
export const GROUND_Y = 500;
export const ARCHER_X = 100;
export const ARCHER_Y = 410; // Archer's standing position (should be slightly above ground)

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "Onboarding Range",
    description: "Welcome to the range! Take aim at the main static target. Unlimited arrows, full trajectory guide. Can you find the hidden bonus target tucked behind the high wooden ledge?",
    arrowLimit: 99,
    windEnabled: false,
    windVariable: false,
    allowTrajectory: true,
    targetScore: 10,
    starRatings: { three: 30, two: 20, one: 8 },
    targets: [
      {
        id: "t1_1",
        x: 720,
        y: 350,
        radius: 45,
        movementType: "static",
        speed: 0,
        range: 0
      },
      {
        id: "t1_2",
        x: 930,
        y: 120,
        radius: 25,
        movementType: "static",
        speed: 0,
        range: 0,
        isBonus: true
      }
    ],
    obstacles: [
      {
        id: "obs1_1",
        x: 880,
        y: 150,
        width: 35,
        height: 100,
        type: "wood"
      }
    ]
  },
  {
    id: 2,
    name: "Wind-Reading (Intro)",
    description: "A constant headwind is blowing from right to left (-3.5 knots). Check the compass at the top, and aim slightly further right of the target to compensate.",
    arrowLimit: 5,
    windEnabled: true,
    windVariable: false,
    baseWind: -3.5,
    allowTrajectory: true,
    targetScore: 10,
    starRatings: { three: 30, two: 18, one: 8 },
    targets: [
      {
        id: "t2_1",
        x: 800,
        y: 320,
        radius: 42,
        movementType: "static",
        speed: 0,
        range: 0
      }
    ],
    obstacles: []
  },
  {
    id: 3,
    name: "Wind-Reading (Test)",
    description: "The wind is stronger (-4.8 knots) and the trajectory line is now disabled! Rely on your muscle memory, judge the wind gauge, and take your shot.",
    arrowLimit: 5,
    windEnabled: true,
    windVariable: false,
    baseWind: -4.8,
    allowTrajectory: false,
    targetScore: 10,
    starRatings: { three: 30, two: 18, one: 8 },
    targets: [
      {
        id: "t3_1",
        x: 800,
        y: 320,
        radius: 42,
        movementType: "static",
        speed: 0,
        range: 0
      }
    ],
    obstacles: []
  },
  {
    id: 4,
    name: "Arc-Timing (Intro)",
    description: "No wind here, but the target is sliding vertically. Watch its trajectory cycle and release your arrow to hit it on the move. Full trajectory line is active.",
    arrowLimit: 5,
    windEnabled: false,
    windVariable: false,
    allowTrajectory: true,
    targetScore: 12,
    starRatings: { three: 35, two: 20, one: 8 },
    targets: [
      {
        id: "t4_1",
        x: 820,
        y: 300,
        radius: 40,
        movementType: "vertical",
        speed: 1.2,
        range: 100
      }
    ],
    obstacles: []
  },
  {
    id: 5,
    name: "Arc-Timing (Test)",
    description: "No trajectory guide, and the target is moving in a fast circular orbit! Anticipate where the target will be when your arrow arrives.",
    arrowLimit: 5,
    windEnabled: false,
    windVariable: false,
    allowTrajectory: false,
    targetScore: 12,
    starRatings: { three: 35, two: 20, one: 8 },
    targets: [
      {
        id: "t5_1",
        x: 820,
        y: 280,
        radius: 38,
        movementType: "circular",
        speed: 1.8,
        range: 80
      }
    ],
    obstacles: []
  },
  {
    id: 6,
    name: "Efficiency (Intro)",
    description: "Three targets, but only five arrows. Hitting consecutive bullseyes awards a score multiplier (2x, 3x...). Maintain a perfect streak to get 3 stars!",
    arrowLimit: 5,
    windEnabled: false,
    windVariable: false,
    allowTrajectory: true,
    targetScore: 20,
    starRatings: { three: 45, two: 25, one: 10 },
    targets: [
      {
        id: "t6_1",
        x: 650,
        y: 380,
        radius: 35,
        movementType: "static",
        speed: 0,
        range: 0
      },
      {
        id: "t6_2",
        x: 800,
        y: 260,
        radius: 35,
        movementType: "static",
        speed: 0,
        range: 0
      },
      {
        id: "t6_3",
        x: 920,
        y: 150,
        radius: 35,
        movementType: "static",
        speed: 0,
        range: 0
      }
    ],
    obstacles: []
  },
  {
    id: 7,
    name: "Wind + Arc Combo",
    description: "A constant tailwind (+3.2 knots) and a moving vertical target. Heavy and Light arrow selection is unlocked! Light arrows are fast but drift more; Heavy arrows are stable.",
    arrowLimit: 5,
    windEnabled: true,
    windVariable: false,
    baseWind: 3.2,
    allowTrajectory: false,
    targetScore: 12,
    starRatings: { three: 35, two: 20, one: 8 },
    targets: [
      {
        id: "t7_1",
        x: 850,
        y: 300,
        radius: 38,
        movementType: "vertical",
        speed: 1.5,
        range: 90
      }
    ],
    obstacles: [
      {
        id: "obs7_1",
        x: 480,
        y: 380,
        width: 60,
        height: 120,
        type: "wood"
      }
    ]
  },
  {
    id: 8,
    name: "Efficiency (Test)",
    description: "Three targets at different heights, and exactly three arrows. No margin for error! Maintain your focus and hit every single shot.",
    arrowLimit: 3,
    windEnabled: false,
    windVariable: false,
    allowTrajectory: false,
    targetScore: 15,
    starRatings: { three: 40, two: 22, one: 8 },
    targets: [
      {
        id: "t8_1",
        x: 600,
        y: 400,
        radius: 32,
        movementType: "static",
        speed: 0,
        range: 0
      },
      {
        id: "t8_2",
        x: 760,
        y: 270,
        radius: 32,
        movementType: "static",
        speed: 0,
        range: 0
      },
      {
        id: "t8_3",
        x: 910,
        y: 140,
        radius: 32,
        movementType: "static",
        speed: 0,
        range: 0
      }
    ],
    obstacles: []
  },
  {
    id: 9,
    name: "Gentle Final Exam",
    description: "An easy exam before the finale. A slowly drifting wind, a slow moving horizontal target, and 4 arrows. Try Light arrows to pierce the wind or Heavy arrows to stabilize the arc.",
    arrowLimit: 4,
    windEnabled: true,
    windVariable: true,
    baseWind: 1.5,
    windAmplitude: 1.5,
    windFrequency: 0.005,
    allowTrajectory: false,
    targetScore: 12,
    starRatings: { three: 35, two: 20, one: 8 },
    targets: [
      {
        id: "t9_1",
        x: 820,
        y: 350,
        radius: 35,
        movementType: "horizontal",
        speed: 1.0,
        range: 80
      }
    ],
    obstacles: []
  },
  {
    id: 10,
    name: "Grandmaster Trial",
    description: "The ultimate trial. Strong shifting winds, a fast circular-orbiting target, and a massive stone wall requiring a steep Heavy-arc or smart high launch. Good luck, Grandmaster!",
    arrowLimit: 4,
    windEnabled: true,
    windVariable: true,
    baseWind: -2.5,
    windAmplitude: 3.0,
    windFrequency: 0.01,
    allowTrajectory: false,
    targetScore: 15,
    starRatings: { three: 40, two: 22, one: 8 },
    targets: [
      {
        id: "t10_1",
        x: 880,
        y: 300,
        radius: 35,
        movementType: "circular",
        speed: 2.2,
        range: 80
      }
    ],
    obstacles: [
      {
        id: "obs10_1",
        x: 520,
        y: 160,
        width: 60,
        height: 340,
        type: "stone"
      }
    ]
  }
];
