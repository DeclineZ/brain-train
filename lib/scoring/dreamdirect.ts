import type { DreamDirectGameStats, ClinicalStats } from '@/types';

/**
 * Calculate clinical stats from Dream Direct game results.
 * 
 * Stats mapped:
 * - stat_visual: Spinner & Fade accuracy (visual tracking under stress)
 * - stat_memory: Fade & Double accuracy (working memory)
 * - stat_focus: Ghost↔Anchor rule-switch accuracy (inhibition)
 * - stat_speed: Timing precision (normalized from avgTimingOffsetMs)
 */
export function calculateDreamDirectStats(data: DreamDirectGameStats): ClinicalStats {
    const { difficultyMultiplier = 1.0 } = data;
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    // === STAT_VISUAL: Spinner + Fade accuracy ===
    // Tests visual tracking under dynamic conditions
    const spinnerTotal = data.spinnerAttempts || 0;
    const fadeTotal = data.fadeAttempts || 0;
    const visualTotal = spinnerTotal + fadeTotal;
    let stat_visual: number | null = null;

    if (visualTotal > 0) {
        const visualCorrect = (data.spinnerCorrect || 0) + (data.fadeCorrect || 0);
        const rawVisual = (visualCorrect / visualTotal) * 100 * difficultyMultiplier;
        stat_visual = clamp(rawVisual);
    }

    // === STAT_MEMORY: Fade + Double accuracy ===
    // Tests working memory (remembering invisible arrows, sequencing)
    const doubleTotal = data.doubleAttempts || 0;
    const memoryTotal = fadeTotal + doubleTotal;
    let stat_memory: number | null = null;

    if (memoryTotal > 0) {
        const memoryCorrect = (data.fadeCorrect || 0) + (data.doubleCorrect || 0);
        const rawMemory = (memoryCorrect / memoryTotal) * 100 * difficultyMultiplier;
        stat_memory = clamp(rawMemory);
    }

    // === STAT_FOCUS: Ghost↔Anchor switching accuracy (Inhibition) ===
    // Measures ability to switch rules and suppress automatic responses
    const ghostTotal = data.ghostAttempts || 0;
    const anchorTotal = data.anchorAttempts || 0;
    const focusTotal = ghostTotal + anchorTotal;
    let stat_focus: number | null = null;

    if (focusTotal > 0) {
        // Calculate accuracy on these core arrow types
        const focusCorrect = (data.ghostCorrect || 0) + (data.anchorCorrect || 0);
        const baseAccuracy = (focusCorrect / focusTotal) * 100;

        // Penalize rule-switch errors more heavily
        // Each error reduces score by 5 points
        const switchPenalty = (data.ruleSwitchErrors || 0) * 5;
        const rawFocus = (baseAccuracy - switchPenalty) * difficultyMultiplier;
        stat_focus = clamp(rawFocus);
    }

    // === STAT_SPEED: Timing precision ===
    // Converts average timing offset to a 0-100 score
    // Perfect (0ms) = 100, 300ms+ = 0
    let stat_speed: number | null = null;
    const avgOffset = data.avgTimingOffsetMs;

    if (avgOffset !== undefined && avgOffset !== null) {
        // Inverse scale: lower offset = higher score
        // 0ms = 100, 150ms = 50, 300ms = 0
        const maxOffset = 300;
        const rawSpeed = Math.max(0, (1 - avgOffset / maxOffset)) * 100 * difficultyMultiplier;
        stat_speed = clamp(rawSpeed);
    }

    return {
        stat_memory,
        stat_speed,
        stat_visual,
        stat_focus,
        stat_planning: null, // Not measured in this game
        stat_emotion: null,  // Not measured in this game
    };
}
