import { useEffect, useRef } from 'react';
import { targetAt, TASK_TIMING } from '../lib/clinical/tasks';
import type { VomsTaskId } from '../lib/clinical/voms';

/*  The stimulus field.
 *
 *  This is the one place in the dim rooms where anything moves, and the
 *  movement is the measurement itself: the person's eyes are supposed to
 *  follow it. It is always started by the person, always stoppable, and the
 *  field is otherwise empty so nothing competes with the target.
 *
 *  Drawn to canvas rather than animated DOM so the target's position is
 *  exact on every frame — a CSS transition would interpolate on its own
 *  schedule and quietly change the stimulus the protocol specifies.
 */

const AMPLITUDE = 0.78; // fraction of the half-field the target travels

export default function Stimulus({
  taskId,
  running,
  startedAt,
  onBeat,
}: {
  taskId: VomsTaskId;
  running: boolean;
  startedAt: number | null;
  onBeat?: (beat: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const lastBeat = useRef(-1);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    if (!ctx) return undefined;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (el.width !== w * dpr || el.height !== h * dpr) {
        el.width = w * dpr;
        el.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const rx = (w / 2) * AMPLITUDE;
      const ry = (h / 2) * AMPLITUDE;

      const elapsed = running && startedAt !== null ? performance.now() - startedAt : 0;
      const s = targetAt(taskId, elapsed);

      if (s.beat !== lastBeat.current) {
        lastBeat.current = s.beat;
        if (running) onBeat?.(s.beat);
      }

      const dot = (x: number, y: number, lit: boolean, r = 11) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        if (lit) {
          ctx.fillStyle = getComputedStyle(el).getPropertyValue('--terra') || '#B8794A';
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(201,191,182,0.26)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      };

      if (!s.visible) {
        // Convergence: the fixation target is the person's own fingertip.
        ctx.strokeStyle = 'rgba(201,191,182,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 26, cy);
        ctx.lineTo(cx + 26, cy);
        ctx.moveTo(cx, cy - 26);
        ctx.lineTo(cx, cy + 26);
        ctx.stroke();
      } else if (taskId === 'saccades_horizontal') {
        // Both endpoints stay visible; only the one being looked at is lit.
        dot(cx - rx, cy, s.x < 0);
        dot(cx + rx, cy, s.x > 0);
      } else if (taskId === 'saccades_vertical') {
        dot(cx, cy - ry, s.y < 0);
        dot(cx, cy + ry, s.y > 0);
      } else {
        dot(cx + s.x * rx, cy + s.y * ry, true);
      }

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf.current);
  }, [taskId, running, startedAt, onBeat]);

  return (
    <div
      className="relative w-full border border-[var(--line)]"
      style={{ height: 'clamp(200px, 34vh, 320px)' }}
    >
      <canvas ref={canvas} className="h-full w-full" aria-hidden="true" />
      <p className="sr-only" role="status">
        {running ? TASK_TIMING[taskId].cue : 'Task not started.'}
      </p>
    </div>
  );
}
