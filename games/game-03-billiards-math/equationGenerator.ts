import type { BilliardsLevelConfig, Equation } from './types';

export class EquationGenerator {
  private levelConfig: BilliardsLevelConfig;

  constructor(levelConfig: BilliardsLevelConfig) {
    this.levelConfig = levelConfig;
  }

  generateEquation(): Equation {
    const { operations, numberRange, equationComplexity } = this.levelConfig;
    
    let operator: '+' | '-';
    if (operations === 'mixed') {
      operator = Math.random() > 0.5 ? '+' : '-';
    } else {
      operator = operations;
    }

    let leftOperand1: number;
    let leftOperand2: number;
    let result: number;

    if (operator === '+') {
      if (equationComplexity === 'simple') {
        // Simple addition: single digits or easy multiples
        leftOperand1 = this.getRandomNumber(numberRange.min, Math.min(numberRange.max, 10));
        leftOperand2 = this.getRandomNumber(numberRange.min, Math.min(numberRange.max, 10));
      } else if (equationComplexity === 'mixed') {
        // Mixed: include some carrying
        leftOperand1 = this.getRandomNumber(numberRange.min, numberRange.max);
        leftOperand2 = this.getRandomNumber(numberRange.min, Math.min(numberRange.max, 20));
      } else {
        // Complex: larger numbers
        leftOperand1 = this.getRandomNumber(numberRange.min, numberRange.max);
        leftOperand2 = this.getRandomNumber(numberRange.min, numberRange.max);
      }
      result = leftOperand1 + leftOperand2;
    } else {
      // Subtraction
      if (equationComplexity === 'simple') {
        // Simple subtraction: no negative results
        leftOperand2 = this.getRandomNumber(numberRange.min, Math.min(numberRange.max, 10));
        result = this.getRandomNumber(numberRange.min, Math.min(numberRange.max, 10));
        leftOperand1 = result + leftOperand2;
      } else if (equationComplexity === 'mixed') {
        // Mixed subtraction: some negative results allowed at higher levels
        leftOperand2 = this.getRandomNumber(numberRange.min, Math.min(numberRange.max, 20));
        if (this.levelConfig.level < 35) {
          // No negative results before level 35
          result = this.getRandomNumber(numberRange.min, Math.min(numberRange.max, 20));
          leftOperand1 = result + leftOperand2;
        } else {
          // Allow negative results
          leftOperand1 = this.getRandomNumber(numberRange.min, numberRange.max);
          result = leftOperand1 - leftOperand2;
        }
      } else {
        // Complex subtraction
        leftOperand2 = this.getRandomNumber(numberRange.min, numberRange.max);
        leftOperand1 = this.getRandomNumber(numberRange.min, numberRange.max);
        result = leftOperand1 - leftOperand2;
      }
    }

    // Ensure result is within reasonable bounds for display
    if (result < -50) result = -50;
    if (result > 200) result = 200;

    const displayText = `${leftOperand1} ${operator} ${leftOperand2} = ${result}`;

    return {
      leftOperand1,
      operator,
      leftOperand2,
      result,
      displayText
    };
  }

  generateFillInTheBlanksEquation(): Equation {
    const equation = this.generateEquation();
    
    // For fill-in-the-blanks, we hide the operands and show the result
    // No displayText needed - we'll build it dynamically in GameScene
    equation.displayText = '';
    
    return equation;
  }

  getRequiredBallsForEquation(equation: Equation): number[] {
    // Return the numbers that should be available as pool balls
    // For this game, we need the operands and sometimes the result
    const balls: number[] = [equation.leftOperand1, equation.leftOperand2];
    
    // Add result if it's a single digit and within reasonable range
    if (equation.result >= 1 && equation.result <= 9 && !balls.includes(equation.result)) {
      balls.push(equation.result);
    }
    
    // Ensure we always have balls 1-9 available for dragging
    for (let i = 1; i <= 9; i++) {
      if (!balls.includes(i)) {
        balls.push(i);
      }
    }
    
    return balls.sort((a, b) => a - b);
  }

  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  validateEquation(equation: Equation, answer: number): boolean {
    const correctResult = equation.operator === '+' 
      ? equation.leftOperand1 + equation.leftOperand2
      : equation.leftOperand1 - equation.leftOperand2;
    
    return correctResult === answer;
  }
}
