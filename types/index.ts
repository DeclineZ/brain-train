// Game types
export type GameCategory = "reasoning" | "data_processing" | "matching" | "pattern_recognition" | "logic" | "calculation" | "attention";


// Result type
export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

// Game stats types
export interface CardGameRawStats {
  totalPairs: number;        // e.g. 6
  wrongFlips: number;        // Total mistakes
  consecutiveErrors: number; // Max mistakes in a row
  repeatedErrors: number;    // Mistakes on cards already seen
  userTimeMs: number;        // Time taken in milliseconds
  parTimeMs: number;         // Target time (e.g. 60000ms)
  difficultyMultiplier: number; // e.g. 1.1
}

export interface MatchingGameStats {
  levelPlayed: number;
  difficultyMultiplier: number;
  totalPairs: number;
  wrongFlips: number;
  consecutiveErrors: number;
  repeatedErrors: number;
  userTimeMs: number;
  parTimeMs: number;
  attempts: number;
  continuedAfterTimeout: boolean;
}

export interface SensorLockGameStats {
  score: number;
  maxStreak: number;
  totalCorrect: number;
  totalAttempts: number;
  reactionTimeAvg: number;
  difficultyMultiplier: number;
  // Breakdown for advanced scoring
  mismatchCorrect: number;
  mismatchAttempts: number;
}

export interface BilliardsGameStats {
  levelPlayed: number;
  difficultyMultiplier: number;
  totalEquations: number;
  correctEquations: number;
  wrongEquations: number;
  totalTimeMs: number;
  parTimeMs: number;
  consecutiveErrors: number;
  repeatedErrors: number;
  attempts: number;
  continuedAfterTimeout: boolean;
}

export interface FloatingBallMathGameStats {
  levelPlayed: number;
  difficultyMultiplier: number;
  penaltyFactor: number;  // 0.7 if continuedAfterTimeout, else 1.0
  
  // Thief event tracking
  thiefEvents: number;         // Total thief appearances
  blockSuccessCount: number;   // Blocked correctly
  adaptSuccessCount: number;   // Adapted correctly
  decisionFailCount: number;    // Wrong decisions
  
  // Timing tracking
  onTimeDecisionCount: number; // Decisions in time window
  lateDecisionCount: number;   // Decisions too slow
  timeLimitSeconds?: number;   // Time limit for level completion (for speed scoring)
  
  // Panic behavior tracking
  panicBlock: number;          // 3+ bad blocks in a row
  panicAdapt: number;         // 3+ bad adapts in a row
  
  // Ball interception tracking
  bombHits: number;           // Total bombs intercepted
  consecutiveErrors: number;    // Max errors in a row
  
  // Legacy fields (kept for compatibility)
  totalEquations: number;
  correctEquations: number;
  wrongEquations: number;
  totalTimeMs: number;
  attempts: number;
  continuedAfterTimeout: boolean;
}

export interface ClinicalStats {
  stat_memory: number | null;
  stat_speed: number | null;
  stat_visual: number | null;
  stat_focus: number | null;
  stat_planning: number | null;
  stat_emotion: number | null;
}

// Level configuration types
export interface MemoryLevelConfig {
  level: number;
  gridCols: number;
  gridRows: number;
  totalPairs: number;
  timeLimitSeconds: number;
  difficultyMultiplier: number;
}

// Difficulty Tiers for Visual Feedback
export type DifficultyTier = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface MatchingLevelConfig {
  level: number;
  gridCols: number;
  totalPairs: number; // 3, 4, 5
  previewTimeMs: number;
  parTimeSeconds: number; // For star calculation
  timeLimitSeconds: number; // <--- NEW: Countdown limit
  difficultyMultiplier: number;
  difficultyTier?: DifficultyTier; // Visual Theme

  // New Mechanics for Levels 8+
  swapAfterPreviewCount?: number; // How many cards to random swap after preview (0 = none)
  periodicSwapInterval?: number;  // Every N turns (0 = none)
  periodicSwapPairs?: number;     // How many pairs to swap periodically

  // Advanced Mechanics (Rebalancing Update)
  useHardVariations?: boolean;    // Enable Quantity, Orientation, State variations
  shuffleAfterPreview?: boolean;  // Force full grid shuffle after preview
}

// Daily streak types
export interface CheckinStatus {
  checked_in_today: boolean;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  last_checkin_date: string | null;
  weekly_progress: {
    days_checked_in: number;
    total_days: number;
    week_days: Array<{
      day_name: string;
      date: string;
      checked_in: boolean;
      is_today: boolean;
    }>;
  };
}

export interface CalendarDay {
  date: string;
  checked_in: boolean;
  is_today: boolean;
  is_future: boolean;
}

export interface CheckinCalendar {
  year: number;
  month: number;
  days: CalendarDay[];
  month_name: string;
}

export interface StreakBadge {
  id: string;
  name: string;
  metric: string;
  description: string;
  icon: string;
  threshold: number;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface CheckinResult {
  success: boolean;
  streak_count: number;
  new_badges: StreakBadge[];
  message: string;
  coins_earned?: number;
  base_amount?: number;
  multiplier?: number;
  new_balance?: number;
  new_checkin?: boolean;
}

// Shop system types
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  item_key: string;
  price: number;
  type: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface ShopItemWithOwnership extends ShopItem {
  isOwned: boolean;
  quantity?: number;
}

export interface PlayerInventory {
  player_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseResult {
  success: boolean;
  new_balance: number;
  item_purchased: ShopItem;
  transaction_id: string;
  message: string;
}

export interface TransactionHistory {
  id: string;
  item_name: string;
  item_price: number;
  balance_after: number;
  action_key: string;
  created_at: string;
  metadata?: any;
}

export interface UserBalance {
  balance: number;
  updated_at: string;
}

export interface DailyMission {
  id: string;
  user_id: string;
  date: string;
  slot_index: number;
  label: string;
  game_id: string;
  completed: boolean;
  completed_at: string | null;
}
