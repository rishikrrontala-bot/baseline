/**
 * Post-Concussion Symptom Scale (PCSS) — the 22-item self-report instrument
 * embedded in SCAT5 (Sport Concussion Assessment Tool, 5th edition). Each
 * item is rated 0 (none) to 6 (severe) against how the respondent has felt
 * over the last 24 hours; the sum is the "symptom severity score" clinicians
 * track across a recovery.
 *
 * This module only scores what the person reports. It does not diagnose,
 * does not decide clearance, and does not know how they felt yesterday
 * unless a caller gives it that value — see docs/LIMITATIONS.md.
 *
 * Source: McCrory P, et al. "Sport Concussion Assessment Tool – 5th
 * edition." Br J Sports Med 2017;51:851-858 (SCAT5 symptom checklist).
 */

export type PcssCluster = 'somatic' | 'cognitive' | 'sleep' | 'emotional';

export interface PcssItem {
  id: string;
  label: string;
  cluster: PcssCluster;
}

// Order matches the printed SCAT5 checklist, which is itself not clustered —
// the cluster tags here are the commonly-used four-factor grouping from the
// concussion literature (e.g. Kontos et al. 2012), added for reporting only.
export const PCSS_ITEMS: readonly PcssItem[] = [
  { id: 'headache', label: 'Headache', cluster: 'somatic' },
  { id: 'pressure_in_head', label: 'Pressure in head', cluster: 'somatic' },
  { id: 'neck_pain', label: 'Neck pain', cluster: 'somatic' },
  { id: 'nausea', label: 'Nausea or vomiting', cluster: 'somatic' },
  { id: 'dizziness', label: 'Dizziness', cluster: 'somatic' },
  { id: 'blurred_vision', label: 'Blurred vision', cluster: 'somatic' },
  { id: 'balance_problems', label: 'Balance problems', cluster: 'somatic' },
  { id: 'light_sensitivity', label: 'Sensitivity to light', cluster: 'somatic' },
  { id: 'noise_sensitivity', label: 'Sensitivity to noise', cluster: 'somatic' },
  { id: 'slowed_down', label: 'Feeling slowed down', cluster: 'cognitive' },
  { id: 'in_a_fog', label: 'Feeling like "in a fog"', cluster: 'cognitive' },
  { id: 'dont_feel_right', label: "Don't feel right", cluster: 'cognitive' },
  { id: 'difficulty_concentrating', label: 'Difficulty concentrating', cluster: 'cognitive' },
  { id: 'difficulty_remembering', label: 'Difficulty remembering', cluster: 'cognitive' },
  { id: 'fatigue', label: 'Fatigue or low energy', cluster: 'sleep' },
  { id: 'confusion', label: 'Confusion', cluster: 'cognitive' },
  { id: 'drowsiness', label: 'Drowsiness', cluster: 'sleep' },
  { id: 'trouble_sleeping', label: 'Trouble falling asleep', cluster: 'sleep' },
  { id: 'more_emotional', label: 'More emotional', cluster: 'emotional' },
  { id: 'irritability', label: 'Irritability', cluster: 'emotional' },
  { id: 'sadness', label: 'Sadness', cluster: 'emotional' },
  { id: 'nervous_anxious', label: 'Nervous or anxious', cluster: 'emotional' },
] as const;

export const PCSS_MAX_PER_ITEM = 6;
export const PCSS_MAX_TOTAL = PCSS_ITEMS.length * PCSS_MAX_PER_ITEM; // 132

export type PcssResponses = Partial<Record<string, number>>;

export type PcssBand = 'minimal' | 'mild' | 'moderate' | 'severe';

export interface PcssScore {
  /** Sum of every answered item. Unanswered items are excluded, not zeroed. */
  total: number;
  /** How many of the 22 items actually have a response. */
  itemsAnswered: number;
  /** Sum per cluster, for items answered in that cluster. */
  byCluster: Record<PcssCluster, number>;
  /** Coarse severity band on the answered-item total. Not a diagnosis — see below. */
  band: PcssBand;
}

function clampSeverity(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(PCSS_MAX_PER_ITEM, Math.max(0, Math.round(v)));
}

/**
 * Bands are cut points used for *this app's* pacing decisions, not a
 * validated clinical threshold — the literature reports population norms and
 * change-from-baseline, not a universal cutoff for "moderate" vs "severe."
 * Kept deliberately coarse so the UI never implies more precision than a
 * self-report scale can carry.
 */
function bandFor(total: number, itemsAnswered: number): PcssBand {
  if (itemsAnswered === 0) return 'minimal';
  const perItemAvg = total / itemsAnswered;
  if (perItemAvg < 0.5) return 'minimal';
  if (perItemAvg < 1.5) return 'mild';
  if (perItemAvg < 3) return 'moderate';
  return 'severe';
}

export function scorePcss(responses: PcssResponses): PcssScore {
  const byCluster: Record<PcssCluster, number> = {
    somatic: 0,
    cognitive: 0,
    sleep: 0,
    emotional: 0,
  };
  let total = 0;
  let itemsAnswered = 0;

  for (const item of PCSS_ITEMS) {
    const raw = responses[item.id];
    if (raw === undefined || raw === null) continue;
    const v = clampSeverity(raw);
    total += v;
    byCluster[item.cluster] += v;
    itemsAnswered += 1;
  }

  return { total, itemsAnswered, byCluster, band: bandFor(total, itemsAnswered) };
}

/**
 * Symptom-exacerbation check used to gate return-to-activity staging: the
 * Amsterdam 2023 consensus criterion for dropping a stage is a "significant"
 * symptom increase, which in practice is operationalised as a rise from the
 * person's own current-state total, not an absolute score. This compares two
 * PCSS totals and reports whether the rise clears a stated point threshold.
 */
export function isExacerbated(
  currentTotal: number,
  baselineTotal: number,
  threshold = 2,
): boolean {
  return currentTotal - baselineTotal >= threshold;
}
