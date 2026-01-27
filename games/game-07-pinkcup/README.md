# Find the Pink Cup (Game 07)

A spatial planning and memory game that challenges players to move a pink cup to a target tile while remembering number positions.

## Game Mechanics

### Core Gameplay
- **Grid**: 3x3 grid (scalable to 4x4, 5x5)
- **Objective**: Move the pink cup to the pink target tile
- **Movement**: Tap adjacent blue cups to swap with the pink cup (orthogonal only)
- **Memory Element**: After the first move, numbers briefly appear under all cups

### Memory System
- **Reveal**: Numbers (1-9) appear under cups for 1-2 seconds after first move
- **Probe**: After reaching the target, the game asks "What number was under cup at (x,y)?"
- **Challenge**: Players must remember number positions while planning moves

### Game Modes
1. **Classic**: Balanced gameplay with standard timing
2. **Time Attack**: Fast-paced with tight time limits
3. **Memory Focus**: Multiple memory probes
4. **Planning Focus**: Emphasizes optimal path finding

## Scoring System

The game calculates 4 cognitive stats based on detailed telemetry:

### 1. Spatial Awareness (มิติสัมพันธ์)
Measures how consistently the player moves toward the target.

**Metrics:**
- **Good Move Rate**: Percentage of moves that reduce distance to target
- **Path Directness**: Ratio of optimal moves to actual moves taken

**Score Formula:**
```
SpatialScore = clamp(50 * GoodMoveRate + 50 * PathDirectness, 0, 100) * difficultyMultiplier
```

### 2. Memory (ความจำ)
Measures recall accuracy for revealed numbers.

**Metrics:**
- **Recall Accuracy**: Percentage of correct probe answers
- **Recall Reaction Time**: Average time to answer probes

**Score Formula:**
```
MemoryScore = clamp(100 * RecallAccuracy - 0.02 * avgRecallRTMs, 0, 100) * difficultyMultiplier
```
- Set to 0 if player fails the level

### 3. Processing Speed (ความเร็ว)
Measures how quickly the player perceives and acts.

**Metrics:**
- **First Reaction Time**: Time from game start to first move
- **Mean Inter-Move RT**: Average time between consecutive moves
- **Completion Time**: Total time to complete the level

**Score Formula:**
```
S1 = clamp(T_first_target / RT_firstMs)
S2 = clamp(T_move_target / meanInterMoveRT)
S3 = clamp(T_complete_target / completionTimeMs)
SpeedScore = clamp(100 * (0.4*S1 + 0.3*S2 + 0.3*S3), 0, 100) * difficultyMultiplier
```

### 4. Planning (การวางแผน)
Measures decision efficiency.

**Metrics:**
- **Optimal Moves**: Manhattan distance from start to target
- **Detour Moves**: Extra moves beyond optimal
- **Backtrack Count**: Number of moves that reverse previous moves

**Score Formula:**
```
PlanningScore = clamp(100 - 10*DetourMoves - 5*BacktrackCount, 0, 100) * difficultyMultiplier
```

## Scalability Features

### Grid Sizes
- Default: 3x3 (Levels 1-15)
- Scalable: 4x4 (Levels 16-17), 5x5 (Level 18+)

### Memory Types (Extensible)
- Currently: Numbers (1-9)
- Future: Colors, shapes, patterns, emojis

### Probe Types (Extensible)
- Currently: Single cell probe
- Future: Multiple cells, sequence, position change

### Special Mechanics (Future)
- Obstacles: Tiles that block movement
- Moving Target: Target tile shifts during gameplay
- Special Cups: Teleporters, movers, etc.

## Level Structure

### Levels 1-5: Easy
- Long reveal (2000ms)
- Generous time (90-120s)
- Target cell probes

### Levels 6-10: Normal
- Medium reveal (1400-1500ms)
- Medium time (65-85s)
- Random cell probes

### Levels 11-15: Hard
- Short reveal (1000-1200ms)
- Tight time (40-60s)
- Challenging probes

### Levels 16-20: Advanced
- Larger grids (4x4, 5x5)
- Multiple probes
- Special modes

## File Structure

```
games/game-07-pinkcup/
├── config.ts           # Phaser game configuration
├── types.ts            # Extensible type definitions
├── levels.ts           # Level configurations (20 levels)
├── GameScene.ts        # Main game scene with telemetry
├── TutorialScene.ts     # Interactive tutorial
└── README.md           # This file

lib/scoring/
└── pinkcup.ts         # Modular scoring system

types/index.ts          # Global types (includes PinkCupGameStats)

hooks/useGameSession.ts # Integrates scoring with session management
```

## Telemetry Format

Every game session produces detailed telemetry:

```typescript
{
  level: number,
  mode: 'classic' | 'time_attack' | 'memory_focus' | 'planning_focus',
  targetCell: {x: number, y: number},
  pinkStart: {x: number, y: number},
  t_start: number,        // Timestamp when game starts
  t_end: number,          // Timestamp when game ends
  moves: [               // Full move history
    {
      timestamp: number,
      from: {x: number, y: number},
      to: {x: number, y: number},
      valid: boolean,
      distanceToTarget: number,
      backtracked: boolean
    }
  ],
  reveal: {               // Memory reveal timing
    start: number,
    end: number,
    elements: {[cell: string]: number}  // Map of "x,y" -> number
  },
  probes: [               // Memory probe results
    {
      cell: {x: number, y: number},
      probeTime: number,
      answerTime: number,
      correct: boolean,
      playerAnswer?: number,
      correctAnswer?: number
    }
  ],
  metrics: {
    spatial: {...},
    memory: {...},
    speed: {...},
    planning: {...}
  }
}
```

## Testing Checklist

- [ ] Tutorial completes successfully
- [ ] First move triggers number reveal
- [ ] Numbers hide after reveal duration
- [ ] Memory probe appears after reaching target
- [ ] Correct probe answers increase memory score
- [ ] Wrong probe answers decrease memory score
- [ ] Moving toward target increases spatial score
- [ ] Moving away from target decreases spatial score
- [ ] Optimal paths give maximum planning score
- [ ] Detours and backtracking reduce planning score
- [ ] Fast completion increases speed score
- [ ] All 4 stats calculate correctly
- [ ] Stats save to database
- [ ] Difficulty multiplier applies correctly
- [ ] Timer counts down and triggers timeout
- [ ] Win/lose conditions work as expected

## Future Enhancements

1. **Visual Polish**: Add particle effects, better animations
2. **Difficulty Progression**: Adaptive difficulty based on player performance
3. **Special Mechanics**: Implement obstacles, moving targets
4. **Memory Variants**: Add color/shape/emoji memory elements
5. **Leaderboards**: Compare scores with other players
6. **Analytics Dashboard**: Visualize player improvement over time

## Credits

Game Concept & Scoring System: Designed per specification
Implementation: Full integration with existing brain-train architecture
