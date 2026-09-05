/*  The mark.
 *
 *  An eye resting on a baseline, and a letterform resting on a typographic
 *  one. The ring is tangent to the rule rather than crossing it, so it sits on
 *  the line the way type does, and the pupil is off centre because the whole
 *  instrument measures drift from where you started.
 *
 *  Stroke is currentColor so the mark inherits whichever room it is in, and
 *  the pupil is var(--terra) so it becomes amber in the dim rooms and black
 *  on the printed handoff, where colour cannot be relied on at all.
 */

export function Mark({ className = '', title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="square">
        <circle cx="50" cy="46" r="30" />
        <line x1="4" y1="76" x2="96" y2="76" />
      </g>
      <circle cx="59.5" cy="39" r="10.5" fill="var(--terra)" />
    </svg>
  );
}

/**
 * Mark and wordmark sharing one rule.
 *
 * Composited in a single SVG rather than as a mark beside underlined text.
 * The first attempt did the latter, and the wordmark's border sat 4.57px below
 * the mark's rule at two different stroke weights, which reads as two lines
 * and loses the entire idea. Here the circle bottom (cy 46 + r 30), the rule,
 * and the type baseline are all literally y=76 in one coordinate space, so
 * they cannot drift apart at any size.
 */
export default function Logo({
  className = '',
  size = 30,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 364 100"
      className={className}
      style={{ height: size * 1.34, width: 'auto' }}
      role="img"
      aria-label="Baseline"
    >
      <title>Baseline</title>
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="square">
        <circle cx="50" cy="46" r="30" />
        <line x1="4" y1="76" x2="360" y2="76" />
      </g>
      <circle cx="59.5" cy="39" r="10.5" fill="var(--terra)" />
      <text
        x="126"
        y="76"
        fill="currentColor"
        fontFamily="'Bodoni Moda', Didot, 'Bodoni MT', Georgia, serif"
        fontSize="62"
        letterSpacing="-1"
        textLength="230"
        lengthAdjust="spacingAndGlyphs"
      >
        Baseline
      </text>
    </svg>
  );
}
