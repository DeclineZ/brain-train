import type * as Phaser from 'phaser';

/**
 * Standard font family for all in-game text rendering in Phaser Canvas.
 * Uses "Prompt" (modern, gamified, clear Thai-Latin typeface) with safe fallbacks.
 */
export const GAME_FONT_FAMILY = 'Prompt, "Noto Sans Thai", "Segoe UI", sans-serif';

/**
 * Safe padding for Thai text to prevent top tone marks (ไม้เอก, ไม้โท, ิ, ี, ึ, ื, ็, ์)
 * and bottom descenders (ุ, ู, ญ, ฎ, ฏ, ฐ) from being clipped by Phaser canvas textures.
 */
export const THAI_TEXT_PADDING = {
  left: 8,
  right: 8,
  top: 10,
  bottom: 10,
};

/**
 * Safe padding for emoji glyphs (e.g. ❌, 👆, ⭐, 🐙, 🎯) in Phaser text objects.
 */
export const EMOJI_TEXT_PADDING = {
  left: 10,
  right: 10,
  top: 12,
  bottom: 12,
};

/**
 * Factory for creating standard game text style with default Prompt font and safe Thai padding.
 */
export function createGameTextStyle(
  customStyle: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.Types.GameObjects.Text.TextStyle {
  const customPadding = typeof customStyle.padding === 'object' && customStyle.padding !== null
    ? customStyle.padding
    : {};

  return {
    fontFamily: GAME_FONT_FAMILY,
    lineSpacing: 6,
    ...customStyle,
    padding: {
      ...THAI_TEXT_PADDING,
      ...customPadding,
    },
  };
}

/**
 * Factory for creating emoji text style with safe emoji padding.
 */
export function createEmojiTextStyle(
  customStyle: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.Types.GameObjects.Text.TextStyle {
  const customPadding = typeof customStyle.padding === 'object' && customStyle.padding !== null
    ? customStyle.padding
    : {};

  return {
    fontFamily: GAME_FONT_FAMILY,
    ...customStyle,
    padding: {
      ...EMOJI_TEXT_PADDING,
      ...customPadding,
    },
  };
}
