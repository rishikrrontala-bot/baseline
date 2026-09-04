import { useCallback, useEffect, useRef, useState } from 'react';
import RoomFrame from '../components/RoomFrame';
import RatingScale from '../components/RatingScale';
import Stimulus from '../components/Stimulus';
import { Tracker, type TrackerSample } from '../lib/tracker';
import { TASK_TIMING, isComplete } from '../lib/clinical/tasks';
import { estimateNpc, type ConvergenceSample, type NpcEstimate } from '../lib/clinical/npc';
import { isDemo, DEMO_FAR_REFERENCE, DEMO_NEAR_BREAK } from '../lib/demo';
import {
  VOMS_TASKS,
  VOMS_SYMPTOMS,
  type VomsRatings,
  type VomsSymptom,
  type VomsTaskResult,
} from '../lib/clinical/voms';

const SYMPTOM_LABEL: Record<VomsSymptom, string> = {
  headache: 'Headache',
  dizziness: 'Dizziness',
  nausea: 'Nausea',
  fogginess: 'Fogginess',
};

type Phase = 'brief' | 'running' | 'rating';

/** A short tick for the paced tasks. Audio, not motion — the eyes are busy. */
function useMetronome() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      ctxRef.current ??= new AudioContext();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      /* Audio is a convenience here; a blocked context must not stop a task. */
    }
  }, []);
}

