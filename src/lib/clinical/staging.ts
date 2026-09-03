import type { VomsAssessment } from './voms';
import type { PcssScore } from './pcss';

/**
 * Return-to-activity staging, following the Amsterdam 2022 consensus
 * (Patricios et al., Br J Sports Med 2023;57:695-711).
 *
 * Two things about that consensus drive this module, and both are departures
 * from the older "rest until symptom-free" advice most people still repeat:
 *
 *  1. Relative rest for 24-48 hours, then *gradual* reintroduction of light
 *     activity, is recommended — prolonged rest is not.
 *  2. The early stages may be attempted with mild, brief symptom
 *     exacerbation (a rise of no more than 2 points on a 10-point scale,
 *     settling within an hour). Symptom-free is not the gate for stages 1-3.
 *
 * This module recommends a stage to *attempt*. It never clears anyone.
 * Stages requiring contact are gated behind a clinician by the consensus
 * itself, and this app has no way to perform that assessment.
 */

export type StageGate = 'self' | 'clinician';

export interface Stage {
  n: number;
  label: string;
  detail: string;
  gate: StageGate;
}

/** Return to sport: six stages, contact gated behind medical clearance. */
export const RTS_STAGES: readonly Stage[] = [
  { n: 1, label: 'Symptom-limited activity', detail: 'Daily activities that do not provoke symptoms more than mildly.', gate: 'self' },
  { n: 2, label: 'Light aerobic exercise', detail: 'Walking or stationary cycling at a gentle pace. No resistance training.', gate: 'self' },
  { n: 3, label: 'Sport-specific exercise', detail: 'Running or skating drills. No activity with any risk of head impact.', gate: 'self' },
  { n: 4, label: 'Non-contact training drills', detail: 'Harder training drills; resistance training may be reintroduced.', gate: 'self' },
  { n: 5, label: 'Full-contact practice', detail: 'Only after a clinician has assessed you and cleared you in person.', gate: 'clinician' },
  { n: 6, label: 'Return to sport', detail: 'Normal competitive play, following clinician clearance.', gate: 'clinician' },
] as const;

/** Return to learn: the half that gets neglected, and the one most people need. */
export const RTL_STAGES: readonly Stage[] = [
  { n: 1, label: 'Daily activities at home', detail: 'Reading, screens and chores in short blocks that do not flare symptoms.', gate: 'self' },
  { n: 2, label: 'School work at home', detail: 'Homework in 20-30 minute blocks with real breaks between them.', gate: 'self' },
  { n: 3, label: 'Part-time at school', detail: 'Partial days, or full days with scheduled breaks and reduced load.', gate: 'self' },
  { n: 4, label: 'Full days at school', detail: 'Full timetable, with accommodations still in place if needed.', gate: 'self' },
  { n: 5, label: 'Full school, no accommodations', detail: 'Normal academic load, catching up on missed work.', gate: 'self' },
] as const;

/** Symptoms that mean stop and seek urgent care, not pacing. */
export const RED_FLAGS: readonly string[] = [
  'Neck pain or tenderness',
  'Double vision',
  'Weakness, numbness or tingling in the arms or legs',
  'Severe or increasing headache',
  'Seizure or convulsion',
  'Loss of consciousness',
  'Worsening confusion, agitation or unusual behaviour',
  'Repeated vomiting',
] as const;

export interface StageRecommendation {
  rts: Stage;
  rtl: Stage;
  /** Plain-language reason, always shown alongside the stage. */
  rationale: string;
  /** True when findings suggest a professional should be seen before pacing. */
  seekAssessment: boolean;
  /** Named, unhedged reasons the app is routing to a clinician. */
  reasons: string[];
}

/**
 * State what was actually found, in the numbers that were actually counted.
 * A fixed plural here once claimed "several tasks provoked symptoms" on a
 * screening where none did and only convergence was abnormal — the exact
 * collapse of "measured and found nothing" into "measured and found
 * something" this product exists to refuse.
 */
export function describeFindings(provokedCount: number, npcAbnormal: boolean): string {
  const tasks =
    provokedCount === 0
      ? 'No task provoked symptoms'
      : provokedCount === 1
        ? 'One task provoked symptoms'
        : `${provokedCount} tasks provoked symptoms`;
  if (!npcAbnormal) return `${tasks}.`;
  return provokedCount === 0
    ? `${tasks}, but convergence was outside the normal range.`
    : `${tasks}, and convergence was outside the normal range.`;
}

/**
 * Map findings to a stage to attempt. The mapping is deliberately
 * conservative and deliberately coarse: a webcam screening cannot justify
 * fine-grained staging, so this returns a floor to start from rather than a
 * precise prescription.
 */
export function recommendStage(
  voms: VomsAssessment,
  pcss: PcssScore,
): StageRecommendation {
  const reasons: string[] = [];

  const provokedCount = voms.provokedTasks.length;
  const npcTask = voms.tasks.find((t) => t.npcAbnormal !== undefined);
  const npcAbnormal = npcTask?.npcAbnormal === true;

  if (provokedCount > 0) {
    reasons.push(
      provokedCount === 1
        ? 'One of the seven tasks provoked symptoms by 2 points or more.'
        : `${provokedCount} of the seven tasks provoked symptoms by 2 points or more.`,
    );
  }
  if (npcAbnormal && npcTask?.npcCm !== undefined) {
    reasons.push(
      `Convergence measured at ${npcTask.npcCm.toFixed(1)} cm, at or beyond the 5 cm cut point.`,
    );
  }
  if (pcss.band === 'severe' || pcss.band === 'moderate') {
    // Never quote a band without saying how many items it rests on: the
    // screening collects four of the twenty-two, and a bare "moderate"
    // implies a full inventory nobody filled in.
    reasons.push(
      `Your symptom inventory scored in the ${pcss.band} band, from ${pcss.itemsAnswered} of 22 items.`,
    );
  }
  if (voms.incomplete.length > 0) {
    reasons.push(
      `${voms.incomplete.length} task${voms.incomplete.length === 1 ? '' : 's'} were not completed, so the picture is partial.`,
    );
  }

  // Any objective or provocation flag routes to a clinician. The staging
  // still returns something to do today, because "see someone" is not a
  // plan for the next few days on its own.
  const seekAssessment = provokedCount > 0 || npcAbnormal || pcss.band === 'severe';

  let rtsN: number;
  let rtlN: number;
  let advice: string;

  if (provokedCount === 0 && !npcAbnormal && pcss.band === 'minimal') {
    rtsN = 3;
    rtlN = 4;
    advice =
      'You can attempt sport-specific work and full school days. Contact still needs a clinician.';
  } else if (provokedCount <= 2 && !npcAbnormal && pcss.band !== 'severe') {
    rtsN = 2;
    rtlN = 3;
    advice =
      'Light aerobic work and part-time school are reasonable to attempt, backing off if symptoms rise more than mildly.';
  } else {
    rtsN = 1;
    rtlN = 2;
    advice =
      'Start at symptom-limited activity and school work at home. This is a starting floor, not a diagnosis.';
  }

  const rationale = `${describeFindings(provokedCount, npcAbnormal)} ${advice}`;

  return {
    rts: RTS_STAGES[rtsN - 1],
    rtl: RTL_STAGES[rtlN - 1],
    rationale,
    seekAssessment,
    reasons,
  };
}
