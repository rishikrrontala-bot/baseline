import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/motion';

/*  The mark.
 *
 *  Not a face and not a mascot — a graduated aperture, drawn the way a
 *  perimetry chart is drawn. A target moves; the pupil follows it late.
 *
 *  That lateness is the entire idea. Healthy smooth pursuit tracks a moving
 *  target with a gain near 1.0 and almost no phase lag. After a concussion the
 *  gain drops and the lag grows, and the eye starts making little corrective
 *  jumps to catch up. So the hero is not decoration standing in for the
 *  product — it is the product's stimulus, running live, with the error signal
 *  between target and pupil drawn as the thin line the test actually measures.
 */

const SPRING = 0.055; // pursuit gain — deliberately under 1
const DAMP = 0.78;
const MAX_EXCURSION = 74; // px in viewBox units the pupil may travel from centre

export default function Aperture({ className = '' }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const pupil = useRef<SVGGElement>(null);
  const target = useRef<SVGGElement>(null);
  const error = useRef<SVGLineElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = wrap.current;
    if (!el || reduced) return undefined;

    // Target position and pupil position, both in viewBox units from centre.
    let tx = 0, ty = 0;
    let px = 0, py = 0, vx = 0, vy = 0;
    let raf = 0;
    let live = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      // Map the whole viewport onto the aperture's excursion range, so the
      // target sweeps the full field rather than only inside the graphic.
      const nx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      let x = clamp(nx) * MAX_EXCURSION * 1.25;
      let y = clamp(ny) * MAX_EXCURSION * 1.25;
      // The target lives inside the same field the pupil can reach. Clamping
      // them to different radii would leave a permanent gap between the two at
      // the corners, and the error line would read that gap as pursuit lag
      // forever — reporting a deficit that is really just clipping.
      const m = Math.hypot(x, y);
      if (m > MAX_EXCURSION) { x = (x / m) * MAX_EXCURSION; y = (y / m) * MAX_EXCURSION; }
      tx = x; ty = y;
      live = true;
    };

    const tick = () => {
      vx = (vx + (tx - px) * SPRING) * DAMP;
      vy = (vy + (ty - py) * SPRING) * DAMP;
      px += vx;
      py += vy;
      const cx = px, cy = py;

      pupil.current?.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)})`);
      target.current?.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`);
      if (error.current && live) {
        error.current.setAttribute('x1', cx.toFixed(2));
        error.current.setAttribute('y1', cy.toFixed(2));
        error.current.setAttribute('x2', tx.toFixed(2));
        error.current.setAttribute('y2', ty.toFixed(2));
        error.current.style.opacity = Math.min(0.5, Math.hypot(tx - cx, ty - cy) / 90).toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const long = i % 4 === 0;
    const r0 = long ? 150 : 156;
    return {
      x1: Math.cos(a) * r0, y1: Math.sin(a) * r0,
      x2: Math.cos(a) * 163, y2: Math.sin(a) * 163,
      o: long ? 0.34 : 0.16,
    };
  });

  return (
    <div ref={wrap} className={className} aria-hidden="true">
      <svg viewBox="-200 -200 400 400" className="h-full w-full overflow-visible">
        <g stroke="currentColor" fill="none">
          {/* Graduated surround — the instrument's scale. */}
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeWidth="1" opacity={t.o} />
          ))}
          <circle r="163" strokeWidth="1" opacity="0.18" />
          <circle r="118" strokeWidth="1" opacity="0.13" strokeDasharray="2 7" />
          <circle r="74" strokeWidth="1" opacity="0.16" />
          {/* Axes — the horizontal and vertical meridians of the visual field. */}
          <line x1="-163" y1="0" x2="163" y2="0" strokeWidth="1" opacity="0.09" />
          <line x1="0" y1="-163" x2="0" y2="163" strokeWidth="1" opacity="0.09" />
        </g>

        {/* Retinal error — the distance the pupil has yet to close. */}
        <line
          ref={error}
          x1="0" y1="0" x2="0" y2="0"
          stroke="currentColor" strokeWidth="1" strokeDasharray="3 4"
          style={{ opacity: 0 }}
        />

        {/* The target being pursued. */}
        <g ref={target}>
          <circle r="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <circle r="1.6" fill="currentColor" opacity="0.5" />
        </g>

        {/* The pupil, trailing. */}
        <g ref={pupil}>
          <circle r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.22" />
          <circle r="15" fill="var(--terra)" />
        </g>
      </svg>
    </div>
  );
}
