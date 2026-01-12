import { Equation, Operation, FloatingBallMathLevelConfig, BallColor } from '../types';

export class EquationGenerator {
  private config: FloatingBallMathLevelConfig;
  private colors: BallColor[] = ['coral', 'mint', 'yellow', 'lavender'];
  private usedCombinations: Set<string> = new Set();

  constructor(config: FloatingBallMathLevelConfig) {
    console.log('[EquationGenerator] Constructor called with config:', config);
    this.config = config;
  }

  generateEquation(): Equation {
    console.log('[EquationGenerator] generateEquation called');
    try {
      const operation = this.pickOperation();
      console.log('[EquationGenerator] Operation selected:', operation);
      
      const target = this.generateTarget(operation);
      console.log('[EquationGenerator] Target generated:', target);
      
      const correctPair = this.generateCorrectPair(target, operation);
      console.log('[EquationGenerator] Correct pair generated:', correctPair);
      
      const distractors = this.generateDistractors(target, operation, correctPair);
      console.log('[EquationGenerator] Distractors generated:', distractors);
      
      const allNumbers = [...correctPair, ...distractors];
      
      // Shuffle the array to place correct pair at random positions
      for (let i = allNumbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
      }
      
      console.log('[EquationGenerator] All numbers (shuffled):', allNumbers);
      
      const result = {
        target,
        operation,
        correctPair,
        allNumbers,
      };
      console.log('[EquationGenerator] Equation generated successfully:', result);
      return result;
    } catch (error) {
      console.error('[EquationGenerator] ERROR in generateEquation:', error);
      throw error;
    }
  }

  private pickOperation(): Operation {
    const operations = this.config.operations;
    if (!operations || operations.length === 0) {
      console.error('[EquationGenerator] ERROR: operations array is empty!');
      throw new Error('No operations available in config');
    }
    const op = operations[Math.floor(Math.random() * operations.length)];
    return op;
  }

  private generateTarget(operation: Operation): number {
    const { min, max } = this.config.targetRange;
    console.log('[EquationGenerator] generateTarget - range:', { min, max }, 'operation:', operation);
    
    // Validate range
    if (min >= max) {
      console.error('[EquationGenerator] ERROR: Invalid targetRange', { min, max });
      throw new Error('Invalid targetRange: min (' + min + ') must be less than max (' + max + ')');
    }
    
    if (operation === '/') {
      const divisors = [2,3,4,5,6,7,8,9,10];
      const validDivisors = divisors.filter(d => d >= min && d <= max);
      if (validDivisors.length === 0) {
        console.error('[EquationGenerator] ERROR: No valid divisors in range', { min, max });
        throw new Error('No valid divisors in range ' + min + '}' + max);
      }
      return validDivisors[Math.floor(Math.random() * validDivisors.length)];
    }
    
    return this.randomInt(min, max);
  }

  private generateCorrectPair(target: number, operation: Operation): [number, number] {
    const { min, max } = this.config.operandRange;
    console.log('[EquationGenerator] generateCorrectPair - target:', target, 'operation:', operation, 'operandRange:', { min, max });
    
    // Validate operand range
    if (min >= max) {
      console.error('[EquationGenerator] ERROR: Invalid operandRange', { min, max });
      throw new Error('Invalid operandRange: min (' + min + ') must be less than max (' + max + ')');
    }
    
    let attempts = 0;
    const maxAttempts = 1000; // Increased from 100 for more robustness

    while (attempts < maxAttempts) {
      let num1: number, num2: number;
      let uniqueKey: string;

      try {
        switch (operation) {
          case '+':
            num1 = this.randomInt(min, Math.min(max, target - min));
            num2 = target - num1;
            uniqueKey = '' + num1 + '+' + num2;
            break;

          case '-':
            num2 = this.randomInt(min, max);
            num1 = target + num2;
            uniqueKey = '' + num1 + '-' + num2;
            break;

          case '*':
            const factors = this.getFactors(target);
            const validFactors = factors.filter(f => f >= min && f <= max);
            if (validFactors.length === 0) {
              attempts++;
              console.log('[EquationGenerator] Attempt ' + attempts + ': No valid factors for multiplication');
              continue;
            }
            num1 = validFactors[Math.floor(Math.random() * validFactors.length)];
            num2 = target / num1;
            uniqueKey = '' + num1 + '*' + num2;
            break;

          case '/':
            const divisor = this.randomInt(min, max);
            num1 = target * divisor;
            num2 = divisor;
            uniqueKey = '' + num1 + '/' + num2;
            break;

          default:
            console.error('[EquationGenerator] ERROR: Unknown operation:', operation);
            throw new Error('Unknown operation: ' + operation);
        }

        // Check if this combination was already used
        if (!this.usedCombinations.has(uniqueKey)) {
          // Ensure both numbers are within operand range
          if (num1 >= min && num1 <= max && num2 >= min && num2 <= max) {
            this.usedCombinations.add(uniqueKey);
            console.log('[EquationGenerator] Found valid pair after ' + attempts + ' attempts:', [num1, num2]);
            return [num1, num2];
          } else {
            console.log('[EquationGenerator] Attempt ' + attempts + ': Pair out of range', [num1, num2], 'range:', { min, max });
          }
        } else {
          console.log('[EquationGenerator] Attempt ' + attempts + ': Combination already used', uniqueKey);
        }

        attempts++;
      } catch (e) {
        console.error('[EquationGenerator] ERROR in generateCorrectPair loop:', e);
        attempts++;
      }
    }

    // Fallback with validation
    console.error('[EquationGenerator] ERROR: Could not find valid pair after ' + maxAttempts + ' attempts');
    throw new Error('Failed to generate correct pair after ' + maxAttempts + ' attempts. Config: target=' + target + ', operation=' + operation + ', range=[' + min + ',' + max + ']');
  }

