/**
 * Shared recommendations, domain parsing, and mission selection logic.
 *
 * Rules:
 * 1. Distinguishes missing scores (null/undefined) from genuine zero scores (0).
 * 2. Unknown domains are never ranked as the user's weakest skill.
 * 3. Recommendation wording contains factual game-practice suggestions without
 *    claims of cognitive decline, everyday deficits, or medical diagnosis.
 * 4. Includes context: "คะแนนและคำแนะนำอ้างอิงจากการเล่นเกมในแอป ไม่ใช่ผลประเมินหรือการวินิจฉัยทางการแพทย์"
 */

export const MEDICAL_DISCLAIMER_TEXT =
  "คะแนนและคำแนะนำอ้างอิงจากการเล่นเกมในแอป ไม่ใช่ผลประเมินหรือการวินิจฉัยทางการแพทย์";

export const CATEGORY_KEYS = [
  "global_memory",
  "global_speed",
  "global_visual",
  "global_focus",
  "global_planning",
  "global_emotion",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  global_memory: "ความจำ",
  global_speed: "ความเร็วในการคิด",
  global_visual: "มิติสัมพันธ์",
  global_focus: "สมาธิและการจดจ่อ",
  global_planning: "การวางแผนและแก้ปัญหา",
  global_emotion: "ภาษาและการนึกคำ",
};

export const DIMENSION_GAMES: Record<CategoryKey, string[]> = {
  global_memory: ["game-01-cardmatch", "game-13-boxpattern", "game-14-wordrecognize"],
  global_focus: ["game-02-sensorlock", "game-06-dreamdirect", "game-18-runforyourlife"],
  global_planning: ["game-09-tube-sort", "game-21-parking-jam", "game-05-wormtrain"],
  global_speed: ["game-02-sensorlock", "game-06-dreamdirect", "game-12-gridhunter"],
  global_visual: ["game-20-boxcounting", "game-11-pipe-patch", "game-10-miner"],
  global_emotion: ["game-08-mysterysound"],
};

export interface RecommendationInfo {
  title: string;
  suggestion: string;
  practice: string[];
  games: { name: string; id: string }[];
}

