# Devpost submission — paste each block into its field

---

## Inspiration

Concussion is diagnosed almost entirely on what the injured person tells you. That
is a problem, because the people most likely to have one are the people most
motivated to under-report it: get back on the field, back in class, back to normal.
Symptoms are invisible, self-reported, and easy to talk yourself out of.

Eye movement is harder to talk yourself out of. Roughly half of concussion patients
develop some oculomotor or vestibular dysfunction, and the clinical instrument for
it — **VOMS**, the Vestibular/Ocular Motor Screening — is a seven-task battery you
can run without any equipment at all.

There is also a gap nobody builds for. Almost every concussion app targets athletes
returning to *play*. The larger and more neglected population is students returning
to *learn*, and academic cognitive load has no equivalent of the six-stage exertion
protocol.

And one more thing, which turned out to be the design's whole spine: **light
sensitivity and motion sensitivity are concussion symptoms**. An app for concussed
people that dumps a bright, animated interface on them is provoking the exact
symptoms it is trying to measure.

## What it does

Baseline runs a VOMS-style screening in your browser and reads it against your own
numbers.

1. **Prepare** — a symptom inventory taken *before* the tasks, because provocation
   is a change from your own starting point, not an absolute score.
2. **Screen** — seven tasks with an on-screen stimulus: smooth pursuit, horizontal
   and vertical saccades, near point of convergence, horizontal and vertical VOR,
   and visual motion sensitivity. You rate four symptoms after each one.
3. **Findings** — what provoked symptoms, what the camera measured, a return-to-sport
   and return-to-**learn** stage from the Amsterdam 2023 consensus protocol, the red
   flags that mean go to an emergency department now, and a printable summary for a
   clinician.

Two things make it more than a questionnaire:

**It measures.** Near point of convergence is measured in real centimetres, using
the fact that the human iris is about 11.7 mm across in every adult — that constant
turns iris-width-in-pixels into an absolute distance reference. Five of the seven
tasks also produce a pursuit gain, a phase lag, or a vestibulo-ocular reflex gain
from the camera.

**It remembers.** "Baseline" is a clinical term before it is a product name: you
record one on a day you feel well, and every later screening is read against *your*
numbers as well as the population cut points. That matters because normal
convergence varies enough between people that a 4.5 cm break is unremarkable for
one person and a clear finding for someone whose healthy near point was 2 cm. The
record plots as a recovery trajectory over time.

**Nothing leaves your device.** No account, no upload, no server. The record lives
in your browser and there are export and erase buttons sitting right next to it.

## How I built it

React 19, TypeScript, Vite and Tailwind, deployed as a fully static site.

Eye tracking is **MediaPipe FaceLandmarker** running in WebAssembly — 478 landmarks
including the iris, 52 blendshapes, and a facial transformation matrix that gives
head pose (which is what makes VOR testing possible at all).

The privacy claim is structural rather than promised. The 11.7 MB WASM runtime and
the 3.7 MB model are **vendored into the repository and served from the app's own
origin**. There is no runtime request to Google, or to anyone. This is the part most
"on-device" claims quietly skip: they run inference locally but fetch the model from
a CDN, which tells that CDN exactly who is using it and when.

All clinical logic is pure functions in `src/lib/clinical/` — PCSS-22 scoring, VOMS
provocation assessment, convergence geometry, Amsterdam staging, personal baseline
comparison, and the oculomotor maths — under **116 tests**. The components on top
are thin state and render glue.

**The design.** Two rooms. The landing is loud: a didone display face on blush paper
with grain and an editorial grid. Crossing into the instrument triggers an announced
transition into a dim, still, low-stimulus mode — grain off, motion off, luminance
capped — and the app says out loud what it is doing and why. That threshold is the
product's whole thesis made physical, and it is skippable.

## Challenges I ran into

