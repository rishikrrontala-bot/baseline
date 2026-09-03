import { useRef } from 'react';

/*  The threshold.
 *
 *  Crossing into the screening is not a theme toggle hidden in settings. The
 *  product says out loud that it is dimming the room and stopping every
 *  moving thing, and why it is doing that — because light sensitivity and
 *  motion sensitivity are two of the symptoms it is about to measure, and an
 *  interface that provokes them corrupts its own reading.
 *
 *  It is also reversible and skippable. Someone who is not photophobic should
 *  not be trapped in a dim room, and someone mid-migraine should not have to
 *  sit through an animation to get out.
 */

const LINES = [
  'Dimming the room.',
  'Stopping all motion.',
  'Nothing you do here leaves this device.',
];

export default function Threshold({ onDone }: { onDone: () => void }) {
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  return (
    <section
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-calm-bg px-6"
      style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Entering the screening"
    >
      <div className="w-full max-w-[46ch]">
        <ul className="space-y-4">
          {LINES.map((line) => (
            <li key={line} className="t-lead text-calm-text">
              {line}
            </li>
          ))}
        </ul>

        <p className="t-body mt-8 max-w-[52ch] text-calm-mute">
          Light sensitivity and motion sensitivity are two of the things this screening
          measures. An interface that provokes them would corrupt its own reading, so the
          rooms ahead are dim and still by design — not as a preference you have to find.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <button
            type="button"
            onClick={finish}
            className="t-action border border-[var(--line-strong)] px-6 py-4 text-calm-text transition-colors duration-300 hover:border-calm-amber hover:text-calm-amber"
          >
            Go on
          </button>
          <button
            type="button"
            onClick={finish}
            className="t-action text-calm-mute underline underline-offset-4 transition-colors duration-300 hover:text-calm-text"
          >
            Skip this
          </button>
        </div>
      </div>
    </section>
  );
}
