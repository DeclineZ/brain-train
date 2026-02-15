// Floating Market Game Types

export type QuestionType = 'none' | 'identify' | 'addition' | 'change' | 'multiplication' | 'mixed';

export interface FloatingMarketLevelConfig {
    level: number;
    boatSpeed: number;           // pixels per second the river scrolls
    riverWidthRatio: number;     // 0-1 ratio of screen width usable as river
    obstacleFrequency: number;   // seconds between obstacle spawns
    encounterCount: number;      // number of math encounters in the level
    questionType: QuestionType;  // type of math questions
    optionCount: number;         // 2 or 3 answer gates
    coinFrequency: number;       // seconds between coin spawns (0 = no coins)
    difficultyMultiplier: number;
    parTimeSeconds: number;      // for star calculation
    timeLimitSeconds: number;    // max time allowed
}

export interface Encounter {
    questionText: string;
    correctAnswer: number;
    options: { label: string; value: number }[];
    questionType: QuestionType;
    chatText?: string;
}

export interface EncounterResult {
    reactionTimeMs: number;     // time from question appear to first movement toward answer
    hesitated: boolean;         // changed direction after initially committing
    correct: boolean;
    questionType: QuestionType;
}

export interface FloatingMarketRawStats {
    current_played: number;
    difficultyMultiplier: number;
    reactionTimes: number[];
    hesitationCount: number;
    totalCollisions: number;
    correctAnswers: number;
    totalEncounters: number;

    changeQuestionCorrect: number;
    changeQuestionTotal: number;
    bonusCoins: number;
    stars: number;
    success: boolean;
    totalTimeMs: number;
}
