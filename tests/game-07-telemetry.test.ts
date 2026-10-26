import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_NAMES, GAME_EVENTS } from '@/lib/analytics/events';

test('Game 07 - Pink Cup: all events are registered in GAME_EVENTS and EVENT_NAMES', () => {
  const expectedGame07Events = [
    'cup_moved',
    'numbers_revealed',
    'numbers_hidden',
    'target_reached',
    'probe_shown',
    'probe_answered',
  ] as const;

  for (const event of expectedGame07Events) {
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

test('Game 07 - Pink Cup: common events are registered', () => {
  const commonEvents = [
    'level_started',
    'level_ended',
    'level_paused',
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
