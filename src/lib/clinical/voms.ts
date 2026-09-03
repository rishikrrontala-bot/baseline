/**
 * VOMS — Vestibular/Ocular Motor Screening.
 *
 * The single most important thing to understand about VOMS, and the thing
 * that makes it buildable honestly in a browser: **VOMS is not an eye
 * tracker.** It is a symptom-provocation instrument. The examiner asks the
 * person to perform seven eye/head tasks and, after each one, the person
 * rates four symptoms 0-10. What VOMS measures is how much each task
 * *provokes* symptoms relative to a pre-task baseline.
 *
 * So the validated signal here comes from the ratings, which a browser can
 * collect exactly as a clinic does. The camera adds two things the paper
 * form cannot: confirmation the movement was actually performed, and one
 * genuinely objective number (near point of convergence in cm). Everything
 * the camera reports is treated as *supporting* evidence and labelled as
 * such in the UI.
 *
 * Sources:
 *  - Mucha A, Collins MW, Elbin RJ, et al. "A Brief Vestibular/Ocular Motor
 *    Screening (VOMS) Assessment to Evaluate Concussions." Am J Sports Med
 *    2014;42(10):2479-2486. (Instrument, and the >=2-point provocation and
 *    >=5 cm NPC cut points.)
 *  - Patricios JS, et al. "Consensus statement on concussion in sport:
 *    Amsterdam 2022." Br J Sports Med 2023;57:695-711.
 */

export type VomsSymptom = 'headache' | 'dizziness' | 'nausea' | 'fogginess';

export const VOMS_SYMPTOMS: readonly VomsSymptom[] = [
  'headache',
  'dizziness',
  'nausea',
  'fogginess',
] as const;

export type VomsRatings = Record<VomsSymptom, number>;

export type VomsTaskId =
  | 'smooth_pursuit'
  | 'saccades_horizontal'
  | 'saccades_vertical'
  | 'convergence'
  | 'vor_horizontal'
  | 'vor_vertical'
  | 'visual_motion_sensitivity';

export interface VomsTask {
  id: VomsTaskId;
  label: string;
  /** What the person is asked to do, in their own language. */
  instruction: string;
  /** Whether this task yields an objective camera measure beyond adherence. */
  objective: 'npc_cm' | 'gaze_trace' | 'head_trace' | null;
}

export const VOMS_TASKS: readonly VomsTask[] = [
  {
    id: 'smooth_pursuit',
    label: 'Smooth pursuit',
    instruction: 'Follow the target with your eyes only. Keep your head still.',
    objective: 'gaze_trace',
  },
  {
    id: 'saccades_horizontal',
    label: 'Horizontal saccades',
    instruction: 'Look quickly between the two targets, left and right. Head still.',
    objective: 'gaze_trace',
  },
  {
    id: 'saccades_vertical',
    label: 'Vertical saccades',
    instruction: 'Look quickly between the two targets, up and down. Head still.',
    objective: 'gaze_trace',
  },
  {
    id: 'convergence',
    label: 'Near point of convergence',
    instruction: 'Focus on the target and bring it slowly toward your nose. Stop when it doubles.',
    objective: 'npc_cm',
  },
  {
    id: 'vor_horizontal',
    label: 'Horizontal VOR',
    instruction: 'Keep your eyes on the target and turn your head side to side.',
    objective: 'head_trace',
  },
  {
    id: 'vor_vertical',
    label: 'Vertical VOR',
    instruction: 'Keep your eyes on the target and nod your head up and down.',
    objective: 'head_trace',
  },
  {
    id: 'visual_motion_sensitivity',
    label: 'Visual motion sensitivity',
    instruction: 'Turn your head and body together while keeping your eyes fixed ahead.',
    objective: null,
  },
] as const;

/** Mucha 2014: a rise of >=2 points on any symptom is clinically significant. */
export const PROVOCATION_THRESHOLD = 2;

/**
 * Mucha 2014 reports NPC >= 5 cm as the cut point that best discriminated
 * concussed from control participants. Other groups use 6 cm. We use 5 and
 * say so, rather than silently picking the more permissive number.
 */
export const NPC_ABNORMAL_CM = 5;

export interface VomsTaskResult {
  taskId: VomsTaskId;
  /** Symptom ratings recorded immediately after the task. */
  after: VomsRatings;
  /** Objective near point of convergence, cm, if this task measured it. */
  npcCm?: number;
}

export interface VomsTaskAssessment {
  taskId: VomsTaskId;
  /** Per-symptom rise over the pre-test baseline. Negative means improvement. */
  delta: Record<VomsSymptom, number>;
  /** Largest single-symptom rise. */
  maxDelta: number;
  /** True when any symptom rose by PROVOCATION_THRESHOLD or more. */
  provoked: boolean;
  /** Present only for the convergence task. */
  npcCm?: number;
  npcAbnormal?: boolean;
}

export interface VomsAssessment {
  baseline: VomsRatings;
  tasks: VomsTaskAssessment[];
  /** Tasks that provoked a clinically significant symptom rise. */
  provokedTasks: VomsTaskId[];
  /** True if any task provoked, or NPC was abnormal. */
  anyFlag: boolean;
  /** Tasks the person has not completed yet. */
  incomplete: VomsTaskId[];
}

function emptyRatings(): VomsRatings {
  return { headache: 0, dizziness: 0, nausea: 0, fogginess: 0 };
}

function clampRating(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(10, Math.max(0, Math.round(v)));
}

export function normaliseRatings(r: Partial<VomsRatings> | undefined): VomsRatings {
  const out = emptyRatings();
  if (!r) return out;
  for (const s of VOMS_SYMPTOMS) out[s] = clampRating(r[s] ?? 0);
  return out;
}

/**
 * Compare each completed task's post-task ratings against the pre-test
 * baseline. Tasks with no result are reported as incomplete rather than
 * being scored as zero — "not measured" and "measured, no symptoms" are
 * different claims and must not collapse into the same output.
 */
export function assessVoms(
  baselineInput: Partial<VomsRatings>,
  results: readonly VomsTaskResult[],
): VomsAssessment {
  const baseline = normaliseRatings(baselineInput);
  const byId = new Map(results.map((r) => [r.taskId, r]));

  const tasks: VomsTaskAssessment[] = [];
  const provokedTasks: VomsTaskId[] = [];
  const incomplete: VomsTaskId[] = [];
  let anyFlag = false;

  for (const task of VOMS_TASKS) {
    const result = byId.get(task.id);
    if (!result) {
      incomplete.push(task.id);
      continue;
    }

    const after = normaliseRatings(result.after);
    const delta = emptyRatings();
    let maxDelta = -Infinity;
    for (const s of VOMS_SYMPTOMS) {
      delta[s] = after[s] - baseline[s];
      if (delta[s] > maxDelta) maxDelta = delta[s];
    }

    const provoked = maxDelta >= PROVOCATION_THRESHOLD;
    if (provoked) {
      provokedTasks.push(task.id);
      anyFlag = true;
    }

    const assessment: VomsTaskAssessment = { taskId: task.id, delta, maxDelta, provoked };

    if (task.objective === 'npc_cm' && typeof result.npcCm === 'number') {
      assessment.npcCm = result.npcCm;
      assessment.npcAbnormal = result.npcCm >= NPC_ABNORMAL_CM;
      if (assessment.npcAbnormal) anyFlag = true;
    }

    tasks.push(assessment);
  }

  return { baseline, tasks, provokedTasks, anyFlag, incomplete };
}
