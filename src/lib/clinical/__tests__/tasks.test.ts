import { describe, it, expect } from 'vitest';
import { targetAt, isComplete, TASK_TIMING } from '../tasks';
import { VOMS_TASKS } from '../voms';

describe('task timing coverage', () => {
  it('defines timing for every VOMS task', () => {
    for (const t of VOMS_TASKS) expect(TASK_TIMING[t.id]).toBeDefined();
  });

  it('gives every task a cue that stays on screen', () => {
    for (const t of VOMS_TASKS) expect(TASK_TIMING[t.id].cue.length).toBeGreaterThan(10);
  });
});

describe('smooth pursuit', () => {
  it('starts centred and sweeps to both extremes', () => {
    expect(targetAt('smooth_pursuit', 0).x).toBeCloseTo(0, 6);
    expect(targetAt('smooth_pursuit', 500).x).toBeCloseTo(1, 6);
    expect(targetAt('smooth_pursuit', 1500).x).toBeCloseTo(-1, 6);
  });

  it('never leaves the field', () => {
    for (let t = 0; t <= 8000; t += 37) {
      const s = targetAt('smooth_pursuit', t);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(1.0000001);
      expect(Math.abs(s.y)).toBeLessThanOrEqual(1.0000001);
    }
  });

  it('moves continuously rather than jumping', () => {
    // Pursuit must be pursued; a discontinuity would make it a saccade task.
    let prev = targetAt('smooth_pursuit', 0).x;
    for (let t = 16; t <= 8000; t += 16) {
      const x = targetAt('smooth_pursuit', t).x;
      expect(Math.abs(x - prev)).toBeLessThan(0.12);
      prev = x;
    }
  });
});

describe('saccades', () => {
  it('alternates between two fixed points, horizontally', () => {
    expect(targetAt('saccades_horizontal', 0).x).toBe(-1);
    expect(targetAt('saccades_horizontal', 600).x).toBe(1);
    expect(targetAt('saccades_horizontal', 1100).x).toBe(-1);
    expect(targetAt('saccades_horizontal', 0).y).toBe(0);
  });

  it('alternates on the vertical axis for the vertical task', () => {
    expect(targetAt('saccades_vertical', 0).y).toBe(-1);
    expect(targetAt('saccades_vertical', 600).y).toBe(1);
    expect(targetAt('saccades_vertical', 0).x).toBe(0);
  });

  it('advances the beat once per interval so a tick can follow it', () => {
    expect(targetAt('saccades_horizontal', 0).beat).toBe(0);
    expect(targetAt('saccades_horizontal', 499).beat).toBe(0);
    expect(targetAt('saccades_horizontal', 500).beat).toBe(1);
  });
});

describe('VOR and visual motion sensitivity', () => {
  it('holds the target still, because the head is what moves', () => {
    for (const id of ['vor_horizontal', 'vor_vertical', 'visual_motion_sensitivity'] as const) {
      for (let t = 0; t < 4000; t += 250) {
        const s = targetAt(id, t);
        expect(s.x).toBe(0);
        expect(s.y).toBe(0);
        expect(s.visible).toBe(true);
      }
    }
  });

  it('paces at 180 beats per minute', () => {
    // 180 bpm is one beat every 333.3ms; the protocol specifies this rate.
    expect(targetAt('vor_horizontal', 0).beat).toBe(0);
    expect(targetAt('vor_horizontal', 333).beat).toBe(0);
    expect(targetAt('vor_horizontal', 334).beat).toBe(1);
  });
});

describe('convergence', () => {
  it('shows nothing on screen, because the target is the person’s fingertip', () => {
    // Drawing a dot here would compete for the fixation being measured.
    expect(targetAt('convergence', 0).visible).toBe(false);
    expect(targetAt('convergence', 5000).visible).toBe(false);
  });

  it('never completes on a timer — only the person ends it', () => {
    expect(isComplete('convergence', 0)).toBe(false);
    expect(isComplete('convergence', 60_000)).toBe(false);
    expect(TASK_TIMING.convergence.selfPaced).toBe(true);
  });
});

describe('isComplete', () => {
  it('ends timed tasks exactly at their duration', () => {
    const d = TASK_TIMING.smooth_pursuit.durationMs;
    expect(isComplete('smooth_pursuit', d - 1)).toBe(false);
    expect(isComplete('smooth_pursuit', d)).toBe(true);
  });

  it('clamps progress to 1 and never past it', () => {
    expect(targetAt('smooth_pursuit', 999_999).progress).toBe(1);
  });
});
