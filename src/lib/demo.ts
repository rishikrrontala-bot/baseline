import type { ConvergenceSample } from './clinical/npc';
import { IRIS_DIAMETER_MM, EYE_ROTATION_RADIUS_MM } from './clinical/npc';

/*  Demo mode: ?demo=1
 *
 *  Walks the entire screening without a camera, so the flow can be reviewed
 *  on a machine with no webcam or no wish to enable one. It is always
 *  announced on screen — synthetic numbers presented as real measurements
 *  would be exactly the dishonesty this product is arguing against.
 */

export function isDemo(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('demo') === '1';
}

/** Synthesise the iris geometry of an eye fixating at a given distance. */
export function syntheticConvergence(distanceCm: number | null, ipdMm = 63): ConvergenceSample {
  const irisPx = 34;
  const mmPerPx = IRIS_DIAMETER_MM / irisPx;
  let ipdNowMm = ipdMm;
  if (distanceCm !== null) {
    const theta = Math.atan(ipdMm / 2 / (distanceCm * 10));
    ipdNowMm = ipdMm - 2 * EYE_ROTATION_RADIUS_MM * Math.sin(theta);
  }
  const halfPx = ipdNowMm / mmPerPx / 2;
  return {
    left: { irisCentre: { x: 640 - halfPx, y: 360 }, irisDiameterPx: irisPx },
    right: { irisCentre: { x: 640 + halfPx, y: 360 }, irisDiameterPx: irisPx },
  };
}

/** The reference the demo compares against, and the break it reports. */
export const DEMO_FAR_REFERENCE = syntheticConvergence(null);
export const DEMO_NEAR_BREAK = syntheticConvergence(8.4);
