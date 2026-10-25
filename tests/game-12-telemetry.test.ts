import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_NAMES, GAME_EVENTS } from '@/lib/analytics/events';

test('Game 12 - Grid Hunter: all events are registered in GAME_EVENTS and EVENT_NAMES', () => {
  const expectedGame12Events = [
    'target_selected',
    'trap_spawned',
    'trap_alert_shown',
    'trap_expired',
    'phase_transition',
    'phase_modal_closed',
    'grid_shuffled',
    'combo_milestone',
    'trap_hit',
  ] as const;

  for (const event of expectedGame12Events) {
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

test('Game 12 - Grid Hunter: common events are registered', () => {
  const commonEvents = [
    'level_started',
    'level_ended',
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
