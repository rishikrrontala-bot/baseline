# Baseline

**A vestibular and ocular-motor concussion screening that runs entirely in your browser.**
No account, no upload, no server — because there is no server.

Built for Hack for Humanity, Summer 2026.

---

## Why

Concussion symptoms are self-reported, and people under-report them to get
back on the field, back in class, back to normal. Eye movement is harder to
talk yourself out of.

## What it does

Runs the seven-task **VOMS** battery (Vestibular/Ocular Motor Screening) in
three named rooms — **Prepare**, **Screen**, **Findings** — then turns the
result into an Amsterdam 2023 return-to-activity stage covering **return to
learn as well as return to play**, plus a printable summary to hand a
clinician or a teacher.

## The two things that are actually novel

**1. Near point of convergence, measured without calibrating the camera.**
The horizontal visible iris diameter is ~11.7 mm in nearly every adult. The
iris is therefore a stable anatomical ruler lying at exactly the depth being
measured, so millimetres-per-pixel is self-calibrating and no focal length,
calibration card, or known distance is needed. Working from interpupillary
*narrowing* rather than absolute iris position makes rigid head translation
cancel out. See `src/lib/clinical/npc.ts`.

**2. The dim room is a clinical requirement, not a theme.**
Photophobia and motion sensitivity are two of the symptoms being measured. An
interface that provokes them corrupts its own reading. Entering the screening
announces that it is dimming the room and stopping all motion, and says why.

## Privacy is structural

The MediaPipe WASM runtime and the face model are vendored into `public/mp/`
and served from this app's own origin. An "on-device" claim is not true if
the model is fetched from a CDN at load time — that request still reports who
is using the tool and when. Frames are read and discarded; nothing is
recorded, stored, or transmitted.

## Run it

```bash
npm install
npm run dev
```

Append `?demo=1` to walk the entire screening with synthesised eye geometry
and no webcam. Every number demo mode produces is fabricated and labelled as
such on screen.

```bash
npm test          # 53 tests over the clinical logic
npm run build     # static build, deployable anywhere
```

## What it is not

It does not diagnose concussion and it cannot clear anyone to return to
contact — the staging code will never recommend a contact stage, because the
consensus gates those behind in-person assessment.

**Read [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) before trusting any
number this produces.** Sources are in
[`docs/RESEARCH.md`](docs/RESEARCH.md).

## Layout

```
src/lib/clinical/    pure, tested domain logic — no React
  pcss.ts            22-item symptom inventory (SCAT5)
  voms.ts            seven tasks, provocation scoring
  npc.ts             convergence geometry from iris landmarks
  tasks.ts           stimulus timing as pure functions of elapsed time
  staging.ts         Amsterdam 2023 return-to-sport and return-to-learn
src/lib/tracker.ts   MediaPipe camera loop
src/rooms/           Prepare · Screen · Findings
```

The clinical logic is deliberately separated from rendering and is covered by
tests that invert a forward model, so the geometry is verified rather than
eyeballed.
