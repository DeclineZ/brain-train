import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_NAMES, GAME_EVENTS } from '@/lib/analytics/events';

test('Game 10 - Miner: all events are registered in GAME_EVENTS and EVENT_NAMES', () => {
  const expectedGame10Events = [
    'hook_dropped',
    'hook_missed',
    'object_grabbed',
    'object_cracked',
    'item_collected',
    'hazard_triggered',
    'dynamic_event_triggered',
    'objective_completed',
  ] as const;

  for (const event of expectedGame10Events) {
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

test('Game 10 - Miner: common events are registered', () => {
  const commonEvents = [
    'level_started',
    'level_ended',
    'time_warning',
    'time_up',
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
