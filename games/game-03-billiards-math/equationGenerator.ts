// Enhanced Equation Generator using new system with backward compatibility
import { EnhancedEquationGenerator } from './enhanced/EnhancedEquationGenerator';
import type { BilliardsLevelConfig, Equation, ComplexEquation, LegacyEquation, LegacyComplexEquation } from './types';

export class EquationGenerator {
  private enhancedGenerator: EnhancedEquationGenerator;
  private levelConfig: BilliardsLevelConfig;

  constructor(levelConfig: BilliardsLevelConfig) {
    this.levelConfig = levelConfig;
    this.enhancedGenerator = new EnhancedEquationGenerator(levelConfig);
  }

  generateEquation(): Equation | ComplexEquation {
    return this.enhancedGenerator.generateEquation();
  }

  generateFillInTheBlanksEquation(): Equation | ComplexEquation {
    return this.enhancedGenerator.generateFillInTheBlanksEquation();
  }

  getRequiredBallsForEquation(equation: Equation | ComplexEquation): number[] {
    return this.enhancedGenerator.getRequiredBallsForEquation(equation);
  }

  validateEquation(equation: Equation | ComplexEquation, answer: number[]): boolean {
    return this.enhancedGenerator.validateEquation(equation, answer);
  }

  isComplexEquation(equation: Equation | ComplexEquation): equation is ComplexEquation {
    return this.enhancedGenerator.isComplexEquation(equation);
  }

  // New enhanced methods
  createQuestion() {
    return this.enhancedGenerator.createQuestion();
  }

  validateQuestion(question: any, userAnswer: number[]) {
    return this.enhancedGenerator.validateQuestion(question, userAnswer);
  }

  getLevelConfig(): BilliardsLevelConfig {
    return this.enhancedGenerator.getLevelConfig();
  }

  // Legacy methods for backward compatibility
  private getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// Re-export the enhanced classes for direct use
export { EnhancedEquationGenerator } from './enhanced/EnhancedEquationGenerator';
export { EquationEngine } from './enhanced/EquationEngine';
export { QuestionManager } from './enhanced/QuestionManager';
