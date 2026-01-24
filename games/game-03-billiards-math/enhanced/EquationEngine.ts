import type {
  Equation,
  SimpleEquation,
  ComplexEquation,
  Operation,
  EquationGenerationConfig,
  ValidationResult
} from '../types';

/**
 * Enhanced Equation Engine - A robust mathematical equation generation and validation system
 */
export class EquationEngine {
  private config: EquationGenerationConfig;

  constructor(config: EquationGenerationConfig) {
    this.config = config;
  }

  /**
   * Generate a new equation based on current configuration
   */
  generateEquation(): Equation {
    const shouldGenerateComplex = this.shouldGenerateComplexEquation();

    if (shouldGenerateComplex) {
      return this.generateComplexEquation();
    } else {
      return this.generateSimpleEquation();
    }
  }

  /**
   * Generate a simple two-operand equation
   */
  private generateSimpleEquation(): SimpleEquation {
    const operations = this.getAvailableOperations();
    const operator = operations[Math.floor(Math.random() * operations.length)] as '+' | '-' | '*' | '/';

    let leftOperand: number;
    let rightOperand: number;
    let result: number;

    if (operator === '+') {
      // Addition: ensure result is within 1-10
      leftOperand = this.getRandomOperand();
      const maxRight = 10 - leftOperand;
      rightOperand = Math.max(1, Math.min(maxRight, this.getRandomOperand()));
      result = leftOperand + rightOperand;

      // If result > 10, adjust
      if (result > 10) {
        leftOperand = Math.floor(Math.random() * 5) + 1; // 1-5
        rightOperand = Math.floor(Math.random() * (10 - leftOperand)) + 1;
        result = leftOperand + rightOperand;
      }
    } else if (operator === '-') {
      // Subtraction: ensure no negative results and result is 1-10
      leftOperand = this.getRandomOperand();
      rightOperand = Math.floor(Math.random() * (leftOperand - 1)) + 1;
      result = leftOperand - rightOperand;

      if (result < 1) {
        leftOperand = Math.floor(Math.random() * 5) + 5; // 5-9
        rightOperand = Math.floor(Math.random() * (leftOperand - 1)) + 1;
        result = leftOperand - rightOperand;
      }
    } else if (operator === '*') {
      // Multiplication: only use pairs where result is 1-10
      // Valid pairs: 1x1-10, 2x1-5, 3x1-3, 5x2
      const validPairs = [
        [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10],
        [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
        [3, 1], [3, 2], [3, 3],
        [4, 1], [4, 2],
        [5, 1], [5, 2],
        [6, 1], [7, 1], [8, 1], [9, 1], [10, 1]
      ];
      const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
      leftOperand = pair[0];
      rightOperand = pair[1];
      result = leftOperand * rightOperand;
    } else {
      // Division: only use pairs where division is clean and all values are 1-10
      // Valid pairs: dividend / divisor = result (all 1-10)
      const validPairs = [
        [2, 1, 2], [2, 2, 1], [3, 1, 3], [3, 3, 1], [4, 1, 4], [4, 2, 2], [4, 4, 1],
        [5, 1, 5], [5, 5, 1], [6, 1, 6], [6, 2, 3], [6, 3, 2], [6, 6, 1],
        [7, 1, 7], [7, 7, 1], [8, 1, 8], [8, 2, 4], [8, 4, 2], [8, 8, 1],
        [9, 1, 9], [9, 3, 3], [9, 9, 1], [10, 1, 10], [10, 2, 5], [10, 5, 2], [10, 10, 1]
      ];
      const pair = validPairs[Math.floor(Math.random() * validPairs.length)];
      leftOperand = pair[0];
      rightOperand = pair[1];
      result = pair[2];
    }

    const equation: SimpleEquation = {
      type: 'simple',
      leftOperand,
      rightOperand,
      operator,
      result,
      displayText: `${leftOperand} ${operator} ${rightOperand} = ${result}`,
      difficulty: this.calculateDifficulty({ type: 'simple', operator, operands: [leftOperand, rightOperand] })
    };

    // Add legacy compatibility properties
    equation.leftOperand1 = leftOperand;
    equation.leftOperand2 = rightOperand;

    return equation;
  }

  /**
   * Generate a complex multi-operand equation
   * To ensure solvability, complex equations only use + and -
   */
  private generateComplexEquation(): ComplexEquation {
    const numOperands = 3; // Fixed to 3 for complex equations

    // Only use + and - for complex equations to ensure solvability
    const safeOperations: Operation[] = ['+', '-'];
    const operations: Operation[] = [];
    for (let i = 0; i < numOperands - 1; i++) {
      operations.push(safeOperations[Math.floor(Math.random() * safeOperations.length)]);
    }

    // Generate operands that ensure result is within 1-10
    let operands: number[];
    let result: number;
    let attempts = 0;

    do {
      operands = [];
      for (let i = 0; i < numOperands; i++) {
        operands.push(Math.floor(Math.random() * 9) + 1); // 1-9
      }
      result = this.calculateComplexResult(operands, operations);
      attempts++;
    } while ((result < 1 || result > 10) && attempts < 50);

    // If we couldn't find a valid equation, use a guaranteed fallback
    if (result < 1 || result > 10) {
      operands = [5, 2, 1];
      const op = operations[0] === '+' ? '+' : '+';
      const op2 = operations[1] === '+' ? '+' : '-';
      operations[0] = op;
      operations[1] = op2;
      result = this.calculateComplexResult(operands, operations);
    }

    const equation: ComplexEquation = {
      type: 'complex',
      operands,
      operators: operations,
      result,
      displayText: this.buildDisplayText(operands, operations),
      difficulty: this.calculateDifficulty({
        type: 'complex',
        operators: operations,
        operands
      })
    };

    // Add legacy compatibility properties
    equation.requiredOperands = operands.slice(0, Math.min(3, operands.length));

    return equation;
  }

  /**
   * Validate if an equation solution is correct
   */
  validateEquation(equation: Equation, userAnswer: number[]): ValidationResult {
    if (equation.type === 'simple') {
      return this.validateSimpleEquation(equation, userAnswer);
    } else {
      return this.validateComplexEquationAnswer(equation, userAnswer);
    }
  }

  /**
   * Validate a simple equation answer
   */
  private validateSimpleEquation(equation: SimpleEquation, userAnswer: number[]): ValidationResult {
    if (userAnswer.length !== 2) {
      return { isValid: false, error: 'Expected 2 operands for simple equation' };
    }

    const [left, right] = userAnswer;
    const userResult = equation.operator === '+' ? left + right : left - right;

    return {
      isValid: userResult === equation.result,
      normalizedResult: userResult
    };
  }

  /**
   * Validate a complex equation answer
   */
  private validateComplexEquationAnswer(equation: ComplexEquation, userAnswer: number[]): ValidationResult {
    if (userAnswer.length < 2) {
      return { isValid: false, error: 'Expected at least 2 operands for complex equation' };
    }

    // Use the same number of operands as in the equation
    const operandsToUse = userAnswer.slice(0, equation.operators.length + 1);
    const userResult = this.calculateComplexResult(operandsToUse, equation.operators);

    return {
      isValid: userResult === equation.result,
      normalizedResult: userResult
    };
  }

  /**
   * Calculate the result of a complex equation following the order of operations
   */
  private calculateComplexResult(operands: number[], operators: Operation[]): number {
    if (operands.length !== operators.length + 1) {
      throw new Error('Invalid equation: operands and operators count mismatch');
    }

    // Create working copies
    const numbers = [...operands];
    const ops = [...operators];

    // First pass: handle multiplication and division
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '*' || ops[i] === '/') {
        let result: number;

        if (ops[i] === '*') {
          result = numbers[i] * numbers[i + 1];
        } else {
          // Handle division - ensure no division by zero
          if (numbers[i + 1] === 0) {
            // Replace division with addition to avoid zero division
            result = numbers[i] + numbers[i + 1];
            ops[i] = '+';
          } else {
            // Use integer division for simplicity
            result = Math.round(numbers[i] / numbers[i + 1]);
          }
        }

        // Replace the two numbers with the result
        numbers.splice(i, 2, result);
        ops.splice(i, 1);
        i--; // Adjust index since we removed an operator
      }
    }