export const RECOMMENDATIONS: Record<CategoryKey, RecommendationInfo> = {
  global_memory: {
    title: "ด้านความจำ",
    suggestion:
      "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านความจำมีคะแนนน้อยกว่าด้านอื่น แนะนำให้ฝึกฝนเพิ่มเติมด้วยเกมจับคู่ภาพและเกมจำตำแหน่งเพื่อพัฒนาความแม่นยำในการเล่น",
    practice: [
      "สังเกตรูปแบบและตำแหน่งของภาพก่อนเริ่มเปิดการ์ด",
      "เริ่มฝึกจากระดับความยากที่คุ้นเคย แล้วค่อย ๆ เพิ่มระดับความท้าทาย",
      "จับกลุ่มข้อมูลภาพที่คล้ายกันเพื่อช่วยในการจำระหว่างเล่นเกม",
    ],
    games: [
      { name: "เกมจับคู่การ์ด", id: "game-01-cardmatch" },
      { name: "เกมลูกไหนต่อดี", id: "game-13-boxpattern" },
      { name: "เกมคุ้นๆนะเนี่ย", id: "game-14-wordrecognize" },
    ],
  },
  global_focus: {
    title: "ด้านสมาธิและการจดจ่อ",
    suggestion:
      "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านสมาธิและการจดจ่อมีคะแนนน้อยกว่าด้านอื่น แนะนำให้ฝึกฝนเพิ่มเติมด้วยเกมที่ต้องคอยสังเกตและจับจังหวะเป้าหมายอย่างต่อเนื่อง",
    practice: [
      "สังเกตความเปลี่ยนแปลงของเป้าหมายบนหน้าจออย่างตั้งใจ",
      "รอจังหวะที่ถูกต้องก่อนกด แทนการกดปุ่มอย่างเร่งรีบ",
      "เลือกเล่นเกมในสถานที่ที่ไม่มีเสียงรบกวนเพื่อช่วยในการจดจ่อ",
    ],
    games: [
      { name: "เกมตรงไม่ตรง", id: "game-02-sensorlock" },
      { name: "เกมลูกศรชี้โน้ต", id: "game-06-dreamdirect" },
      { name: "ท่องอวกาศ", id: "game-18-runforyourlife" },
    ],
  },
  global_planning: {
    title: "ด้านการวางแผนและแก้ปัญหา",
    suggestion:
      "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านการวางแผนมีคะแนนน้อยกว่าด้านอื่น แนะนำให้ฝึกฝนเพิ่มเติมด้วยเกมจัดเรียงและเกมแก้ปัญหาแบบมีลำดับขั้นตอน",
    practice: [
      "มองภาพรวมของกระดานและวางแผนลำดับการเดินล่วงหน้า",
      "คิดเปรียบเทียบทางเลือกก่อนย้ายสิ่งของเพื่อลดจำนวนก้าวที่ไม่จำเป็น",
      "แบ่งการแก้ปัญหาออกเป็นเป้าหมายย่อยทีละส่วน",
    ],
    games: [
      { name: "เกมเรียงสีหลอดแก้ว", id: "game-09-tube-sort" },
      { name: "เกมแก้รถติด", id: "game-21-parking-jam" },
      { name: "เกมกลับหลุม", id: "game-05-wormtrain" },
    ],
  },
  global_speed: {
    title: "ความเร็วในการคิด การตอบสนอง",
    suggestion:
      "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านความเร็วในการตอบสนองมีคะแนนน้อยกว่าด้านอื่น แนะนำให้ฝึกฝนเพิ่มเติมด้วยเกมค้นหาและเกมตอบสนองตามเวลาที่กำหนด",
    practice: [
      "ฝึกกวาดสายตามองหาเป้าหมายหลักทันทีที่ปรากฏบนหน้าจอ",
      "ตอบสนองต่อสัญลักษณ์อย่างกระชับและแม่นยำ",
      "ฝึกเล่นเกมซ้ำเพื่อพัฒนาความคุ้นเคยกับรูปแบบและความเร็ว",
    ],
    games: [
      { name: "เกมตรงไม่ตรง", id: "game-02-sensorlock" },
      { name: "เกมลูกศรชี้โน้ต", id: "game-06-dreamdirect" },
      { name: "เกมนักล่าตัวเลข", id: "game-12-gridhunter" },
    ],
  },
  global_visual: {
    title: "มิติสัมพันธ์",
    suggestion:
      "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านมิติสัมพันธ์มีคะแนนน้อยกว่าด้านอื่น แนะนำให้ฝึกฝนเพิ่มเติมด้วยเกมวิเคราะห์ภาพ โครงสร้าง และการกะระยะทางสายตา",
    practice: [
      "สังเกตมุมมอง โครงสร้าง และทิศทางของสิ่งของในแต่ละด่าน",
      "ฝึกนับจำนวนสิ่งของที่ซ้อนทับกันอย่างเป็นระบบ",
      "กะระยะและทิศทางการเชื่อมต่อของชิ้นส่วนก่อนลงมือ",
    ],
    games: [
      { name: "เกมกล่องเยอะจัง", id: "game-20-boxcounting" },
      { name: "เกมท่อน้ำของการประปา", id: "game-11-pipe-patch" },
      { name: "เกมลงเหมืองหาทอง", id: "game-10-miner" },
    ],
  },
  global_emotion: {
    title: "ด้านภาษาและการนึกคำ",
    suggestion:
      "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านภาษาและการนึกคำมีคะแนนน้อยกว่าด้านอื่น แนะนำให้ฝึกฝนเพิ่มเติมด้วยเกมเชื่อมโยงเสียง รูปภาพ และคำศัพท์",
    practice: [
      "ฝึกจับคู่เสียงกับคำศัพท์ให้แม่นยำ",
      "สังเกตความเชื่อมโยงระหว่างภาพและเสียงที่ได้ยินในเกม",
      "ทบทวนคำศัพท์และเสียงที่เคยเล่นเพื่อเพิ่มความคุ้นเคย",
    ],
    games: [{ name: "เกมเสียงอะไรเอ่ย", id: "game-08-mysterysound" }],
  },
};

export interface ParsedDomainScore {
  key: CategoryKey;
  label: string;
  val: number | null;
  isScored: boolean;
}

/**
 * Parses user profile domain scores, strictly distinguishing genuine 0 from missing (null/undefined).
 */
export function parseDomainScores(
  profile: Partial<Record<CategoryKey, number | null>> | null | undefined
): ParsedDomainScore[] {
  return CATEGORY_KEYS.map((key) => {
    const rawVal = profile ? profile[key] : undefined;
    const isNumber = typeof rawVal === "number" && !isNaN(rawVal);
    return {
      key,
      label: CATEGORY_LABELS[key],
      val: isNumber ? rawVal : null,
      isScored: isNumber,
    };
  });
}

/**
 * Returns scored domains sorted ascending by score (lowest score first).
 * Unknown / missing domains are strictly excluded, so they are NEVER ranked as weakest.
 * Genuine 0 scores ARE preserved and ranked as lowest.
 */
export function getRankedWeakestDomains(
  profile: Partial<Record<CategoryKey, number | null>> | null | undefined
): ParsedDomainScore[] {
  const parsed = parseDomainScores(profile);
  const scored = parsed.filter((d): d is ParsedDomainScore & { val: number } => d.isScored);
  return scored.sort((a, b) => a.val - b.val);
}

/**
 * Identifies categories that have never been played or are missing scores.
 */
