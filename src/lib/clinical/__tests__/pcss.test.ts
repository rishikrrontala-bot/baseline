import { describe, it, expect } from 'vitest';
import {
  PCSS_ITEMS,
  PCSS_MAX_TOTAL,
  scorePcss,
  isExacerbated,
} from '../pcss';

describe('PCSS item set', () => {
  it('is the 22-item SCAT5 checklist', () => {
    expect(PCSS_ITEMS).toHaveLength(22);
    expect(PCSS_MAX_TOTAL).toBe(132);
  });

  it('has no duplicate item ids', () => {
    const ids = PCSS_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('scorePcss', () => {
  it('sums answered items and reports how many were answered', () => {
    const s = scorePcss({ headache: 3, nausea: 2, irritability: 1 });
    expect(s.total).toBe(6);
    expect(s.itemsAnswered).toBe(3);
  });

  it('does NOT treat an unanswered item as a zero', () => {
    // The distinction that matters: three mild symptoms out of three answered
    // is not the same picture as three mild out of twenty-two.
    const partial = scorePcss({ headache: 3, nausea: 3, dizziness: 3 });
    const full = scorePcss(
      Object.fromEntries(PCSS_ITEMS.map((i) => [i.id, 0])) as Record<string, number>,
    );
    expect(partial.itemsAnswered).toBe(3);
    expect(full.itemsAnswered).toBe(22);
    expect(partial.band).not.toBe(full.band);
  });

  it('clamps out-of-range and non-finite values instead of propagating them', () => {
    const s = scorePcss({ headache: 99, nausea: -4, dizziness: NaN, fatigue: 2.6 });
    // 6 (clamped) + 0 (clamped) + 0 (NaN) + 3 (rounded)
    expect(s.total).toBe(9);
    expect(Number.isFinite(s.total)).toBe(true);
  });

  it('splits totals across the four symptom clusters', () => {
    const s = scorePcss({ headache: 4, difficulty_remembering: 2, drowsiness: 1, sadness: 5 });
    expect(s.byCluster.somatic).toBe(4);
    expect(s.byCluster.cognitive).toBe(2);
    expect(s.byCluster.sleep).toBe(1);
    expect(s.byCluster.emotional).toBe(5);
  });

  it('ignores ids that are not part of the instrument', () => {
    const s = scorePcss({ headache: 2, not_a_real_symptom: 6 });
    expect(s.total).toBe(2);
    expect(s.itemsAnswered).toBe(1);
  });

  it('bands on per-item average, so a partial form is not flattered', () => {
    expect(scorePcss({ headache: 0 }).band).toBe('minimal');
    expect(scorePcss({ headache: 1 }).band).toBe('mild');
    expect(scorePcss({ headache: 2 }).band).toBe('moderate');
    expect(scorePcss({ headache: 5 }).band).toBe('severe');
  });

  it('returns minimal for an entirely empty form without dividing by zero', () => {
    const s = scorePcss({});
    expect(s.total).toBe(0);
    expect(s.itemsAnswered).toBe(0);
    expect(s.band).toBe('minimal');
  });
});

describe('isExacerbated', () => {
  it('flags a rise at or above the threshold', () => {
    expect(isExacerbated(12, 10)).toBe(true);
    expect(isExacerbated(11, 10)).toBe(false);
  });

  it('does not flag improvement', () => {
    expect(isExacerbated(4, 10)).toBe(false);
  });
});