    // Second pass: handle addition and subtraction
    let result = numbers[0];
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '+') {
        result += numbers[i + 1];
      } else if (ops[i] === '-') {
        result -= numbers[i + 1];
      }
    }

    return result;
  }

  /**
   * Generate display text with proper mathematical symbols
   */
  private buildDisplayText(operands: number[], operators: Operation[]): string {
    let displayText = '';

    for (let i = 0; i < operands.length; i++) {
      displayText += operands[i].toString();

      // Add operator (except after last operand)
      if (i < operators.length) {
        let operatorSymbol: string = operators[i];
        if (operators[i] === '*') operatorSymbol = '×';
        if (operators[i] === '/') operatorSymbol = '÷';

        displayText += ` ${operatorSymbol} `;
      }
    }

    displayText += ` = ${this.calculateComplexResult(operands, operators)}`;
    return displayText;
  }

  /**
   * Get available operations based on configuration
   */
  private getAvailableOperations(): Operation[] {
    if (this.config.complexity === 'simple') {
      return this.config.operations.filter(op => op === '+' || op === '-');
    }
    return this.config.operations;
  }

  /**
   * Determine if we should generate a complex equation
   */
  private shouldGenerateComplexEquation(): boolean {
    return this.config.complexity === 'complex' ||
      (this.config.complexity === 'mixed' && Math.random() > 0.5);
  }

  /**
   * Generate appropriate number of operands based on equation complexity
   */
  private getRandomOperandCount(): number {
    if (this.config.complexity === 'simple') {
      return 2; // Simple equations always have 2 operands
    } else if (this.config.complexity === 'complex') {
      return 3
    } else {
      // Mixed complexity - 50% chance of simple, 50% chance of complex
      return Math.random() > 0.5 ? 2 : 3;
    }
  }

  /**
   * Generate random operations for complex equations with proper precedence ordering
   */
  private generateRandomOperations(count: number): Operation[] {
    const operations = this.getAvailableOperations();

    // Separate operations into high precedence (*, /) and low precedence (+, -)
    const highPrecedence: Operation[] = operations.filter(op => op === '*' || op === '/');
    const lowPrecedence: Operation[] = operations.filter(op => op === '+' || op === '-');
    const result: Operation[] = [];

    for (let i = 0; i < count; i++) {
      // For the first part of the equation, prefer high precedence operations
      if (i < Math.ceil(count / 2) && highPrecedence.length > 0) {
        result.push(highPrecedence[Math.floor(Math.random() * highPrecedence.length)]);
      } else if (lowPrecedence.length > 0) {
        result.push(lowPrecedence[Math.floor(Math.random() * lowPrecedence.length)]);
      } else if (highPrecedence.length > 0) {
        // Fallback to high precedence if no low precedence available
        result.push(highPrecedence[Math.floor(Math.random() * highPrecedence.length)]);
      } else {
        // Fallback to addition if nothing else available
        result.push('+');
      }
    }

    // Ensure at least one high precedence operation comes first if available
    if (result.length > 1 && highPrecedence.length > 0) {
      // Move any high precedence operation to the front
      const firstHighIndex = result.findIndex(op => op === '*' || op === '/');
      if (firstHighIndex > 0) {
        [result[0], result[firstHighIndex]] = [result[firstHighIndex], result[0]];
      }
    }

    return result;
  }

  /**
   * Generate operands for complex equations
   */
  private generateOperands(count: number): number[] {
    const operands: number[] = [];

    for (let i = 0; i < count; i++) {
      operands.push(this.getRandomOperand());
    }

    return operands;
  }

  /**
   * Get a random operand within the configured range
   */
  private getRandomOperand(): number {
    const { min, max } = this.config.numberRange;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Validate if a result meets the configured constraints and pool ball availability
   */
  private validateResult(result: number): ValidationResult {
    // First check configured constraints
    if (!this.config.allowNegativeResults && result < 0) {
      return { isValid: false, error: 'Negative result not allowed' };
    }

    if (!this.config.allowLargeResults && result > this.config.maxResult) {
      return { isValid: false, error: 'Result too large' };
    }

    if (result < this.config.minResult || result > this.config.maxResult) {
      return { isValid: false, error: 'Result out of range' };
    }

    // Critical: Check if result is within pool ball range (1-10)
    if (result < 1 || result > 10) {
      return { isValid: false, error: 'Result not in pool ball range (1-10)' };
    }

    return { isValid: true };
  }

  /**
   * Validate a complex equation for solvability
   */
  private validateComplexEquation(operands: number[], operators: Operation[], result: number): ValidationResult {
    // Check for division by zero in intermediate steps
    const numbers = [...operands];
    const ops = [...operators];

    // Simulate calculation to check for issues
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '*' || ops[i] === '/') {
        if (ops[i] === '/' && numbers[i + 1] === 0) {
          return { isValid: false, error: 'Division by zero' };
        }

        if (ops[i] === '*') {
          const product = numbers[i] * numbers[i + 1];
          if (Math.abs(product) > 100) {
            return { isValid: false, error: 'Intermediate result too large' };
          }
        }
      }
    }

    return this.validateResult(result);
  }

  /**
   * Calculate difficulty score for an equation
   */
  private calculateDifficulty(params: {
    type: 'simple' | 'complex';
    operator?: Operation;
    operands?: number[];
    operators?: Operation[];
  }): number {
    let difficulty = 1;

    if (params.type === 'simple') {
      if (params.operator === '-') difficulty += 0.5;
    } else {
      // Complex equation difficulty
      difficulty += params.operators!.length * 0.5;

      // Add difficulty for multiplication and division
      params.operators!.forEach(op => {
        if (op === '*') difficulty += 1;
        if (op === '/') difficulty += 1.5;
      });
    }

    return Math.round(difficulty * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Check if an equation is complex
   */
  isComplexEquation(equation: Equation): equation is ComplexEquation {
    return equation.type === 'complex';
  }
}
