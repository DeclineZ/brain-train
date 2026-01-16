import type { 
  Equation, 
  Question, 
  QuestionType, 
  QuestionValidation, 
  SimpleEquation, 
  ComplexEquation 
} from '../types';

/**
 * Question Manager - Handles question creation, validation, and management
 */
export class QuestionManager {
  private questionIdCounter = 0;

  /**
   * Create a new question from an equation
   */
  createQuestion(equation: Equation, type: QuestionType = 'fill-in-the-blanks'): Question {
    const id = this.generateQuestionId();
    const requiredBalls = this.getRequiredBallsForEquation(equation);
    const maxSlots = this.getMaxSlotsForEquation(equation);
    const hint = this.generateHint(equation, type);

    const question: Question = {
      id,
      equation,
      type,
      requiredBalls,
      maxSlots,
      hint
    };

    // Add options for multiple choice questions
    if (type === 'multiple-choice') {
      question.options = this.generateMultipleChoiceOptions(equation);
    }

    return question;
  }

  /**
   * Validate a user's answer to a question
   */
  validateAnswer(question: Question, userAnswer: number[]): QuestionValidation {
    const { equation } = question;
    let isCorrect = false;
    let feedback = '';

    if (equation.type === 'simple') {
      const simpleEq = equation as SimpleEquation;
      const [left, right] = userAnswer;
      let userResult: number;
      
      // Handle all four operations
      switch (simpleEq.operator) {
        case '+':
          userResult = left + right;
          break;
        case '-':
          userResult = left - right;
          break;
        case '*':
          userResult = left * right;
          break;
        case '/':
          userResult = right !== 0 ? left / right : NaN;
          break;
        default:
          userResult = NaN;
      }
      
      isCorrect = userResult === simpleEq.result && !isNaN(userResult);
      
      if (!isCorrect) {
        feedback = this.generateSimpleEquationFeedback(simpleEq, userResult);
      } else {
        feedback = 'Correct! Well done!';
      }
    } else {
      const complexEq = equation as ComplexEquation;
      // For complex equations, use the correct number of operands from the equation
      const requiredOperands = complexEq.operators.length + 1;
      const userOperands = userAnswer.slice(0, requiredOperands);
      const userResult = this.calculateComplexResult(userOperands, complexEq.operators);
      isCorrect = userResult === complexEq.result;
      
      if (!isCorrect) {
        feedback = this.generateComplexEquationFeedback(complexEq, userResult);
      } else {
        feedback = 'Excellent! You solved the complex equation!';
      }
    }

    return {
      isCorrect,
      feedback,
      expectedAnswer: this.getExpectedAnswer(equation),
      userAnswer
    };
  }

  /**
   * Get the required balls for an equation (for pool ball game)
   */
  getRequiredBallsForEquation(equation: Equation): number[] {
    let requiredNumbers: number[] = [];
    const availableBallRange = { min: 1, max: 10 };

    if (equation.type === 'simple') {
      const simpleEq = equation as SimpleEquation;
      requiredNumbers = [simpleEq.leftOperand, simpleEq.rightOperand];
      
      // Add result if it's within pool ball range and not already included
      if (simpleEq.result >= availableBallRange.min && 
          simpleEq.result <= availableBallRange.max && 
          !requiredNumbers.includes(simpleEq.result)) {
        requiredNumbers.push(simpleEq.result);
      }
    } else {
      const complexEq = equation as ComplexEquation;
      requiredNumbers = [...complexEq.operands];
      
      // Add result if it's within pool ball range and not already included
      if (complexEq.result >= availableBallRange.min && 
          complexEq.result <= availableBallRange.max && 
          !requiredNumbers.includes(complexEq.result)) {
        requiredNumbers.push(complexEq.result);
      }
    }

    // Add additional balls to make the game playable, but stay within available range
    // Only add balls that would help solve similar equations
    const additionalBalls: number[] = [];
    for (let i = availableBallRange.min; i <= availableBallRange.max; i++) {
      if (!requiredNumbers.includes(i)) {
        additionalBalls.push(i);
      }
    }

    // Sort and return all balls, prioritizing required ones
    return [...requiredNumbers.sort((a, b) => a - b), ...additionalBalls.sort((a, b) => a - b)];
  }

