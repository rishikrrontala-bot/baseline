import { useCallback, useState } from 'react';
import RoomFrame from '../components/RoomFrame';
import CameraCheck from '../components/CameraCheck';
import RatingScale from '../components/RatingScale';
import { VOMS_SYMPTOMS, type VomsRatings, type VomsSymptom } from '../lib/clinical/voms';
import { isDemo } from '../lib/demo';

const SYMPTOM_LABEL: Record<VomsSymptom, string> = {
  headache: 'Headache',
  dizziness: 'Dizziness',
  nausea: 'Nausea',
  fogginess: 'Fogginess',
};

export default function Prepare({
  onLeave,
  onContinue,
}: {
  onLeave: () => void;
  onContinue: (baseline: VomsRatings) => void;
}) {
  const [ratings, setRatings] = useState<Partial<VomsRatings>>({});
  const [cameraReady, setCameraReady] = useState(false);
  const demo = isDemo();

  const answered = VOMS_SYMPTOMS.filter((s) => ratings[s] !== undefined).length;
  const allAnswered = answered === VOMS_SYMPTOMS.length;

  // Stable identity so CameraCheck's effect does not re-fire every render.
  const handleReady = useCallback((r: boolean) => setCameraReady(r), []);

  return (
    <RoomFrame
      room="prepare"
      heading="How do you feel right now?"
      onLeave={onLeave}
      action={
        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-[var(--line)] pt-5">
          <p className="t-mono text-calm-mute">
            {allAnswered
              ? cameraReady || demo
                ? 'Ready'
                : 'Ratings done — the camera is still off'
              : `${answered} of ${VOMS_SYMPTOMS.length} answered`}
          </p>
          <button
            type="button"
            disabled={!allAnswered || !(cameraReady || demo)}
            onClick={() => onContinue(ratings as VomsRatings)}
            className="t-mono border border-[var(--line)] px-6 py-4 text-calm-text transition-colors duration-300 enabled:hover:border-calm-amber enabled:hover:text-calm-amber disabled:opacity-40"
          >
            Start the seven tasks
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-x-[5vw] gap-y-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="t-body mb-7 max-w-[54ch]">
            These four are recorded before anything moves, so the screening can tell the
            difference between a symptom a task caused and one you already had. Answer for
            this moment, not for today in general.
          </p>

          <div className="space-y-6">
            {VOMS_SYMPTOMS.map((s) => (
              <RatingScale
                key={s}
                label={SYMPTOM_LABEL[s]}
                value={ratings[s] ?? null}
                onChange={(v) => setRatings((r) => ({ ...r, [s]: v }))}
              />
            ))}
          </div>
        </div>

        <div>
          {demo ? (
            <div
              className="grid w-full place-items-center border border-dashed border-[var(--line)] p-8 text-center"
              style={{ aspectRatio: '16 / 9' }}
            >
              <div>
                <p className="t-mono" style={{ color: 'var(--terra)' }}>
                  Demonstration mode — no camera
                </p>
                <p className="t-body mt-3 max-w-[36ch]">
                  The screening runs with synthesised eye geometry so the whole flow can be
                  walked without a webcam. Every number it produces is invented, and labelled
                  as such wherever it appears.
                </p>
              </div>
            </div>
          ) : (
            <CameraCheck onReady={handleReady} />
          )}
          <p className="t-body mt-5 max-w-[52ch]">
            The camera confirms you performed each movement and measures one number the
            ratings cannot: how far from your eyes the target was when it doubled. Frames
            are read and thrown away — nothing is recorded and nothing is sent.
          </p>
        </div>
      </div>
    </RoomFrame>
  );
}