export function getUnplayedCategories(
  profile: Partial<Record<CategoryKey, number | null>> | null | undefined,
  playedGameIds: Iterable<string>
): ParsedDomainScore[] {
  const playedSet = new Set(playedGameIds);
  const parsed = parseDomainScores(profile);

  return parsed.filter((domain) => {
    // If domain has a valid score, it has been played
    if (domain.isScored) return false;

    // Otherwise check if any game in this dimension has been played
    const dimensionGames = DIMENSION_GAMES[domain.key] || [];
    return !dimensionGames.some((gId) => playedSet.has(gId));
  });
}

/**
 * Generates the factual home recommendation message.
 */
export function getHomeRecommendationMessage(
  profile: Partial<Record<CategoryKey, number | null>> | null | undefined,
  playedGameIds: Iterable<string>
): string {
  const unplayed = getUnplayedCategories(profile, playedGameIds);

  if (unplayed.length > 0) {
    const nextToPlay = unplayed[0];
    return `ลองเล่นเกมด้าน${nextToPlay.label} ที่ยังไม่เคยเล่น เพื่อบันทึกคะแนนและฝึกทักษะด้านนี้`;
  }

  const ranked = getRankedWeakestDomains(profile);
  if (ranked.length > 0) {
    const weakest = ranked[0];
    return `แนะนำฝึกฝนเพิ่มเติมด้วยเกมด้าน${weakest.label} จากคะแนนการเล่นที่ผ่านมา`;
  }

  return "เริ่มต้นฝึกทักษะสมองด้วยการลองเล่นเกมในหมวดหมู่ต่าง ๆ วันนี้";
}

export interface GameOption {
  game_id: string;
  title: string;
}

/**
 * Selects 3 daily mission games according to profile state:
 * - If profile has scored domains: picks weakest, 2nd weakest (or unplayed), and 1 varied game.
 * - If profile has NO usable scores (all missing): picks a varied starter selection from 3 different categories.
 * - Avoids duplicate games where possible.
 */
export function selectDailyMissionGames(
  allGames: GameOption[],
  profile: Partial<Record<CategoryKey, number | null>> | null | undefined
): GameOption[] {
  if (!allGames || allGames.length < 3) {
    return allGames || [];
  }

  const gamesById = new Map<string, GameOption>();
  allGames.forEach((g) => gamesById.set(g.game_id, g));

  const getGamesForDimension = (dim: CategoryKey): GameOption[] => {
    const ids = DIMENSION_GAMES[dim] || [];
    return ids.map((id) => gamesById.get(id)).filter((g): g is GameOption => !!g);
  };

  const ranked = getRankedWeakestDomains(profile);

  if (ranked.length === 0) {
    // All scores missing: provide a varied starter selection from different categories
    const starterCategories: CategoryKey[] = [
      "global_memory",
      "global_focus",
      "global_planning",
      "global_speed",
      "global_visual",
      "global_emotion",
    ];

    // Pick 3 distinct categories that have games
    const pickedGames: GameOption[] = [];
    const usedGameIds = new Set<string>();

    for (const cat of starterCategories) {
      if (pickedGames.length >= 3) break;
      const games = getGamesForDimension(cat).filter((g) => !usedGameIds.has(g.game_id));
      if (games.length > 0) {
        const game = games[0];
        pickedGames.push(game);
        usedGameIds.add(game.game_id);
      }
    }

    // Fallback if needed
    for (const game of allGames) {
      if (pickedGames.length >= 3) break;
      if (!usedGameIds.has(game.game_id)) {
        pickedGames.push(game);
        usedGameIds.add(game.game_id);
      }
    }

    return pickedGames.slice(0, 3);
  }

  // Scored domains exist
  const weakest1 = ranked[0].key;
  const weakest2 =
    ranked.length > 1
      ? ranked[1].key
      : CATEGORY_KEYS.find((k) => k !== weakest1) || "global_speed";

  const gamesForWeakness1 = getGamesForDimension(weakest1);
  const gamesForWeakness2 = getGamesForDimension(weakest2);

  // Pick Game 2 (from Weakest 1)
  const chosenGame2 =
    gamesForWeakness1.length > 0 ? gamesForWeakness1[0] : allGames[0];

  // Pick Game 3 (from Weakest 2) - avoid duplicate of Game 2
  const filteredWeakness2 = gamesForWeakness2.filter((g) => g.game_id !== chosenGame2.game_id);
  const fallbackGames2 = allGames.filter((g) => g.game_id !== chosenGame2.game_id);
  const chosenGame3 =
    filteredWeakness2.length > 0
      ? filteredWeakness2[0]
      : fallbackGames2[0] || allGames[0];

  // Pick Game 1 (varied game) - avoid duplicates of Game 2 and Game 3
  const remainingGames = allGames.filter(
    (g) => g.game_id !== chosenGame2.game_id && g.game_id !== chosenGame3.game_id
  );
  const chosenGame1 = remainingGames[0] || allGames[0];

  return [chosenGame1, chosenGame2, chosenGame3];
}
