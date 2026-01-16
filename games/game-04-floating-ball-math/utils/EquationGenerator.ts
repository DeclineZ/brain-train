import { Equation, Operation, FloatingBallMathLevelConfig, BallColor, FloatingBall } from '../types';

export class EquationGenerator {
  private config: FloatingBallMathLevelConfig;
  private colors: BallColor[] = ['coral', 'mint', 'yellow', 'lavender'];
  private usedCombinations: Set<string> = new Set();

  constructor(config: FloatingBallMathLevelConfig) {
    console.log('[EquationGenerator] Constructor called with config:', config);
    this.config = config;
  }

  /**
   * Generate an equation with operation balls
   * Starts with a target, creates a starting current, and generates operation balls
   */
  generateEquation(): Equation {
    console.log('[EquationGenerator] generateEquation called');
    try {
      const target = this.generateTarget();
      console.log('[EquationGenerator] Target generated:', target);

      const startingCurrent = this.generateStartingCurrent(target);
      console.log('[EquationGenerator] Starting current generated:', startingCurrent);

      // Generate operation balls that can transform startingCurrent to target
      const operationBalls = this.generateOperationBalls(target, startingCurrent);
      console.log('[EquationGenerator] Operation balls generated:', operationBalls.length);

      const result = {
        target,
        startingCurrent,
        operationBalls,
      };
      console.log('[EquationGenerator] Equation generated successfully:', result);
      return result;
    } catch (error) {
      console.error('[EquationGenerator] ERROR in generateEquation:', error);
      throw error;
    }
  }

  /**
   * Generate a target number within the configured range
   */
  private generateTarget(): number {
    const { min, max } = this.config.targetRange;
    console.log('[EquationGenerator] generateTarget - range:', { min, max });
    
    if (min >= max) {
      console.error('[EquationGenerator] ERROR: Invalid targetRange', { min, max });
      throw new Error('Invalid targetRange: min (' + min + ') must be less than max (' + max + ')');
    }
    
    return this.randomInt(min, max);
  }

  /**
   * Generate a starting current number that's reasonably close to target
   */
  private generateStartingCurrent(target: number): number {
    const { min, max } = this.config.startNumberRange;
    
    // Generate a random start number within the configured range
    const startingCurrent = this.randomInt(min, max);
    
    return startingCurrent;
  }

  /**
   * Generate operation balls that can transform startingCurrent to target
   */
  private generateOperationBalls(target: number, startingCurrent: number): FloatingBall[] {
    const balls: FloatingBall[] = [];
    const { min, max } = this.config.operandRange;
    const operations = this.config.operations;
    
    // Generate a solution path (sequence of operations)
    const solutionPath = this.generateSolutionPath(target, startingCurrent);
    console.log('[EquationGenerator] Solution path:', solutionPath);

    // Create balls from the solution path
    solutionPath.forEach((step, index) => {
      const ball: FloatingBall = {
        id: `ball-${Date.now()}-${Math.random()}`,
        value: step.value,
        operator: step.operator,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        x: 0, // Will be set when spawning
        y: 0,
        originalX: 0,
        originalY: 0,
        wavePhase: Math.random() * Math.PI * 2,
        isCollected: false,
        isBomb: false,
        isSolvable: true, // Solution path balls are solvable
        lane: 1, // Will be set when spawning
        originalLane: 1,
        container: null, // Will be set when creating
      };
      balls.push(ball);
    });

    // Generate distractor balls (balls that won't help solve puzzle)
    const distractorCount = this.randomInt(4, 6);
    const distractorBalls = this.generateDistractorBalls(target, startingCurrent, distractorCount);
    
    // Generate bomb balls (1-2 bombs)
    const bombCount = this.randomInt(1, 2);
    const bombBalls = this.generateBombBalls(bombCount);
    
    // Combine and shuffle
    const allBalls = [...balls, ...distractorBalls, ...bombBalls];
    this.shuffleArray(allBalls);
    
    return allBalls;
  }

