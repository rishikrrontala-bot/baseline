import { describe, it, expect } from 'vitest';
import { recommendStage, describeFindings, RTS_STAGES, RTL_STAGES, RED_FLAGS } from '../staging';
import { assessVoms, VOMS_TASKS, type VomsTaskResult } from '../voms';
import { scorePcss } from '../pcss';

const calm = { headache: 0, dizziness: 0, nausea: 0, fogginess: 0 };

function allTasks(after: Partial<typeof calm>, npcCm?: number): VomsTaskResult[] {
  return VOMS_TASKS.map((t) => ({
    taskId: t.id,
    after: { ...calm, ...after },
    ...(t.id === 'convergence' && npcCm !== undefined ? { npcCm } : {}),
  }));
}

describe('stage tables', () => {
  it('gates contact stages behind a clinician, never the app', () => {
    for (const s of RTS_STAGES) {
      if (s.n >= 5) expect(s.gate).toBe('clinician');
    }
  });

  it('covers return to learn, not just return to sport', () => {
    expect(RTL_STAGES.length).toBeGreaterThanOrEqual(4);
    expect(RED_FLAGS.length).toBeGreaterThan(5);
  });
});

describe('recommendStage', () => {
  it('advances furthest when nothing provoked and symptoms are minimal', () => {
    const v = assessVoms(calm, allTasks({}, 3));
    const r = recommendStage(v, scorePcss({ headache: 0 }));
    expect(r.rts.n).toBe(3);
    expect(r.rtl.n).toBe(4);
    expect(r.seekAssessment).toBe(false);
  });

  it('never clears anyone to contact, even on a clean screening', () => {
    // The app must not be the thing that puts someone back on the field.
    const v = assessVoms(calm, allTasks({}, 3));
    const r = recommendStage(v, scorePcss({ headache: 0 }));
    expect(r.rts.n).toBeLessThan(5);
    expect(r.rts.gate).toBe('self');
  });

  it('drops to symptom-limited activity when many tasks provoke', () => {
    const v = assessVoms(calm, allTasks({ headache: 5 }));
    const r = recommendStage(v, scorePcss({ headache: 5, dizziness: 4 }));
    expect(r.rts.n).toBe(1);
    expect(r.rtl.n).toBe(2);
    expect(r.seekAssessment).toBe(true);
  });

  it('routes to a clinician on abnormal convergence even with no provocation', () => {
    // The objective finding must not be outvoted by a calm self-report.
    const v = assessVoms(calm, allTasks({}, 7.5));
    const r = recommendStage(v, scorePcss({ headache: 0 }));
    expect(r.seekAssessment).toBe(true);
    expect(r.reasons.some((x) => x.includes('7.5 cm'))).toBe(true);
  });

  it('says so when the screening was left incomplete', () => {
    const partial = allTasks({}).slice(0, 3);
    const v = assessVoms(calm, partial);
    const r = recommendStage(v, scorePcss({ headache: 1 }));
    expect(r.reasons.some((x) => /not completed/.test(x))).toBe(true);
  });

  it('never quotes a symptom band without saying how many items it rests on', () => {
    const v = assessVoms(calm, allTasks({ headache: 5 }));
    const r = recommendStage(v, scorePcss({ headache: 5, dizziness: 4 }));
    const band = r.reasons.find((x) => /band/.test(x));
    expect(band).toBeDefined();
    expect(band).toMatch(/of 22 items/);
  });

  it('always gives a rationale in plain language', () => {
    const v = assessVoms(calm, allTasks({ dizziness: 3 }));
    const r = recommendStage(v, scorePcss({ dizziness: 3 }));
    expect(r.rationale.length).toBeGreaterThan(40);
  });
});

describe('describeFindings — never claims provocation that did not happen', () => {
  it('says no task provoked when none did', () => {
    expect(describeFindings(0, false)).toBe('No task provoked symptoms.');
  });

  it('says "One task", not "1 tasks"', () => {
    expect(describeFindings(1, false)).toBe('One task provoked symptoms.');
  });

  it('reports abnormal convergence without inventing provoking tasks', () => {
    // The regression: the old rationale was hardcoded "Several tasks provoked
    // symptoms" and its branch was reached on an abnormal NPC alone.
    const s = describeFindings(0, true);
    expect(s).toMatch(/^No task provoked symptoms, but convergence/);
    expect(s).not.toMatch(/several/i);
  });

  it('joins both findings when both are present', () => {
    expect(describeFindings(3, true)).toBe(
      '3 tasks provoked symptoms, and convergence was outside the normal range.',
    );
  });
});

describe('rationale matches the counted findings', () => {
  it('does not say "several tasks" when only convergence was abnormal', () => {
    const v = assessVoms(calm, allTasks({}, 7.5));
    const r = recommendStage(v, scorePcss({ headache: 0 }));
    expect(r.rationale).toMatch(/^No task provoked symptoms, but convergence/);
    expect(r.rationale).not.toMatch(/several tasks/i);
  });

  it('opens every rationale with what was actually found', () => {
    const v = assessVoms(calm, allTasks({ headache: 5 }));
    const r = recommendStage(v, scorePcss({ headache: 5 }));
    expect(r.rationale).toMatch(/^7 tasks provoked symptoms/);
  });
});
