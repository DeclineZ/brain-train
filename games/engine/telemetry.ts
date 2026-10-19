import type * as Phaser from 'phaser';
import type { EventName } from '@/lib/analytics/events';
import { newId, track } from '@/lib/analytics/track';

// In-game analytics helper. The only tracking API game code uses.
// Spec: docs/gametrackinghandoff.md sections 2.3 and 3.
// Every method swallows its own errors and never awaits, so a bug here can't
// break or slow a game.

export type TelemetryMode = 'normal' | 'tutorial';
export type InputMethod = 'touch' | 'mouse' | 'keyboard' | 'tilt';

export interface TelemetryOptions {
  gameId: string;
  /** Defaults to 'tutorial' when the scene key contains 'Tutorial'. */
  mode?: TelemetryMode;
}

type Props = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';

// Attempt ids already used by a levelStarted() call, per Phaser game. The
// registry id from the play page is used once; every later levelStarted()
// (scene restart, replay inside the scene) gets a fresh id.
const usedAttemptIds = new WeakMap<Phaser.Game, Set<string>>();

export class GameTelemetry {
  private readonly scene: Phaser.Scene;
  private readonly gameId: string;
  private readonly mode: TelemetryMode;
  private currentAttemptId: string | null = null;
  private startedAt = 0;
  private seq = 0;
  private active = false;
  private actions = 0;
  private errors = 0;
  private warned = false;
  private inputMethod: InputMethod | null = null;
  private readonly stimuli = new Map<string, number>();

  static forScene(scene: Phaser.Scene, options: TelemetryOptions): GameTelemetry {
    return new GameTelemetry(scene, options);
  }

  private constructor(scene: Phaser.Scene, options: TelemetryOptions) {
    this.scene = scene;
    this.gameId = options.gameId;
    let key = '';
    try {
      key = scene.sys.settings.key ?? '';
    } catch {
      // Ignore.
    }
    this.mode = options.mode ?? (key.includes('Tutorial') ? 'tutorial' : 'normal');
    this.listenForInput();
  }

  /** Current attempt id (registry id before the first levelStarted()). */
  get attemptId(): string | null {
    if (this.currentAttemptId) return this.currentAttemptId;
    try {
      const id = this.scene.registry.get('attemptId');
      return typeof id === 'string' ? id : null;
    } catch {
      return null;
    }
  }

  get isActive(): boolean {
    return this.active;
  }

  /** For inputs Phaser doesn't see (device tilt). The next tap or key press overrides it. */
  setInputMethod(method: InputMethod) {
    this.inputMethod = method;
  }

  /** The player can act now. Starts a new attempt (seq 0, t_ms 0). */
  levelStarted(props: Props = {}) {
    try {
      this.currentAttemptId = this.nextAttemptId();
      this.startedAt = performance.now();
      this.seq = 0;
      this.actions = 0;
      this.errors = 0;
      this.stimuli.clear();
      this.active = true;
      this.send('level_started', props);
    } catch {
      // Never break the game.
    }
  }

  /**
   * A player action or game decision. Counts toward level_ended's `actions`,
   * and toward `errors` when props.correct === false. input_ignored and the
   * pause events are logged but not counted.
   */
  action(event: EventName, props: Props = {}) {
    try {
      if (!this.ensureActive(event)) return;
      if (!UNCOUNTED_EVENTS.has(event)) {
        this.actions++;
        if (props.correct === false) this.errors++;
      }
      this.send(event, props);
    } catch {
      // Never break the game.
    }
  }

  /**
   * Call right before onGameOver. `actions`, `errors` and `duration_ms` default
   * to what the helper counted; pass them to override.
   */
  levelEnded(props: Props = {}) {
    try {
      if (!this.ensureActive('level_ended')) return;
      this.send('level_ended', {
        actions: this.actions,
        errors: this.errors,
        duration_ms: Math.round(performance.now() - this.startedAt),
        ...props,
      });
      this.active = false;
    } catch {
      // Never break the game.
    }
  }

  /** Mark when a stimulus became visible or interactive. */
  stimulus(id: string) {
    try {
      this.stimuli.set(id, performance.now());
    } catch {
      // Never break the game.
    }
  }

  /** ms since stimulus(id), or null if it was never marked. */
  rtFrom(id: string): number | null {
    try {
      const shownAt = this.stimuli.get(id);
      return shownAt === undefined ? null : Math.round(performance.now() - shownAt);
    } catch {
      return null;
    }
  }

  private nextAttemptId(): string {
    const game = this.scene.game;
    let used = usedAttemptIds.get(game);
    if (!used) {
      used = new Set();
      usedAttemptIds.set(game, used);
    }
    const registryId = this.scene.registry.get('attemptId');
    if (typeof registryId === 'string' && !used.has(registryId)) {
      used.add(registryId);
      return registryId;
    }
    const id = newId();
    used.add(id);
    // The play page listens for this and rotates its app-level attempt.
    this.scene.registry.set('attemptId', id);
    return id;
  }

  private ensureActive(event: string): boolean {
    if (this.active) return true;
    if (isDev && !this.warned) {
      this.warned = true;
      const reason = this.currentAttemptId ? 'after_level_ended' : 'before_level_started';
      console.warn(`[telemetry] ${this.gameId}: "${event}" ignored (${reason})`);
      track('telemetry_misuse', { event, reason, mode: this.mode }, {
        gameId: this.gameId,
        level: this.level(),
        attemptId: this.attemptId,
      });
    }
    return false;
  }

  private send(event: EventName, props: Props) {
    track(
      event,
      { mode: this.mode, input_method: this.inputMethod, muted: this.muted(), ...props },
      {
        gameId: this.gameId,
        level: this.level(),
        attemptId: this.currentAttemptId,
        seq: this.seq++,
        tMs: Math.round(performance.now() - this.startedAt),
      },
    );
  }

  private level(): number | null {
    const level = this.scene.registry.get('level');
    return typeof level === 'number' ? level : null;
  }

  private muted(): boolean | null {
    try {
      return this.scene.sound?.mute ?? null;
    } catch {
      return null;
    }
  }

  private listenForInput() {
    try {
      const input = this.scene.input;
      if (!input) return;
      const onPointer = (pointer: Phaser.Input.Pointer) => {
        this.inputMethod = pointer.wasTouch ? 'touch' : 'mouse';
      };
      const onKey = () => {
        this.inputMethod = 'keyboard';
      };
      input.on('pointerdown', onPointer);
      input.keyboard?.on('keydown', onKey);
      this.scene.events.once('shutdown', () => {
        input.off('pointerdown', onPointer);
        input.keyboard?.off('keydown', onKey);
      });
    } catch {
      // Ignore.
    }
  }
}

// Logged through action() but not player actions for the level_ended counts.
const UNCOUNTED_EVENTS: ReadonlySet<string> = new Set([
  'input_ignored',
  'level_paused',
  'level_resumed',
  'time_warning',
  'time_up',
  'tutorial_step_shown',
  'tutorial_step_done',
]);
