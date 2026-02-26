import type { CashierGameStats } from '@/games/game-19-cashier/types';

export function calculateCashierStats(data: CashierGameStats) {
    const {
        correct_tallies,
        tally_adjustments,
        forgotten_rules,
        distractor_clicks,
        operator_errors,
        deceptive_errors,
        visual_hesitation_time_ms
    } = data;

    const clamp = (val: number) => Math.max(0, Math.min(100, val));

    // 1. Memory (Working Memory)
    // Formula Idea: Base Score (100) - (tally_adjustments * 5) - (forgotten_rules * 15)
    // Massive hit if first submission is wrong, which correctly equates to low correct_tallies
    // The spec says "If they submit the wrong final tally in Phase 1, it's a massive hit"
    const rawMemory = 100 - (tally_adjustments * 15) - (forgotten_rules * 25);
    const stat_memory = clamp(rawMemory);

    // 2. Focus (Inhibitory Control & Task Switching)
    // Formula Idea: (Total Correct Required Actions / (Total Correct Required Actions + distractor_clicks + operator_errors)) * 100.
    // For simplicity, we assume correct_tallies correlates to correct actions required.
    // We'll base it off deductions to ensure high base if no errors.
    const totalErrors = distractor_clicks + operator_errors;
    let stat_focus = 100;
    if (totalErrors > 0) {
        // E.g. each distractor error reduces by 15, operator error by 20.
        // Or roughly: 100 - (distractor * 15) - (operator * 20)
        stat_focus = clamp(100 - (distractor_clicks * 15) - (operator_errors * 25));
    }

    // 3. Visual (Deception Resistance)
    // Formula Idea: Start with 100. Deduct 20 points for every deceptive_error.
    // Time based modifier can be added later, for now sticking to pure errors.
    const stat_visual = clamp(100 - (deceptive_errors * 20));

    return {
        stat_memory: Math.round(stat_memory),
        stat_speed: null, // Not actively measuring for primary scoring
        stat_focus: Math.round(stat_focus),
        stat_visual: Math.round(stat_visual),
        stat_planning: null,
        stat_emotion: null
    };
}
