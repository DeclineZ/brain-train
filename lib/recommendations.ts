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
      "การฝึกฝนทักษะด้านความจำด้วยเกมจับคู่ภาพและจำตำแหน่ง ช่วยเสริมสร้างความคุ้นเคยในการสังเกตและจดจำรูปแบบข้อมูลอย่างเป็นระบบ",
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
      "การฝึกฝนทักษะด้านสมาธิและการจดจ่อด้วยเกมจับจังหวะและสังเกตสัญลักษณ์ ช่วยพัฒนาการมุ่งความสนใจไปยังเป้าหมายอย่างต่อเนื่อง",
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
      "การฝึกฝนทักษะด้านการวางแผนและแก้ปัญหาด้วยเกมจัดเรียงและเกมวางกลยุทธ์ ช่วยฝึกการคิดวิเคราะห์ขั้นตอนและการตัดสินใจอย่างมีลำดับ",
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
      "การฝึกฝนทักษะด้านความเร็วในการตอบสนองด้วยเกมค้นหาและเกมตอบสนองตามเวลา ช่วยพัฒนาความคล่องแคล่วในการประมวลผลสิ่งกระตุ้น",
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
      "การฝึกฝนทักษะด้านมิติสัมพันธ์ด้วยเกมวิเคราะห์ภาพ โครงสร้าง และการกะระยะ ช่วยเสริมสร้างความเข้าใจเกี่ยวกับรูปทรงและตำแหน่งเชิงพื้นที่",
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
      "การฝึกฝนทักษะด้านภาษาและการนึกคำด้วยเกมเชื่อมโยงเสียง รูปภาพ และคำศัพท์ ช่วยส่งเสริมความคล่องแคล่วในการนึกคำและความจำทางภาษา",
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

export type CategoryExplanationType =
  | "missing"
  | "lowest"
  | "tied_lowest"
  | "highest"
  | "mid_tier"
  | "only_scored";

export interface CategoryExplanation {
  type: CategoryExplanationType;
  text: string;
}

/**
 * Returns a contextual explanation for a given domain based strictly on actual user score data:
 * - Missing (null/undefined): explains that this category has not been played yet and recommends trying it.
 * - Lowest: explains that this category has a lower score than other categories based on past gameplay.
 * - Tied lowest: explains that this category is in the lower group alongside other tied categories.
 * - Highest: explains that this category is a high-scoring/strong area to maintain.
 * - Mid-tier: explains that this category has a steady score.
 */
