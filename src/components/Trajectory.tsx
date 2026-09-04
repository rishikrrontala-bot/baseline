import type { ScreeningRecord } from '../lib/history';
import { NPC_ABNORMAL_CM } from '../lib/clinical/voms';

/*  Recovery, plotted.
 *
 *  Two panels rather than one. Symptom score runs 0–132 and near point of
 *  convergence runs roughly 1–12 cm; putting both on a single pair of axes
 *  would mean two y-scales, which makes the crossing point of the two lines
 *  an artefact of the scaling rather than a fact about the person. Small
 *  multiples over a shared time axis say the same thing without the lie.
 *
 *  Each panel therefore carries one series, so nothing is encoded by colour:
 *  the panel title names its own line. Provoking or abnormal points are drawn
 *  as a ringed marker and given their value in text, so the finding survives
 *  greyscale, print, and the reader who cannot separate the hues.
 *
 *  There is no hover tooltip, which is the one place this departs from the
 *  house chart rules. A tooltip that follows the cursor is a moving element,
 *  and this screen is read by people selected for motion sensitivity. The
 *  table underneath carries every value instead.
 */

const W = 640;
const H = 132;
const PAD = { top: 14, right: 104, bottom: 22, left: 40 };

interface Panel {
  title: string;
  unit: string;
  values: (number | null)[];
  /** Drawn as a dashed rule with a label, when present. */
  reference?: { value: number; label: string };
  /** A point at or beyond this gets the ringed marker. */
  flagAtOrAbove?: number;
  /** Fixed lower bound; the upper bound always fits the data. */
  min: number;
  decimals: number;
}

function panelPath(vals: (number | null)[], xs: number[], y: (v: number) => number) {
  // Gaps are gaps: a run that did not measure convergence must break the line
  // rather than be interpolated across, which would invent a reading.
  const out: string[] = [];
  let pen = false;
  vals.forEach((v, i) => {
    if (v === null) { pen = false; return; }
    out.push(`${pen ? 'L' : 'M'}${xs[i].toFixed(1)} ${y(v).toFixed(1)}`);
    pen = true;
  });
  return out.join(' ');
}

