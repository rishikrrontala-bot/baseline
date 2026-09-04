import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { ConvergenceSample } from './clinical/npc';

/*  The camera loop.
 *
 *  Everything here runs on this device. The WASM runtime and the model are
 *  served from this app's own origin (public/mp/), so no frame, landmark or
 *  request reaches a third party — including at load time, which is the part
 *  most "on-device" claims quietly skip by pulling the model from a CDN.
 *
 *  Frames are read and discarded. Nothing is recorded, buffered to disk, or
 *  kept after the numbers are extracted.
 */

// 478-point mesh: iris landmarks exist only in the refined set.
const L_IRIS_CENTRE = 468;
const L_IRIS_RIGHT = 469;
const L_IRIS_LEFT = 471;
const R_IRIS_CENTRE = 473;
const R_IRIS_RIGHT = 474;
const R_IRIS_LEFT = 476;

export interface HeadPose {
  /** Degrees. Positive yaw = turned to the subject's left. */
  yaw: number;
  pitch: number;
  roll: number;
}

export interface TrackerSample {
  timestampMs: number;
  convergence: ConvergenceSample;
  head: HeadPose;
  /** 0..1 per eye, from the model's blendshapes. */
  blink: { left: number; right: number };
  /** Normalised gaze offsets, a second opinion independent of iris geometry. */
  gaze: { horizontal: number; vertical: number };
}

export type TrackerStatus =
  | 'idle'
  | 'loading_model'
  | 'requesting_camera'
  | 'running'
  | 'no_face'
  | 'error';

/*  Why the camera did not start.
 *
 *  "It didn't work" is not a finding. A denied permission, a camera another
 *  app is holding, a machine with no camera at all and a model that failed to
 *  load are four different problems with four different remedies, and the
 *  person in front of the screen is the only one who can act on any of them.
 *  Collapsing them into one message is the same refusal to distinguish that
 *  this product exists to avoid.
 */
export type TrackerFault =
  | 'model_load'
  | 'insecure_origin'
  | 'unsupported'
  | 'permission'
  | 'no_device'
  | 'device_busy'
  | 'constraints'
  | 'playback'
  | 'unknown';

export interface TrackerFaultInfo {
  fault: TrackerFault;
  /** The underlying error name and message, kept for the diagnostics line. */
  detail: string;
}

/** Map a getUserMedia rejection to the thing the person actually has to fix. */
export function classifyCameraError(err: unknown): TrackerFault {
  const name = (err as { name?: string })?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'permission';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'no_device';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'device_busy';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'constraints';
    case 'SecurityError':
      return 'insecure_origin';
    default:
      return 'unknown';
  }
}

function blend(cats: { categoryName?: string; score: number }[] | undefined, name: string): number {
  if (!cats) return 0;
  const hit = cats.find((c) => c.categoryName === name);
  return hit ? hit.score : 0;
}

/** Yaw/pitch/roll from the model's 4x4 facial transformation matrix (column-major). */
function poseFromMatrix(m: number[] | undefined): HeadPose {
  if (!m || m.length < 16) return { yaw: 0, pitch: 0, roll: 0 };
  const r00 = m[0], r02 = m[8];
  const r10 = m[1], r12 = m[9];
  const r22 = m[10];
  const deg = (r: number) => (r * 180) / Math.PI;
  // Guard the gimbal-lock branch rather than emitting NaN at extreme pitch.
  const sy = Math.hypot(r00, r10);
  if (sy < 1e-6) {
    return { yaw: deg(Math.atan2(-r02, sy)), pitch: deg(Math.atan2(-r12, r22)), roll: 0 };
  }
  return {
    yaw: deg(Math.atan2(-r02, sy)),
    pitch: deg(Math.atan2(r12, r22)),
    roll: deg(Math.atan2(r10, r00)),
  };
}

export class Tracker {
  private landmarker: FaceLandmarker | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private raf = 0;
  private lastTs = -1;

  status: TrackerStatus = 'idle';
  fault: TrackerFaultInfo | null = null;
  onSample: ((s: TrackerSample) => void) | null = null;
  onStatus: ((s: TrackerStatus) => void) | null = null;
  onFault: ((f: TrackerFaultInfo) => void) | null = null;

