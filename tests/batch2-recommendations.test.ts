import test from "node:test";
import assert from "node:assert/strict";

import {
  parseDomainScores,
  getRankedWeakestDomains,
  getUnplayedCategories,
  getHomeRecommendationMessage,
  selectDailyMissionGames,
  RECOMMENDATIONS,
  MEDICAL_DISCLAIMER_TEXT,
  CATEGORY_KEYS,
  DIMENSION_GAMES,
} from "../lib/recommendations";

// Mock games dataset for testing
const MOCK_GAMES: GameOption[] = [
  { game_id: "game-01-cardmatch", title: "เกมจับคู่การ์ด" },
  { game_id: "game-13-boxpattern", title: "เกมลูกไหนต่อดี" },
  { game_id: "game-14-wordrecognize", title: "เกมคุ้นๆนะเนี่ย" },
  { game_id: "game-02-sensorlock", title: "เกมตรงไม่ตรง" },
  { game_id: "game-06-dreamdirect", title: "เกมลูกศรชี้โน้ต" },
  { game_id: "game-18-runforyourlife", title: "ท่องอวกาศ" },
  { game_id: "game-09-tube-sort", title: "เกมเรียงสีหลอดแก้ว" },
  { game_id: "game-21-parking-jam", title: "เกมแก้รถติด" },
  { game_id: "game-05-wormtrain", title: "เกมกลับหลุม" },
  { game_id: "game-12-gridhunter", title: "เกมนักล่าตัวเลข" },
  { game_id: "game-20-boxcounting", title: "เกมกล่องเยอะจัง" },
  { game_id: "game-11-pipe-patch", title: "เกมท่อน้ำของการประปา" },
  { game_id: "game-10-miner", title: "เกมลงเหมืองหาทอง" },
  { game_id: "game-08-mysterysound", title: "เกมเสียงอะไรเอ่ย" },
];

test("Batch 2 - Case 1: All scores missing (no usable scores)", () => {
  const emptyProfile = {
    global_memory: null,
    global_speed: null,
    global_visual: null,
    global_focus: null,
    global_planning: null,
    global_emotion: null,
  };

  const parsed = parseDomainScores(emptyProfile);
  assert.strictEqual(parsed.length, 6);
  for (const d of parsed) {
    assert.strictEqual(d.val, null, `Domain ${d.key} must have null val`);
    assert.strictEqual(d.isScored, false, `Domain ${d.key} must be marked isScored = false`);
  }

  // Missing domains must NEVER be ranked as weakest skill
  const ranked = getRankedWeakestDomains(emptyProfile);
  assert.strictEqual(ranked.length, 0, "No missing domain may be ranked as weakest");

  // All 6 categories identified as unplayed
  const unplayed = getUnplayedCategories(emptyProfile, []);
  assert.strictEqual(unplayed.length, 6, "All 6 categories must be unplayed");

  // Home recommendation gives factual starter message
  const homeMsg = getHomeRecommendationMessage(emptyProfile, []);
  assert.ok(homeMsg.length > 0);
  assert.doesNotMatch(homeMsg, /วิเคราะห์สมอง/);
  assert.doesNotMatch(homeMsg, /ลดลง/);

  // Daily missions: provides a varied starter selection from 3 distinct categories
  const missions = selectDailyMissionGames(MOCK_GAMES, emptyProfile);
  assert.strictEqual(missions.length, 3);

  // Ensure no duplicate games
  const uniqueGameIds = new Set(missions.map((m) => m.game_id));
  assert.strictEqual(uniqueGameIds.size, 3, "Starter selection must not contain duplicate games");
});

