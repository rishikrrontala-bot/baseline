import { useState } from 'react';
import Trajectory from './Trajectory';
import { compareToBaseline, trendOf } from '../lib/clinical/baseline';
import {
  clearHistory, currentBaseline, exportJson, saveScreening, newId,
  type KeyValueStore, type ScreeningRecord,
} from '../lib/history';

/*  The record, and what it is worth.
 *
 *  A screening kept only in this tab is a snapshot; concussion recovery is a
 *  trajectory. Saving is deliberate rather than automatic — a person testing
 *  on a borrowed laptop should not silently leave a concussion history on it,
 *  and one taken on someone else's behalf should not contaminate their own.
 */

function Row({ label, note, flagged }: { label: string; note: string; flagged: boolean }) {
  return (
    <div className="flex gap-4 border-b border-[var(--line)] py-3">
      {/* Flag state carries a word, not just a colour or a mark. */}
      <span className="t-mono w-[7.5rem] shrink-0" style={{ color: flagged ? 'var(--terra)' : 'var(--ash)' }}>
        {flagged ? 'Changed' : 'Steady'}
      </span>
      <span className="t-body">
        <span className="text-[var(--ink)]">{label}. </span>
        {note}
      </span>
    </div>
  );
}

export default function History({
  store,
  records,
  onRecords,
  pending,
}: {
  store: KeyValueStore | null;
  records: ScreeningRecord[];
  onRecords: (r: ScreeningRecord[]) => void;
  /** This screening, not yet saved. */
  pending: Omit<ScreeningRecord, 'id' | 'at' | 'kind'>;
}) {
  const [saved, setSaved] = useState<ScreeningRecord | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const base = currentBaseline(records);
  const comparison = saved ? compareToBaseline(saved, base && base.id !== saved.id ? base : null) : null;
  const trend = trendOf(records);

  const save = (kind: ScreeningRecord['kind']) => {
    const record: ScreeningRecord = { ...pending, id: newId(), at: Date.now(), kind };
    const next = saveScreening(store, record);
    setSaved(record);
    onRecords(next.length ? next : [...records, record]);
  };

  const download = () => {
    const blob = new Blob([exportJson(records)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baseline-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (store === null) {
    return (
      <section className="mt-10 border-t border-[var(--line)] pt-6 print:hidden">
        <p className="t-body max-w-[56ch]">
          This browser will not let Baseline keep a local record — private browsing usually does
          this. The screening above is complete and printable; it just cannot be saved for
          comparison later.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-[var(--line)] pt-6 print:hidden">
      {!saved ? (
        <>
          <h3 className="t-mono mb-3 text-[var(--ash)]">Keep this screening?</h3>
          <p className="t-body max-w-[58ch]">
            {base
              ? `Saving it adds a point to your recovery record and compares it against the baseline you took ${new Date(base.at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.`
              : 'Nothing is stored unless you choose to store it. A baseline taken while you feel well is what every later screening is measured against — so if you are currently symptomatic, save this as a screening, not a baseline.'}
          </p>
          <p className="t-body mt-2 max-w-[58ch] text-[var(--ash)]">
            It stays in this browser on this device. It is never uploaded, and you can export or
            erase it below.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => save('screening')}
              className="t-action border border-[var(--line-strong)] px-6 py-4 text-[var(--ink)] transition-colors duration-300 hover:border-[var(--terra)] hover:text-[var(--terra)]"
            >
              Save as a screening
            </button>
            <button
              type="button"
              onClick={() => save('baseline')}
              className="t-action underline underline-offset-4 text-[var(--ash)]"
            >
              {base ? 'Replace my baseline with this' : 'Save as my baseline'}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="t-mono mb-4 text-[var(--ash)]">
            {comparison?.hasBaseline
              ? `Against your baseline${comparison.daysSinceBaseline !== null ? `, ${comparison.daysSinceBaseline} day${comparison.daysSinceBaseline === 1 ? '' : 's'} ago` : ''}`
              : saved.kind === 'baseline'
                ? 'Saved as your baseline'
                : 'Saved'}
          </h3>

          {comparison?.hasBaseline ? (
            <div className="max-w-[70ch]">
              <Row label="Convergence" note={comparison.npc.note} flagged={comparison.npc.flagged} />
              <Row label="Symptoms" note={comparison.symptoms.note} flagged={comparison.symptoms.flagged} />
              <Row label="Provocation" note={comparison.provoked.note} flagged={comparison.provoked.flagged} />
              <p className="t-body mt-4 text-[var(--ash)]">{trend.note}</p>
            </div>
          ) : (
            <p className="t-body max-w-[58ch]">
              {saved.kind === 'baseline'
                ? 'Later screenings will be read against these numbers as well as against the population cut points.'
                : 'There is no baseline to compare this with yet. Take one on a day you feel well and every screening after it gains a second, more personal reference.'}
            </p>
          )}
        </>
      )}

      <Trajectory records={records} />

      <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-[var(--line)] pt-5">
        <button type="button" onClick={download} className="t-action underline underline-offset-4 text-[var(--ash)]">
          Export my record
        </button>
        {!confirmWipe ? (
          <button type="button" onClick={() => setConfirmWipe(true)} className="t-action underline underline-offset-4 text-[var(--ash)]">
            Erase everything
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-4">
            <span className="t-body text-[var(--ink)]">Erase every saved screening on this device?</span>
            <button
              type="button"
              onClick={() => { clearHistory(store); onRecords([]); setSaved(null); setConfirmWipe(false); }}
              className="t-action underline underline-offset-4 text-[var(--terra)]"
            >
              Yes, erase it
            </button>
            <button type="button" onClick={() => setConfirmWipe(false)} className="t-action underline underline-offset-4 text-[var(--ash)]">
              Keep it
            </button>
          </span>
        )}
      </div>
    </section>
  );
}