function Chart({ panel, xs, times }: { panel: Panel; xs: number[]; times: number[] }) {
  const present = panel.values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;

  const hi = Math.max(...present, panel.reference?.value ?? -Infinity, panel.flagAtOrAbove ?? -Infinity);
  const lo = panel.min;
  const span = Math.max(hi - lo, 1) * 1.15;
  const y = (v: number) => PAD.top + (1 - (v - lo) / span) * (H - PAD.top - PAD.bottom);

  const lastIdx = panel.values.reduce<number>((acc, v, i) => (v !== null ? i : acc), -1);
  const firstIdx = panel.values.findIndex((v) => v !== null);
  const fmt = (v: number) => v.toFixed(panel.decimals);

  return (
    <figure className="m-0">
      <figcaption className="t-mono mb-2 text-[var(--ash)]">
        {panel.title} <span className="opacity-60">({panel.unit})</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${panel.title} across ${present.length} screenings, from ${fmt(present[0])} to ${fmt(present[present.length - 1])} ${panel.unit}. The table below lists every value.`}
      >
        {/* Recessive frame: a single baseline rule, no boxed grid. */}
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
              stroke="var(--line)" strokeWidth="1" />

        {panel.flagAtOrAbove !== undefined && (
          <>
            <line x1={PAD.left} y1={y(panel.flagAtOrAbove)} x2={W - PAD.right} y2={y(panel.flagAtOrAbove)}
                  stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="2 5" />
            <text x={W - PAD.right + 6} y={y(panel.flagAtOrAbove) + 3.5}
                  className="t-mono" fill="var(--ash)" fontSize="9">
              cut {fmt(panel.flagAtOrAbove)} {panel.unit === 'cm' ? 'cm' : ''}
            </text>
          </>
        )}

        {panel.reference && (
          <>
            <line x1={PAD.left} y1={y(panel.reference.value)} x2={W - PAD.right} y2={y(panel.reference.value)}
                  stroke="var(--line-strong)" strokeWidth="1" />
            <text x={W - PAD.right + 6} y={y(panel.reference.value) + 3.5}
                  className="t-mono" fill="var(--ash)" fontSize="9">
              {panel.reference.label}
            </text>
          </>
        )}

        <path d={panelPath(panel.values, xs, y)} fill="none" stroke="var(--terra)" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round" />

        {panel.values.map((v, i) => {
          if (v === null) return null;
          const flagged = panel.flagAtOrAbove !== undefined && v >= panel.flagAtOrAbove;
          return (
            <g key={times[i]}>
              {/* A 2px ring in the surface colour keeps overlapping marks legible. */}
              <circle cx={xs[i]} cy={y(v)} r="5.5" fill="var(--paper)" />
              <circle cx={xs[i]} cy={y(v)} r={flagged ? 4.5 : 3.5}
                      fill={flagged ? 'none' : 'var(--terra)'}
                      stroke="var(--terra)" strokeWidth={flagged ? 2 : 0} />
            </g>
          );
        })}

        {/* Label the ends only; a number on every point is noise. */}
        {[firstIdx, lastIdx].filter((i, n, a) => i >= 0 && a.indexOf(i) === n).map((i) => (
          <text key={i} x={xs[i]} y={y(panel.values[i]!) - 11}
                textAnchor={i === lastIdx && i !== firstIdx ? 'end' : 'start'}
                className="t-mono" fill="var(--ink)" fontSize="10">
            {fmt(panel.values[i]!)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export default function Trajectory({ records }: { records: readonly ScreeningRecord[] }) {
  const runs = [...records].sort((a, b) => a.at - b.at);
  if (runs.length < 2) return null;

  const times = runs.map((r) => r.at);
  const t0 = times[0];
  const t1 = times[times.length - 1];
  const spanMs = Math.max(t1 - t0, 1);
  // Real elapsed time on the x-axis: a gap of nine days should look like one.
  const xs = times.map((t) => PAD.left + ((t - t0) / spanMs) * (W - PAD.left - PAD.right));

  const base = runs.find((r) => r.kind === 'baseline') ?? null;
  const day = (t: number) =>
    new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <section className="mt-10 border-t border-[var(--line)] pt-6">
      <h3 className="t-mono mb-5 text-[var(--ash)]">Your screenings over time</h3>

      <div className="grid gap-7">
        <Chart
          panel={{
            title: 'Symptom score', unit: '0–132', min: 0, decimals: 0,
            values: runs.map((r) => r.pcssTotal),
            reference: base ? { value: base.pcssTotal, label: 'baseline' } : undefined,
          }}
          xs={xs} times={times}
        />
        <Chart
          panel={{
            title: 'Near point of convergence', unit: 'cm', min: 0, decimals: 1,
            values: runs.map((r) => r.npcCm),
            flagAtOrAbove: NPC_ABNORMAL_CM,
            reference: base?.npcCm != null ? { value: base.npcCm, label: 'baseline' } : undefined,
          }}
          xs={xs} times={times}
        />
      </div>

      <p className="t-mono mt-1 text-[var(--ash)]">
        {day(t0)} — {day(t1)}
      </p>

      <table className="mt-6 w-full border-collapse text-left">
        <caption className="sr-only">
          Every recorded screening, with its symptom score and near point of convergence.
        </caption>
        <thead>
          <tr className="t-mono text-[var(--ash)]">
            <th scope="col" className="border-b border-[var(--line)] pb-2 font-normal">Date</th>
            <th scope="col" className="border-b border-[var(--line)] pb-2 font-normal">Kind</th>
            <th scope="col" className="border-b border-[var(--line)] pb-2 text-right font-normal">Symptoms</th>
            <th scope="col" className="border-b border-[var(--line)] pb-2 text-right font-normal">NPC</th>
            <th scope="col" className="border-b border-[var(--line)] pb-2 text-right font-normal">Provoked</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="t-body">
              <td className="border-b border-[var(--line)] py-2">{day(r.at)}</td>
              <td className="border-b border-[var(--line)] py-2">
                {r.kind === 'baseline' ? 'Baseline' : 'Screening'}
              </td>
              <td className="t-mono border-b border-[var(--line)] py-2 text-right">{r.pcssTotal}</td>
              <td className="t-mono border-b border-[var(--line)] py-2 text-right">
                {r.npcCm === null ? 'not measured' : `${r.npcCm.toFixed(1)} cm`}
              </td>
              <td className="t-mono border-b border-[var(--line)] py-2 text-right">{r.provokedCount}/7</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
