export interface CashierGameStats {
    level: number;
    score: number;
    stars: number;
    success: boolean;

    // Custom Game 19 Phase Stats
    correct_tallies: number;
    tally_adjustments: number;
    forgotten_rules: number;

    distractor_clicks: number;
    operator_errors: number;

    deceptive_errors: number;
    visual_hesitation_time_ms: number;

    // Required global stat fields (to be calculated in scoring logic)
    stat_memory: number | null;
    stat_speed: number | null;
    stat_visual: number | null;
    stat_focus: number | null;
    stat_planning: number | null;
    stat_emotion: number | null;

    starHint?: string;
}
