/**
 * Near point of convergence, in centimetres, from iris geometry alone.
 *
 * WHY THIS WORKS WITHOUT CAMERA CALIBRATION
 * -----------------------------------------
 * Turning pixels into millimetres normally needs the camera's focal length,
 * which a browser cannot read. But the horizontal visible iris diameter
 * (HVID) is one of the most stable dimensions in human anatomy — about
 * 11.7 mm, SD ~0.5 mm, and essentially independent of age, sex and
 * ethnicity. The iris therefore *is* a ruler, and it is lying in the image
 * at exactly the depth we want to measure. Dividing 11.7 mm by the iris's
 * pixel width gives millimetres-per-pixel at the eye plane directly, so the
 * whole measurement is self-calibrating.
 *
 * THE GEOMETRY
 * ------------
 * Fixating a target at distance D makes each eye rotate nasally by angle t,
 * where tan(t) = (IPD/2) / D. Rotating the globe by t moves the iris centre
 * across the image by R * sin(t), with R the distance from the eye's centre
 * of rotation to the iris plane (~12 mm). So, measuring the nasal shift d of
 * each iris away from its far-fixation position:
 *
 *     t = asin(d / R)
 *     D = (IPD / 2) / tan(t)
 *
 * IPD itself is measured in the same self-calibrated millimetres, so no
 * population average is assumed for the one dimension that genuinely varies
 * a lot between people.
 *
 * WHAT THIS IS NOT
 * ----------------
 * This estimates where the eyes are *converged to*. Clinical NPC is the
 * distance at which the person reports the target doubling — a subjective
 * break point. The camera cannot know when someone sees double, so the
 * person still reports the break and this module answers "how far away was
 * the fixation point at that moment." Error sources are enumerated in
 * docs/LIMITATIONS.md and are not small.
 *
 * Sources:
 *  - Rufer F, Schroder A, Erb C. "White-to-white corneal diameter."
 *    Cornea 2005;24(3):259-261. (HVID ~11.7 mm, low variance.)
 *  - Mucha A, et al. Am J Sports Med 2014;42(10):2479-2486. (NPC cut point.)
 */

/** Horizontal visible iris diameter, millimetres. The ruler. */
export const IRIS_DIAMETER_MM = 11.7;

/** Centre of ocular rotation to the iris plane, millimetres. */
export const EYE_ROTATION_RADIUS_MM = 12.0;

/** Beyond this the convergence angle is too small to resolve from landmarks. */
export const MAX_RESOLVABLE_CM = 100;

export interface Point2 {
  x: number;
  y: number;
}

export interface EyeSample {
  /** Iris centre, in the same pixel space as irisDiameterPx. */
  irisCentre: Point2;
  /** Horizontal iris width in pixels. The scale reference. */
  irisDiameterPx: number;
}

export interface ConvergenceSample {
  left: EyeSample;
  right: EyeSample;
}

export type NpcQuality = 'ok' | 'beyond_range' | 'implausible' | 'insufficient_signal';

export interface NpcEstimate {
  /** Fixation distance from the eyes, centimetres. Null when not resolvable. */
  cm: number | null;
  /** Mean convergence angle per eye, degrees. */
  convergenceDeg: number;
  /** Self-calibrated interpupillary distance at far fixation, millimetres. */
  ipdMm: number;
  /** Millimetres per pixel derived from the iris, at the eye plane. */
  mmPerPx: number;
  quality: NpcQuality;
}

function dist(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Millimetres per pixel from both irises. Averaged because one iris is often
 * partly occluded by the lids or foreshortened by head yaw, and averaging is
 * a cheap way to keep a single bad frame from halving the scale.
 */
export function mmPerPixel(sample: ConvergenceSample): number {
  const px = (sample.left.irisDiameterPx + sample.right.irisDiameterPx) / 2;
  if (!Number.isFinite(px) || px <= 0) return 0;
  return IRIS_DIAMETER_MM / px;
}

/**
 * Estimate fixation distance by comparing a near-fixation sample against a
 * far-fixation reference captured with the person looking at something across
 * the room (where the visual axes are effectively parallel).
 */
export function estimateNpc(
  farReference: ConvergenceSample,
  nearSample: ConvergenceSample,
): NpcEstimate {
  const mmPerPx = mmPerPixel(nearSample);
  const farMmPerPx = mmPerPixel(farReference);

  const farIpdPx = dist(farReference.left.irisCentre, farReference.right.irisCentre);
  const ipdMm = farIpdPx * farMmPerPx;

  const fail = (quality: NpcQuality): NpcEstimate => ({
    cm: null,
    convergenceDeg: 0,
    ipdMm,
    mmPerPx,
    quality,
  });

  if (mmPerPx <= 0 || farMmPerPx <= 0 || !Number.isFinite(ipdMm) || ipdMm <= 0) {
    return fail('insufficient_signal');
  }

  const nearIpdPx = dist(nearSample.left.irisCentre, nearSample.right.irisCentre);

  // Convergence narrows the *measured* interpupillary distance. Working from
  // the IPD change rather than each iris's absolute position means a head
  // that drifts sideways between the two samples cancels out, since both
  // irises translate together and the distance between them does not change.
  const farIpdMm = farIpdPx * farMmPerPx;
  const nearIpdMm = nearIpdPx * mmPerPx;
  const narrowingMm = farIpdMm - nearIpdMm;

  if (narrowingMm <= 0) return fail('beyond_range');

  // Split the narrowing between the two eyes; each contributes d of nasal shift.
  const dPerEye = narrowingMm / 2;
  if (dPerEye >= EYE_ROTATION_RADIUS_MM) return fail('implausible');

  const theta = Math.asin(dPerEye / EYE_ROTATION_RADIUS_MM);
  if (!Number.isFinite(theta) || theta <= 0) return fail('beyond_range');

  const distanceMm = ipdMm / 2 / Math.tan(theta);
  const cm = distanceMm / 10;

  if (!Number.isFinite(cm) || cm <= 0) return fail('implausible');
  if (cm > MAX_RESOLVABLE_CM) {
    return { cm: null, convergenceDeg: (theta * 180) / Math.PI, ipdMm, mmPerPx, quality: 'beyond_range' };
  }

  return { cm, convergenceDeg: (theta * 180) / Math.PI, ipdMm, mmPerPx, quality: 'ok' };
}

/**
 * Clinical NPC is the average of repeated trials. Trials that failed to
 * resolve are dropped rather than counted as zero, and the count of usable
 * trials is returned so the UI can say how much the average rests on.
 */
export function averageNpc(estimates: readonly NpcEstimate[]): {
  cm: number | null;
  usableTrials: number;
} {
  const usable = estimates.filter((e) => e.quality === 'ok' && e.cm !== null);
  if (usable.length === 0) return { cm: null, usableTrials: 0 };
  const sum = usable.reduce((acc, e) => acc + (e.cm as number), 0);
  return { cm: sum / usable.length, usableTrials: usable.length };
}
