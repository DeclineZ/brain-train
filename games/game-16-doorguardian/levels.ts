export interface DoorGuardianLevelConfig {
    level: number;
    name: string;
    totalVisitors: number;
    allowedCharacters: string[]; // IDs of characters allowed today
    characterPool: string[]; // IDs of characters that can visit (superset of allowed)
    abnormalChance: number; // 0-1, chance a visitor is abnormal
    timePerVisitor?: number; // seconds, undefined = no timer
    description: string;
}

// Character IDs
export const CHARACTER_IDS = {
    WOMAN: 'woman',
    MAN: 'man',
    KID: 'kid',
    DOG: 'dog',
    CAT: 'cat',
    RABBIT: 'rabbit',
    BEAR: 'bear',
    FOX: 'fox',
} as const;

export type CharacterId = typeof CHARACTER_IDS[keyof typeof CHARACTER_IDS];

export interface CharacterData {
    id: CharacterId;
    name: string;
    normalSprite: string;
    abnormalSprite: string;
    normalDialogue: string[];
    abnormalDialogue: string[];
    thumbnailNormal: string;
}

export const CHARACTERS: Record<CharacterId, CharacterData> = {
    woman: {
        id: 'woman',
        name: 'พี่สาว',
        normalSprite: 'char-woman-normal',
        abnormalSprite: 'char-woman-abnormal',
        normalDialogue: [
            'สวัสดีค่ะ ขอเข้าไปเยี่ยมหน่อยน้า',
            'มาเล่นด้วยกันนะคะ',
            'เปิดประตูให้หน่อยน้า',
        ],
        abnormalDialogue: [
            'สวัสดีค่ะ ไม่ต้องมองนะ...',
            'ให้เข้าไปเถอะน้า~ ไม่ต้องสนใจสีหน้าเลย',
        ],
        thumbnailNormal: 'thumb-woman',
    },
    man: {
        id: 'man',
        name: 'พี่ชาย',
        normalSprite: 'char-man-normal',
        abnormalSprite: 'char-man-abnormal',
        normalDialogue: [
            'เฮ้! เปิดประตูให้หน่อยสิครับ 😎',
            'มาแล้ว~ เปิดให้หน่อยนะ 👋',
            'ว่าไง! มีของมาให้',
        ],
        abnormalDialogue: [
            'เปิดให้หน่อยสิครับ....',
            'ไม่มีอะไรผิดปกตินะครับ เชื่อผมสิ 😬',
        ],
        thumbnailNormal: 'thumb-man',
    },
    kid: {
        id: 'kid',
        name: 'น้องเด็ก',
        normalSprite: 'char-kid-normal',
        abnormalSprite: 'char-kid-abnormal',
        normalDialogue: [
            'พี่ๆ ขอเข้าไปเล่นด้วยได้มั้ยครับ~ 🎈',
            'มาเล่นซ่อนหาด้วยกันนะ! 🙈',
            'ขอเข้าไปวาดรูปหน่อยนะครับ 🎨',
        ],
        abnormalDialogue: [
            'ให้เข้าไปเล่นหน่อยสิ... เขาของผมน่ารักใช่มั้ย 😈',
            'ไม่ต้องกลัว... ผมเป็นเด็กธรรมดานะครับ 🤘',
        ],
        thumbnailNormal: 'thumb-kid',
    },
    dog: {
        id: 'dog',
        name: 'น้องหมา',
        normalSprite: 'char-dog-normal',
        abnormalSprite: 'char-dog-abnormal',
        normalDialogue: [
            'บ๊อก! บ๊อก! 🐾',
            'โฮ่ง โฮ่ง~ กระดิกหาง 🐕',
            'บ๊อก~ ขออยู่ด้วยนะ 💛',
        ],
        abnormalDialogue: [
            'บ๊อก... บ๊อก... บ๊อก... 🐾🐾🐾',
        ],
        thumbnailNormal: 'thumb-dog',
    },
    cat: {
        id: 'cat',
        name: 'น้องแมว',
        normalSprite: 'char-cat-normal',
        abnormalSprite: 'char-cat-abnormal',
        normalDialogue: [
            'เมี้ยวว~ ให้เข้าไปนอนอุ่นหน่อยน้า 😺',
            'เมี๊ยว~ มานอนบนโซฟาหน่อย 🛋️',
            'เมี้ยว เมี้ยว~ 🐱',
        ],
        abnormalDialogue: [
            'เมี้ยว... ไม่ต้องสนใจสีของหนูนะ... 🔵',
            'เมี้ยว~ หางสองเส้นก็แค่พิเศษหน่อย 🐈‍⬛',
        ],
        thumbnailNormal: 'thumb-cat',
    },
    rabbit: {
        id: 'rabbit',
        name: 'น้องกระต่าย',
        normalSprite: 'char-rabbit-normal',
        abnormalSprite: 'char-rabbit-abnormal',
        normalDialogue: [
            'กระโดด กระโดด~ เข้าไปกินแครอทด้วยนะ 🥕',
            'ขอเข้าไปกินหญ้าในสวนหน่อยน้า 🌿',
            'กระต่ายน้อย มาเล่นด้วยนะ 🐰',
        ],
        abnormalDialogue: [
            'กระโดด~ ...หูข้างเดียวก็ได้ยินดีนะ 👂',
            'ให้เข้าไปหน่อย... ตาแดงแค่ไม่ได้นอน 🔴',
        ],
        thumbnailNormal: 'thumb-rabbit',
    },
    bear: {
        id: 'bear',
        name: 'น้องหมี',
        normalSprite: 'char-bear-normal',
        abnormalSprite: 'char-bear-abnormal',
        normalDialogue: [
            'ฮืมม~ หนาวจังเลย ขอเข้าไปอุ่นด้วย 🍯',
            'มีน้ำผึ้งมั้ย~ ขอหน่อยสิ 🐝',
            'กอดหน่อยมั้ย~ 🤗',
        ],
        abnormalDialogue: [
            'ฮืมม~ หูใหญ่ดีนะ',
            'ตาสามดวงมองเห็นชัดกว่า~ เชื่อสิ 👁️👁️👁️',
        ],
        thumbnailNormal: 'thumb-bear',
    },
    fox: {
        id: 'fox',
        name: 'น้องจิ้งจอก',
        normalSprite: 'char-fox-normal',
        abnormalSprite: 'char-fox-abnormal',
        normalDialogue: [
            'คอนคอน~ ขอพักหน่อยได้มั้ย? 🦊',
            'มาแวะเยี่ยมหน่อยน้า~ 🍂',
            'ขออยู่ด้วยสักพักนะ 🌙',
        ],
        abnormalDialogue: [
            'คอนคอน~',
            'เขี้ยวยาวก็แค่ไว้กินผลไม้จ้า 🫣',
        ],
        thumbnailNormal: 'thumb-fox',
    },
};