  private generateDistractors(
    target: number,
    operation: Operation,
    correctPair: [number, number]
  ): number[] {
    const { min, max } = this.config.operandRange;
    console.log('[EquationGenerator] generateDistractors - target:', target, 'operation:', operation, 'correctPair:', correctPair);
    
    const distractors: number[] = [];
    const targetCount = this.randomInt(4, 6);
    console.log('[EquationGenerator] Target distractor count:', targetCount);
    
    let attempts = 0;
    const maxAttempts = 1000; // Safety limit

    while (distractors.length < targetCount && attempts < maxAttempts) {
      const offset = this.randomInt(-5, 5);
      const reference = correctPair[this.randomInt(0, 1)];
      const candidate = reference + offset;
      
      if (this.isValidDistractor(candidate, target, operation, correctPair, min, max)) {
        if (!distractors.includes(candidate) && !correctPair.includes(candidate)) {
          distractors.push(candidate);
          console.log('[EquationGenerator] Added distractor ' + distractors.length + '/' + targetCount + ':', candidate);
        }
      }
      
      attempts++;
    }
    
    if (distractors.length < targetCount) {
      console.error('[EquationGenerator] WARNING: Only generated ' + distractors.length + '/' + targetCount + ' distractors after ' + attempts + ' attempts');
    }
    
    return distractors;
  }

  private isValidDistractor(
    candidate: number,
    target: number,
    operation: Operation,
    correctPair: [number, number],
    min: number,
    max: number
  ): boolean {
    if (candidate < min || candidate > max) return false;

    for (const num of correctPair) {
      if (this.formsTarget(candidate, num, target, operation)) {
        return false;
      }
    }

    return true;
  }

  private formsTarget(num1: number, num2: number, target: number, operation: Operation): boolean {
    switch (operation) {
      case '+':
        return num1 + num2 === target;
      case '-':
        return num1 - num2 === target || num2 - num1 === target;
      case '*':
        return num1 * num2 === target;
      case '/':
        return num1 !== 0 && num2 !== 0 && (num1 / num2 === target || num2 / num1 === target);
      default:
        return false;
    }
  }

