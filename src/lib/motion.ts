import { useEffect, useState } from 'react';

/** True when the visitor has asked the OS for less motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Pointer position in viewport pixels. Null until the pointer first moves, so
 *  the aperture rests centred for keyboard and touch visitors rather than
 *  snapping to a phantom origin. */
export function usePointer(enabled: boolean) {
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const on = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      setPt({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, [enabled]);
  return pt;
}

/** Real viewport unit — iOS reports 100vh including chrome that then retracts. */
export function useViewportUnit() {
  useEffect(() => {
    const set = () =>
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    set();
    window.addEventListener('resize', set);
    return () => window.removeEventListener('resize', set);
  }, []);
}