  /**
   * Validate if an equation is solvable with available pool balls (1-10)
   */
  isEquationSolvableWithPoolBalls(equation: Equation): boolean {
    const availableBallRange = { min: 1, max: 10 };
    
    // Check if all operands are within ball range
    if (equation.type === 'simple') {
      const simpleEq = equation as SimpleEquation;
      if (simpleEq.leftOperand < availableBallRange.min || 
          simpleEq.leftOperand > availableBallRange.max ||
          simpleEq.rightOperand < availableBallRange.min || 
          simpleEq.rightOperand > availableBallRange.max) {
        return false;
      }
      
      // Special validation for division equations
      if (simpleEq.operator === '/' || simpleEq.operator === '*') {
        return this.isSimpleDivisionEquationSolvable(simpleEq, availableBallRange);
      }
    } else {
      const complexEq = equation as ComplexEquation;
      if (complexEq.operands.some(operand => 
          operand < availableBallRange.min || operand > availableBallRange.max)) {
        return false;
      }
      
      // Special validation for complex equations with division
      if (complexEq.operators.includes('/')) {
        return this.isComplexEquationWithDivisionSolvable(complexEq, availableBallRange);
      }
    }
    
    // Check if result is within ball range (for goal ball)
    if (equation.result < availableBallRange.min || equation.result > availableBallRange.max) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if a simple division/multiplication equation is solvable with available balls
   */
  private isSimpleDivisionEquationSolvable(equation: SimpleEquation, ballRange: { min: number; max: number }): boolean {
    // For multiplication: a * b = c, all three numbers must be available as balls
    if (equation.operator === '*') {
      const hasLeftOperand = this.isBallAvailable(equation.leftOperand, ballRange);
      const hasRightOperand = this.isBallAvailable(equation.rightOperand, ballRange);
      const hasResult = this.isBallAvailable(equation.result, ballRange);
      return hasLeftOperand && hasRightOperand && hasResult;
    }
    
    // For division: a / b = c, all three numbers must be available as balls
    // and b must not be zero, and division must result in integer
    if (equation.operator === '/') {
      // Check division by zero
      if (equation.rightOperand === 0) {
        return false;
      }
      
      // Check if division results in integer
      if (equation.leftOperand % equation.rightOperand !== 0) {
        return false;
      }
      
      // Check if all required balls are available
      const hasDividend = this.isBallAvailable(equation.leftOperand, ballRange);
      const hasDivisor = this.isBallAvailable(equation.rightOperand, ballRange);
      const hasResult = this.isBallAvailable(equation.result, ballRange);
      
      return hasDividend && hasDivisor && hasResult;
    }
    
    return true;
  }

  /**
   * Check if a complex equation with division is solvable with available balls
   */
  private isComplexEquationWithDivisionSolvable(equation: ComplexEquation, ballRange: { min: number; max: number }): boolean {
    // Create working copies to simulate calculation
    const numbers = [...equation.operands];
    const ops = [...equation.operators];
    const requiredBalls = new Set<number>(equation.operands);
    
    // Simulate the calculation to check intermediate results
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '*' || ops[i] === '/') {
        let result: number;
        
        if (ops[i] === '*') {
          result = numbers[i] * numbers[i + 1];
        } else {
          // Check division by zero
          if (numbers[i + 1] === 0) {
            return false;
          }
          
          // Check if division results in integer
          if (numbers[i] % numbers[i + 1] !== 0) {
            return false;
          }
          
          result = numbers[i] / numbers[i + 1];
        }
        
        // Add intermediate result to required balls if it's within range
        if (result >= ballRange.min && result <= ballRange.max) {
          requiredBalls.add(result);
        }
        
        // Update the working arrays
        numbers.splice(i, 2, result);
        ops.splice(i, 1);
        i--; // Adjust index since we removed an operator
      }
    }
    
