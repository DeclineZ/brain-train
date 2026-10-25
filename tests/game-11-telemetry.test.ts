import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_NAMES, GAME_EVENTS } from '@/lib/analytics/events';

test('Game 11 - Pipe Patch: all events are registered in GAME_EVENTS and EVENT_NAMES', () => {
  const expectedGame11Events = [
    'session_start',
    'level_start',
    'tray_piece_selected',
    'drag_start',
    'drag_end',
    'piece_placed',
    'piece_swapped',
    'piece_rejected',
    'piece_removed',
    'obstacle_interaction_attempt',
    'board_state_eval',
    'color_path_check',
    'one_way_gate_path_fail',
    'undo_pressed',
    'reset_level_pressed',
    'level_complete',
    'session_end',
    'tray_page_changed',
  ] as const;

  for (const event of expectedGame11Events) {
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

test('Game 11 - Pipe Patch: common events are registered', () => {
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
