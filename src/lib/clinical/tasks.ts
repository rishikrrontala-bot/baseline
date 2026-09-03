import type { VomsTaskId } from './voms';

/**
 * Stimulus timing for the seven tasks.
 *
 * Pure functions of elapsed time so the motion can be unit-tested without a
 * browser: given a task and how long it has been running, return where the
 * target is and what the person should be doing. The renderer only draws
 * what this returns.
 *
 * Timings follow the VOMS protocol as published (Mucha et al. 2014):
 * smooth pursuit 2 repetitions each direction; saccades and VOR 10
 * repetitions; VOR paced at 180 beats per minute. Where the protocol
 * specifies a physical distance the browser cannot know (targets 3 feet
 * apart, held 3 feet from the face) the amplitude is expressed as a
 * fraction of the stimulus field instead, and that substitution is one of
 * the reasons this is a screening aid and not the clinical instrument.
 */

export interface TargetState {
  /** Target position in normalised field coordinates, -1..1 on each axis. */
  x: number;
  y: number;
  /** True when the target should be visible at all. */
  visible: boolean;
  /** 0..1 through the task. */
  progress: number;
  /** Beat index for paced tasks, so a metronome can fire on change. */
  beat: number;
}

export interface TaskTiming {
  id: VomsTaskId;
  durationMs: number;
  /** What the person does; shown while the task runs, never from memory. */
  cue: string;
  /** Whether the person, not the screen, provides the movement. */
  selfPaced: boolean;
}

const PURSUIT_HZ = 0.5; // one full left-right-left cycle every two seconds
const SACCADE_INTERVAL_MS = 500;
const SACCADE_REPS = 10;
const VOR_BPM = 180;
const VOR_REPS = 10;

export const TASK_TIMING: Record<VomsTaskId, TaskTiming> = {
  smooth_pursuit: {
    id: 'smooth_pursuit',
    durationMs: 8000,
    cue: 'Follow the dot with your eyes. Keep your head still.',
    selfPaced: false,
  },
  saccades_horizontal: {
    id: 'saccades_horizontal',
    durationMs: SACCADE_INTERVAL_MS * SACCADE_REPS * 2,
    cue: 'Look straight at whichever dot is lit. Head still.',
    selfPaced: false,
  },
  saccades_vertical: {
    id: 'saccades_vertical',
    durationMs: SACCADE_INTERVAL_MS * SACCADE_REPS * 2,
    cue: 'Look straight at whichever dot is lit. Head still.',
    selfPaced: false,
  },
  convergence: {
    id: 'convergence',
    durationMs: 0,
    cue: 'Focus on your fingertip and bring it slowly toward your nose. Press space the moment it doubles.',
    selfPaced: true,
  },
  vor_horizontal: {
    id: 'vor_horizontal',
    durationMs: Math.round((60000 / VOR_BPM) * VOR_REPS * 2),
    cue: 'Stay locked on the dot and turn your head side to side with the beat.',
    selfPaced: false,
  },
  vor_vertical: {
    id: 'vor_vertical',
    durationMs: Math.round((60000 / VOR_BPM) * VOR_REPS * 2),
    cue: 'Stay locked on the dot and nod your head with the beat.',
    selfPaced: false,
  },
  visual_motion_sensitivity: {
    id: 'visual_motion_sensitivity',
    durationMs: Math.round((60000 / VOR_BPM) * VOR_REPS * 2),
    cue: 'Turn your head and shoulders together, eyes fixed on the dot.',
    selfPaced: false,
  },
};

/** Square wave that alternates every `intervalMs`, returning -1 or 1. */
function alternate(elapsedMs: number, intervalMs: number): number {
  return Math.floor(elapsedMs / intervalMs) % 2 === 0 ? -1 : 1;
}

export function targetAt(id: VomsTaskId, elapsedMs: number): TargetState {
  const timing = TASK_TIMING[id];
  const t = Math.max(0, elapsedMs);
  const progress =
    timing.durationMs > 0 ? Math.min(1, t / timing.durationMs) : 0;

  switch (id) {
    case 'smooth_pursuit':
      return {
        x: Math.sin((t / 1000) * PURSUIT_HZ * 2 * Math.PI),
        y: 0,
        visible: true,
        progress,
        beat: 0,
      };

    case 'saccades_horizontal':
      return {
        x: alternate(t, SACCADE_INTERVAL_MS),
        y: 0,
        visible: true,
        progress,
        beat: Math.floor(t / SACCADE_INTERVAL_MS),
      };

    case 'saccades_vertical':
      return {
        x: 0,
        y: alternate(t, SACCADE_INTERVAL_MS),
        visible: true,
        progress,
        beat: Math.floor(t / SACCADE_INTERVAL_MS),
      };

    case 'convergence':
      // The target is the person's own fingertip, so the screen shows nothing
      // to look at — drawing a dot here would compete for the fixation the
      // measurement depends on.
      return { x: 0, y: 0, visible: false, progress: 0, beat: 0 };

    case 'vor_horizontal':
    case 'vor_vertical':
    case 'visual_motion_sensitivity': {
      // The head moves, not the target: it stays dead centre and the beat
      // paces the person.
      const beatMs = 60000 / VOR_BPM;
      return { x: 0, y: 0, visible: true, progress, beat: Math.floor(t / beatMs) };
    }
  }
}

export function isComplete(id: VomsTaskId, elapsedMs: number): boolean {
  const timing = TASK_TIMING[id];
  if (timing.durationMs <= 0) return false; // self-paced: the person ends it
  return elapsedMs >= timing.durationMs;
}
