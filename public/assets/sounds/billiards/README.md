# Floating Pool Balls - Sound Files

This directory contains sound effects for the Floating Pool Balls game.

## Required Sound Files

The game expects the following audio files:

1. **ball-rattle.mp3** - Ball click sound
   - Duration: Short (0.1-0.3 seconds)
   - Style: Light rattle/click sound
   - Used when selecting balls

2. **success.mp3** - Success sound
   - Duration: Medium (0.5-1 second)
   - Style: Positive, upbeat success chime
   - Used when correct answer is selected

3. **bg-music.mp3** - Background music
   - Duration: Loopable (1-3 minutes)
   - Style: Calm, water-themed, non-distracting
   - Volume: Should be subtle (played at 30% volume)
   - Genre: Ambient, light classical, or soft electronic

## Audio Specifications

- Format: MP3 (preferred) or WAV
- Sample rate: 44.1kHz
- Bitrate: 128kbps or higher for MP3
- Volume: Balanced - not too loud or quiet

## Temporary Solution

If you don't have custom sounds, you can:

1. **Use existing sounds from other games:**
   - Copy from `/public/assets/sounds/` directory
   - Rename existing files to match required names

2. **Generate sounds using free tools:**
   - https://www.freesound.org (free sound effects library)
   - https://sfxr.me (retro sound generator)
   - https://www.zapsplat.com (free sound library)

3. **Use silent placeholders:**
   - Create empty MP3 files
   - Game will still function, just without audio

## Sound Search Keywords

For **ball-rattle.mp3:**
- "ball click", "rattle", "tap", "click sound", "ping pong ball"

For **success.mp3:**
- "success chime", "correct answer", "positive ping", "ding", "victory"

For **bg-music.mp3:**
- "ambient water", "calm background", "meditation music", "water flow", "ocean"

## Level Pass/Fail Sounds

The game also uses:
- **level-pass.mp3** - Level completion success (from game-01-cardmatch)
- **level-fail.mp3** - Level completion fail (from game-01-cardmatch)

These are expected to be in `/public/assets/sounds/` directory.