  private fail(fault: TrackerFault, err: unknown) {
    const e = err as { name?: string; message?: string };
    this.fault = { fault, detail: `${e?.name ?? 'Error'}: ${e?.message ?? String(err)}` };
    this.onFault?.(this.fault);
    this.setStatus('error');
  }

  private setStatus(s: TrackerStatus) {
    this.status = s;
    this.onStatus?.(s);
  }

  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    this.fault = null;

    // getUserMedia only exists in a secure context. Saying so beats a browser
    // that simply reports the API as missing.
    if (!window.isSecureContext) {
      this.fail('insecure_origin', new Error('Page is not a secure context'));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail('unsupported', new Error('navigator.mediaDevices.getUserMedia is unavailable'));
      return;
    }

    try {
      this.setStatus('loading_model');
      const fileset = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mp/wasm`);
      this.landmarker = await this.createLandmarker(fileset);
    } catch (err) {
      this.fail('model_load', err);
      return;
    }

    try {
      this.setStatus('requesting_camera');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
    } catch (err) {
      this.fail(classifyCameraError(err), err);
      return;
    }

    try {
      video.srcObject = this.stream;
      await video.play();
    } catch (err) {
      this.fail('playback', err);
      return;
    }

    this.setStatus('running');
    this.loop();
  }

  /** GPU first, CPU second. A machine without a usable GL delegate should run
   *  the screening slower, not refuse to run it. */
  private async createLandmarker(fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>) {
    const opts = {
      modelAssetPath: `${import.meta.env.BASE_URL}mp/models/face_landmarker.task`,
    };
    const common = {
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    };
    try {
      return await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { ...opts, delegate: 'GPU' },
        ...common,
      });
    } catch {
      return await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { ...opts, delegate: 'CPU' },
        ...common,
      });
    }
  }

  private loop = () => {
    const video = this.video;
    const lm = this.landmarker;
    if (!video || !lm) return;

    // A repeated timestamp makes detectForVideo throw; skip until the frame moves on.
    const ts = performance.now();
    if (video.readyState >= 2 && ts !== this.lastTs) {
      this.lastTs = ts;
      const res = lm.detectForVideo(video, ts);
      const pts = res.faceLandmarks?.[0];

      if (!pts || pts.length < 478) {
        if (this.status !== 'no_face') this.setStatus('no_face');
      } else {
        if (this.status !== 'running') this.setStatus('running');

        // Landmarks are normalised to the frame, so x and y must be scaled by
        // width and height separately — treating them as square would skew
        // every distance by the aspect ratio.
        const w = video.videoWidth || 1;
        const h = video.videoHeight || 1;
        const px = (i: number) => ({ x: pts[i].x * w, y: pts[i].y * h });

        const lc = px(L_IRIS_CENTRE);
        const rc = px(R_IRIS_CENTRE);
        const lDia = Math.hypot(px(L_IRIS_RIGHT).x - px(L_IRIS_LEFT).x, px(L_IRIS_RIGHT).y - px(L_IRIS_LEFT).y);
        const rDia = Math.hypot(px(R_IRIS_RIGHT).x - px(R_IRIS_LEFT).x, px(R_IRIS_RIGHT).y - px(R_IRIS_LEFT).y);

        const cats = res.faceBlendshapes?.[0]?.categories;
        const matrix = res.facialTransformationMatrixes?.[0]?.data as number[] | undefined;

        this.onSample?.({
          timestampMs: ts,
          convergence: {
            left: { irisCentre: lc, irisDiameterPx: lDia },
            right: { irisCentre: rc, irisDiameterPx: rDia },
          },
          head: poseFromMatrix(matrix),
          blink: {
            left: blend(cats, 'eyeBlinkLeft'),
            right: blend(cats, 'eyeBlinkRight'),
          },
          gaze: {
            horizontal:
              blend(cats, 'eyeLookOutLeft') - blend(cats, 'eyeLookInLeft'),
            vertical: blend(cats, 'eyeLookUpLeft') - blend(cats, 'eyeLookDownLeft'),
          },
        });
      }
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.setStatus('idle');
  }
}
