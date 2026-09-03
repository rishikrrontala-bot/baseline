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
  onSample: ((s: TrackerSample) => void) | null = null;
  onStatus: ((s: TrackerStatus) => void) | null = null;

  private setStatus(s: TrackerStatus) {
    this.status = s;
    this.onStatus?.(s);
  }

  async start(video: HTMLVideoElement): Promise<void> {
    this.video = video;
    try {
      this.setStatus('loading_model');
      const fileset = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mp/wasm`);
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: `${import.meta.env.BASE_URL}mp/models/face_landmarker.task`,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      this.setStatus('requesting_camera');
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      video.srcObject = this.stream;
      await video.play();

      this.setStatus('running');
      this.loop();
    } catch {
      this.setStatus('error');
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
