import { useEffect, useRef, useState } from 'react';
import { Tracker, type TrackerStatus, type TrackerSample } from '../lib/tracker';

const MESSAGE: Record<TrackerStatus, string> = {
  idle: 'Camera off.',
  loading_model: 'Loading the model from this device…',
  requesting_camera: 'Waiting for you to allow the camera…',
  running: 'Face found. Framing looks usable.',
  no_face: 'No face found — move into frame, or add some light.',
  error: 'The camera could not be started.',
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
    const t = new Tracker();
    trackerRef.current = t;
    t.onStatus = setStatus;
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
        className="relative w-full overflow-hidden border border-[var(--line)]"
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
            className="t-mono absolute inset-0 grid place-items-center text-calm-text transition-colors duration-300 hover:text-calm-amber"
          >
            Turn the camera on
          </button>
        )}
      </div>

      <p className="t-body mt-3 text-calm-mute" role="status">
        {MESSAGE[status]}
        {status === 'running' && ipd !== null && (
          <span className="t-mono ml-3 text-calm-mute">
            Pupil separation {Math.round(ipd)} px
          </span>
        )}
      </p>
    </div>
  );
}
