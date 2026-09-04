import { describe, it, expect } from 'vitest';
import { compareToBaseline, trendOf, NPC_BASELINE_SHIFT_CM } from '../baseline';
import { newId, type ScreeningRecord } from '../../history';

const rec = (over: Partial<ScreeningRecord> = {}): ScreeningRecord => ({
  id: newId(), at: 0, kind: 'screening', pcssTotal: 0, pcssBand: 'minimal',
  pcssAnswered: 0, pretest: { headache: 0, dizziness: 0, nausea: 0, fogginess: 0 },
  provokedTasks: [], provokedCount: 0, npcCm: null, rtsStage: 3, rtlStage: 4, ...over,
});
const DAY = 86_400_000;

describe('convergence against a personal baseline', () => {
  it('flags a real personal worsening that sits inside the population range', () => {
    // The whole reason the app asks for a baseline: 4.5 cm is "normal" for a
    // stranger and clearly worse for someone whose own near point was 2 cm.
    const base = rec({ kind: 'baseline', npcCm: 2, at: 0 });
    const now = rec({ npcCm: 4.5, at: 7 * DAY });
    const c = compareToBaseline(now, base);
    expect(c.npc.delta).toBe(2.5);
    expect(c.npc.delta!).toBeGreaterThanOrEqual(NPC_BASELINE_SHIFT_CM);
    expect(c.npc.flagged).toBe(true);
    expect(c.npc.direction).toBe('worse');
    expect(c.npc.note).toMatch(/inside the usual range, but 2\.5 cm further out/);
  });

  it('does not flag someone who has simply always broken late', () => {
    const base = rec({ kind: 'baseline', npcCm: 5.5 });
    const now = rec({ npcCm: 5.6, at: DAY });
    const c = compareToBaseline(now, base);
    // Over the population cut point, but unchanged for this person.
    expect(c.npc.direction).not.toBe('worse');
    expect(c.npc.note).toMatch(/close to your baseline/);
  });

  it('still uses the population cut point when there is no baseline', () => {
    const c = compareToBaseline(rec({ npcCm: 7 }), null);
    expect(c.hasBaseline).toBe(false);
    expect(c.npc.flagged).toBe(true);
    expect(c.npc.note).toMatch(/no baseline to compare it with/i);
  });

  it('says convergence was not measured rather than implying it was normal', () => {
    const c = compareToBaseline(rec({ npcCm: null }), rec({ kind: 'baseline', npcCm: 3 }));
    expect(c.npc.now).toBeNull();
    expect(c.npc.flagged).toBe(false);
    expect(c.npc.direction).toBe('unknown');
    expect(c.npc.note).toMatch(/not measured/);
  });

  it('reports improvement as improvement', () => {
    const c = compareToBaseline(
      rec({ npcCm: 3 }),
      rec({ kind: 'baseline', npcCm: 6 }),
    );
    expect(c.npc.direction).toBe('better');
    expect(c.npc.flagged).toBe(false);
  });

  it('counts whole days since the baseline', () => {
    const c = compareToBaseline(rec({ at: 10 * DAY + 3600_000 }), rec({ kind: 'baseline', at: 0 }));
    expect(c.daysSinceBaseline).toBe(10);
  });
});

describe('symptom score against a personal baseline', () => {
  it('flags a rise of ten or more over the person own baseline', () => {
    const c = compareToBaseline(rec({ pcssTotal: 34 }), rec({ kind: 'baseline', pcssTotal: 12 }));
    expect(c.symptoms.delta).toBe(22);
    expect(c.symptoms.flagged).toBe(true);
    expect(c.symptoms.note).toMatch(/22 higher than your baseline of 12/);
  });

  it('does not flag a person whose baseline was already high', () => {
    const c = compareToBaseline(rec({ pcssTotal: 30 }), rec({ kind: 'baseline', pcssTotal: 28 }));
    expect(c.symptoms.flagged).toBe(false);
  });
});

describe('trend', () => {
  it('refuses to call a direction from fewer than three screenings', () => {
    const t = trendOf([rec({ pcssTotal: 40 }), rec({ pcssTotal: 5 })]);
    expect(t.direction).toBe('unknown');
    expect(t.note).toMatch(/three or more/i);
  });

  it('reads a falling series as improving', () => {
    const t = trendOf([40, 35, 20, 8].map((p, i) => rec({ pcssTotal: p, at: i * DAY })));
    expect(t.direction).toBe('better');
  });

  it('reads a rising series as worsening', () => {
    const t = trendOf([5, 12, 30, 44].map((p, i) => rec({ pcssTotal: p, at: i * DAY })));
    expect(t.direction).toBe('worse');
  });

  it('does not mistake noise for a direction', () => {
    const t = trendOf([20, 22, 19, 21].map((p, i) => rec({ pcssTotal: p, at: i * DAY })));
    expect(t.direction).toBe('same');
  });

  it('ignores the baseline record itself when counting screenings', () => {
    const t = trendOf([rec({ kind: 'baseline', pcssTotal: 0 }), rec({ pcssTotal: 30 })]);
    expect(t.direction).toBe('unknown');
  });
});

describe('measurement noise is not a finding', () => {
  it('calls a sub-half-centimetre convergence change unchanged', () => {
    const c = compareToBaseline(rec({ npcCm: 3.3 }), rec({ kind: 'baseline', npcCm: 3 }));
    expect(c.npc.direction).toBe('same');
  });

  it('calls a two-point symptom change effectively unchanged', () => {
    const c = compareToBaseline(rec({ pcssTotal: 14 }), rec({ kind: 'baseline', pcssTotal: 12 }));
    expect(c.symptoms.direction).toBe('same');
    expect(c.symptoms.note).toMatch(/effectively unchanged/);
  });

  it('still reports a change that clears the margin', () => {
    const c = compareToBaseline(rec({ npcCm: 4 }), rec({ kind: 'baseline', npcCm: 3 }));
    expect(c.npc.direction).toBe('worse');
  });
});