  private getFactors(n: number): number[] {
    const factors: number[] = [];
    for (let i = 1; i <= Math.sqrt(n); i++) {
      if (n % i === 0) {
        factors.push(i);
        if (i !== n / i) {
          factors.push(n / i);
        }
      }
    }
    return factors.sort((a, b) => a - b);
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  reset(): void {
    console.log('[EquationGenerator] reset called - clearing used combinations');
    this.usedCombinations.clear();
  }

  getRandomColor(): BallColor {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  /**
   * Generate an equation that can be solved using the available ball values
   * @param availableNumbers - Array of ball values currently available
   * @returns An equation with target, operation, correct pair, and all numbers
   */
  generateEquationWithBalls(availableNumbers: number[]): Equation {
    console.log('[EquationGenerator] generateEquationWithBalls called with available numbers:', availableNumbers);
    
    // Need at least 2 balls to form an equation
    if (availableNumbers.length < 2) {
      console.error('[EquationGenerator] ERROR: Need at least 2 available balls, got:', availableNumbers.length);
      throw new Error('Need at least 2 available balls to generate equation');
    }

    // Pick an operation
    const operation = this.pickOperation();
    console.log('[EquationGenerator] Operation selected:', operation);

    // Find all valid pairs from available numbers that can form a target within range
    const validPairs = this.findValidPairs(availableNumbers, operation);
    console.log('[EquationGenerator] Valid pairs found:', validPairs.length);

    if (validPairs.length === 0) {
      console.error('[EquationGenerator] ERROR: No valid pairs found in available numbers for operation:', operation);
      throw new Error('No valid pairs found in available numbers for operation: ' + operation);
    }

    // Select a random valid pair as the correct answer
    const correctPair = validPairs[Math.floor(Math.random() * validPairs.length)];
    console.log('[EquationGenerator] Selected correct pair:', correctPair);

    // Calculate target from the correct pair
    const target = this.calculateTarget(correctPair, operation);
    console.log('[EquationGenerator] Target calculated:', target);

    // Use available numbers as the pool for distractors
    // Remove the correct pair from available numbers to get distractor candidates
    const distractorCandidates = availableNumbers.filter(num => !correctPair.includes(num));
    console.log('[EquationGenerator] Distractor candidates:', distractorCandidates);

    // Generate distractors from remaining available numbers
    const distractors = this.generateDistractorsFromCandidates(target, operation, correctPair, distractorCandidates);
    console.log('[EquationGenerator] Distractors generated:', distractors);

    // Combine correct pair and distractors
    const allNumbers = [...correctPair, ...distractors];

    // Shuffle the array
    for (let i = allNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allNumbers[i], allNumbers[j]] = [allNumbers[j], allNumbers[i]];
    }

    console.log('[EquationGenerator] All numbers (shuffled):', allNumbers);

    const result = {
      target,
      operation,
      correctPair,
      allNumbers,
    };
    console.log('[EquationGenerator] Equation generated successfully:', result);
    return result;
  }

  /**
   * Find all pairs from available numbers that can form valid targets within the configured range
   */
  private findValidPairs(availableNumbers: number[], operation: Operation): [number, number][] {
    const validPairs: [number, number][] = [];
    const { min: targetMin, max: targetMax } = this.config.targetRange;

    // Check all unique pairs
    for (let i = 0; i < availableNumbers.length; i++) {
      for (let j = i + 1; j < availableNumbers.length; j++) {
        const num1 = availableNumbers[i];
        const num2 = availableNumbers[j];

        // Calculate what target this pair would produce
        const target = this.calculateTarget([num1, num2], operation);

        // Check if target is within valid range
        if (target >= targetMin && target <= targetMax) {
          // Check if we haven't used this combination before
          const uniqueKey1 = `${num1}${operation}${num2}`;
          const uniqueKey2 = `${num2}${operation}${num1}`;
          
          if (!this.usedCombinations.has(uniqueKey1) && !this.usedCombinations.has(uniqueKey2)) {
            validPairs.push([num1, num2]);
          }
        }
      }
    }

    console.log('[EquationGenerator] findValidPairs found', validPairs.length, 'valid pairs out of', availableNumbers.length, 'numbers');
    return validPairs;
  }

  /**
   * Calculate the target from a pair of numbers using the specified operation
   */
  private calculateTarget(pair: [number, number], operation: Operation): number {
    const [num1, num2] = pair;

    switch (operation) {
      case '+':
        return num1 + num2;
      case '-':
        return Math.abs(num1 - num2);
      case '*':
        return num1 * num2;
      case '/':
        // For division, return the quotient (should be integer)
        return Math.round(num1 / num2);
      default:
        throw new Error('Unknown operation: ' + operation);
    }
  }

  /**
   * Generate distractors from candidate numbers
   * Uses available numbers that are not part of the correct pair
   */
  private generateDistractorsFromCandidates(
    target: number,
    operation: Operation,
    correctPair: [number, number],
    candidates: number[]
  ): number[] {
    const { min, max } = this.config.operandRange;
    const distractors: number[] = [];
    const targetCount = this.randomInt(2, Math.min(4, candidates.length)); // Use fewer distractors if we have fewer candidates
    console.log('[EquationGenerator] Target distractor count:', targetCount, 'from', candidates.length, 'candidates');

    // Try to use all candidates first, then shuffle and select targetCount
    const shuffledCandidates = [...candidates];
    for (let i = shuffledCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCandidates[i], shuffledCandidates[j]] = [shuffledCandidates[j], shuffledCandidates[i]];
    }

    for (const candidate of shuffledCandidates) {
      if (distractors.length >= targetCount) break;

      if (this.isValidDistractor(candidate, target, operation, correctPair, min, max)) {
        distractors.push(candidate);
        console.log('[EquationGenerator] Added distractor ' + distractors.length + ':', candidate);
      }
    }

    if (distractors.length < targetCount) {
      console.warn('[EquationGenerator] WARNING: Only generated ' + distractors.length + '/' + targetCount + ' distractors');
    }

    return distractors;
  }
}
