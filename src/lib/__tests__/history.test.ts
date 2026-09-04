import { describe, it, expect, beforeEach } from 'vitest';
import {
  HISTORY_KEY, loadHistory, saveScreening, deleteScreening, clearHistory,
  currentBaseline, sinceBaseline, exportJson, newId,
  type KeyValueStore, type ScreeningRecord,
} from '../history';

class FakeStore implements KeyValueStore {
  map = new Map<string, string>();
  throwOnWrite = false;
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.throwOnWrite) throw new Error('quota'); this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const rec = (over: Partial<ScreeningRecord> = {}): ScreeningRecord => ({
  id: newId(), at: 1_000, kind: 'screening', pcssTotal: 20, pcssBand: 'mild',
  pcssAnswered: 5, pretest: { headache: 1, dizziness: 0, nausea: 0, fogginess: 0 },
  provokedTasks: [], provokedCount: 0, npcCm: 4, rtsStage: 2, rtlStage: 3, ...over,
});

let store: FakeStore;
beforeEach(() => { store = new FakeStore(); });

describe('loadHistory is resilient', () => {
  it('returns empty when nothing is stored', () => {
    expect(loadHistory(store)).toEqual([]);
  });

  it('returns empty rather than throwing on corrupt JSON', () => {
    store.map.set(HISTORY_KEY, '{not json');
    expect(loadHistory(store)).toEqual([]);
  });

  it('drops unreadable rows but keeps the good ones', () => {
    // One bad row must not take the whole history with it.
    const good = rec({ id: 'a' });
    store.map.set(HISTORY_KEY, JSON.stringify({
      version: 1, records: [good, { id: 'b' }, null, { id: 'c', at: 'soon' }],
    }));
    const out = loadHistory(store);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });

  it('returns empty when no store is available at all', () => {
    expect(loadHistory(null)).toEqual([]);
  });

  it('sorts oldest first regardless of stored order', () => {
    store.map.set(HISTORY_KEY, JSON.stringify({
      version: 1, records: [rec({ id: 'late', at: 900 }), rec({ id: 'early', at: 100 })],
    }));
    expect(loadHistory(store).map((r) => r.id)).toEqual(['early', 'late']);
  });
});

describe('saving', () => {
  it('round-trips a screening', () => {
    saveScreening(store, rec({ id: 'x', npcCm: 6.2 }));
    const [got] = loadHistory(store);
    expect(got.id).toBe('x');
    expect(got.npcCm).toBe(6.2);
  });

  it('replaces a record with the same id instead of duplicating it', () => {
    saveScreening(store, rec({ id: 'x', pcssTotal: 10 }));
    const after = saveScreening(store, rec({ id: 'x', pcssTotal: 40 }));
    expect(after).toHaveLength(1);
    expect(after[0].pcssTotal).toBe(40);
  });

  it('does not throw when the store refuses to write', () => {
    store.throwOnWrite = true;
    expect(() => saveScreening(store, rec())).not.toThrow();
  });

  it('deletes one record and leaves the others', () => {
    saveScreening(store, rec({ id: 'a', at: 1 }));
    saveScreening(store, rec({ id: 'b', at: 2 }));
    expect(deleteScreening(store, 'a').map((r) => r.id)).toEqual(['b']);
  });

  it('clears everything', () => {
    saveScreening(store, rec());
    clearHistory(store);
    expect(loadHistory(store)).toEqual([]);
  });
});

describe('which baseline is in force', () => {
  it('is null when none has been marked', () => {
    expect(currentBaseline([rec(), rec()])).toBeNull();
  });

  it('is the most recent one marked as a baseline', () => {
    const list = [
      rec({ id: 'old', at: 1, kind: 'baseline' }),
      rec({ id: 'mid', at: 2 }),
      rec({ id: 'new', at: 3, kind: 'baseline' }),
    ];
    expect(currentBaseline(list)?.id).toBe('new');
  });

  it('counts only screenings taken at or after the baseline', () => {
    const list = [
      rec({ id: 'before', at: 1 }),
      rec({ id: 'base', at: 5, kind: 'baseline' }),
      rec({ id: 'after', at: 9 }),
    ];
    expect(sinceBaseline(list).map((r) => r.id)).toEqual(['after']);
  });
});

describe('export', () => {
  it('emits versioned JSON the person can keep', () => {
    const parsed = JSON.parse(exportJson([rec({ id: 'x' })]));
    expect(parsed.version).toBe(1);
    expect(parsed.records[0].id).toBe('x');
  });
});
