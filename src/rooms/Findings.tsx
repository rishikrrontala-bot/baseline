import { useMemo, useState } from 'react';
import RoomFrame from '../components/RoomFrame';
import History from '../components/History';
import { browserStore, loadHistory, type ScreeningRecord } from '../lib/history';
import {
  assessVoms,
  VOMS_TASKS,
  VOMS_SYMPTOMS,
  NPC_ABNORMAL_CM,
  PROVOCATION_THRESHOLD,
  type VomsRatings,
  type VomsTaskResult,
} from '../lib/clinical/voms';
import { scorePcss, pcssFromVomsSymptoms } from '../lib/clinical/pcss';
import { recommendStage, RED_FLAGS, describeFindings } from '../lib/clinical/staging';

export default function Findings({
  baseline,
  results,
  onLeave,
}: {
  baseline: VomsRatings;
  results: VomsTaskResult[];
  onLeave: () => void;
}) {
  const voms = assessVoms(baseline, results);
  const pcss = scorePcss(pcssFromVomsSymptoms(baseline));
  const plan = recommendStage(voms, pcss);

  const byId = new Map(voms.tasks.map((t) => [t.taskId, t]));
  const provokedCount = voms.provokedTasks.length;
  const npcAbnormal = voms.tasks.some((t) => t.npcAbnormal === true);

  const store = useMemo(() => browserStore(), []);
  const [records, setRecords] = useState<ScreeningRecord[]>(() => loadHistory(store));

  const npcTask = voms.tasks.find((t) => t.npcCm !== undefined);
  const pending = {
    pcssTotal: pcss.total,
    pcssBand: pcss.band,
    pcssAnswered: pcss.itemsAnswered,
    pretest: baseline,
    provokedTasks: voms.provokedTasks,
    provokedCount,
    npcCm: npcTask?.npcCm ?? null,
    rtsStage: plan.rts.n,
    rtlStage: plan.rtl.n,
  };

  return (
    <RoomFrame
      room="findings"
      heading={describeFindings(provokedCount, npcAbnormal).replace(/\.$/, '')}
      onLeave={onLeave}
      action={
        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-[var(--line)] pt-5 print:hidden">
          <p className="t-mono" style={{ color: 'var(--ash)' }}>
            Nothing here was sent anywhere
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="t-action border border-[var(--line-strong)] px-6 py-4 text-[var(--ink)] transition-colors duration-300 hover:border-[var(--terra)] hover:text-[var(--terra)]"
          >
            Print this for a clinician
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-x-[4vw] gap-y-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* What was actually measured, task by task. */}
        <section>
          <table className="w-full border-collapse">
            <caption className="t-mono mb-3 text-left" style={{ color: 'var(--ash)' }}>
              Provocation is a rise of {PROVOCATION_THRESHOLD}+ points over your pre-test rating
            </caption>
            <tbody>
              {VOMS_TASKS.map((task) => {
                const a = byId.get(task.id);
                return (
                  <tr key={task.id} className="border-b border-[var(--line)]">
                    <th scope="row" className="t-body py-3 pr-4 text-left font-normal text-[var(--ink)]">
                      {task.label}
                    </th>
                    <td className="t-mono py-3 text-right" style={{ color: 'var(--ash)' }}>
                      {!a ? (
                        'Not completed'
                      ) : a.provoked ? (
                        <span style={{ color: 'var(--terra)' }}>
                          Provoked +{a.maxDelta}
                        </span>
                      ) : (
                        'No rise'
                      )}
                      {a?.npcCm !== undefined && (
                        <span className="ml-3 inline-block whitespace-nowrap">
                          {a.npcCm.toFixed(1)} cm
                          {a.npcAbnormal ? ` (≥${NPC_ABNORMAL_CM})` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="t-body mt-5 max-w-[54ch]">
            Your pre-test ratings were{' '}
            {VOMS_SYMPTOMS.map((s) => `${s} ${baseline[s]}`).join(', ')}. Everything above is
            measured against those, which is why the screening asks for them first.
          </p>

          <div className="mt-8 border-t border-[var(--line)] pt-5">
            <p className="t-body text-[var(--ink)]">
              None of this waits. Go to an emergency department now if you have any of these:
            </p>
            <ul className="t-body mt-3 max-w-[48ch] list-disc space-y-1 pl-5">
              {RED_FLAGS.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* What to do about it. */}
        <section>
          <h2 className="t-mono mb-4" style={{ color: 'var(--ash)' }}>
            What to try next
          </h2>

          <dl className="space-y-5">
            <div>
              <dt className="t-body text-[var(--ink)]">
                Activity — stage {plan.rts.n}: {plan.rts.label}
              </dt>
              <dd className="t-body mt-1 max-w-[46ch]">{plan.rts.detail}</dd>
            </div>
            <div>
              <dt className="t-body text-[var(--ink)]">
                School or work — stage {plan.rtl.n}: {plan.rtl.label}
              </dt>
              <dd className="t-body mt-1 max-w-[46ch]">{plan.rtl.detail}</dd>
            </div>
          </dl>

          <p className="t-body mt-5 max-w-[48ch]">{plan.rationale}</p>

          {plan.seekAssessment && (
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <p className="t-body text-[var(--ink)]">See a clinician about this screening.</p>
              <ul className="t-body mt-2 max-w-[48ch] list-disc space-y-1 pl-5">
                {plan.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="t-body mt-6 max-w-[50ch]">
            Baseline is a screening aid. It does not diagnose a concussion and it cannot clear
            you to return to contact — only a clinician who examines you can do that.
          </p>
        </section>
      </div>
      <History store={store} records={records} onRecords={setRecords} pending={pending} />
    </RoomFrame>
  );
}
