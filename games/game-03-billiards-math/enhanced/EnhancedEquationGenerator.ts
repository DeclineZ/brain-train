import { EquationEngine } from './EquationEngine';
import { QuestionManager } from './QuestionManager';
import type { 
  BilliardsLevelConfig, 
  Equation, 
  Question, 
  QuestionType,
  EquationGenerationConfig,
  LegacyEquation,
  LegacyComplexEquation
} from '../types';

/**
 * Enhanced Equation Generator - Backward compatible wrapper for the new equation and question systems
 */
export class EnhancedEquationGenerator {
  private equationEngine: EquationEngine;
  private questionManager: QuestionManager;
  private levelConfig: BilliardsLevelConfig;

  constructor(levelConfig: BilliardsLevelConfig) {
    this.levelConfig = levelConfig;
    this.equationEngine = new EquationEngine(this.createEquationConfig(levelConfig));
    this.questionManager = new QuestionManager();
  }

  /**
   * Generate an equation (backward compatible method)
   */
  generateEquation(): Equation {
    let equation: Equation;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      equation = this.equationEngine.generateEquation();
      attempts++;
      
      if (attempts >= maxAttempts) {
        console.warn('Failed to generate solvable equation after max attempts, using fallback');
        // Generate a simple guaranteed solvable equation
        equation = this.generateGuaranteedSolvableEquation();
        break;
      }
    } while (!this.questionManager.isEquationSolvableWithPoolBalls(equation));

