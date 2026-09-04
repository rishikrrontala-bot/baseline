import type { Measure } from './oculomotor';
import type { VomsTaskId } from './voms';

/*  Reporting the objective side of a task.
 *
 *  These numbers sit beside the symptom ratings, never instead of them. VOMS
 *  is a symptom-provocation instrument and that is what it is validated as;
 *  a webcam gain is supporting evidence, and the interface has to keep saying
 *  so. Where a measure could not be taken, the report says which and why
 *  rather than leaving a blank that reads as normal.
 */

export type ObjectiveKind = 'pursuit' | 'saccade' | 'vor';

export const KIND_LABEL: Record<ObjectiveKind, string> = {
  pursuit: 'pursuit gain',
  saccade: 'tracking accuracy',
  vor: 'reflex gain',
};

export interface TaskObjective {
  taskId: VomsTaskId;
  kind: ObjectiveKind;
  gain: Measure;
  /** Pursuit only; the reflex has no meaningful phase lag at these speeds. */
  lag: Measure | null;
}

/** Healthy smooth pursuit and VOR both sit near unity. */
export const GAIN_LOW = 0.7;
export const GAIN_HIGH = 1.3;

export interface ObjectiveSummary {
  measured: number;
  attempted: number;
  /** Tasks whose gain fell outside the usual band. */
  outOfBand: VomsTaskId[];
  headline: string;
}

export function summariseObjectives(objectives: readonly TaskObjective[]): ObjectiveSummary {
  const attempted = objectives.length;
  const withValue = objectives.filter((o) => o.gain.value !== null);
  const outOfBand = withValue
    .filter((o) => o.gain.value! < GAIN_LOW || o.gain.value! > GAIN_HIGH)
    .map((o) => o.taskId);

  let headline: string;
  if (attempted === 0) {
    headline = 'No eye movement was recorded for this screening.';
  } else if (withValue.length === 0) {
    // The distinction that matters: nothing measurable is not "all normal".
    headline = `The camera ran for ${attempted} task${attempted === 1 ? '' : 's'} but none produced a usable measurement. That is not the same as finding nothing wrong.`;
  } else if (outOfBand.length === 0) {
    headline = `${withValue.length} of ${attempted} tasks gave a usable gain, and all sat inside the usual range.`;
  } else {
    headline = `${outOfBand.length} of the ${withValue.length} measured task${withValue.length === 1 ? '' : 's'} fell outside the usual range of ${GAIN_LOW}–${GAIN_HIGH}.`;
  }

  return { measured: withValue.length, attempted, outOfBand, headline };
}

export function gainVerdict(m: Measure): 'unmeasured' | 'in_band' | 'out_of_band' {
  if (m.value === null) return 'unmeasured';
  return m.value < GAIN_LOW || m.value > GAIN_HIGH ? 'out_of_band' : 'in_band';
}