  /**
   * Generate a sequence of operations that transforms startingCurrent to target
   */
  private generateSolutionPath(target: number, startingCurrent: number): Array<{operator: '+' | '-' | '*' | '/', value: number}> {
    const path: Array<{operator: '+' | '-' | '*' | '/', value: number}> = [];
    let current = startingCurrent;
    const operations = this.config.operations;
    const { min, max } = this.config.operandRange;
    
    const maxSteps = 4; // Maximum number of operations to solve
    let attempts = 0;
    const maxAttempts = 100;

    while (current !== target && attempts < maxAttempts && path.length < maxSteps) {
      attempts++;
      
      // Find an operation that gets us closer to target
      let foundValidOperation = false;
      
      // Try each available operation
      for (const op of operations) {
        const validValues = this.getValidOperationValues(op, current, target, min, max);
        
        for (const value of validValues) {
          // Apply operation and check if it's valid
          const result = this.applyOperation(current, op, value);
          
          if (result === target) {
            // Found the solution!
            path.push({ operator: op, value });
            current = result;
            foundValidOperation = true;
            break;
          } else if (this.isValidIntermediateResult(result, target, min, max)) {
            // This gets us closer, use it
            path.push({ operator: op, value });
            current = result;
            foundValidOperation = true;
            break;
          }
        }
        
        if (foundValidOperation) break;
      }
      
      // If we couldn't find a valid operation, restart
      if (!foundValidOperation) {
        path.length = 0;
        current = startingCurrent;
        attempts++;
      }
    }

    // If we couldn't reach target, return a simple path
    if (current !== target && path.length === 0) {
      // Fallback: simple addition/subtraction
      const difference = target - startingCurrent;
      if (difference > 0) {
        path.push({ operator: '+', value: difference });
      } else {
        path.push({ operator: '-', value: Math.abs(difference) });
      }
    }

    return path;
  }

  /**
   * Get valid values for an operation that could help solve the puzzle
   */
  private getValidOperationValues(
    operator: '+' | '-' | '*' | '/',
    current: number,
    target: number,
    min: number,
    max: number
  ): number[] {
    const values: number[] = [];
    
    switch (operator) {
      case '+':
        // Values that when added to current get closer to target
        const diffPlus = target - current;
        if (diffPlus > 0 && diffPlus >= min && diffPlus <= max) {
          values.push(diffPlus);
        }
        // Also try partial values
        const partialPlus = Math.floor(diffPlus / 2);
        if (partialPlus >= min && partialPlus <= max) {
          values.push(partialPlus);
        }
        break;

      case '-':
        // Values that when subtracted from current get closer to target
        const diffMinus = current - target;
        if (diffMinus > 0 && diffMinus >= min && diffMinus <= max) {
          values.push(diffMinus);
        }
        // Try partial values
        const partialMinus = Math.floor(diffMinus / 2);
        if (partialMinus >= min && partialMinus <= max) {
          values.push(partialMinus);
        }
        break;

      case '*':
        // Multipliers that get us closer to target
        if (current !== 0) {
          const multiplier = target / current;
          if (Number.isInteger(multiplier) && multiplier >= min && multiplier <= max) {
            values.push(Math.round(multiplier));
          }
          // Try smaller multipliers
          for (let i = 2; i <= 5; i++) {
            const result = current * i;
            if (i >= min && i <= max && result <= max * 2) {
              values.push(i);
            }
          }
        }
        break;

      case '/':
        // Divisors that get us closer to target
        if (current !== 0 && target !== 0) {
          const divisor = current / target;
          if (Number.isInteger(divisor) && divisor >= min && divisor <= max) {
            values.push(Math.round(divisor));
          }
          // Try common divisors
          const divisors = [2, 3, 4, 5];
          for (const d of divisors) {
            if (d >= min && d <= max && current % d === 0) {
              values.push(d);
            }
          }
        }
        break;
    }
    
    return values;
  }

