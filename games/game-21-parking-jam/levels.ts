import type {
  ParkingJamCarConfig,
  ParkingJamCarType,
  ParkingJamDirection,
  ParkingJamLevelConfig,
  ParkingJamRawLevelConfig,
} from './types';
import { generateParkingJamLateLevels } from './level-generation';

const COLORS = [
  0xf97316,
  0x0ea5e9,
  0x84cc16,
  0xec4899,
  0xf59e0b,
  0x14b8a6,
  0x8b5cf6,
  0xef4444,
  0x22c55e,
  0x6366f1,
  0x06b6d4,
  0xeab308,
];

const CAR_TYPES: ParkingJamCarType[] = ['sedan', 'suv', 'taxi', 'pickup', 'van', 'bus', 'truck'];

const car = (
  id: string,
  axis: 'h' | 'v',
  length: 2 | 3,
  row: number,
  col: number,
  colorIndex: number,
  allowedExitDirections: ParkingJamDirection[],
  carType?: ParkingJamCarType
): ParkingJamCarConfig => ({
  id,
  axis,
  length,
  row,
  col,
  color: COLORS[colorIndex % COLORS.length],
  carType: carType ?? CAR_TYPES[colorIndex % CAR_TYPES.length],
  allowedExitDirections,
});

const L = (
  level: number,
  gridSize: number,
  cars: ParkingJamCarConfig[],
  config: Omit<ParkingJamRawLevelConfig, 'level' | 'gridSize' | 'cars'>
): ParkingJamRawLevelConfig => ({
  level,
  gridSize,
  cars,
  ...config,
});

const TWO_WAY_H: ParkingJamDirection[] = ['left', 'right'];
const TWO_WAY_V: ParkingJamDirection[] = ['up', 'down'];

