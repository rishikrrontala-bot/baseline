import type { ReactNode } from 'react';
import { SCREENING_ROOMS, type Room } from '../lib/room';

/*  The chrome every dim room shares: which room you are standing in, the one
 *  job it holds, and the way out. Nothing here ever moves or reflows between
 *  rooms — only the centre changes.
 */

export default function RoomFrame({
  room,
  heading,
  children,
  action,
  onLeave,
}: {
  room: Exclude<Room, 'landing'>;
  heading: string;
  children: ReactNode;
  action?: ReactNode;
  onLeave: () => void;
}) {
  return (
    <div
      className="gutter flex flex-col bg-calm-bg pb-[clamp(20px,3.5vh,36px)] pt-[clamp(20px,3.5vh,36px)]"
      style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
    >
      {/* Which room you are standing in. Navigation, not a label on the heading. */}
      <header className="flex items-start justify-between gap-6">
        <nav aria-label="Screening progress">
          <ol className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {SCREENING_ROOMS.map((r) => {
              const here = r.id === room;
              return (
                <li key={r.id} className="flex items-center gap-5">
                  <span
                    className="t-mono"
                    style={{ color: here ? 'var(--terra)' : 'var(--ash)' }}
                    aria-current={here ? 'step' : undefined}
                  >
                    {r.name}
                    {here && <span className="sr-only"> — current room</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <button
          type="button"
          onClick={onLeave}
          className="t-action shrink-0 text-calm-mute underline underline-offset-4 transition-colors duration-300 hover:text-calm-text"
        >
          Stop
        </button>
      </header>

      {/* The one job this room holds. */}
      <main className="flex flex-1 flex-col justify-center py-[clamp(20px,4vh,44px)]">
        <h1
          className="t-display mb-[clamp(18px,3vh,32px)] max-w-[26ch] text-balance text-calm-text"
          style={{ fontSize: 'clamp(30px, 4vw, 58px)' }}
        >
          {heading}
        </h1>
        {children}
      </main>

      {action ? <footer className="mt-auto">{action}</footer> : null}
    </div>
  );
}
