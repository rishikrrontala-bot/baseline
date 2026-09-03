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
        <span className="t-body text-calm-text">{label}</span>
        <span className="t-mono text-calm-mute">
          {value === null ? 'Not answered' : `${value} / 10`}
        </span>
      </div>

      <div className="flex gap-[3px]">
        {Array.from({ length: 11 }, (_, n) => {
          const active = value !== null && n <= value;
          const selected = value === n;
          return (
            <label
              key={n}
              className="group relative flex-1 cursor-pointer"
              style={{ minWidth: 0 }}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={selected}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="block h-9 border transition-colors duration-200 group-hover:border-[var(--terra)]"
                style={{
                  background: active ? 'var(--terra)' : 'transparent',
                  borderColor: selected ? 'var(--ink)' : active ? 'var(--terra)' : 'var(--line)',
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