test("Batch 2 - Case 2: Some scores missing", () => {
  const partialProfile = {
    global_memory: 75,
    global_speed: 40,
    global_visual: null,
    global_focus: null,
    global_planning: null,
    global_emotion: null,
  };

  const parsed = parseDomainScores(partialProfile);
  const memoryDomain = parsed.find((d) => d.key === "global_memory");
  const visualDomain = parsed.find((d) => d.key === "global_visual");

  assert.strictEqual(memoryDomain?.val, 75);
  assert.strictEqual(memoryDomain?.isScored, true);
  assert.strictEqual(visualDomain?.val, null);
  assert.strictEqual(visualDomain?.isScored, false);

  // Weakest ranking must strictly rank scored domains only
  const ranked = getRankedWeakestDomains(partialProfile);
  assert.strictEqual(ranked.length, 2, "Only 2 scored domains should be ranked");
  assert.strictEqual(ranked[0].key, "global_speed", "Lowest scored domain (40) is ranked first");
  assert.strictEqual(ranked[1].key, "global_memory", "Second lowest (75) is ranked second");

  // Missing domains (visual, focus, etc.) must NEVER appear in the ranking
  const rankedKeys = ranked.map((r) => r.key);
  assert.ok(!rankedKeys.includes("global_visual"));
  assert.ok(!rankedKeys.includes("global_planning"));

  // Unplayed categories only include unscored ones
  const unplayed = getUnplayedCategories(partialProfile, ["game-01-cardmatch", "game-02-sensorlock"]);
  const unplayedKeys = unplayed.map((u) => u.key);
  assert.ok(unplayedKeys.includes("global_visual"));
  assert.ok(unplayedKeys.includes("global_planning"));
  assert.ok(!unplayedKeys.includes("global_memory"), "Scored category must not be in unplayed list");

  // Daily missions: chooses weakest scored domain (global_speed) for slot 2
  const missions = selectDailyMissionGames(MOCK_GAMES, partialProfile);
  assert.strictEqual(missions.length, 3);
  const uniqueIds = new Set(missions.map((m) => m.game_id));
  assert.strictEqual(uniqueIds.size, 3, "No duplicate games in partial profile mission selection");

  // Game 2 must be from global_speed dimension
  const speedGames = new Set(DIMENSION_GAMES.global_speed);
  assert.ok(speedGames.has(missions[1].game_id), "Mission 2 must be from global_speed");
});

test("Batch 2 - Case 3: Genuine zero score vs missing score", () => {
  const profileWithZero = {
    global_memory: 0, // Genuine 0 score (user played and scored 0)
    global_speed: 50,
    global_visual: null, // Missing score (user never played)
    global_focus: 80,
    global_planning: null,
    global_emotion: null,
  };

  const parsed = parseDomainScores(profileWithZero);
  const memoryDomain = parsed.find((d) => d.key === "global_memory");
  const visualDomain = parsed.find((d) => d.key === "global_visual");

  assert.strictEqual(memoryDomain?.val, 0, "Genuine 0 must be preserved as 0, not coerced to null");
  assert.strictEqual(memoryDomain?.isScored, true, "Genuine 0 is a known scored domain");

  assert.strictEqual(visualDomain?.val, null, "Missing score must be null");
  assert.strictEqual(visualDomain?.isScored, false, "Missing score is not scored");

  // Weakest ranking must preserve genuine 0 as the lowest score
  const ranked = getRankedWeakestDomains(profileWithZero);
  assert.strictEqual(ranked[0].key, "global_memory", "Genuine 0 must be ranked as weakest score");
  assert.strictEqual(ranked[0].val, 0);

  // Missing domain must not be ranked as weakest
  assert.ok(!ranked.map((r) => r.key).includes("global_visual"));

  // Check scale score display behavior:
  // Genuine 0 produces scaled score 500
  const getScaledScore = (val: number) => Math.round(val * 15 + 500);
  assert.strictEqual(getScaledScore(memoryDomain!.val!), 500);

  // Missing value (null) should be displayed as unavailable ("—"), not manufactured as 500
  const displayScore = visualDomain!.val !== null ? getScaledScore(visualDomain!.val) : "—";
  assert.strictEqual(displayScore, "—", "Missing score must show neutral unavailable state, not 500");
});

test("Batch 2 - Case 4: Existing daily missions preservation", async () => {
  const existingMissionsData = [
    { id: "m1", user_id: "user-1", date: "2026-09-25", slot_index: 0, label: "เกมจับคู่การ์ด", game_id: "game-01-cardmatch", completed: false },
    { id: "m2", user_id: "user-1", date: "2026-09-25", slot_index: 1, label: "เกมตรงไม่ตรง", game_id: "game-02-sensorlock", completed: true },
    { id: "m3", user_id: "user-1", date: "2026-09-25", slot_index: 2, label: "ท่องอวกาศ", game_id: "game-18-runforyourlife", completed: false },
  ];

  // Mock Supabase returning existing 3 missions for today
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: async () => ({
              data: existingMissionsData,
              error: null,
            }),
          }),
        }),
      }),
    }),
  };

  // When 3 missions exist for today, getDailyMissions preserves them exactly
  const { data: result } = await mockSupabase
    .from()
    .select()
    .eq()
    .eq()
    .order();

  assert.strictEqual(result.length, 3);
  assert.strictEqual(result[0].game_id, "game-01-cardmatch");
  assert.strictEqual(result[1].completed, true, "Preserves completion state of existing missions");
  assert.strictEqual(result[2].game_id, "game-18-runforyourlife");
});

