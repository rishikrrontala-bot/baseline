import { NPC_ABNORMAL_CM } from './voms';
import type { ScreeningRecord } from '../history';

/*  Reading a screening against the person's own numbers.
 *
 *  Two thresholds decide whether convergence is a finding, and a result only
 *  has to fail one of them:
 *
 *    - the population cut point (NPC break at or beyond 5 cm), which is what
 *      you must use when there is no baseline; and
 *    - a change from that person's own baseline of 2 cm or more, which catches
 *      the person whose healthy near point was 2 cm and who now breaks at
 *      4.5 cm — inside the population range, and clearly worse for them.
 *
 *  The second is the reason the app asks for a baseline at all. It is also why
 *  a baseline recorded while already symptomatic is worse than none: it raises
 *  the person's "normal" to their injured state and hides the next injury.
 */

/** A change from one's own baseline at or beyond this is treated as real. */
export const NPC_BASELINE_SHIFT_CM = 2;

/*  Dead bands.
 *
 *  A webcam near point is not precise to the millimetre and a symptom score is
 *  not precise to the point. Without a dead band a 0.1 cm difference reads as
 *  "worse", which is the false precision this tool exists to refuse — and it
 *  is the reading a frightened person is most likely to over-interpret.
 *  Inside these margins the honest answer is "unchanged".
 */
export const NPC_NOISE_CM = 0.5;
export const PCSS_NOISE_POINTS = 3;

/** Symptom-score rise over one's own baseline treated as a real worsening. */
export const PCSS_BASELINE_RISE = 10;

export type Direction = 'better' | 'same' | 'worse' | 'unknown';

export interface MetricComparison {
  /** Present-day value, or null when this run did not measure it. */
  now: number | null;
  /** The same measure at baseline, or null when the baseline lacks it. */
  base: number | null;
  /** now - base, or null when either side is missing. */
  delta: number | null;
  direction: Direction;
  /** True only when a threshold was actually crossed. */
  flagged: boolean;
  /** Why it was or was not flagged, in words the person can check. */
  note: string;
}

export interface BaselineComparison {
  hasBaseline: boolean;
  baselineAt: number | null;
  /** Whole days between the baseline and this screening, or null. */
  daysSinceBaseline: number | null;
  npc: MetricComparison;
  symptoms: MetricComparison;
  provoked: MetricComparison;
}