**The app nearly told people something false.** On a screening where *no* task
provoked symptoms and only convergence was abnormal, Findings announced "Several
tasks provoked symptoms." The rationale string was hardcoded plural, but its branch
was also reachable with a provoked count of zero. It was invisible in the source and
only showed up in a rendered screenshot. That is exactly the failure this product
exists to refuse — "we didn't measure it", "we couldn't resolve it" and "we measured
it and found nothing" collapsing into one claim. Both the heading and the rationale
now derive from the two counts separately, pinned by regression tests.

**A test I wrote failed, and the test was right.** I asserted that someone who has
always broken at 5.5 cm should not be told they are "worse" at 5.6 cm. The first
implementation flipped direction on any non-zero delta, so it happily reported
0.1 cm of webcam noise as deterioration — to a frightened person, about their brain.
Every comparison now carries a dead band, and the trend refuses to name a direction
from fewer than three screenings.

**The clinician printout printed black on black.** It was the one output nobody had
ever rendered. The rooms were painted with literal colour classes rather than the
design tokens, so the print stylesheet's overrides never reached them, and the whole
handoff came out as near-black text on a near-black ground. Now every room reads the
tokens, so the bright world, the dim world and print all resolve from one vocabulary
— and a script renders the PDF on demand so it cannot go unseen again.

**"The camera could not be started" was five different problems.** A bare `catch`
swallowed every failure, so a denied permission, a camera held by another app, a
machine with no camera and a model that failed to load all produced the same
useless sentence — for the one person who could actually fix it. Each fault is now
named with its own remedy, plus the underlying error for anyone debugging.

**Testing a camera app with no camera.** I synthesised a Y4M video from a face
photograph — writing the RGB to I420 conversion by hand, since there was no ffmpeg
available — and fed it through Chromium's fake capture device. That made the whole
pipeline reproducible headlessly, and it produced my favourite result in the
project: pointed at a *still photograph*, the app correctly refuses to measure
anything, reports the fit that made it refuse, and prints "the camera ran for 5
tasks but none produced a usable measurement — that is not the same as finding
nothing wrong."

## Accomplishments that I'm proud of

That the honest path is the one that got built. The app refuses to produce a number
whenever the number would not mean anything: too few frames, too much blinking, a
target that did not travel, a head that did not turn, a fit too loose to trust. Every
refusal states its reason and quotes the fit, because a blank space reads as normal
and a measurement from six usable frames is worse than no measurement, since it will
be believed.

The accessibility is clinical rather than decorative. Low stimulus, capped
luminance, no motion, 44 px targets, full keyboard operation, and never a finding
carried by colour alone — because the readers are photophobic and motion-sensitive
by definition, and print and greyscale have to carry the same meaning.

And 116 tests over logic that genuinely deserves them.

## What I learned

That the interesting engineering in a health tool is mostly in what it declines to
say. The hard parts were not the eye tracking; they were the dead bands, the
null-versus-zero distinctions, and the four separate error messages.

That the human iris being a near-constant 11.7 mm is a beautiful piece of free
calibration — a single biological constant turning a webcam into a ruler.

That rendering is a debugging technique. Three of the worst defects in this project
— a false clinical claim, an unreadable printout, and an invisible focus ring on the
primary control — were all invisible in source and obvious in a screenshot.

## What's next for Baseline

Saccade latency proper — the target-jump timing is already recorded and it is one of
the better-evidenced concussion markers. Trending the objective gains over time
alongside symptoms. And the honest one: **human validation.** The oculomotor
mathematics is tested against synthetic signals with known answers, which validates
the arithmetic and not the clinical claim. Establishing that these numbers track
concussion in real people means recording a cohort against a reference eye tracker,
and that is the work between this and anything a clinician should rely on.

`docs/LIMITATIONS.md` says all of this in the repository, at length, including the
things Baseline deliberately does not do.

## Built with

react · typescript · vite · tailwindcss · mediapipe · webassembly · canvas · vitest · playwright · github-pages

## Try it out

- Live: https://rishikrrontala-bot.github.io/baseline/
- Source: https://github.com/rishikrrontala-bot/baseline
- Add `?demo=1` to walk the entire screening without a camera.
