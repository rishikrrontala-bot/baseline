/*  Objective measures from the samples the camera was already producing.
 *
 *  Six of the seven tasks scored on nothing but self-report, while the tracker
 *  ran the whole time and its output was discarded. These are the numbers that
 *  were sitting in it.
 *
 *  What each one means, and why it is worth having:
 *
 *  - Smooth pursuit gain. A healthy eye following a slow target tracks it at
 *    close to the target's own velocity — a gain near 1.0. After a concussion
 *    the gain falls and the eye falls behind, then jumps to catch up. Gain is
 *    the slope of eye position regressed on target position.
 *  - Phase lag. How far behind the target the eye runs, found by shifting the
 *    two series against each other and taking the offset that fits best.
 *  - VOR gain. During vestibulo-ocular testing the head turns while the eyes
 *    hold a fixed point, so the eyes must counter-rotate at the same speed in
 *    the opposite direction. A healthy gain is near 1.0.
 *
 *  Every function here refuses to answer rather than guess. Too few samples,
 *  too much blinking, a target that barely moved, or a fit too poor to mean
 *  anything all return a null value with the reason attached. A number
 *  produced from six usable frames is worse than no number, because it will
 *  be believed.
 */

export interface OculoSample {
  /** Milliseconds since the task began. */
  t: number;
  /** Target position, normalised -1..1 per axis. */
  target: { x: number; y: number };
  /** Gaze offsets from the model's blendshapes, roughly -1..1. */
  gaze: { horizontal: number; vertical: number };
  /** Head rotation in degrees. */
  head: { yaw: number; pitch: number };
  /** 0..1 per eye. */
  blink: { left: number; right: number };
}

/** Above this, an eye is closing and its gaze reading means nothing. */
export const BLINK_REJECT = 0.5;
/** Fewer usable frames than this and no measure is reported. */
export const MIN_SAMPLES = 20;
/** A fit looser than this is reported as unusable rather than as a value. */
export const MIN_FIT_R = 0.5;

export interface Measure {
  /** The value, or null when it could not be measured honestly. */
  value: number | null;
  /** Goodness of fit, 0..1, when a value was produced. */
  fit: number | null;
  /** Usable frames after blink rejection. */
  usable: number;
  /** Always populated: why there is a number, or why there is not. */
  note: string;
}

function unusable(usable: number, note: string): Measure {
  return { value: null, fit: null, usable, note };
}

/** Drop frames where either eye was closing. */
export function usableFrames(samples: readonly OculoSample[]): OculoSample[] {
  return samples.filter((s) => s.blink.left < BLINK_REJECT && s.blink.right < BLINK_REJECT);
}

/** Least-squares slope of y on x, plus Pearson r. Null when x barely varies. */
export function fitLine(
  xs: readonly number[],
  ys: readonly number[],
): { slope: number; r: number } | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  // A target that never moved cannot tell you how well the eye followed it.
  if (sxx < 1e-9 || syy < 1e-9) return null;
  return { slope: sxy / sxx, r: sxy / Math.sqrt(sxx * syy) };
}

/**
 * Smooth pursuit gain: eye displacement per unit of target displacement.
 *
 * `axis` picks which way the target actually moves for the task, because
 * regressing on the stationary axis would divide by noise.
 */
export function pursuitGain(
  samples: readonly OculoSample[],
  axis: 'horizontal' | 'vertical' = 'horizontal',
): Measure {
  const usable = usableFrames(samples);
  if (usable.length < MIN_SAMPLES) {
    return unusable(usable.length, `Only ${usable.length} usable frames; at least ${MIN_SAMPLES} are needed.`);
  }
  const xs = usable.map((s) => (axis === 'horizontal' ? s.target.x : s.target.y));
  const ys = usable.map((s) => (axis === 'horizontal' ? s.gaze.horizontal : s.gaze.vertical));
  const fit = fitLine(xs, ys);
  if (!fit) return unusable(usable.length, 'The target did not move enough to measure tracking against.');

  const gain = Math.abs(fit.slope);
  const r = Math.abs(fit.r);
  if (r < MIN_FIT_R) {
    return {
      value: null, fit: r, usable: usable.length,
      note: `The eye did not track the target closely enough to give a gain (fit ${r.toFixed(2)}). This can mean poor tracking, or simply that the camera lost the eyes.`,
    };
  }
  return {
    value: gain, fit: r, usable: usable.length,
    note: `Gain ${gain.toFixed(2)} across ${usable.length} frames (fit ${r.toFixed(2)}). A healthy eye tracks a slow target at close to 1.0.`,
  };
}