const PARKING_JAM_BASE_LEVELS: ParkingJamRawLevelConfig[] = [
  L(
    0,
    5,
    [
      car('A', 'h', 2, 2, 1, 0, TWO_WAY_H),
      car('B', 'v', 2, 0, 0, 1, TWO_WAY_V),
      car('C', 'v', 2, 1, 3, 2, TWO_WAY_V),
    ],
    {
      objectiveType: 'clear_all',
      blockedGateSegments: [],
      gatingProfile: 'none',
      oneWayRatio: 0,
      dependencyDepth: 1,
      difficulty: 1,
    }
  ),

  L(1, 5, [
    car('A', 'h', 2, 2, 1, 0, TWO_WAY_H),
    car('B', 'v', 2, 0, 0, 1, TWO_WAY_V),
    car('C', 'v', 2, 1, 3, 2, TWO_WAY_V),
    car('D', 'h', 2, 4, 2, 3, TWO_WAY_H),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0,
    dependencyDepth: 1,
    difficulty: 1,
  }),

  L(2, 5, [
    car('A', 'h', 2, 2, 0, 0, TWO_WAY_H),
    car('B', 'v', 2, 0, 2, 1, TWO_WAY_V),
    car('C', 'h', 2, 1, 3, 2, TWO_WAY_H),
    car('D', 'v', 2, 3, 1, 3, TWO_WAY_V),
    car('E', 'h', 2, 4, 2, 4, TWO_WAY_H),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.1,
    dependencyDepth: 2,
    difficulty: 2,
  }),

  L(3, 5, [
    car('A', 'h', 2, 1, 1, 0, TWO_WAY_H),
    car('B', 'v', 3, 0, 3, 1, TWO_WAY_V),
    car('C', 'h', 2, 3, 0, 2, TWO_WAY_H),
    car('D', 'v', 2, 2, 2, 3, TWO_WAY_V),
    car('E', 'v', 2, 0, 0, 4, TWO_WAY_V),
    car('F', 'h', 2, 4, 2, 5, TWO_WAY_H),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.2,
    dependencyDepth: 2,
    difficulty: 2,
  }),

  L(4, 6, [
    car('A', 'h', 2, 2, 2, 0, TWO_WAY_H),
    car('B', 'v', 2, 0, 1, 1, TWO_WAY_V),
    car('C', 'v', 3, 1, 4, 2, TWO_WAY_V),
    car('D', 'h', 3, 4, 1, 3, TWO_WAY_H),
    car('E', 'h', 2, 0, 3, 4, TWO_WAY_H),
    car('F', 'v', 2, 3, 0, 5, TWO_WAY_V),
    car('G', 'h', 2, 5, 3, 6, TWO_WAY_H),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.3,
    dependencyDepth: 3,
    difficulty: 3,
  }),

  L(5, 6, [
    car('A', 'h', 2, 2, 1, 0, TWO_WAY_H),
    car('B', 'v', 2, 0, 2, 1, TWO_WAY_V),
    car('C', 'v', 2, 1, 4, 2, TWO_WAY_V),
    car('D', 'h', 2, 3, 3, 3, TWO_WAY_H),
    car('E', 'h', 3, 5, 0, 4, TWO_WAY_H),
    car('F', 'v', 3, 2, 0, 5, TWO_WAY_V),
    car('G', 'h', 2, 0, 4, 6, TWO_WAY_H),
    car('H', 'v', 2, 4, 5, 7, TWO_WAY_V),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.35,
    dependencyDepth: 3,
    difficulty: 3,
  }),

  L(6, 6, [
    car('X', 'h', 2, 3, 2, 0, TWO_WAY_H),
    car('A', 'v', 3, 0, 3, 1, TWO_WAY_V),
    car('B', 'v', 2, 1, 0, 2, TWO_WAY_V),
    car('C', 'h', 2, 2, 0, 3, TWO_WAY_H),
    car('D', 'h', 3, 5, 1, 4, TWO_WAY_H),
    car('E', 'v', 2, 0, 5, 5, TWO_WAY_V),
    car('F', 'v', 3, 1, 5, 6, TWO_WAY_V),
    car('G', 'h', 2, 4, 3, 7, TWO_WAY_H),
    car('H', 'v', 2, 4, 0, 8, TWO_WAY_V),
  ], {
    objectiveType: 'exit_target',
    targetCarId: 'X',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.4,
    dependencyDepth: 3,
    difficulty: 4,
  }),

  L(7, 6, [
    car('A', 'h', 2, 2, 2, 0, TWO_WAY_H),
    car('B', 'v', 3, 0, 0, 1, TWO_WAY_V),
    car('C', 'v', 2, 0, 3, 2, TWO_WAY_V),
    car('D', 'h', 3, 4, 2, 3, TWO_WAY_H),
    car('E', 'h', 2, 0, 4, 4, TWO_WAY_H),
    car('F', 'v', 2, 2, 5, 5, TWO_WAY_V),
    car('G', 'h', 2, 5, 0, 6, TWO_WAY_H),
    car('H', 'v', 2, 2, 1, 7, TWO_WAY_V),
    car('I', 'h', 2, 1, 4, 8, TWO_WAY_H),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.4,
    dependencyDepth: 4,
    difficulty: 4,
  }),

  L(8, 6, [
    car('A', 'h', 3, 2, 0, 0, TWO_WAY_H),
    car('B', 'v', 2, 0, 1, 1, TWO_WAY_V),
    car('C', 'v', 3, 1, 4, 2, TWO_WAY_V),
    car('D', 'h', 2, 3, 2, 3, TWO_WAY_H),
    car('E', 'v', 2, 4, 0, 4, TWO_WAY_V),
    car('F', 'h', 2, 5, 3, 5, TWO_WAY_H),
    car('G', 'v', 2, 0, 5, 6, TWO_WAY_V),
    car('H', 'h', 2, 1, 2, 7, TWO_WAY_H),
    car('I', 'v', 2, 3, 5, 8, TWO_WAY_V),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.45,
    dependencyDepth: 4,
    difficulty: 4,
  }),

  L(9, 6, [
    car('A', 'h', 2, 2, 1, 0, ['right']),
    car('B', 'v', 2, 0, 0, 1, ['down']),
    car('C', 'v', 3, 1, 3, 2, TWO_WAY_V),
    car('D', 'h', 3, 4, 1, 3, TWO_WAY_H),
    car('E', 'v', 2, 2, 5, 4, ['up']),
    car('F', 'h', 2, 0, 4, 5, ['left']),
    car('G', 'v', 2, 3, 0, 6, TWO_WAY_V),
    car('H', 'h', 2, 5, 3, 7, TWO_WAY_H),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.5,
    dependencyDepth: 4,
    difficulty: 5,
  }),

  L(10, 6, [
    car('X', 'v', 2, 2, 2, 0, ['up']),
    car('A', 'h', 2, 2, 0, 1, TWO_WAY_H),
    car('B', 'h', 2, 1, 2, 2, TWO_WAY_H),
    car('C', 'v', 2, 0, 4, 3, TWO_WAY_V),
    car('D', 'h', 3, 5, 1, 4, TWO_WAY_H),
    car('E', 'v', 3, 1, 5, 5, TWO_WAY_V),
    car('F', 'h', 2, 4, 3, 6, TWO_WAY_H),
    car('G', 'v', 2, 3, 0, 7, TWO_WAY_V),
    car('H', 'h', 2, 0, 1, 8, TWO_WAY_H),
  ], {
    objectiveType: 'exit_target',
    targetCarId: 'X',
    blockedGateSegments: [],
    gatingProfile: 'none',
    oneWayRatio: 0.5,
    dependencyDepth: 4,
    difficulty: 5,
  }),

  L(11, 6, [
    car('A', 'h', 2, 2, 2, 0, TWO_WAY_H),
    car('B', 'v', 3, 0, 1, 1, TWO_WAY_V),
    car('C', 'v', 2, 1, 4, 2, TWO_WAY_V),
    car('D', 'h', 3, 4, 1, 3, TWO_WAY_H),
    car('E', 'v', 2, 2, 0, 4, TWO_WAY_V),
    car('F', 'h', 2, 0, 3, 5, TWO_WAY_H),
    car('G', 'v', 2, 3, 5, 6, TWO_WAY_V),
    car('H', 'h', 2, 5, 3, 7, TWO_WAY_H),
    car('I', 'v', 2, 0, 2, 8, TWO_WAY_V),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'right', index: 0 },
      { edge: 'right', index: 1 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 0.5,
    dependencyDepth: 4,
    difficulty: 5,
  }),

  L(12, 6, [
    car('A', 'h', 2, 2, 1, 0, TWO_WAY_H),
    car('B', 'v', 3, 0, 0, 1, TWO_WAY_V),
    car('C', 'v', 2, 1, 3, 2, TWO_WAY_V),
    car('D', 'h', 3, 4, 2, 3, TWO_WAY_H),
    car('E', 'v', 2, 3, 5, 4, TWO_WAY_V),
    car('F', 'h', 2, 0, 4, 5, TWO_WAY_H),
    car('G', 'v', 2, 2, 2, 6, TWO_WAY_V),
    car('H', 'h', 2, 5, 0, 7, TWO_WAY_H),
    car('I', 'v', 2, 1, 5, 8, TWO_WAY_V),
    car('J', 'h', 2, 3, 0, 9, TWO_WAY_H),
  ], {
    objectiveType: 'exit_target',
    targetCarId: 'B',
    blockedGateSegments: [
      { edge: 'top', index: 2 },
      { edge: 'top', index: 3 },
      { edge: 'top', index: 4 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 0.55,
    dependencyDepth: 4,
    difficulty: 6,
  }),

  L(13, 6, [
    car('A', 'h', 2, 2, 1, 0, ['left', 'right'], 'sedan'),
    car('B', 'h', 3, 1, 2, 1, ['left', 'right'], 'suv'),
    car('C', 'v', 2, 0, 0, 2, ['down'], 'taxi'),
    car('D', 'v', 2, 2, 3, 3, ['down'], 'pickup'),
    car('E', 'h', 2, 5, 0, 4, ['right'], 'van'),
    car('F', 'h', 2, 4, 1, 5, ['left', 'right'], 'bus'),
    car('G', 'v', 3, 1, 5, 6, ['down'], 'truck'),
    car('H', 'h', 2, 0, 3, 7, ['left', 'right'], 'sedan'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'left', index: 3 },
      { edge: 'left', index: 4 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 0.5,
    dependencyDepth: 5,
    difficulty: 6,
  }),

  L(14, 6, [
    car('A', 'v', 2, 3, 1, 0, ['up'], 'sedan'),
    car('B', 'h', 3, 0, 2, 1, ['left'], 'suv'),
    car('C', 'h', 2, 1, 3, 2, ['left', 'right'], 'taxi'),
    car('D', 'h', 2, 1, 1, 3, ['left'], 'pickup'),
    car('E', 'v', 2, 0, 5, 4, ['up', 'down'], 'van'),
    car('F', 'h', 2, 5, 0, 5, ['left', 'right'], 'bus'),
    car('G', 'v', 2, 3, 5, 6, ['down'], 'truck'),
    car('H', 'h', 3, 2, 1, 7, ['left', 'right'], 'sedan'),
    car('I', 'v', 2, 3, 3, 8, ['up', 'down'], 'suv'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'right', index: 3 },
      { edge: 'bottom', index: 2 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 0.44,
    dependencyDepth: 5,
    difficulty: 6,
  }),

  L(15, 7, [
    car('A', 'v', 2, 3, 6, 0, ['down'], 'sedan'),
    car('B', 'v', 2, 1, 4, 1, ['down'], 'suv'),
    car('C', 'v', 3, 4, 3, 2, ['up'], 'taxi'),
    car('D', 'v', 2, 0, 5, 3, ['up', 'down'], 'pickup'),
    car('E', 'v', 2, 0, 0, 4, ['up', 'down'], 'van'),
    car('F', 'v', 3, 2, 0, 5, ['down'], 'bus'),
    car('G', 'v', 2, 4, 4, 6, ['down'], 'truck'),
    car('H', 'v', 2, 1, 3, 7, ['up'], 'sedan'),
    car('I', 'v', 2, 4, 2, 8, ['up', 'down'], 'suv'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'bottom', index: 3 },
      { edge: 'bottom', index: 1 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 0.67,
    dependencyDepth: 5,
    difficulty: 7,
  }),

  L(16, 7, [
    car('A', 'h', 3, 4, 2, 0, ['left'], 'sedan'),
    car('B', 'h', 2, 6, 3, 1, ['right'], 'suv'),
    car('C', 'v', 3, 0, 5, 2, ['down'], 'taxi'),
    car('D', 'v', 3, 0, 0, 3, ['down'], 'pickup'),
    car('E', 'v', 3, 1, 6, 4, ['down'], 'van'),
    car('F', 'h', 3, 3, 2, 5, ['left'], 'bus'),
    car('G', 'h', 2, 5, 4, 6, ['right'], 'truck'),
    car('H', 'h', 2, 5, 1, 7, ['left'], 'sedan'),
    car('I', 'v', 2, 4, 6, 8, ['down'], 'suv'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'top', index: 3 },
      { edge: 'top', index: 5 },
      { edge: 'right', index: 4 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 5,
    difficulty: 7,
  }),

  L(17, 7, [
    car('A', 'v', 3, 1, 4, 0, ['down'], 'sedan'),
    car('B', 'h', 2, 0, 4, 1, ['left'], 'suv'),
    car('C', 'h', 2, 0, 2, 2, ['left'], 'taxi'),
    car('D', 'v', 2, 1, 0, 3, ['down'], 'pickup'),
    car('E', 'v', 2, 4, 0, 4, ['down'], 'van'),
    car('F', 'v', 3, 1, 5, 5, ['down'], 'bus'),
    car('G', 'h', 3, 6, 1, 6, ['right'], 'truck'),
    car('H', 'v', 2, 4, 5, 7, ['down'], 'sedan'),
    car('I', 'v', 2, 4, 6, 8, ['up'], 'suv'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'right', index: 2 },
      { edge: 'right', index: 0 },
      { edge: 'top', index: 3 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 5,
    difficulty: 8,
  }),

  L(18, 7, [
    car('A', 'h', 2, 5, 5, 0, ['left'], 'sedan'),
    car('B', 'h', 3, 6, 4, 1, ['left'], 'suv'),
    car('C', 'v', 2, 1, 3, 2, ['up'], 'taxi'),
    car('D', 'h', 2, 2, 1, 3, ['left'], 'pickup'),
    car('E', 'v', 3, 1, 5, 4, ['up'], 'van'),
    car('F', 'h', 2, 4, 2, 5, ['left'], 'bus'),
    car('G', 'h', 2, 5, 3, 6, ['left'], 'truck'),
    car('H', 'v', 2, 4, 0, 7, ['up'], 'sedan'),
    car('I', 'v', 3, 1, 0, 8, ['up'], 'suv'),
    car('J', 'h', 2, 6, 2, 9, ['left'], 'taxi'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'right', index: 5 },
      { edge: 'left', index: 0 },
      { edge: 'top', index: 2 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 6,
    difficulty: 8,
  }),

  L(19, 7, [
    car('A', 'v', 2, 1, 5, 0, ['up'], 'sedan'),
    car('B', 'v', 3, 4, 0, 1, ['up'], 'suv'),
    car('C', 'v', 3, 0, 6, 2, ['down'], 'taxi'),
    car('D', 'h', 2, 3, 1, 3, ['right'], 'pickup'),
    car('E', 'h', 2, 3, 4, 4, ['right'], 'van'),
    car('F', 'v', 2, 0, 3, 5, ['down'], 'bus'),
    car('G', 'h', 3, 4, 1, 6, ['right'], 'truck'),
    car('H', 'v', 2, 1, 0, 7, ['up'], 'sedan'),
    car('I', 'h', 2, 4, 4, 8, ['right'], 'suv'),
    car('J', 'h', 2, 5, 1, 9, ['right'], 'taxi'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'left', index: 0 },
      { edge: 'left', index: 5 },
      { edge: 'right', index: 0 },
      { edge: 'left', index: 3 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 6,
    difficulty: 8,
  }),

  L(20, 7, [
    car('A', 'v', 3, 2, 1, 0, ['down'], 'sedan'),
    car('B', 'h', 2, 0, 0, 1, ['right'], 'suv'),
    car('C', 'v', 2, 3, 4, 2, ['down'], 'taxi'),
    car('D', 'v', 3, 1, 3, 3, ['up'], 'pickup'),
    car('E', 'h', 2, 5, 4, 4, ['right'], 'van'),
    car('F', 'h', 3, 6, 2, 5, ['right'], 'bus'),
    car('G', 'v', 2, 1, 4, 6, ['up'], 'truck'),
    car('H', 'h', 2, 0, 2, 7, ['right'], 'sedan'),
    car('I', 'h', 2, 5, 2, 8, ['left'], 'suv'),
    car('J', 'h', 2, 0, 4, 9, ['right'], 'taxi'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'bottom', index: 6 },
      { edge: 'top', index: 0 },
      { edge: 'left', index: 2 },
      { edge: 'left', index: 3 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 6,
    difficulty: 9,
  }),

  L(21, 7, [
    car('A', 'v', 2, 3, 4, 0, ['up'], 'sedan'),
    car('B', 'h', 3, 1, 1, 1, ['left'], 'suv'),
    car('C', 'h', 2, 6, 2, 2, ['left'], 'taxi'),
    car('D', 'h', 3, 0, 0, 3, ['right'], 'pickup'),
    car('E', 'h', 3, 3, 1, 4, ['left'], 'van'),
    car('F', 'v', 2, 1, 4, 5, ['up'], 'bus'),
    car('G', 'v', 3, 2, 5, 6, ['down'], 'truck'),
    car('H', 'h', 3, 0, 3, 7, ['right'], 'sedan'),
    car('I', 'h', 3, 5, 4, 8, ['left'], 'suv'),
    car('J', 'v', 2, 4, 1, 9, ['down'], 'taxi'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'right', index: 4 },
      { edge: 'right', index: 1 },
      { edge: 'right', index: 3 },
      { edge: 'top', index: 1 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 6,
    difficulty: 9,
    timeLimitMs: 35_000,
  }),

  L(22, 7, [
    car('A', 'h', 2, 3, 3, 0, ['left'], 'sedan'),
    car('B', 'v', 3, 0, 2, 1, ['down'], 'suv'),
    car('C', 'v', 2, 5, 0, 2, ['up'], 'taxi'),
    car('D', 'v', 2, 4, 2, 3, ['down'], 'pickup'),
    car('E', 'v', 2, 1, 1, 4, ['down'], 'van'),
    car('F', 'v', 3, 0, 5, 5, ['down'], 'bus'),
    car('G', 'h', 2, 4, 3, 6, ['right'], 'truck'),
    car('H', 'v', 2, 3, 0, 7, ['up'], 'sedan'),
    car('I', 'v', 3, 4, 6, 8, ['up'], 'suv'),
    car('J', 'v', 3, 3, 5, 9, ['down'], 'taxi'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'left', index: 5 },
      { edge: 'right', index: 1 },
      { edge: 'left', index: 4 },
      { edge: 'left', index: 2 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 6,
    difficulty: 10,
    timeLimitMs: 32_000,
  }),

  L(23, 7, [
    car('A', 'v', 3, 4, 4, 0, ['up'], 'sedan'),
    car('B', 'h', 2, 2, 0, 1, ['right'], 'suv'),
    car('C', 'v', 2, 0, 3, 2, ['down'], 'taxi'),
    car('D', 'v', 2, 2, 4, 3, ['up'], 'pickup'),
    car('E', 'v', 3, 1, 6, 4, ['up'], 'van'),
    car('F', 'h', 3, 3, 1, 5, ['left'], 'bus'),
    car('G', 'h', 3, 4, 1, 6, ['left'], 'truck'),
    car('H', 'v', 3, 4, 5, 7, ['up'], 'sedan'),
    car('I', 'h', 2, 0, 4, 8, ['right'], 'suv'),
    car('J', 'v', 2, 4, 6, 9, ['down'], 'taxi'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'top', index: 0 },
      { edge: 'bottom', index: 2 },
      { edge: 'top', index: 2 },
      { edge: 'left', index: 6 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 6,
    difficulty: 10,
    timeLimitMs: 30_000,
  }),

  L(24, 7, [
    car('A', 'v', 3, 4, 4, 0, ['up'], 'sedan'),
    car('B', 'h', 2, 2, 0, 1, ['right'], 'suv'),
    car('C', 'v', 2, 0, 3, 2, ['down'], 'taxi'),
    car('D', 'v', 2, 2, 4, 3, ['up'], 'pickup'),
    car('E', 'v', 3, 1, 6, 4, ['up'], 'van'),
    car('F', 'h', 3, 3, 1, 5, ['left'], 'bus'),
    car('G', 'h', 3, 4, 1, 6, ['left'], 'truck'),
    car('H', 'v', 3, 4, 5, 7, ['up'], 'sedan'),
    car('I', 'h', 2, 0, 4, 8, ['right'], 'suv'),
    car('J', 'v', 2, 4, 6, 9, ['down'], 'taxi'),
  ], {
    objectiveType: 'clear_all',
    blockedGateSegments: [
      { edge: 'top', index: 0 },
      { edge: 'bottom', index: 2 },
      { edge: 'top', index: 2 },
      { edge: 'left', index: 6 },
    ],
    gatingProfile: 'partial',
    oneWayRatio: 1,
    dependencyDepth: 6,
    difficulty: 10,
    timeLimitMs: 28_000,
  }),
];

const PARKING_JAM_LATE_LEVEL_FALLBACKS = PARKING_JAM_BASE_LEVELS
  .filter((raw) => raw.level >= 21 && raw.level <= 24)
  .reduce<Record<number, ParkingJamRawLevelConfig>>((acc, raw) => {
    acc[raw.level] = raw;
    return acc;
  }, {});

const PARKING_JAM_GENERATED_LATE_LEVELS = generateParkingJamLateLevels(PARKING_JAM_LATE_LEVEL_FALLBACKS);
const PARKING_JAM_GENERATED_LATE_LEVEL_MAP = new Map(
  PARKING_JAM_GENERATED_LATE_LEVELS.map((raw) => [raw.level, raw] as const)
);

export const PARKING_JAM_RAW_LEVELS: ParkingJamRawLevelConfig[] = PARKING_JAM_BASE_LEVELS.map((raw) => {
  return PARKING_JAM_GENERATED_LATE_LEVEL_MAP.get(raw.level) ?? raw;
});

type ParkingJamLevelMeta = {
  parMoves: number;
  relevantCarSet: string[];
};

// Solver metadata is authored-time data and kept static to avoid heavy runtime precomputation.
const PRECOMPUTED_LEVEL_META: Record<number, ParkingJamLevelMeta> = {
  0: { parMoves: 3, relevantCarSet: ['A', 'B', 'C'] },
  1: { parMoves: 4, relevantCarSet: ['A', 'B', 'C', 'D'] },
  2: { parMoves: 5, relevantCarSet: ['A', 'B', 'C', 'D', 'E'] },
  3: { parMoves: 6, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F'] },
  4: { parMoves: 7, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
  5: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
  6: { parMoves: 1, relevantCarSet: ['X'] },
  7: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] },
  8: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] },
  9: { parMoves: 8, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
  10: { parMoves: 3, relevantCarSet: ['B', 'H', 'X'] },
  11: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] },
  12: { parMoves: 4, relevantCarSet: ['B', 'G', 'H', 'J'] },
  13: { parMoves: 8, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] },
  14: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] },
  15: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] },
  16: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] },
  17: { parMoves: 9, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] },
  18: { parMoves: 10, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
  19: { parMoves: 10, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
  20: { parMoves: 10, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
  21: { parMoves: 10, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
  22: { parMoves: 10, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
  23: { parMoves: 10, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
  24: { parMoves: 10, relevantCarSet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] },
};

const deriveParTimeMs = (parMoves: number, difficulty: number) =>
  Math.max(3000, Math.round(2200 + parMoves * 1700 + difficulty * 350));

const carCells = (car: ParkingJamCarConfig) => {
  const cells: string[] = [];
  if (car.axis === 'h') {
    for (let i = 0; i < car.length; i += 1) {
      cells.push(`${car.row},${car.col + i}`);
    }
  } else {
    for (let i = 0; i < car.length; i += 1) {
      cells.push(`${car.row + i},${car.col}`);
    }
  }
  return cells;
};

const sanitizeOverlaps = (cars: ParkingJamCarConfig[], gridSize: number) => {
  const occupied = new Set<string>();
  const kept: ParkingJamCarConfig[] = [];

  cars.forEach((car) => {
    const cells = carCells(car);
    const isOutOfBounds = cells.some((cell) => {
      const [row, col] = cell.split(',').map((value) => Number(value));
      return row < 0 || col < 0 || row >= gridSize || col >= gridSize;
    });
    if (isOutOfBounds) return;

    const overlap = cells.some((cell) => occupied.has(cell));
    if (overlap) return;

    cells.forEach((cell) => occupied.add(cell));
    kept.push(car);
  });

  return kept;
};

const hasBlockedGate = (raw: ParkingJamRawLevelConfig, edge: 'top' | 'right' | 'bottom' | 'left', index: number) =>
  raw.blockedGateSegments.some((segment) => segment.edge === edge && segment.index === index);

const capBlockedGateSegments = (raw: ParkingJamRawLevelConfig) => {
  const unique = new Map<string, { edge: 'top' | 'right' | 'bottom' | 'left'; index: number }>();
  raw.blockedGateSegments.forEach((segment) => {
    if (segment.index < 0 || segment.index >= raw.gridSize) return;
    unique.set(`${segment.edge}:${segment.index}`, segment);
  });

  const ordered = [...unique.values()].sort((a, b) => {
    const edgeOrder = ['top', 'right', 'bottom', 'left'] as const;
    const edgeDiff = edgeOrder.indexOf(a.edge) - edgeOrder.indexOf(b.edge);
    if (edgeDiff !== 0) return edgeDiff;
    return a.index - b.index;
  });

  const cap = raw.level >= 16 && raw.level <= 24 ? 6 : ordered.length;
  return ordered.slice(0, cap);
};

const preferredOneWayDirection = (car: ParkingJamCarConfig, gridSize: number): ParkingJamDirection => {
  // fallback heuristic if no gate information is used
  if (car.axis === 'h') {
    const leftDistance = car.col;
    const rightDistance = (gridSize - 1) - (car.col + car.length - 1);
    return rightDistance <= leftDistance ? 'right' : 'left';
  }
  const upDistance = car.row;
  const downDistance = (gridSize - 1) - (car.row + car.length - 1);
  return downDistance <= upDistance ? 'down' : 'up';
};

const chooseOneWayDirection = (raw: ParkingJamRawLevelConfig, car: ParkingJamCarConfig): ParkingJamDirection => {
  if (car.axis === 'h') {
    const leftBlocked = hasBlockedGate(raw, 'left', car.row);
    const rightBlocked = hasBlockedGate(raw, 'right', car.row);
    if (!leftBlocked && rightBlocked) return 'left';
    if (!rightBlocked && leftBlocked) return 'right';
    return preferredOneWayDirection(car, raw.gridSize);
  }

  const upBlocked = hasBlockedGate(raw, 'top', car.col);
  const downBlocked = hasBlockedGate(raw, 'bottom', car.col);
  if (!upBlocked && downBlocked) return 'up';
  if (!downBlocked && upBlocked) return 'down';
  return preferredOneWayDirection(car, raw.gridSize);
};

const normalizeCarsForProgression = (raw: ParkingJamRawLevelConfig): ParkingJamRawLevelConfig => {
  let cars = sanitizeOverlaps(raw.cars.map((car) => ({ ...car })), raw.gridSize);
  if (raw.level <= 3) {
    cars = cars.slice(0, Math.min(3, cars.length));
  }

  const blockedGateSegments = capBlockedGateSegments(raw);
  const normalizedRaw: ParkingJamRawLevelConfig = {
    ...raw,
    blockedGateSegments,
  };

  // Progression rule: only levels 16+ are strict one-way.
  if (raw.level >= 16) {
    cars.forEach((car) => {
      if (car.allowedExitDirections.length <= 1) return;
      car.allowedExitDirections = [chooseOneWayDirection(normalizedRaw, car)];
    });
  }

  const objectiveType: ParkingJamRawLevelConfig['objectiveType'] = 'clear_all';
  const targetCarId = undefined;
  const oneWayCount = cars.filter((car) => car.allowedExitDirections.length === 1).length;
  const oneWayRatio = cars.length > 0 ? oneWayCount / cars.length : 1;
  const gatingProfile: ParkingJamRawLevelConfig['gatingProfile'] =
    blockedGateSegments.length === 0 ? 'none' : raw.level >= 16 ? 'partial' : raw.gatingProfile;

  return {
    ...normalizedRaw,
    cars,
    blockedGateSegments,
    gatingProfile,
    targetCarId,
    objectiveType,
    oneWayRatio,
  };
};

const buildLevelConfig = (raw: ParkingJamRawLevelConfig): ParkingJamLevelConfig => {
  const tuned = normalizeCarsForProgression(raw);
  const gatingMoveFactor = tuned.gatingProfile === 'none' ? 1.05 : tuned.gatingProfile === 'partial' ? 1.25 : 1.4;
  const fallbackParMoves = Math.max(
    1,
    Math.round(
      tuned.cars.length * gatingMoveFactor +
      tuned.dependencyDepth * 0.8 +
      tuned.oneWayRatio * 2
    )
  );
  const meta = PRECOMPUTED_LEVEL_META[tuned.level];
  const calibratedParMoves = Math.max(1, meta?.parMoves ?? fallbackParMoves);
  const relevantCarSet = meta?.relevantCarSet?.length
    ? [...new Set(meta.relevantCarSet.filter((id) => tuned.cars.some((car) => car.id === id)))]
    : tuned.cars.map((car) => car.id);
  const parTimeMs = deriveParTimeMs(calibratedParMoves, tuned.difficulty);
  const calibratedTimeLimitMs = tuned.timeLimitMs
    ? Math.max(tuned.timeLimitMs, Math.min(45_000, Math.round(parTimeMs * 1.35)))
    : undefined;

  return {
    ...tuned,
    parMoves: calibratedParMoves,
    parTimeMs,
    relevantCarSet: relevantCarSet.length > 0 ? relevantCarSet : tuned.cars.map((car) => car.id),
    timeLimitMs: calibratedTimeLimitMs,
  };
};

export const PARKING_JAM_LEVELS = PARKING_JAM_RAW_LEVELS.reduce<Record<number, ParkingJamLevelConfig>>((acc, raw) => {
  acc[raw.level] = buildLevelConfig(raw);
  return acc;
}, {});

export const getParkingJamLevel = (level: number) => {
  if (PARKING_JAM_LEVELS[level]) {
    return PARKING_JAM_LEVELS[level];
  }
  return PARKING_JAM_LEVELS[1];
};

export const PARKING_JAM_LEVEL_ORDER = Object.keys(PARKING_JAM_LEVELS)
  .map((value) => Number(value))
  .filter((value) => Number.isFinite(value))
  .sort((a, b) => a - b);
