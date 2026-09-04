import { describe, it, expect } from 'vitest';
import {
  pursuitGain, phaseLagMs, vorGain, fitLine, usableFrames,
  MIN_SAMPLES, type OculoSample,
} from '../oculomotor';

/** A pursuit trial: sinusoidal target, eye following at `gain` with `lagMs`. */
function trial({
  n = 120, dt = 16.7, gain = 1, lagMs = 0, blinkEvery = 0, noise = 0,
}: Partial<{ n: number; dt: number; gain: number; lagMs: number; blinkEvery: number; noise: number }> = {}): OculoSample[] {
  const period = 2000;
  const out: OculoSample[] = [];
  // Deterministic pseudo-noise: a seeded wobble, so the test cannot flake.
  const wob = (i: number) => noise * Math.sin(i * 12.9898) ;
  for (let i = 0; i < n; i++) {
    const t = i * dt;
    const target = Math.sin((2 * Math.PI * t) / period);
    const eye = gain * Math.sin((2 * Math.PI * (t - lagMs)) / period) + wob(i);
    const blinking = blinkEvery > 0 && i % blinkEvery === 0;
    out.push({
      t,
      target: { x: target, y: 0 },
      gaze: { horizontal: eye, vertical: 0 },
      head: { yaw: 0, pitch: 0 },
      blink: { left: blinking ? 0.9 : 0.02, right: blinking ? 0.9 : 0.02 },
    });
  }
  return out;
}

describe('fitLine', () => {
  it('recovers a known slope', () => {
    const xs = [0, 1, 2, 3, 4];
    const fit = fitLine(xs, xs.map((x) => 3 * x + 1))!;
    expect(fit.slope).toBeCloseTo(3, 6);
    expect(Math.abs(fit.r)).toBeCloseTo(1, 6);
  });

  it('refuses when x never varies, rather than dividing by nothing', () => {
    expect(fitLine([2, 2, 2, 2], [1, 2, 3, 4])).toBeNull();
  });
});

describe('blink rejection', () => {
  it('drops frames where an eye was closing', () => {
    const s = trial({ n: 40, blinkEvery: 4 });
    expect(usableFrames(s).length).toBe(30);
  });
});

describe('pursuit gain', () => {
  it('recovers a gain of 1.0 from perfect tracking', () => {
    const m = pursuitGain(trial({ gain: 1 }));
    expect(m.value).toBeCloseTo(1, 1);
    expect(m.fit).toBeGreaterThan(0.99);
  });

  it('recovers a reduced gain, which is the concussion finding', () => {
    const m = pursuitGain(trial({ gain: 0.6 }));
    expect(m.value).toBeCloseTo(0.6, 1);
  });

  it('refuses to answer from too few frames', () => {
    const m = pursuitGain(trial({ n: 10 }));
    expect(m.value).toBeNull();
    expect(m.note).toMatch(new RegExp(`${MIN_SAMPLES}`));
  });

  it('refuses when the eye was not tracking the target at all', () => {
    // Eye wandering independently of the target: no gain should be reported.
    const s = trial().map((x, i) => ({ ...x, gaze: { horizontal: Math.sin(i * 7.3), vertical: 0 } }));
    const m = pursuitGain(s);
    expect(m.value).toBeNull();
    expect(m.note).toMatch(/did not track|not track/i);
  });

  it('refuses when the target never moved', () => {
    const s = trial().map((x) => ({ ...x, target: { x: 0, y: 0 } }));
    expect(pursuitGain(s).value).toBeNull();
  });

  it('reports usable frame count even when it declines to answer', () => {
    const m = pursuitGain(trial({ n: 8 }));
    expect(m.usable).toBe(8);
  });
});

describe('phase lag', () => {
  it('finds no lag when the eye is in step', () => {
    const m = phaseLagMs(trial({ lagMs: 0 }));
    expect(m.value).toBeLessThanOrEqual(20);
  });

  it('recovers a known lag', () => {
    const m = phaseLagMs(trial({ lagMs: 100 }));
    expect(m.value).toBeGreaterThan(60);
    expect(m.value).toBeLessThan(150);
  });

  it('never reports a lag longer than it searched', () => {
    const m = phaseLagMs(trial({ lagMs: 100 }), 'horizontal', 200);
    expect(m.value === null || m.value <= 200).toBe(true);
  });
});

describe('VOR gain', () => {
  const vorTrial = (gain: number, headAmpDeg = 15): OculoSample[] =>
    Array.from({ length: 120 }, (_, i) => {
      const t = i * 16.7;
      const yaw = headAmpDeg * Math.sin((2 * Math.PI * t) / 1500);
      return {
        t, target: { x: 0, y: 0 },
        // Eyes counter-rotate: opposite sign to the head.
        gaze: { horizontal: -gain * (yaw / headAmpDeg), vertical: 0 },
        head: { yaw, pitch: 0 },
        blink: { left: 0, right: 0 },
      };
    });

  it('recovers counter-rotation and says the eyes went the right way', () => {
    const m = vorGain(vorTrial(1));
    expect(m.value).toBeGreaterThan(0);
    expect(m.note).toMatch(/counter-rotated/);
  });

  it('refuses when the head barely moved', () => {
    const m = vorGain(vorTrial(1, 2));
    expect(m.value).toBeNull();
    expect(m.note).toMatch(/too little/);
  });

  it('says so when the eyes moved with the head instead of against it', () => {
    const m = vorGain(vorTrial(-1));
    expect(m.note).toMatch(/with the head/);
  });
});

describe('every measure explains itself', () => {
  it('always carries a note, whether or not it produced a number', () => {
    for (const m of [
      pursuitGain(trial()), pursuitGain(trial({ n: 3 })),
      phaseLagMs(trial()), vorGain(trial()),
    ]) {
      expect(m.note.length).toBeGreaterThan(10);
    }
  });
});