/**
 * Phase lag in milliseconds: the shift that best aligns eye with target.
 *
 * Searched only up to `maxLagMs`, because a "best" alignment half a cycle away
 * is the same waveform lining up again, not a lag.
 */
export function phaseLagMs(
  samples: readonly OculoSample[],
  axis: 'horizontal' | 'vertical' = 'horizontal',
  maxLagMs = 400,
): Measure {
  const usable = usableFrames(samples);
  if (usable.length < MIN_SAMPLES) {
    return unusable(usable.length, `Only ${usable.length} usable frames; at least ${MIN_SAMPLES} are needed.`);
  }
  const dt = (usable[usable.length - 1].t - usable[0].t) / (usable.length - 1);
  if (!Number.isFinite(dt) || dt <= 0) return unusable(usable.length, 'Frame times were not usable.');

  const tgt = usable.map((s) => (axis === 'horizontal' ? s.target.x : s.target.y));
  const eye = usable.map((s) => (axis === 'horizontal' ? s.gaze.horizontal : s.gaze.vertical));
  const maxShift = Math.min(Math.floor(maxLagMs / dt), Math.floor(usable.length / 3));

  let bestShift = 0, bestR = -Infinity;
  for (let k = 0; k <= maxShift; k++) {
    const fit = fitLine(tgt.slice(0, tgt.length - k), eye.slice(k));
    if (fit && Math.abs(fit.r) > bestR) { bestR = Math.abs(fit.r); bestShift = k; }
  }
  if (bestR < MIN_FIT_R) {
    return { value: null, fit: bestR, usable: usable.length, note: 'No shift aligned the eye with the target well enough to call it a lag.' };
  }
  const lag = Math.round(bestShift * dt);
  return {
    value: lag, fit: bestR, usable: usable.length,
    note: `The eye ran about ${lag} ms behind the target (fit ${bestR.toFixed(2)}).`,
  };
}

/**
 * VOR gain: eye counter-rotation per degree of head rotation.
 *
 * The eyes must move opposite to the head to hold a fixed point, so the raw
 * slope is negative and its magnitude is the gain.
 */
export function vorGain(
  samples: readonly OculoSample[],
  axis: 'horizontal' | 'vertical' = 'horizontal',
  minHeadRangeDeg = 6,
): Measure {
  const usable = usableFrames(samples);
  if (usable.length < MIN_SAMPLES) {
    return unusable(usable.length, `Only ${usable.length} usable frames; at least ${MIN_SAMPLES} are needed.`);
  }
  const head = usable.map((s) => (axis === 'horizontal' ? s.head.yaw : s.head.pitch));
  const range = Math.max(...head) - Math.min(...head);
  if (range < minHeadRangeDeg) {
    return unusable(usable.length, `The head moved only ${range.toFixed(1)}°, too little to measure the reflex against.`);
  }
  const eye = usable.map((s) => (axis === 'horizontal' ? s.gaze.horizontal : s.gaze.vertical));
  const fit = fitLine(head, eye);
  if (!fit) return unusable(usable.length, 'Head movement was not usable.');

  const r = Math.abs(fit.r);
  if (r < MIN_FIT_R) {
    return { value: null, fit: r, usable: usable.length, note: `Eye and head movement were not related closely enough to give a gain (fit ${r.toFixed(2)}).` };
  }
  // Report magnitude; the sign only confirms the eyes went the right way.
  const gain = Math.abs(fit.slope);
  const counterRotating = fit.slope < 0;
  return {
    value: gain, fit: r, usable: usable.length,
    note: counterRotating
      ? `Gain ${gain.toFixed(2)} across ${range.toFixed(0)}° of head movement. The eyes counter-rotated as they should.`
      : `Gain ${gain.toFixed(2)}, but the eyes moved with the head rather than against it, which usually means the head was still and the eyes were following something else.`,
  };
}
