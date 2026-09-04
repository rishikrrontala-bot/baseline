import { useEffect, useRef, useState } from 'react';
import {
  Tracker,
  type TrackerStatus,
  type TrackerSample,
  type TrackerFaultInfo,
} from '../lib/tracker';

const MESSAGE: Record<TrackerStatus, string> = {
  idle: 'Camera off.',
  loading_model: 'Loading the model from this device…',
  requesting_camera: 'Waiting for you to allow the camera…',
  running: 'Face found. Framing looks usable.',
  no_face: 'No face found — move into frame, or add some light.',
  error: 'The camera could not be started.',
};

/* Each fault names the thing to change, because the person at the screen is
   the only one who can change it. */
const FAULT: Record<TrackerFaultInfo['fault'], { says: string; fix: string }> = {
  permission: {
    says: 'The browser blocked the camera.',
    fix: 'Allow camera access for this site, then turn it on again. On a Mac, also check System Settings → Privacy & Security → Camera and make sure your browser is ticked.',
  },
  no_device: {
    says: 'No camera was found on this device.',
    fix: 'Plug one in, or open Baseline on a device with a front camera. You can still read what the screening does without one.',
  },
  device_busy: {
    says: 'Another app is holding the camera.',
    fix: 'Quit anything else using it — a video call, Photo Booth, OBS — and turn it on again.',
  },
  constraints: {
    says: 'This camera cannot provide a usable video size.',
    fix: 'Try a different camera if you have one.',
  },
  insecure_origin: {
    says: 'This page is not on a secure connection.',
    fix: 'Cameras only work over https, or on localhost. Open the https address for this site.',
  },
  unsupported: {
    says: 'This browser cannot open a camera.',
    fix: 'Try a current version of Chrome, Edge, Firefox or Safari.',
  },
  model_load: {
    says: 'The on-device model did not load.',
    fix: 'Reload the page. If it keeps failing, the app is missing its model files — the screening runs entirely from them, so there is no server to fall back to.',
  },
  playback: {
    says: 'The camera opened but the video would not play.',
    fix: 'Reload the page and turn the camera on again.',
  },
  unknown: {
    says: 'The camera could not be started.',
    fix: 'Reload the page and try again.',
  },
};

export default function CameraCheck({
  onReady,
}: {
  onReady: (ready: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<Tracker | null>(null);
  const [status, setStatus] = useState<TrackerStatus>('idle');
  const [started, setStarted] = useState(false);
  const [ipd, setIpd] = useState<number | null>(null);
  const [fault, setFault] = useState<TrackerFaultInfo | null>(null);

  useEffect(() => {
    return () => {
      trackerRef.current?.stop();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    onReady(status === 'running');
  }, [status, onReady]);

  const begin = async () => {
    if (!videoRef.current || trackerRef.current) return;
    setStarted(true);
    setFault(null);
    const t = new Tracker();
    trackerRef.current = t;
    t.onStatus = setStatus;
    t.onFault = setFault;
    t.onSample = (s: TrackerSample) => {
      const dx = s.convergence.right.irisCentre.x - s.convergence.left.irisCentre.x;
      const dy = s.convergence.right.irisCentre.y - s.convergence.left.irisCentre.y;
      setIpd(Math.hypot(dx, dy));
    };
    await t.start(videoRef.current);
  };

  return (
    <div>
      <div
        className="relative w-full overflow-hidden border border-[var(--line-strong)]"
        style={{ aspectRatio: '16 / 9', background: 'var(--paper-deep)' }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          // Mirrored so moving left moves the image left; an unmirrored
          // self-view makes people correct their framing the wrong way.
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)', opacity: started ? 1 : 0 }}
        />
        {!started && (
          <button
            type="button"
            onClick={begin}
            className="t-action absolute inset-0 grid place-items-center text-[var(--ink)] transition-colors duration-300 hover:text-[var(--terra)]"
          >
            Turn the camera on
          </button>
        )}
      </div>

      <p className="t-body mt-3 text-[var(--ash)]" role="status">
        {status === 'error' && fault ? FAULT[fault.fault].says : MESSAGE[status]}
        {status === 'running' && ipd !== null && (
          <span className="t-mono ml-3 text-[var(--ash)]">
            Pupil separation {Math.round(ipd)} px
          </span>
        )}
      </p>

      {status === 'error' && fault && (
        <div className="mt-3 border-l-2 border-[var(--terra)] pl-4">
          <p className="t-body max-w-[54ch] text-[var(--ink)]">{FAULT[fault.fault].fix}</p>
          <p className="t-mono mt-2 text-[var(--ash)]">{fault.detail}</p>
          <button
            type="button"
            onClick={() => {
              trackerRef.current?.stop();
              trackerRef.current = null;
              setStarted(false);
              setFault(null);
              setStatus('idle');
            }}
            className="t-action mt-4 underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