  /**
   * Apply an operation to a value
   */
  private applyOperation(current: number, operator: '+' | '-' | '*' | '/', value: number): number {
    switch (operator) {
      case '+':
        return current + value;
      case '-':
        return current - value;
      case '*':
        return current * value;
      case '/':
        return value !== 0 ? Math.round(current / value) : current;
    }
  }

  /**
   * Check if a result is valid as an intermediate step
   */
  private isValidIntermediateResult(result: number, target: number, min: number, max: number): boolean {
    // Result should be positive and within reasonable bounds
    if (result < 0 || result > max * 2) {
      return false;
    }
    
    // Result should get us closer to target
    const currentDistance = Math.abs(result - target);
    
    return true;
  }

  /**
   * Generate distractor balls that won't help solve the puzzle
   */
  private generateDistractorBalls(target: number, startingCurrent: number, count: number): FloatingBall[] {
    const balls: FloatingBall[] = [];
    const { min, max } = this.config.operandRange;
    const operations = this.config.operations;
    
    for (let i = 0; i < count; i++) {
      const operator = operations[Math.floor(Math.random() * operations.length)];
      let value: number;
      
      // Generate a value that's NOT helpful
      let attempts = 0;
      do {
        value = this.randomInt(min, max);
        attempts++;
      } while (attempts < 10 && this.isHelpfulOperation(operator, value, startingCurrent, target));
      
      const ball: FloatingBall = {
        id: `ball-distractor-${Date.now()}-${Math.random()}`,
        value,
        operator,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        x: 0,
        y: 0,
        originalX: 0,
        originalY: 0,
        wavePhase: Math.random() * Math.PI * 2,
        isCollected: false,
        isBomb: false,
        isSolvable: false, // Distractor balls are not solvable
        lane: 1, // Will be set when spawning
        originalLane: 1,
        container: null,
      };
      balls.push(ball);
    }
    
    return balls;
  }

  /**
   * Generate bomb balls (dangerous balls to avoid)
   */
  private generateBombBalls(count: number): FloatingBall[] {
    const balls: FloatingBall[] = [];
    const { min, max } = this.config.operandRange;
    const operations = this.config.operations;
    
    for (let i = 0; i < count; i++) {
      const operator = operations[Math.floor(Math.random() * operations.length)];
      const value = this.randomInt(min, max);
      
      const ball: FloatingBall = {
        id: `bomb-${Date.now()}-${Math.random()}`,
        value,
        operator,
        color: 'coral', // Will be overridden by black graphics
        x: 0,
        y: 0,
        originalX: 0,
        originalY: 0,
        wavePhase: Math.random() * Math.PI * 2,
        isCollected: false,
        isBomb: true, // This IS a bomb
        isSolvable: false, // Bombs are not solvable
        lane: 1, // Will be set when spawning
        originalLane: 1,
        container: null,
      };
      balls.push(ball);
    }
    
    return balls;
  }

  /**
   * Check if an operation is helpful for solving the puzzle
   */
  private isHelpfulOperation(operator: '+' | '-' | '*' | '/', value: number, current: number, target: number): boolean {
    const result = this.applyOperation(current, operator, value);
    const currentDistance = Math.abs(result - target);
    const originalDistance = Math.abs(current - target);
    
    return currentDistance < originalDistance;
  }

  /**
   * Shuffle array in place
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Generate random integer in range [min, max]
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Reset generator state
   */
  reset(): void {
    console.log('[EquationGenerator] reset called - clearing used combinations');
    this.usedCombinations.clear();
  }

  /**
   * Get random color
   */
  getRandomColor(): BallColor {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  // Deprecated methods kept for backward compatibility
  generateEquationWithBalls(availableNumbers: number[]): Equation {
    console.warn('[EquationGenerator] generateEquationWithBalls is deprecated, using generateEquation instead');
    return this.generateEquation();
  }
}