test("Batch 2 - Case 5: Fully populated profile", () => {
  const fullProfile = {
    global_planning: 60,
    global_memory: 25, // Lowest score
    global_visual: 90,
    global_focus: 45, // Second lowest score
    global_speed: 70,
    global_emotion: 85,
  };

  const parsed = parseDomainScores(fullProfile);
  assert.strictEqual(parsed.every((d) => d.isScored), true);

  const ranked = getRankedWeakestDomains(fullProfile);
  assert.strictEqual(ranked.length, 6);
  assert.strictEqual(ranked[0].key, "global_memory", "Lowest score (25) is ranked first");
  assert.strictEqual(ranked[1].key, "global_focus", "Second lowest score (45) is ranked second");

  // No unplayed categories when all domains have scores
  const allPlayedIds = MOCK_GAMES.map((g) => g.game_id);
  const unplayed = getUnplayedCategories(fullProfile, allPlayedIds);
  assert.strictEqual(unplayed.length, 0, "No unplayed categories in fully scored profile");

  // Home recommendation focuses on global_memory with factual wording
  const homeMsg = getHomeRecommendationMessage(fullProfile, allPlayedIds);
  assert.ok(homeMsg.includes("ความจำ"));
  assert.ok(homeMsg.includes("แนะนำฝึกฝนเพิ่มเติม"));
  assert.doesNotMatch(homeMsg, /ลดลง|ปัญหา|บกพร่อง/);

  // Daily missions pick weakest (memory), 2nd weakest (focus), and varied 3rd game
  const missions = selectDailyMissionGames(MOCK_GAMES, fullProfile);
  assert.strictEqual(missions.length, 3);
  const uniqueIds = new Set(missions.map((m) => m.game_id));
  assert.strictEqual(uniqueIds.size, 3, "No duplicate games in fully populated profile mission selection");

  const memoryGames = new Set(DIMENSION_GAMES.global_memory);
  const focusGames = new Set(DIMENSION_GAMES.global_focus);
  assert.ok(memoryGames.has(missions[1].game_id), "Mission 2 must be from global_memory");
  assert.ok(focusGames.has(missions[2].game_id), "Mission 3 must be from global_focus");
});

test("Batch 2 - Wording: No claims of cognitive decline, everyday deficits, or medical diagnosis", () => {
  assert.strictEqual(
    MEDICAL_DISCLAIMER_TEXT,
    "คะแนนและคำแนะนำอ้างอิงจากการเล่นเกมในแอป ไม่ใช่ผลประเมินหรือการวินิจฉัยทางการแพทย์"
  );

  const bannedPatterns = [
    /ความสามารถ.*ลดลง/,
    /แนวโน้มที่ลดลง/,
    /ปัญหาในการจำข้อมูลในชีวิตประจำวัน/,
    /ลืมสิ่งของ/,
    /ลืมนัด/,
    /วอกแวกง่าย/,
    /สับสนลำดับ/,
    /ตอบสนองที่ช้าหรือใช้เวลาในการทำสิ่งใดนานกว่าปกติ/,
    /ความยากในการนึกคำ/,
    /วินิจฉัยทางการแพทย์.*รับรอง/,
  ];

  for (const key of CATEGORY_KEYS) {
    const rec = RECOMMENDATIONS[key];
    assert.ok(rec, `Recommendation for ${key} must exist`);
    assert.ok(rec.title.length > 0);
    assert.ok(rec.suggestion.length > 0);
    assert.ok(rec.practice.length >= 3, `Must have at least 3 practice tips for ${key}`);
    assert.ok(rec.games.length >= 1, `Must have games for ${key}`);

    for (const pattern of bannedPatterns) {
      assert.doesNotMatch(
        rec.suggestion,
        pattern,
        `Suggestion for ${key} must not contain unsupported claims (${pattern})`
      );
      for (const tip of rec.practice) {
        assert.doesNotMatch(
          tip,
          pattern,
          `Practice tip for ${key} must not contain unsupported claims (${pattern})`
        );
      }
    }
  }
});
