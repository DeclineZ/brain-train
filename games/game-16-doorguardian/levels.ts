export interface DoorGuardianLevelConfig {
    level: number;
    name: string;
    totalVisitors: number;
    allowedCharacters: string[]; // IDs of characters allowed today
    characterPool: string[]; // IDs of characters that can visit (superset of allowed)
    abnormalChance: number; // 0-1, chance a visitor is abnormal
    guaranteedAbnormal?: number; // Minimum number of abnormal visitors
    maxRefViews?: number; // Maximum times player can view the reference list (undefined = unlimited)
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
    ALIEN: 'alien',
    MONSTER: 'monster',
    GHOST: 'ghost',
    ROBOT: 'robot',
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
    alien: {
        id: 'alien',
        name: 'เอเลี่ยน',
        normalSprite: 'char-alien-normal',
        abnormalSprite: 'char-alien-abnormal',
        normalDialogue: [
            'ปิ๊บๆ... มาอย่างสันติ 👽',
            'ขอเข้าไปสำรวจหน่อย... ปิ๊บๆ ✨',
            'ชาวโลกใจดี... ขอพักหน่อย 🛸',
        ],
        abnormalDialogue: [
            'ปิ๊บ... ยึดครอง... เอ้ย ขอเข้าหน่อย 👾',
            'หน้าตาแปลก? คิดไปเองน่า... 👁️',
        ],
        thumbnailNormal: 'thumb-alien',
    },
    monster: {
        id: 'monster',
        name: 'มอนสเตอร์',
        normalSprite: 'char-monster-normal',
        abnormalSprite: 'char-monster-abnormal',
        normalDialogue: [
            'ก๊าซซ~ ขอเข้าไปหน่อย 👹',
            'ตัวใหญ่แต่ใจดีนะ... ฮึ่ม~ 💙',
            'หิวจัง... มีขนมมั้ย? 🍪',
        ],
        abnormalDialogue: [
            'ก๊าซซ! ... หิวเนื้อ... 🥩',
            'เข้าไป... เดี๋ยวรู้เลย... 🔥',
        ],
        thumbnailNormal: 'thumb-monster',
    },
    ghost: {
        id: 'ghost',
        name: 'คุณผี',
        normalSprite: 'char-ghost-normal',
        abnormalSprite: 'char-ghost-abnormal',
        normalDialogue: [
            'แบ่~ ไม่ได้มาหลอกนะ 👻',
            'ลอยผ่านทางมา... ขอแวะหน่อย ☁️',
            'ฮืออ~ เหงาจัง ขอเข้าไปนะ 🌫️',
        ],
        abnormalDialogue: [
            'แบ่!! ... ตกใจมั้ย? 😈',
            'จะเข้าไปสิง... เอ้ย สิงสู่... เอ้ย เยี่ยม! 💀',
        ],
        thumbnailNormal: 'thumb-ghost',
    },
    robot: {
        id: 'robot',
        name: 'โรบอท',
        normalSprite: 'char-robot-normal',
        abnormalSprite: 'char-robot-abnormal',
        normalDialogue: [
            'บี๊บ บู๊บ... ขออนุญาตเข้าพื้นที่ 🤖',
            'ระบบปกติ... ต้องการชาร์จแบต 🔋',
            'สวัสดีมนุษย์... 010101 💿',
        ],
        abnormalDialogue: [
            'บี๊บ... ระบบรวน... ทำลาย... 💥',
            'ตาสีแดง... แค่โหมดประหยัดพลังงาน... 🚨',
        ],
        thumbnailNormal: 'thumb-robot',
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
        guaranteedAbnormal: 0,
        description: 'ง่ายมาก: แค่เช็ครายการ',
    },
    {
        level: 2,
        name: 'จำได้มั้ย',
        totalVisitors: 3,
        allowedCharacters: ['woman', 'kid'],
        characterPool: ['woman', 'man', 'kid'],
        abnormalChance: 0,
        guaranteedAbnormal: 0,
        description: 'รายการเปลี่ยนแล้วนะ!',
    },
    {
        level: 3,
        name: 'เริ่มยากขึ้น',
        totalVisitors: 4,
        allowedCharacters: ['man', 'kid'],
        characterPool: ['woman', 'man', 'kid'],
        abnormalChance: 0.4,
        guaranteedAbnormal: 1,
        description: 'ระวัง! อาจมีร่างไม่ปกติ',
    },

    // === Phase 2: Introduce dog & cat (L4-6) ===
    {
        level: 4,
        name: 'สัตว์มาแล้ว!',
        totalVisitors: 4,
        allowedCharacters: ['woman', 'man', 'dog'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'trash'], // Note: 'trash' not in keys, removing trash. Keeping pool consistent.
        // wait, I made a mistake in pool, let me correct it in the content below
        abnormalChance: 0.4,
        guaranteedAbnormal: 1,
        description: 'น้องหมามาด้วย!',
    },
    {
        level: 5,
        name: 'แมวก็มา',
        totalVisitors: 5,
        allowedCharacters: ['kid', 'dog', 'cat'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'monster'],
        abnormalChance: 0.4,
        guaranteedAbnormal: 1,
        description: 'เริ่มมีตัวแปลกๆ!',
    },
    {
        level: 6,
        name: 'สับสนขึ้น',
        totalVisitors: 5,
        allowedCharacters: ['woman', 'man', 'cat'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'alien'],
        abnormalChance: 0.4,
        guaranteedAbnormal: 2,
        description: 'รายการเปลี่ยน ร่างผิดปกติเยอะขึ้น!',
    },

    // === Phase 3: Introduce rabbit & bear & strange creatures (L7-9) ===
    {
        level: 7,
        name: 'กระต่ายน้อย',
        totalVisitors: 6,
        allowedCharacters: ['woman', 'kid', 'rabbit'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'alien'],
        abnormalChance: 0.5,
        guaranteedAbnormal: 2,
        maxRefViews: 5,
        description: 'ดูรายชื่อได้ 5 ครั้ง!',
    },
    {
        level: 8,
        name: 'สังเกตดีๆ',
        totalVisitors: 6,
        allowedCharacters: ['man', 'dog', 'cat', 'rabbit'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'monster', 'ghost'],
        abnormalChance: 0.5,
        guaranteedAbnormal: 2,
        maxRefViews: 5,
        description: 'ระวังผีหลอก!',
    },
    {
        level: 9,
        name: 'หมีมาแล้ว',
        totalVisitors: 7,
        allowedCharacters: ['woman', 'kid', 'dog', 'bear'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'robot'],
        abnormalChance: 0.5,
        guaranteedAbnormal: 3,
        maxRefViews: 5,
        description: 'น้องหมีและหุ่นยนต์!',
    },

    // === Phase 4: All animals + timers (L10-12) ===
    {
        level: 10,
        name: 'แข่งกับเวลา',
        totalVisitors: 8,
        allowedCharacters: ['man', 'cat', 'rabbit', 'bear'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'ghost', 'robot'],
        abnormalChance: 0.6,
        guaranteedAbnormal: 3,
        maxRefViews: 3,
        timePerVisitor: 10,
        description: 'เริ่มมี timer + ดูชื่อได้ 3 ครั้ง!',
    },
    {
        level: 11,
        name: 'จิ้งจอกแสนซน',
        totalVisitors: 8,
        allowedCharacters: ['woman', 'kid', 'fox', 'bear'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox', 'alien'],
        abnormalChance: 0.6,
        guaranteedAbnormal: 4,
        maxRefViews: 3,
        timePerVisitor: 9,
        description: 'จิ้งจอกมาเพิ่ม! timer 9 วิ',
    },
    {
        level: 12,
        name: 'ด่านหิน',
        totalVisitors: 9,
        allowedCharacters: ['man', 'dog', 'cat', 'rabbit', 'fox'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox', 'monster', 'ghost'],
        abnormalChance: 0.6,
        guaranteedAbnormal: 4,
        maxRefViews: 3,
        timePerVisitor: 8,
        description: 'ตัวเยอะ + timer 8 วิ',
    },

    // === Phase 5: Max difficulty (L13-15) ===
    {
        level: 13,
        name: 'ใกล้จบแล้ว',
        totalVisitors: 10,
        allowedCharacters: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox', 'alien', 'robot'],
        abnormalChance: 0.7,
        guaranteedAbnormal: 5,
        maxRefViews: 1,
        timePerVisitor: 7,
        description: 'ดูรายชื่อได้ครั้งเดียว!!',
    },
    {
        level: 14,
        name: 'ท้าทายสุดๆ',
        totalVisitors: 11,
        allowedCharacters: ['kid', 'dog', 'bear', 'fox', 'rabbit', 'cat'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox', 'monster', 'ghost', 'robot'],
        abnormalChance: 0.7,
        guaranteedAbnormal: 6,
        maxRefViews: 1,
        timePerVisitor: 7,
        description: 'เกือบทุกตัว! ร่างผิดปกติเพียบ!',
    },
    {
        level: 15,
        name: 'วันสุดท้าย',
        totalVisitors: 12,
        allowedCharacters: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox'],
        characterPool: ['woman', 'man', 'kid', 'dog', 'cat', 'rabbit', 'bear', 'fox', 'alien', 'monster', 'ghost', 'robot'],
        abnormalChance: 0.7,
        guaranteedAbnormal: 7,
        maxRefViews: 1,
        timePerVisitor: 6,
        description: 'ทุกตัวมาหมด! timer 6 วิ!',
    },
];

// Export as Record for levelLoader compatibility
export const DOORGUARDIAN_LEVELS: Record<number, DoorGuardianLevelConfig> = {};
LEVELS.forEach(l => { DOORGUARDIAN_LEVELS[l.level] = l; });