export const LEVELS: DoorGuardianLevelConfig[] = [
    // === Phase 1: Humans only (L1-3) ===
    {
        level: 1,
        name: 'วันแรก',
        totalVisitors: 3,
        allowedCharacters: ['woman', 'man'],
        characterPool: ['woman', 'man', 'kid'],
        abnormalChance: 0,
        description: 'ง่ายมาก: แค่เช็ครายการ',
    },
    {
        level: 2,
        name: 'จำได้มั้ย',
        totalVisitors: 3,
        allowedCharacters: ['woman', 'kid'],
        characterPool: ['woman', 'man', 'kid'],
        abnormalChance: 0,
        description: 'รายการเปลี่ยนแล้วนะ!',
    },
    {
        level: 3,
        name: 'เริ่มยากขึ้น',
        totalVisitors: 4,
        allowedCharacters: ['man', 'kid'],
        characterPool: ['woman', 'man', 'kid'],
        abnormalChance: 0.1,
        description: 'ระวัง! อาจมีร่างไม่ปกติ',
    },

    // === Phase 2: Introduce dog & cat (L4-6) ===
    {
        level: 4,
        name: 'สัตว์มาแล้ว!',
        totalVisitors: 4,
        allowedCharacters: ['woman', 'man', 'dog'],
        characterPool: ['woman', 'man', 'kid', 'dog'],
        abnormalChance: 0,
        description: 'น้องหมามาด้วย!',
    },
    {
        level: 5,
        name: 'แมวก็มา',
        totalVisitors: 5,
        allowedCharacters: ['kid', 'dog', 'cat'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat'],
        abnormalChance: 0.15,
        description: 'สัตว์เพิ่ม + ร่างไม่ปกติ',
    },
    {
        level: 6,
        name: 'สับสนขึ้น',
        totalVisitors: 5,
        allowedCharacters: ['woman', 'man', 'cat'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat'],
        abnormalChance: 0.2,
        description: 'รายการเปลี่ยน ร่างผิดปกติเยอะขึ้น!',
    },

    // === Phase 3: Introduce rabbit & bear (L7-9) ===
    {
        level: 7,
        name: 'กระต่ายน้อย',
        totalVisitors: 6,
        allowedCharacters: ['woman', 'kid', 'rabbit'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit'],
        abnormalChance: 0.2,
        description: 'กระต่ายมาเพิ่ม ดูดีๆนะ!',
    },
    {
        level: 8,
        name: 'สังเกตดีๆ',
        totalVisitors: 6,
        allowedCharacters: ['man', 'dog', 'cat', 'rabbit'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit'],
        abnormalChance: 0.25,
        description: 'รายการ 4 ตัว + ร่างผิดปกติ',
    },
    {
        level: 9,
        name: 'หมีมาแล้ว',
        totalVisitors: 7,
        allowedCharacters: ['woman', 'kid', 'dog', 'bear'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear'],
        abnormalChance: 0.3,
        description: 'น้องหมีมาเพิ่ม! ดูให้ดี!',
    },

    // === Phase 4: All animals + timers (L10-12) ===
    {
        level: 10,
        name: 'แข่งกับเวลา',
        totalVisitors: 8,
        allowedCharacters: ['man', 'cat', 'rabbit', 'bear'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear'],
        abnormalChance: 0.3,
        timePerVisitor: 10,
        description: 'เริ่มมี timer! 10 วินาที/คน',
    },
    {
        level: 11,
        name: 'จิ้งจอกแสนซน',
        totalVisitors: 8,
        allowedCharacters: ['woman', 'kid', 'fox', 'bear'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'],
        abnormalChance: 0.35,
        timePerVisitor: 9,
        description: 'จิ้งจอกมาเพิ่ม! timer 9 วิ',
    },
    {
        level: 12,
        name: 'ด่านหิน',
        totalVisitors: 9,
        allowedCharacters: ['man', 'dog', 'cat', 'rabbit', 'fox'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'],
        abnormalChance: 0.35,
        timePerVisitor: 8,
        description: 'ตัวเยอะ + timer 8 วิ',
    },

    // === Phase 5: Max difficulty (L13-15) ===
    {
        level: 13,
        name: 'ใกล้จบแล้ว',
        totalVisitors: 10,
        allowedCharacters: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'],
        abnormalChance: 0.4,
        timePerVisitor: 7,
        description: 'แขก 10 คน! timer 7 วิ!',
    },
    {
        level: 14,
        name: 'ท้าทายสุดๆ',
        totalVisitors: 11,
        allowedCharacters: ['kid', 'dog', 'bear', 'fox', 'rabbit', 'cat'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'],
        abnormalChance: 0.45,
        timePerVisitor: 7,
        description: 'เกือบทุกตัว! ร่างผิดปกติเพียบ!',
    },
    {
        level: 15,
        name: 'วันสุดท้าย',
        totalVisitors: 12,
        allowedCharacters: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'],
        abnormalChance: 0.5,
        timePerVisitor: 6,
        description: 'ทุกตัวมาหมด! timer 6 วิ!',
    },
];

// Export as Record for levelLoader compatibility
export const DOORGUARDIAN_LEVELS: Record<number, DoorGuardianLevelConfig> = {};
LEVELS.forEach(l => { DOORGUARDIAN_LEVELS[l.level] = l; });