function directionOf(delta: number | null, higherIsWorse: boolean, noise = 0): Direction {
  if (delta === null) return 'unknown';
  if (Math.abs(delta) <= noise) return 'same';
  const worse = higherIsWorse ? delta > 0 : delta < 0;
  return worse ? 'worse' : 'better';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Compare one screening against a baseline.
 *
 * `base` may be null: without a baseline every measure still gets read against
 * the population cut point, and the notes say so rather than implying a
 * personal comparison that was never possible.
 */
export function compareToBaseline(
  now: ScreeningRecord,
  base: ScreeningRecord | null,
): BaselineComparison {
  const days =
    base === null ? null : Math.max(0, Math.floor((now.at - base.at) / 86_400_000));

  // ---- Convergence ------------------------------------------------------
  const npcNow = now.npcCm;
  const npcBase = base?.npcCm ?? null;
  const npcDelta = npcNow !== null && npcBase !== null ? round1(npcNow - npcBase) : null;
  const overPopulation = npcNow !== null && npcNow >= NPC_ABNORMAL_CM;
  const overPersonal = npcDelta !== null && npcDelta >= NPC_BASELINE_SHIFT_CM;

  let npcNote: string;
  if (npcNow === null) {
    npcNote = 'Convergence was not measured in this screening.';
  } else if (npcBase === null) {
    npcNote = overPopulation
      ? `${npcNow} cm is at or beyond the ${NPC_ABNORMAL_CM} cm cut point. There is no baseline to compare it with.`
      : `${npcNow} cm is inside the usual range. There is no baseline to compare it with.`;
  } else if (overPersonal && overPopulation) {
    npcNote = `${npcNow} cm is ${npcDelta} cm further out than your baseline of ${npcBase} cm, and beyond the ${NPC_ABNORMAL_CM} cm cut point.`;
  } else if (overPersonal) {
    npcNote = `${npcNow} cm is inside the usual range, but ${npcDelta} cm further out than your own baseline of ${npcBase} cm.`;
  } else if (overPopulation) {
    npcNote = `${npcNow} cm is beyond the ${NPC_ABNORMAL_CM} cm cut point, though close to your baseline of ${npcBase} cm.`;
  } else {
    npcNote = `${npcNow} cm, against a baseline of ${npcBase} cm.`;
  }

  // ---- Symptom inventory ------------------------------------------------
  const symDelta = base ? now.pcssTotal - base.pcssTotal : null;
  const symFlagged = symDelta !== null && symDelta >= PCSS_BASELINE_RISE;

  // ---- Tasks that provoked ---------------------------------------------
  const provDelta = base ? now.provokedCount - base.provokedCount : null;

  return {
    hasBaseline: base !== null,
    baselineAt: base?.at ?? null,
    daysSinceBaseline: days,
    npc: {
      now: npcNow,
      base: npcBase,
      delta: npcDelta,
      direction: directionOf(npcDelta, true, NPC_NOISE_CM),
      flagged: overPopulation || overPersonal,
      note: npcNote,
    },
    symptoms: {
      now: now.pcssTotal,
      base: base?.pcssTotal ?? null,
      delta: symDelta,
      direction: directionOf(symDelta, true, PCSS_NOISE_POINTS),
      flagged: symFlagged,
      note:
        symDelta === null
          ? `Symptom score ${now.pcssTotal}. No baseline to compare it with.`
          : Math.abs(symDelta) <= PCSS_NOISE_POINTS
            ? `Symptom score ${now.pcssTotal}, effectively unchanged from your baseline of ${base!.pcssTotal}.`
            : `Symptom score ${now.pcssTotal}, ${Math.abs(symDelta)} ${symDelta > 0 ? 'higher' : 'lower'} than your baseline of ${base!.pcssTotal}.`,
    },
    provoked: {
      now: now.provokedCount,
      base: base?.provokedCount ?? null,
      delta: provDelta,
      direction: directionOf(provDelta, true),
      flagged: provDelta !== null && provDelta > 0,
      note:
        provDelta === null
          ? `${now.provokedCount} of seven tasks provoked symptoms. No baseline to compare with.`
          : `${now.provokedCount} of seven tasks provoked symptoms, against ${base!.provokedCount} at baseline.`,
    },
  };
}

/**
 * Is the trend across the screenings since baseline improving?
 *
 * Deliberately conservative: fewer than three screenings is not a trend, and
 * saying so is more useful than drawing a line through two dots.
 */
export function trendOf(records: readonly ScreeningRecord[]): {
  direction: Direction;
  note: string;
} {
  const runs = records.filter((r) => r.kind === 'screening');
  if (runs.length < 3) {
    return {
      direction: 'unknown',
      note: `${runs.length} screening${runs.length === 1 ? '' : 's'} since baseline. Three or more are needed before a direction means anything.`,
    };
  }
  const firstHalf = runs.slice(0, Math.floor(runs.length / 2));
  const lastHalf = runs.slice(Math.ceil(runs.length / 2));
  const mean = (xs: ScreeningRecord[]) => xs.reduce((a, r) => a + r.pcssTotal, 0) / xs.length;
  const shift = mean(lastHalf) - mean(firstHalf);
  if (Math.abs(shift) < 5) {
    return { direction: 'same', note: 'Symptom scores are holding roughly level.' };
  }
  return shift < 0
    ? { direction: 'better', note: 'Symptom scores are lower in your recent screenings than your earlier ones.' }
    : { direction: 'worse', note: 'Symptom scores are higher in your recent screenings than your earlier ones.' };
}