    return equation;
  }

  /**
   * Generate a guaranteed solvable equation for fallback cases
   */
  private generateGuaranteedSolvableEquation(): Equation {
    const operations = ['+', '-'] as const;
    const operator = operations[Math.floor(Math.random() * operations.length)];
    
    let leftOperand = Math.floor(Math.random() * 5) + 1; // 1-5
    let rightOperand = Math.floor(Math.random() * 5) + 1; // 1-5
    
    // Ensure result is within 1-10 range
    if (operator === '-' && leftOperand < rightOperand) {
      [leftOperand, rightOperand] = [rightOperand, leftOperand]; // Swap to avoid negative
    }
    
    const result = operator === '+' ? leftOperand + rightOperand : leftOperand - rightOperand;
    
    return {
      type: 'simple',
      leftOperand,
      rightOperand,
      operator,
      result,
      displayText: `${leftOperand} ${operator} ${rightOperand} = ${result}`,
      difficulty: 1,
      // Legacy compatibility
      leftOperand1: leftOperand,
      leftOperand2: rightOperand
    };
  }

  /**
   * Generate a fill-in-the-blanks equation (backward compatible)
   */
  generateFillInTheBlanksEquation(): Equation {
    const equation = this.generateEquation();
    // Clear display text for fill-in-the-blanks (will be built dynamically in GameScene)
    equation.displayText = '';
    return equation;
  }

  /**
   * Validate an equation answer (backward compatible)
   */
  validateEquation(equation: Equation, answer: number[]): boolean {
    const validation = this.equationEngine.validateEquation(equation, answer);
    return validation.isValid;
  }

  /**
   * Get required balls for an equation (backward compatible)
   */
  getRequiredBallsForEquation(equation: Equation): number[] {
    return this.questionManager.getRequiredBallsForEquation(equation);
  }

  /**
   * Check if an equation is complex (backward compatible)
   */
  isComplexEquation(equation: Equation): boolean {
    return this.equationEngine.isComplexEquation(equation);
  }

  /**
   * Create a question (new enhanced method)
   */
  createQuestion(type: QuestionType = 'fill-in-the-blanks'): Question {
    const equation = this.generateEquation();
    return this.questionManager.createQuestion(equation, type);
  }

  /**
   * Validate a question answer (new enhanced method)
   */
  validateQuestion(question: Question, userAnswer: number[]) {
    return this.questionManager.validateAnswer(question, userAnswer);
  }

  /**
   * Convert legacy equation to new equation format
   */
  static fromLegacyEquation(legacyEq: LegacyEquation | LegacyComplexEquation): Equation {
    if ('leftOperand1' in legacyEq) {
      // Legacy simple equation
      const legacy = legacyEq as LegacyEquation;
      return {
        type: 'simple',
        leftOperand: legacy.leftOperand1,
        rightOperand: legacy.leftOperand2,
        operator: legacy.operator,
        result: legacy.result,
        displayText: legacy.displayText,
        difficulty: 1,
        // Legacy compatibility
        leftOperand1: legacy.leftOperand1,
        leftOperand2: legacy.leftOperand2
      };
    } else {
      // Legacy complex equation
      const legacy = legacyEq as LegacyComplexEquation;
      return {
        type: 'complex',
        operands: legacy.operands,
        operators: legacy.operators,
        result: legacy.result,
        displayText: legacy.displayText,
        difficulty: 2,
        requiredOperands: legacy.requiredOperands
      };
    }
  }

  /**
   * Convert new equation to legacy format
   */
  static toLegacyEquation(equation: Equation): LegacyEquation | LegacyComplexEquation {
    if (equation.type === 'simple') {
      const simple = equation as any;
      return {
        leftOperand1: simple.leftOperand || simple.leftOperand1,
        operator: simple.operator,
        leftOperand2: simple.rightOperand || simple.leftOperand2,
        result: equation.result,
        displayText: equation.displayText
      };
    } else {
      const complex = equation as any;
      return {
        operands: complex.operands,
        operators: complex.operators,
        result: equation.result,
        displayText: equation.displayText,
        requiredOperands: complex.requiredOperands
      };
    }
  }

  /**
   * Create equation generation config from level config
   */
  private createEquationConfig(levelConfig: BilliardsLevelConfig): EquationGenerationConfig {
    let operations: ('+' | '-' | '*' | '/')[] = [];
    
    switch (levelConfig.operations) {
      case '+':
        operations = ['+'];
        break;
      case '-':
        operations = ['-'];
        break;
      case '*':
        operations = ['*'];
        break;
      case '/':
        operations = ['/'];
        break;
      case 'mixed':
        operations = ['+', '-', '*', '/'];
        break;
      default:
        operations = ['+', '-'];
    }

    return {
      operations,
      numberRange: levelConfig.numberRange,
      complexity: levelConfig.equationComplexity,
      allowNegativeResults: false, // Keep simple for now
      allowLargeResults: false,
      maxResult: 200,
      minResult: -50
    };
  }

  /**
   * Get the current level configuration
   */
  getLevelConfig(): BilliardsLevelConfig {
    return this.levelConfig;
  }

  /**
   * Update the level configuration
   */
  updateLevelConfig(levelConfig: BilliardsLevelConfig): void {
    this.levelConfig = levelConfig;
    this.equationEngine = new EquationEngine(this.createEquationConfig(levelConfig));
  }

  /**
   * Get equation statistics for debugging
   */
  getEquationStats(equation: Equation): {
    type: string;
    difficulty: number;
    hasResult: boolean;
    resultInPoolRange: boolean;
  } {
    return {
      type: equation.type,
      difficulty: equation.difficulty,
      hasResult: typeof equation.result === 'number',
      resultInPoolRange: equation.result >= 1 && equation.result <= 10
    };
  }

  /**
   * Generate a batch of equations for testing
   */
  generateEquationBatch(count: number): Equation[] {
    const equations: Equation[] = [];
    
    for (let i = 0; i < count; i++) {
      equations.push(this.generateEquation());
    }
    
    return equations;
  }

  /**
   * Check if an equation is appropriate for the current level
   */
  isEquationAppropriateForLevel(equation: Equation): boolean {
    const config = this.createEquationConfig(this.levelConfig);
    
    // Check if result is within allowed range
    if (equation.result < config.minResult || equation.result > config.maxResult) {
      return false;
    }
    
    // Check if equation complexity matches level
    if (config.complexity === 'simple' && equation.type !== 'simple') {
      return false;
    }
    
    if (config.complexity === 'complex' && equation.type === 'simple') {
      return false;
    }
    
    // For mixed complexity, both are allowed
    return true;
  }
}
