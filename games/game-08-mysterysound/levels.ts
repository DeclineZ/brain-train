import type { MysterySoundLevelConfig } from '@/types';

// Level configurations for Mystery Sound game
// Each level has a correct sound and 4 options to choose from

export const MYSTERY_SOUND_LEVELS: Record<number, MysterySoundLevelConfig> = {
    // Level 0: Tutorial (unlimited time, easy)
    0: {
        level: 0,
        correctSound: 'cat',
        correctLabel: 'แมว',
        options: [
            { id: 'dog', label: 'หมา' },
            { id: 'cat', label: 'แมว' },
            { id: 'bird', label: 'นก' },
            { id: 'chicken', label: 'ไก่' },
        ],
        maxReplays: 3,
        timeLimitSeconds: 999,
        difficultyMultiplier: 1.0,
    },

    // Level 1: Cat sound - Easy intro
    1: {
        level: 1,
        correctSound: 'cat',
        correctLabel: 'แมว',
        options: [
            { id: 'dog', label: 'หมา' },
            { id: 'cat', label: 'แมว' },
            { id: 'bird', label: 'นก' },
            { id: 'chicken', label: 'ไก่' },
        ],
        maxReplays: 1,
        timeLimitSeconds: 30,
        difficultyMultiplier: 1.0,
    },
};
