export interface CashierLevelConfig {
    difficultyTier: "easy" | "normal" | "hard" | "nightmare";
    // Phase 1 Settings
    tallyItemsCount: number;
    tallyDistractors: number;    // E.g. crossed out items
    tallyLimitRule: boolean;     // Whether "Limit X per customer" trick is present
    roundNumbers: boolean;       // Easy additions vs prices ending in 3, 7, 9

    // Phase 2 Settings
    paymentMixed: boolean;       // Introduce coupons (- amounts)
    paymentDisguised: boolean;   // Coupons look like cash, force reading sign

    // Phase 3 Settings
    deceptiveCurrency: boolean;  // Coins sized counterintuitively to value
    invertedVisuals: boolean;    // Extreme deception

    // Time Pressure Settings
    patienceDurationMs: number;
}

export const CASHIER_LEVELS: Record<number, CashierLevelConfig> = {};

// Levels 1-30 Mapping
for (let i = 1; i <= 30; i++) {
    const config: CashierLevelConfig = {
        difficultyTier: "easy",
        tallyItemsCount: 2,
        tallyDistractors: 0,
        tallyLimitRule: false,
        roundNumbers: true,
        paymentMixed: false,
        paymentDisguised: false,
        deceptiveCurrency: false,
        invertedVisuals: false,
        patienceDurationMs: 30000,
    };

    if (i <= 5) {
        // Tier 1: Onboarding
        config.difficultyTier = "easy";
        config.tallyItemsCount = 2 + Math.floor((i - 1) / 2); // 2-3 items
        config.patienceDurationMs = 120000; // 2 minutes
    } else if (i <= 10) {
        // Tier 2: Selective Attention
        config.difficultyTier = "normal";
        config.tallyItemsCount = 4;
        config.tallyDistractors = i >= 6 ? 1 : 0;
        if (i >= 8) config.tallyDistractors = 2;
        config.tallyLimitRule = i >= 10;
        config.patienceDurationMs = 110000;
    } else if (i <= 15) {
        // Tier 3: Task Switching
        config.difficultyTier = "normal";
        config.tallyItemsCount = 4;
        config.tallyDistractors = 1; // Keep it mild while introducing mixed
        config.paymentMixed = true;
        config.paymentDisguised = i >= 14;
        config.patienceDurationMs = 100000;
    } else if (i <= 20) {
        // Tier 4: Inhibitory Control
        config.difficultyTier = "hard";
        config.tallyItemsCount = 4;
        config.tallyDistractors = 0; // Temporarily isolate new mechanic
        config.paymentMixed = false;
        config.deceptiveCurrency = true;
        config.invertedVisuals = i >= 19;
        config.patienceDurationMs = 90000;
    } else if (i <= 25) {
        // Tier 5: Compound Friction
        config.difficultyTier = "hard";
        config.tallyItemsCount = 5;
        config.tallyDistractors = 2;
        config.tallyLimitRule = true;
        config.paymentMixed = true;
        config.paymentDisguised = true;
        config.deceptiveCurrency = false; // Give a break before all-in
        config.patienceDurationMs = 80000;
    } else {
        // Tier 6: The Master Checkout
        config.difficultyTier = "nightmare";
        config.tallyItemsCount = 5 + Math.floor((i - 26) / 2); // 5-7 items
        config.tallyDistractors = 2;
        config.tallyLimitRule = true;
        config.roundNumbers = false; // prices like $13, $7, $19
        config.paymentMixed = true;
        config.paymentDisguised = true;
        config.deceptiveCurrency = true;
        config.invertedVisuals = true;
        config.patienceDurationMs = 70000;
    }

    CASHIER_LEVELS[i] = config;
}
