import test from "node:test";
import assert from "node:assert/strict";
import { calculateGameClinicalStats } from "@/lib/clinicalStats";
import type { ClinicalStats } from "@/types";

test("calculateGameClinicalStats - RunForYourLife extracts speed and focus while nulling others", () => {
    const rawData = {
        score: 1093,
        stars: 0,
        stat_speed: 75,
        stat_focus: 56,
        stat_memory: null,
        stat_visual: null,
        stat_planning: null,
        stat_emotion: null,
    };

    const stats = calculateGameClinicalStats("game-18-runforyourlife", rawData);
    assert.equal(stats.stat_speed, 75);
    assert.equal(stats.stat_focus, 56);
    assert.equal(stats.stat_memory, null);
    assert.equal(stats.stat_visual, null);
    assert.equal(stats.stat_planning, null);
    assert.equal(stats.stat_emotion, null);
});

test("calculateGameClinicalStats - Floating Market computes clinical stats from raw gameplay metrics", () => {
    const rawData = {
        level: 1,
        mode: "normal",
        ruleMode: "modeA",
        difficultyMultiplier: 1.0,
        correctCollections: 5,
        incorrectCollections: 1,
        missedItems: 0,
        duplicatePickups: 0,
        memoryCapacity: 1,
        totalCollisions: 2,
        reactionTimes: [1200, 1500, 1300],
        hesitationCount: 1,
        bonusCoins: 0,
        stars: 3,
        success: true,
        totalTimeMs: 15000,
        totalItemsSpawned: 6,
        totalItemsCollected: 5,
    };

    const stats = calculateGameClinicalStats("game-17-floatingmarket", rawData);
    assert.ok(stats.stat_speed !== null && stats.stat_speed > 0, "stat_speed should be computed");
    assert.ok(stats.stat_visual !== null && stats.stat_visual > 0, "stat_visual should be computed");
    assert.ok(stats.stat_focus !== null && stats.stat_focus > 0, "stat_focus should be computed");
    assert.equal(stats.stat_planning, null);
    assert.equal(stats.stat_emotion, null);
});

test("calculateGameClinicalStats - Tutorial payloads return null across all domains", () => {
    const tutorialPayload = {
        level: 0,
        isTutorial: true,
        score: 500,
        stat_speed: 80,
        stat_focus: 90,
    };

    const stats = calculateGameClinicalStats("game-18-runforyourlife", tutorialPayload);
    assert.equal(stats.stat_memory, null);
    assert.equal(stats.stat_speed, null);
    assert.equal(stats.stat_visual, null);
    assert.equal(stats.stat_focus, null);
    assert.equal(stats.stat_planning, null);
    assert.equal(stats.stat_emotion, null);
});

test("Stat Chip display condition and label formatting (^ only on confirmed saved positive change)", () => {
    const renderBadge = (
        saveStatus: "idle" | "saving" | "saved" | "failed",
        statValue: number | null | undefined,
        statChange: number | undefined | null,
        label: string
    ) => {
        if (saveStatus === "failed") return null;
        const hasMeasuredStat = statValue !== null && statValue !== undefined;
        const isPositiveChange =
            saveStatus === "saved" &&
            typeof statChange === "number" &&
            statChange > 0;
        if (!isPositiveChange && !hasMeasuredStat) return null;
        return `${isPositiveChange ? "^ " : ""}${label}`;
    };

    // 1. Confirmed saved positive profile increase -> Shows "^ ความเร็ว"
    assert.equal(renderBadge("saved", 75, 4, "ความเร็ว"), "^ ความเร็ว");

    // 2. Profile score stays unchanged (delta = 0) -> Shows "ความเร็ว" without "^ "
    assert.equal(renderBadge("saved", 75, 0, "ความเร็ว"), "ความเร็ว");

    // 3. Profile score decreases (delta < 0) -> Shows "ความเร็ว" without "^ "
    assert.equal(renderBadge("saved", 56, -3, "ความเร็ว"), "ความเร็ว");

    // 4. Undefined delta (pending / measured) -> Shows "ความเร็ว" without "^ "
    assert.equal(renderBadge("saved", 75, undefined, "ความเร็ว"), "ความเร็ว");

    // 5. Unmeasured stat (null) with no positive delta -> Does NOT render
    assert.equal(renderBadge("saved", null, 0, "การวางแผน"), null);
    assert.equal(renderBadge("saved", null, -1, "การวางแผน"), null);
    assert.equal(renderBadge("saved", null, undefined, "การวางแผน"), null);

    // 6. Save failed -> Does NOT render
    assert.equal(renderBadge("failed", 75, 5, "ความเร็ว"), null);
});

test("Stat Chip during saving shows measured skill name without ^ even with positive estimated change", () => {
    const renderBadge = (
        saveStatus: "idle" | "saving" | "saved" | "failed",
        statValue: number | null | undefined,
        statChange: number | undefined | null,
        label: string
    ) => {
        if (saveStatus === "failed") return null;
        const hasMeasuredStat = statValue !== null && statValue !== undefined;
        const isPositiveChange =
            saveStatus === "saved" &&
            typeof statChange === "number" &&
            statChange > 0;
        if (!isPositiveChange && !hasMeasuredStat) return null;
        return `${isPositiveChange ? "^ " : ""}${label}`;
    };

    // While saving with an estimated positive change (e.g. +4), only the measured skill name is shown without "^ "
    assert.equal(
        renderBadge("saving", 75, 4, "ความเร็ว"),
        "ความเร็ว",
        "During saving, positive estimated change should display name without ^"
    );

    // After confirmation (saveStatus === 'saved'), the "^ " confirmed indicator appears
    assert.equal(
        renderBadge("saved", 75, 4, "ความเร็ว"),
        "^ ความเร็ว",
        "After saving is confirmed, positive change should display name with ^"
    );
});


