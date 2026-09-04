/*  A 0-10 symptom rating, the way the paper instrument asks for it.
 *
 *  Eleven discrete targets rather than a slider: dragging a thumb is a fine
 *  motor task, and this is answered by someone with a headache who may be
 *  keyboard-only. Rendered as a real radiogroup so arrow keys work and a
 *  screen reader announces the scale rather than eleven unlabelled buttons.
 *
 *  Severity is never carried by colour alone — the number is always visible
 *  and the ends of the scale are named in words.
 */

export default function RatingScale({
  label,
  value,
  onChange,
  lowLabel = 'None',
  highLabel = 'Severe',
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  const name = `rating-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div role="radiogroup" aria-label={`${label}, 0 to 10`}>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <span className="t-body text-[var(--ink)]">{label}</span>
        <span className="t-mono text-[var(--ash)]">
          {value === null ? 'Not answered' : `${value} / 10`}
        </span>
      </div>

      {/* Wraps to two rows on narrow screens rather than shrinking targets
          below what someone with a headache can reliably hit — as a grid, so
          the wrapped steps keep the same width as the ones above them. A
          severity scale whose last steps are visually wider is a scale that
          misreports its own intervals. */}
      <div className="grid grid-cols-6 gap-[3px] sm:grid-cols-11">
        {Array.from({ length: 11 }, (_, n) => {
          const active = value !== null && n <= value;
          const selected = value === n;
          return (
            <label key={n} className="group relative cursor-pointer">
              {/* The input is visually hidden but focusable; `peer` carries its
                  focus state to the segment, because a focus ring painted on a
                  1px-clipped element is a focus ring nobody can see. */}
              <input
                type="radio"
                name={name}
                value={n}
                checked={selected}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="block h-11 border transition-colors duration-200 group-hover:border-[var(--terra)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--terra)]"
                style={{
                  background: active ? 'var(--terra)' : 'transparent',
                  borderColor: selected ? 'var(--paper)' : active ? 'var(--terra)' : 'var(--line-strong)',
                  // Marked in the room's own ground, not in ink: ink on the
                  // amber fill measures 1.98:1, under the 3:1 floor for a
                  // control's state indicator.
                  boxShadow: selected ? 'inset 0 0 0 2px var(--paper)' : undefined,
                }}
              />
              {/* Only the anchors are labelled; eleven numerals under every
                  scale is more to read than the scale is worth. */}
              <span
                className="t-mono mt-1 block text-center"
                style={{ color: 'var(--ash)', visibility: n % 5 === 0 ? 'visible' : 'hidden' }}
                aria-hidden="true"
              >
                {n}
              </span>
            </label>
          );
        })}
      </div>

      <div className="t-mono mt-1 flex justify-between" style={{ color: 'var(--ash)' }}>
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
