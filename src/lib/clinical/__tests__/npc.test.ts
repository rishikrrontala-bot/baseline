import { describe, it, expect } from 'vitest';
import {
  estimateNpc,
  averageNpc,
  mmPerPixel,
  IRIS_DIAMETER_MM,
  EYE_ROTATION_RADIUS_MM,
  type ConvergenceSample,
  type NpcEstimate,
} from '../npc';

/**
 * Forward model: given a true fixation distance, synthesise the iris
 * landmarks a camera would see. If estimateNpc is correct it must invert
 * this and recover the distance we started from.
 */
function synthesise(opts: {
  distanceCm: number | null; // null = far fixation, axes parallel
  ipdMm?: number;
  irisPx?: number;
  offsetX?: number; // rigid head translation, pixels
  offsetY?: number;
}): ConvergenceSample {
  const ipdMm = opts.ipdMm ?? 63;
  const irisPx = opts.irisPx ?? 30;
  const mmPerPx = IRIS_DIAMETER_MM / irisPx;
  const ox = opts.offsetX ?? 0;
  const oy = opts.offsetY ?? 0;

  let ipdNowMm = ipdMm;
  if (opts.distanceCm !== null) {
    const theta = Math.atan(ipdMm / 2 / (opts.distanceCm * 10));
    const dPerEye = EYE_ROTATION_RADIUS_MM * Math.sin(theta);
    ipdNowMm = ipdMm - 2 * dPerEye;
  }

  const halfPx = ipdNowMm / mmPerPx / 2;
  return {
    left: { irisCentre: { x: 500 - halfPx + ox, y: 300 + oy }, irisDiameterPx: irisPx },
    right: { irisCentre: { x: 500 + halfPx + ox, y: 300 + oy }, irisDiameterPx: irisPx },
  };
}

describe('mmPerPixel', () => {
  it('derives scale from the iris without any camera intrinsics', () => {
    const s = synthesise({ distanceCm: null, irisPx: 30 });
    expect(mmPerPixel(s)).toBeCloseTo(IRIS_DIAMETER_MM / 30, 6);
  });

  it('returns 0 rather than Infinity when the iris has no width', () => {
    const s = synthesise({ distanceCm: null });
    s.left.irisDiameterPx = 0;
    s.right.irisDiameterPx = 0;
    expect(mmPerPixel(s)).toBe(0);
  });
});

describe('estimateNpc recovers a known distance', () => {
  const far = synthesise({ distanceCm: null });

  it.each([5, 8, 10, 15, 25, 40])('recovers %i cm', (cm) => {
    const est = estimateNpc(far, synthesise({ distanceCm: cm }));
    expect(est.quality).toBe('ok');
    expect(est.cm).not.toBeNull();
    expect(est.cm as number).toBeCloseTo(cm, 4);
  });

  it('self-calibrates IPD rather than assuming a population average', () => {
    // A person with an unusually wide IPD must still be measured correctly.
    const wideFar = synthesise({ distanceCm: null, ipdMm: 72 });
    const wideNear = synthesise({ distanceCm: 9, ipdMm: 72 });
    const est = estimateNpc(wideFar, wideNear);
    expect(est.ipdMm).toBeCloseTo(72, 3);
    expect(est.cm as number).toBeCloseTo(9, 4);
  });

  it('is unaffected by the camera being closer, since the iris rescales', () => {
    // Same fixation distance, but the face fills more of the frame.
    const nearCam = estimateNpc(
      synthesise({ distanceCm: null, irisPx: 55 }),
      synthesise({ distanceCm: 12, irisPx: 55 }),
    );
    expect(nearCam.cm as number).toBeCloseTo(12, 4);
  });

  it('cancels rigid head translation between the two samples', () => {
    // The head drifting sideways must not read as convergence.
    const shifted = synthesise({ distanceCm: 10, offsetX: 90, offsetY: -35 });
    const est = estimateNpc(far, shifted);
    expect(est.cm as number).toBeCloseTo(10, 4);
  });

  it('converges more for nearer targets', () => {
    const near = estimateNpc(far, synthesise({ distanceCm: 6 }));
    const distant = estimateNpc(far, synthesise({ distanceCm: 30 }));
    expect(near.convergenceDeg).toBeGreaterThan(distant.convergenceDeg);
  });
});

describe('estimateNpc refuses to guess', () => {
  const far = synthesise({ distanceCm: null });

  it('reports beyond_range when the eyes have not converged at all', () => {
    const est = estimateNpc(far, synthesise({ distanceCm: null }));
    expect(est.quality).toBe('beyond_range');
    expect(est.cm).toBeNull();
  });

  it('reports beyond_range rather than a huge number past the resolvable limit', () => {
    const est = estimateNpc(far, synthesise({ distanceCm: 400 }));
    expect(est.cm).toBeNull();
    expect(est.quality).toBe('beyond_range');
  });

  it('reports insufficient_signal when the iris is not measurable', () => {
    const bad = synthesise({ distanceCm: 10 });
    bad.left.irisDiameterPx = 0;
    bad.right.irisDiameterPx = 0;
    const est = estimateNpc(far, bad);
    expect(est.quality).toBe('insufficient_signal');
    expect(est.cm).toBeNull();
  });

  it('reports implausible when narrowing exceeds anatomical range', () => {
    const impossible = synthesise({ distanceCm: null });
    // Irises collapsed almost on top of each other — not physically reachable.
    impossible.left.irisCentre.x = 499;
    impossible.right.irisCentre.x = 501;
    const est = estimateNpc(far, impossible);
    expect(est.cm).toBeNull();
    expect(est.quality).toBe('implausible');
  });
});

describe('averageNpc', () => {
  const ok = (cm: number): NpcEstimate => ({
    cm,
    convergenceDeg: 5,
    ipdMm: 63,
    mmPerPx: 0.39,
    quality: 'ok',
  });
  const failed: NpcEstimate = {
    cm: null,
    convergenceDeg: 0,
    ipdMm: 63,
    mmPerPx: 0.39,
    quality: 'beyond_range',
  };

  it('averages usable trials only', () => {
    const r = averageNpc([ok(6), ok(8), failed]);
    expect(r.cm).toBeCloseTo(7, 6);
    expect(r.usableTrials).toBe(2);
  });

  it('drops failed trials instead of scoring them as zero', () => {
    // Counting a failure as 0 cm would drag the mean toward "severely
    // abnormal" precisely when the measurement did not work.
    const r = averageNpc([ok(9), failed, failed]);
    expect(r.cm).toBeCloseTo(9, 6);
    expect(r.usableTrials).toBe(1);
  });

  it('returns null with zero usable trials rather than NaN', () => {
    const r = averageNpc([failed, failed]);
    expect(r.cm).toBeNull();
    expect(r.usableTrials).toBe(0);
  });
});