export function getCategoryContextualExplanation(
  key: CategoryKey,
  profile: Partial<Record<CategoryKey, number | null>> | null | undefined
): CategoryExplanation {
  const parsed = parseDomainScores(profile);
  const target = parsed.find((d) => d.key === key);

  if (!target || !target.isScored || target.val === null) {
    return {
      type: "missing",
      text: "ยังไม่มีคะแนนจากการเล่นเกมในหมวดนี้ แนะนำให้ลองเล่นเกมเพื่อบันทึกคะแนนและฝึกทักษะด้านนี้",
    };
  }

  const scored = parsed.filter((d): d is ParsedDomainScore & { val: number } => d.isScored);

  if (scored.length === 1) {
    return {
      type: "only_scored",
      text: "บันทึกคะแนนจากการเล่นเกมแล้ว สามารถฝึกฝนเพิ่มเติมเพื่อพัฒนาความแม่นยำได้",
    };
  }

  const scores = scored.map((d) => d.val);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const tiedLowestCount = scored.filter((d) => d.val === minScore).length;
  const tiedHighestCount = scored.filter((d) => d.val === maxScore).length;

  if (target.val === minScore) {
    if (minScore === maxScore) {
      return {
        type: "tied_lowest",
        text: "ทักษะทุกด้านที่เล่นมีคะแนนเท่ากัน แนะนำให้ฝึกฝนแต่ละหมวดสลับกันเพื่อพัฒนาอย่างรอบด้าน",
      };
    }
    if (tiedLowestCount > 1) {
      return {
        type: "tied_lowest",
        text: "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านนี้มีคะแนนอยู่ในกลุ่มต่ำสุดร่วมกับด้านอื่น แนะนำให้ฝึกฝนสลับกัน",
      };
    }
    return {
      type: "lowest",
      text: "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านนี้มีคะแนนน้อยกว่าด้านอื่น แนะนำให้ฝึกฝนเพิ่มเติมด้วยเกมที่แนะนำ",
    };
  }

  if (target.val === maxScore) {
    if (tiedHighestCount > 1) {
      return {
        type: "highest",
        text: "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านนี้เป็นหนึ่งในกลุ่มที่มีคะแนนสูงสุด สามารถฝึกฝนเพื่อรักษาความคล่องแคล่ว",
      };
    }
    return {
      type: "highest",
      text: "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านนี้เป็นด้านที่มีคะแนนโดดเด่นสูงสุด สามารถฝึกฝนเพื่อรักษาความคล่องแคล่วได้อย่างต่อเนื่อง",
    };
  }

  return {
    type: "mid_tier",
    text: "จากคะแนนการเล่นเกมที่ผ่านมา ทักษะด้านนี้มีคะแนนอยู่ในระดับปานกลาง สามารถฝึกฝนเพิ่มเติมเพื่อเสริมความชำนาญ",
  };
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
 * - Retains category selection rules and duplicate prevention while choosing among eligible games using randomFn.
 */
export function selectDailyMissionGames(
  allGames: GameOption[],
  profile: Partial<Record<CategoryKey, number | null>> | null | undefined,
  randomFn: () => number = Math.random
): GameOption[] {
  if (!allGames || allGames.length < 3) {
    return allGames || [];
  }

  const pickFrom = <T>(arr: T[]): T => {
    if (arr.length === 0) throw new Error("Cannot pick from empty array");
    const raw = randomFn();
    const normalized = typeof raw === "number" && !isNaN(raw) ? raw : Math.random();
    const clamped = Math.max(0, Math.min(0.999999, normalized));
    const index = Math.floor(clamped * arr.length);
    return arr[index];
  };

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
      const eligible = getGamesForDimension(cat).filter((g) => !usedGameIds.has(g.game_id));
      if (eligible.length > 0) {
        const game = pickFrom(eligible);
        pickedGames.push(game);
        usedGameIds.add(game.game_id);
      }
    }

    // Fallback if needed
    while (pickedGames.length < 3) {
      const fallbackEligible = allGames.filter((g) => !usedGameIds.has(g.game_id));
      if (fallbackEligible.length === 0) break;
      const game = pickFrom(fallbackEligible);
      pickedGames.push(game);
      usedGameIds.add(game.game_id);
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

  // Pick Game 2 (from Weakest 1) choosing among eligible games
  const chosenGame2 =
    gamesForWeakness1.length > 0 ? pickFrom(gamesForWeakness1) : pickFrom(allGames);

  // Pick Game 3 (from Weakest 2) choosing among eligible games (avoiding duplicate of Game 2)
  const filteredWeakness2 = gamesForWeakness2.filter((g) => g.game_id !== chosenGame2.game_id);
  const fallbackGames2 = allGames.filter((g) => g.game_id !== chosenGame2.game_id);
  const chosenGame3 =
    filteredWeakness2.length > 0
      ? pickFrom(filteredWeakness2)
      : pickFrom(fallbackGames2);

  // Pick Game 1 (varied game) choosing among eligible games (avoiding duplicates of Game 2 and Game 3)
  const remainingGames = allGames.filter(
    (g) => g.game_id !== chosenGame2.game_id && g.game_id !== chosenGame3.game_id
  );
  const chosenGame1 =
    remainingGames.length > 0 ? pickFrom(remainingGames) : pickFrom(allGames);

  return [chosenGame1, chosenGame2, chosenGame3];
}
