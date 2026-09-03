import { useCallback, useEffect, useState } from 'react';

export type Room = 'landing' | 'prepare' | 'screen' | 'findings';

/** The three named rooms, in the order they are walked. */
export const SCREENING_ROOMS: readonly { id: Room; name: string; job: string }[] = [
  { id: 'prepare', name: 'Prepare', job: 'Set up, and say how you feel right now' },
  { id: 'screen', name: 'Screen', job: 'Seven tasks, rated as you go' },
  { id: 'findings', name: 'Findings', job: 'What was measured, and what to do' },
] as const;

/** The dim rooms cap luminance and stop motion. Set on <html> so it reaches
 *  the scrollbar, form controls and anything portalled outside the tree. */
export function useRoom(initial: Room = 'landing') {
  const [room, setRoom] = useState<Room>(initial);

  useEffect(() => {
    const el = document.documentElement;
    const calm = room !== 'landing';
    if (calm) el.setAttribute('data-room', 'calm');
    else el.removeAttribute('data-room');
    el.style.setProperty('color-scheme', calm ? 'dark' : 'light');
  }, [room]);

  const go = useCallback((next: Room) => setRoom(next), []);
  return { room, go };
}
