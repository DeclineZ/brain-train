import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_NAMES, GAME_EVENTS } from '@/lib/analytics/events';

test('Game 05 - Worm Train: all events are registered in GAME_EVENTS and EVENT_NAMES', () => {
  const expectedGame05Events = [
    'junction_switched',
    'worm_spawned',
    'worm_arrived',
    'trap_hit',
    'mistake_registered',
  ] as const;

  for (const event of expectedGame05Events) {
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

test('Game 05 - Worm Train: common events are registered', () => {
  const commonEvents = [
    'level_started',
    'level_ended',
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