    // Continue with addition/subtraction
    let finalResult = numbers[0];
    for (let i = 0; i < ops.length; i++) {
      if (ops[i] === '+') {
        finalResult += numbers[i + 1];
      } else if (ops[i] === '-') {
        finalResult -= numbers[i + 1];
      }
      
      // Add intermediate result if within range
      if (finalResult >= ballRange.min && finalResult <= ballRange.max) {
        requiredBalls.add(finalResult);
      }
    }
    
    // Check if all required balls are available
    for (const ball of requiredBalls) {
      if (!this.isBallAvailable(ball, ballRange)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if a specific ball value is available in the pool
   */
  private isBallAvailable(value: number, ballRange: { min: number; max: number }): boolean {
    return value >= ballRange.min && value <= ballRange.max;
  }

  /**
   * Generate guaranteed solvable division equations
   */
  generateSolvableDivisionEquation(): SimpleEquation {
    const availableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    // Create valid division pairs where dividend ÷ divisor = quotient
    const validPairs: Array<{dividend: number, divisor: number, quotient: number}> = [];
    
    for (const dividend of availableNumbers) {
      for (const divisor of availableNumbers) {
        if (divisor !== 0 && dividend % divisor === 0) {
          const quotient = dividend / divisor;
          if (quotient >= 1 && quotient <= 10) {
            validPairs.push({ dividend, divisor, quotient });
          }
        }
      }
    }
    
    // Select a random valid pair
    const selectedPair = validPairs[Math.floor(Math.random() * validPairs.length)];
    
    return {
      type: 'simple',
      leftOperand: selectedPair.dividend,
      rightOperand: selectedPair.divisor,
      operator: '/',
      result: selectedPair.quotient,
      displayText: `${selectedPair.dividend} ÷ ${selectedPair.divisor} = ${selectedPair.quotient}`,
      difficulty: 2,
      // Legacy compatibility
      leftOperand1: selectedPair.dividend,
      leftOperand2: selectedPair.divisor
    };
  }

  /**
   * Generate guaranteed solvable multiplication equations
   */
  generateSolvableMultiplicationEquation(): SimpleEquation {
    const availableNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    // Create valid multiplication pairs where a × b = c and c ≤ 10
    const validPairs: Array<{factor1: number, factor2: number, product: number}> = [];
    
    for (const factor1 of availableNumbers) {
      for (const factor2 of availableNumbers) {
        const product = factor1 * factor2;
        if (product >= 1 && product <= 10) {
          validPairs.push({ factor1, factor2, product });
        }
      }
    }
    
    // Select a random valid pair
    const selectedPair = validPairs[Math.floor(Math.random() * validPairs.length)];
    
    return {
      type: 'simple',
      leftOperand: selectedPair.factor1,
      rightOperand: selectedPair.factor2,
      operator: '*',
      result: selectedPair.product,
      displayText: `${selectedPair.factor1} × ${selectedPair.factor2} = ${selectedPair.product}`,
      difficulty: 2,
      // Legacy compatibility
      leftOperand1: selectedPair.factor1,
      leftOperand2: selectedPair.factor2
    };
  }

  /**
   * Get maximum slots needed for an equation
   */
  private getMaxSlotsForEquation(equation: Equation): number {
    if (equation.type === 'simple') {
      return 2;
    } else {
      const complexEq = equation as ComplexEquation;
      return Math.min(3, complexEq.operands.length); // Limit to 3 slots for UI
    }
  }

  /**
   * Generate a hint for the question
   */
  private generateHint(equation: Equation, questionType: QuestionType): string | undefined {
    if (questionType === 'fill-in-the-blanks') {
      if (equation.type === 'simple') {
        const simpleEq = equation as SimpleEquation;
        if (simpleEq.operator === '+') {
          return 'Think about adding two numbers together';
        } else if (simpleEq.operator === '-') {
          return 'Think about subtracting the second number from the first';
        } else if (simpleEq.operator === '*') {
          return 'Think about multiplying two numbers together';
        } else {
          return 'Think about dividing the first number by the second';
        }
      } else {
        return 'Remember: multiplication and division come before addition and subtraction';
      }
    }
    
    return undefined;
  }

  /**
   * Generate multiple choice options for an equation
   */
  private generateMultipleChoiceOptions(equation: Equation): number[] {
    const correctAnswer = equation.result;
    const options = [correctAnswer];
    
    // Generate 3 incorrect options
    while (options.length < 4) {
      let incorrectOption: number;
      
      if (equation.type === 'simple') {
        // Generate numbers close to the correct answer
        const variance = Math.max(2, Math.floor(Math.abs(correctAnswer) * 0.3));
        incorrectOption = correctAnswer + (Math.random() > 0.5 ? variance : -variance);
      } else {
        // For complex equations, use a wider range
        incorrectOption = Math.floor(Math.random() * 50) - 10;
      }
      
      // Ensure it's different from existing options
      if (!options.includes(incorrectOption)) {
        options.push(incorrectOption);
      }
    }
    
    // Shuffle the options
    return options.sort(() => Math.random() - 0.5);
  }

  /**
   * Generate feedback for simple equation errors
   */
  private generateSimpleEquationFeedback(equation: SimpleEquation, userResult: number): string {
    const diff = Math.abs(userResult - equation.result);
    
    if (diff === 1) {
      return 'Very close! Try checking your calculation one more time.';
    } else if (diff <= 3) {
      return 'Getting warmer! Double-check your calculation.';
    } else if (equation.operator === '+') {
      return 'Remember to add the two numbers together. Try counting on your fingers if it helps!';
    } else if (equation.operator === '-') {
      return 'Remember to subtract the second number from the first. Try counting backwards!';
    } else if (equation.operator === '*') {
      return 'Remember to multiply the two numbers together. Think of it as repeated addition!';
    } else {
      return 'Remember to divide the first number by the second. Think of it as sharing equally!';
    }
  }

  /**
   * Generate feedback for complex equation errors
   */
  private generateComplexEquationFeedback(equation: ComplexEquation, userResult: number): string {
    const diff = Math.abs(userResult - equation.result);
    
    if (diff <= 2) {
      return 'Very close! Pay attention to the order of operations.';
    } else if (diff <= 5) {
      return 'Good try! Remember: multiply and divide before adding and subtracting.';
    } else {
      return 'Remember PEMDAS: Parentheses, Exponents, Multiplication/Division, Addition/Subtraction';
    }
  }

  /**
   * Get the expected answer format for an equation
   */
  private getExpectedAnswer(equation: Equation): number[] {
    if (equation.type === 'simple') {
      const simpleEq = equation as SimpleEquation;
      return [simpleEq.leftOperand, simpleEq.rightOperand];
    } else {
      const complexEq = equation as ComplexEquation;
      return complexEq.operands.slice(0, complexEq.operators.length + 1);
    }
  }

  /**
   * Calculate complex result (mirrored from EquationEngine for validation)
   */
  private calculateComplexResult(operands: number[], operators: ('+' | '-' | '*' | '/')[]): number {
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
          if (numbers[i + 1] === 0) {
            result = numbers[i] + numbers[i + 1];
            ops[i] = '+';
          } else {
            result = Math.round(numbers[i] / numbers[i + 1]);
          }
        }

        numbers.splice(i, 2, result);
        ops.splice(i, 1);
        i--;
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
   * Generate a unique question ID
   */
  private generateQuestionId(): string {
    return `question_${++this.questionIdCounter}_${Date.now()}`;
  }

  /**
   * Create a fill-in-the-blanks question (default for pool game)
   */
  createFillInTheBlanksQuestion(equation: Equation): Question {
    return this.createQuestion(equation, 'fill-in-the-blanks');
  }

  /**
   * Create a multiple choice question
   */
  createMultipleChoiceQuestion(equation: Equation): Question {
    return this.createQuestion(equation, 'multiple-choice');
  }

  /**
   * Create an input question (for keyboard input)
   */
  createInputQuestion(equation: Equation): Question {
    return this.createQuestion(equation, 'input');
  }

  /**
   * Check if a question is complete based on user input
   */
  isQuestionComplete(question: Question, userAnswer: number[]): boolean {
    return userAnswer.length >= question.maxSlots;
  }

  /**
   * Get progress percentage for a question
   */
  getQuestionProgress(question: Question, userAnswer: number[]): number {
    return Math.min(100, (userAnswer.length / question.maxSlots) * 100);
  }
}
