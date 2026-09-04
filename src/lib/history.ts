import type { PcssBand } from './clinical/pcss';
import type { VomsRatings, VomsTaskId } from './clinical/voms';

/*  Your own record, on your own machine.
 *
 *  "Baseline" is a clinical term before it is a product name: you test while
 *  well, and every later screening is read against your own numbers rather
 *  than a population cut-point. Normal near point of convergence varies
 *  enough between people that a 6 cm break is a real finding for someone who
 *  breaks at 3 cm and unremarkable for someone who always broke at 5.5 cm.
 *  Without a personal baseline the app can only compare you to a stranger.
 *
 *  This is also the only thing Baseline stores. It lives in this browser's
 *  localStorage, it is never transmitted, and it can be exported or destroyed
 *  from the interface. Clearing it is not buried in settings, because a
 *  concussion history is exactly the kind of record a person may not want
 *  sitting on a shared or borrowed machine.
 */

export const HISTORY_KEY = 'baseline.history.v1';
export const SCHEMA_VERSION = 1;

export type ScreeningKind = 'baseline' | 'screening';

export interface ScreeningRecord {
  id: string;
  /** Epoch milliseconds. */
  at: number;
  kind: ScreeningKind;
  pcssTotal: number;
  pcssBand: PcssBand;
  pcssAnswered: number;
  pretest: VomsRatings;
  provokedTasks: VomsTaskId[];
  provokedCount: number;
  /** Centimetres, or null when convergence was not measured this run. */
  npcCm: number | null;
  rtsStage: number;
  rtlStage: number;
}

interface HistoryFile {
  version: number;
  records: ScreeningRecord[];
}

/** The slice of the Storage API used here, so tests need no browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function browserStore(): KeyValueStore | null {
  try {
    // Private-mode Safari throws on write rather than on access, so prove it.
    const probe = '__baseline_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is ScreeningRecord {
  if (!v || typeof v !== 'object') return false;
  const r = v as Partial<ScreeningRecord>;
  return (
    typeof r.id === 'string' &&
    typeof r.at === 'number' &&
    Number.isFinite(r.at) &&
    (r.kind === 'baseline' || r.kind === 'screening') &&
    typeof r.pcssTotal === 'number' &&
    (r.npcCm === null || typeof r.npcCm === 'number')
  );
}

/**
 * Read the history, discarding anything unreadable.
 *
 * A corrupt or half-written entry must not take the rest of the record with
 * it, and must never throw into the render — losing one screening is a
 * nuisance, losing the whole history because of one bad row is not.
 */
export function loadHistory(store: KeyValueStore | null): ScreeningRecord[] {
  if (!store) return [];
  let raw: string | null;
  try {
    raw = store.getItem(HISTORY_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Partial<HistoryFile>;
    if (!parsed || !Array.isArray(parsed.records)) return [];
    return parsed.records.filter(isRecord).sort((a, b) => a.at - b.at);
  } catch {
    return [];
  }
}

/** Returns the history as it now stands, so callers need not re-read. */
export function saveScreening(
  store: KeyValueStore | null,
  record: ScreeningRecord,
): ScreeningRecord[] {
  if (!store) return [];
  const next = [...loadHistory(store).filter((r) => r.id !== record.id), record].sort(
    (a, b) => a.at - b.at,
  );
  const file: HistoryFile = { version: SCHEMA_VERSION, records: next };
  try {
    store.setItem(HISTORY_KEY, JSON.stringify(file));
  } catch {
    // A full or read-only store means this screening is not kept. The caller
    // still has it in memory for this session; it simply will not persist.
    return loadHistory(store);
  }
  return next;
}

export function deleteScreening(store: KeyValueStore | null, id: string): ScreeningRecord[] {
  if (!store) return [];
  const next = loadHistory(store).filter((r) => r.id !== id);
  try {
    store.setItem(HISTORY_KEY, JSON.stringify({ version: SCHEMA_VERSION, records: next }));
  } catch {
    return loadHistory(store);
  }
  return next;
}

export function clearHistory(store: KeyValueStore | null): void {
  try {
    store?.removeItem(HISTORY_KEY);
  } catch {
    // Nothing further to do; the caller reports what it can see.
  }
}

/** The baseline in force: the most recent screening marked as one. */
export function currentBaseline(records: readonly ScreeningRecord[]): ScreeningRecord | null {
  const marked = records.filter((r) => r.kind === 'baseline');
  return marked.length ? marked[marked.length - 1] : null;
}

/** Screenings taken after the baseline, oldest first. */
export function sinceBaseline(records: readonly ScreeningRecord[]): ScreeningRecord[] {
  const base = currentBaseline(records);
  return records.filter((r) => r.kind === 'screening' && (!base || r.at >= base.at));
}

export function exportJson(records: readonly ScreeningRecord[]): string {
  return JSON.stringify({ version: SCHEMA_VERSION, exportedAt: Date.now(), records }, null, 2);
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
