import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_NAMES, GAME_EVENTS } from '@/lib/analytics/events';

test('Game 04 - Floating Ball Math: all events are registered in GAME_EVENTS and EVENT_NAMES', () => {
  const expectedGame04Events = [
    'lane_changed',
    'ball_collected',
    'bomb_hit',
    'equation_completed',
    'equation_overshot',
    'thief_appeared',
    'thief_decision',
  ] as const;

  for (const event of expectedGame04Events) {
    assert.ok(
      GAME_EVENTS.includes(event as any),
      `GAME_EVENTS should include ${event}`,
    );
    assert.ok(
      EVENT_NAMES.includes(event as any),
      `EVENT_NAMES should include ${event}`,
    );
  }
});

test('Game 04 - Floating Ball Math: common events are registered', () => {
  const commonEvents = [
    'level_started',
    'level_ended',
    'time_warning',
    'level_resumed',
    'tutorial_step_shown',
    'tutorial_step_done',
  ] as const;

  for (const event of commonEvents) {
    assert.ok(
      EVENT_NAMES.includes(event as any),
      `EVENT_NAMES should include common event ${event}`,
    );
  }
});