export default function Screen({
  baseline,
  onLeave,
  onComplete,
}: {
  baseline: VomsRatings;
  onLeave: () => void;
  onComplete: (results: VomsTaskResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('brief');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Partial<VomsRatings>>({});
  const [results, setResults] = useState<VomsTaskResult[]>([]);
  const [npc, setNpc] = useState<NpcEstimate | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<Tracker | null>(null);
  const latest = useRef<TrackerSample | null>(null);
  const farRef = useRef<ConvergenceSample | null>(null);

  const demo = isDemo();
  const tick = useMetronome();
  const task = VOMS_TASKS[index];
  const timing = TASK_TIMING[task.id];
  const paced = task.id.startsWith('vor_') || task.id === 'visual_motion_sensitivity';

  // One camera for the whole room; permission was already granted in Prepare.
  useEffect(() => {
    if (demo) return undefined;
    const t = new Tracker();
    trackerRef.current = t;
    t.onSample = (s) => {
      latest.current = s;
    };
    if (videoRef.current) void t.start(videoRef.current);
    return () => {
      t.stop();
      trackerRef.current = null;
    };
  }, [demo]);

  // Timed tasks end themselves; the self-paced one waits for the person.
  useEffect(() => {
    if (phase !== 'running' || startedAt === null || timing.durationMs <= 0) return undefined;
    const id = window.setInterval(() => {
      if (isComplete(task.id, performance.now() - startedAt)) {
        setPhase('rating');
        setStartedAt(null);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, startedAt, task.id, timing.durationMs]);

  const beginTask = () => {
    // The reference for convergence is captured while the person is looking at
    // the screen, roughly an arm away — not at optical infinity. That biases
    // the estimate and is recorded in docs/LIMITATIONS.md rather than hidden.
    if (task.id === 'convergence')
      farRef.current = demo ? DEMO_FAR_REFERENCE : (latest.current?.convergence ?? null);
    setStartedAt(performance.now());
    setPhase('running');
  };

  const markConvergenceBreak = useCallback(() => {
    const near: ConvergenceSample | null | undefined = demo
      ? DEMO_NEAR_BREAK
      : latest.current?.convergence;
    const far = farRef.current;
    if (far && near) setNpc(estimateNpc(far, near));
    setPhase('rating');
    setStartedAt(null);
  }, [demo]);

  // Space ends the self-paced task, because the person's eyes are on their
  // fingertip and not on a button.
  useEffect(() => {
    if (phase !== 'running' || !timing.selfPaced) return undefined;
    const on = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        markConvergenceBreak();
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [phase, timing.selfPaced, markConvergenceBreak]);

  const answered = VOMS_SYMPTOMS.filter((s) => ratings[s] !== undefined).length;
  const allAnswered = answered === VOMS_SYMPTOMS.length;

  const commitRating = () => {
    const result: VomsTaskResult = {
      taskId: task.id,
      after: ratings as VomsRatings,
      ...(task.id === 'convergence' && npc?.cm !== null && npc?.cm !== undefined
        ? { npcCm: npc.cm }
        : {}),
    };
    const next = [...results, result];
    setResults(next);
    setRatings({});
    setNpc(null);
    if (index + 1 >= VOMS_TASKS.length) onComplete(next);
    else {
      setIndex(index + 1);
      setPhase('brief');
    }
  };

  return (
    <RoomFrame
      room="screen"
      heading={task.label}
      onLeave={onLeave}
      action={
        <div className="flex flex-wrap items-center justify-between gap-6 border-t border-[var(--line)] pt-5">
          <p className="t-mono" style={{ color: 'var(--ash)' }}>
            Task {index + 1} of {VOMS_TASKS.length}
            {phase === 'rating' && !allAnswered && ` — ${answered} of 4 rated`}
          </p>

          {phase === 'brief' && (
            <button
              type="button"
              onClick={beginTask}
              className="t-action border border-[var(--line-strong)] px-6 py-4 text-[var(--ink)] transition-colors duration-300 hover:border-[var(--terra)] hover:text-[var(--terra)]"
            >
              Start this task
            </button>
          )}

          {phase === 'running' && timing.selfPaced && (
            <button
              type="button"
              onClick={markConvergenceBreak}
              className="t-mono border border-[var(--terra)] px-6 py-4 text-[var(--terra)]"
            >
              It doubled — press space
            </button>
          )}

          {phase === 'running' && !timing.selfPaced && (
            <button
              type="button"
              onClick={() => {
                setPhase('rating');
                setStartedAt(null);
              }}
              className="t-action underline underline-offset-4"
              style={{ color: 'var(--ash)' }}
            >
              End this task early
            </button>
          )}

          {phase === 'rating' && (
            <button
              type="button"
              disabled={!allAnswered}
              onClick={commitRating}
              className="t-action border border-[var(--line-strong)] px-6 py-4 text-[var(--ink)] transition-colors duration-300 enabled:hover:border-[var(--terra)] enabled:hover:text-[var(--terra)] disabled:opacity-40"
            >
              {index + 1 >= VOMS_TASKS.length ? 'See findings' : 'Next task'}
            </button>
          )}
        </div>
      }
    >
      <video ref={videoRef} playsInline muted className="sr-only" />

      {phase !== 'rating' && (
        <div className="grid grid-cols-1 gap-x-[4vw] gap-y-8 lg:grid-cols-[1fr_minmax(280px,26vw)]">
          <div>
            <Stimulus
              taskId={task.id}
              running={phase === 'running'}
              startedAt={startedAt}
              onBeat={paced ? tick : undefined}
            />
            {/* The cue stays on screen for the whole task — recalling an
                instruction is exactly what a concussed brain struggles with. */}
            <p className="t-lead mt-5 max-w-[46ch] text-[var(--ink)]">{timing.cue}</p>
          </div>

          <div className="t-body">
            {task.id === 'convergence' && (
              <p className="mt-4 max-w-[40ch]">
                Nothing is drawn on screen for this one on purpose — a dot here would
                compete with your fingertip for the fixation being measured.
              </p>
            )}
          </div>
        </div>
      )}

      {phase === 'rating' && (
        <div className="max-w-[62ch]">
          <p className="t-body mb-7">
            Rate how you feel <em>now</em>, right after that task — not how you felt before
            it. The difference between the two is the measurement.
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
          {task.id === 'convergence' && (
            <p className="t-mono mt-6" style={{ color: 'var(--ash)' }}>
              {npc?.cm != null
                ? `Convergence ${demo ? 'simulated' : 'measured'} at ${npc.cm.toFixed(1)} cm`
                : 'Convergence could not be resolved from the camera'}
            </p>
          )}
          <p className="t-mono mt-2" style={{ color: 'var(--ash)' }}>
            Before this task you were at {VOMS_SYMPTOMS.map((s) => baseline[s]).join(' · ')}
          </p>
        </div>
      )}
    </RoomFrame>
  );
}
