# Devpost submission — paste each block into its field

---

## Inspiration

We diagnose concussion almost entirely on what the injured person tells us. Which is
a problem, because the people most likely to have one are the people most motivated
to say they're fine. Get back on the field. Get back to class. Get back to normal.

Eye movement is harder to lie about.

Somewhere around half of concussion patients end up with some kind of oculomotor or
vestibular problem, and there's already a clinical tool for finding it: VOMS, the
Vestibular/Ocular Motor Screening. Seven tasks. No equipment needed.

There's also a gap I kept noticing. Nearly every concussion app is built for athletes
returning to *play*. The bigger and much less served group is students trying to get
back to *learning*, and there's no equivalent of the six-stage exertion protocol for
academic load.

One more thing, which ended up shaping the entire design: light sensitivity and
motion sensitivity are concussion symptoms. So an app for concussed people that
throws a bright animated interface at them is provoking the exact symptoms it's
supposed to be measuring.

## What it does

Baseline runs a VOMS-style screening in your browser and reads the results against
your own numbers.

1. **Prepare.** A symptom inventory taken *before* the tasks, because provocation
   means a change from your own starting point, not some absolute score.
2. **Screen.** Seven tasks with an on-screen stimulus: smooth pursuit, horizontal and
   vertical saccades, near point of convergence, horizontal and vertical VOR, and
   visual motion sensitivity. You rate four symptoms after each one.
3. **Findings.** What provoked symptoms, what the camera measured, a return-to-sport
   and return-to-learn stage drawn from the Amsterdam 2023 consensus protocol, the red
   flags that mean go to an emergency department right now, and a printable summary
   you can hand a clinician.

Two things push it past being a questionnaire.

**It measures.** Near point of convergence comes out in actual centimetres. That works
because the human iris is about 11.7 mm across in every adult, so iris-width-in-pixels
becomes an absolute distance reference. Five of the seven tasks also produce a pursuit
gain, a phase lag, or a vestibulo-ocular reflex gain.

**It remembers.** "Baseline" is a clinical term long before it's a product name. You
record one on a day you feel fine, and every screening after that gets read against
*your* numbers as well as the population cut points. This matters more than it sounds
like it should. Normal convergence varies enough between people that a 4.5 cm break is
completely unremarkable in one person and a real finding in someone whose healthy near
point was 2 cm. Over time the record turns into a recovery curve.

Nothing leaves your device. No account, no upload, no server. Your record sits in your
browser, with export and erase buttons right next to it.

## How I built it

React 19, TypeScript, Vite, Tailwind. Ships as a fully static site.

Eye tracking is MediaPipe FaceLandmarker running in WebAssembly: 478 landmarks
including the iris, 52 blendshapes, and a facial transformation matrix that gives head
pose. That last one is what makes VOR testing possible at all.

The privacy claim is structural rather than a promise. I vendored the 11.7 MB WASM
runtime and the 3.7 MB model into the repo, and they're served from the app's own
origin. No runtime request goes to Google or anyone else. This is the part most
"on-device" claims skip quietly: they run inference locally but pull the model from a
CDN, which tells that CDN exactly who's using the thing and when.

Clinical logic all lives as pure functions in `src/lib/clinical/`. PCSS-22 scoring,
VOMS provocation, convergence geometry, Amsterdam staging, personal baseline
comparison, the oculomotor maths. 116 tests cover it. The components on top are thin
glue.

For the design, I built two rooms. The landing is loud: a didone display face on blush
paper, grain, an editorial grid. Walking into the instrument triggers an announced
transition into a dim, still, low-stimulus mode. Grain off, motion off, luminance
capped, and the app says out loud what it's doing and why. You can skip it. That
threshold is the whole thesis made physical.

## Challenges I ran into

**The app nearly told people something false.** On a screening where zero tasks
provoked symptoms and only convergence was abnormal, Findings announced "Several tasks
provoked symptoms." The rationale string was hardcoded plural and its branch was
reachable with a provoked count of zero. Invisible in the source. Completely obvious in
a screenshot. This is exactly the failure the whole product exists to avoid: "we didn't
measure it," "we couldn't resolve it," and "we measured it and found nothing"
collapsing into one sentence. Both the heading and the rationale now come from the two
counts separately, with regression tests holding them there.

**A test I wrote failed, and the test was right.** I'd asserted that someone who has
always broken at 5.5 cm shouldn't be told they're "worse" at 5.6 cm. My first
implementation flipped direction on any non-zero delta, so it cheerfully reported
0.1 cm of webcam noise as deterioration. To a frightened person. About their brain.
Every comparison carries a dead band now, and the trend refuses to name a direction
from fewer than three screenings.

**The clinician printout printed black on black.** It was the one output nobody had
ever actually rendered. The rooms were painted with literal colour classes instead of
the design tokens, so the print stylesheet's overrides never reached them and the whole
handoff came out as near-black text on near-black ground. Every room reads the tokens
now, and a script renders the PDF on demand so it can't go unseen again.

**"The camera could not be started" turned out to be five different problems.** A bare
`catch` was swallowing every failure, so a denied permission, a camera held by another
app, a machine with no camera, and a model that failed to load all produced the same
useless sentence. For the one person who could actually fix it. Each fault gets its own
name and its own remedy now, plus the underlying error for anyone debugging.

**Testing a camera app without a camera.** I built a Y4M video out of a face
photograph, writing the RGB to I420 conversion by hand since there was no ffmpeg
around, and fed it through Chromium's fake capture device. That made the whole pipeline
reproducible headlessly. It also produced my favourite result in the project: pointed
at a still photograph, the app correctly refuses to measure anything, reports the fit
that made it refuse, and prints "the camera ran for 5 tasks but none produced a usable
measurement — that is not the same as finding nothing wrong."

## Accomplishments that I'm proud of

Mostly that the honest path is the one that got built. The app won't produce a number
when the number wouldn't mean anything. Too few frames, too much blinking, a target
that didn't travel, a head that didn't turn, a fit too loose to trust. Every refusal
states its reason and quotes the fit, because a blank space reads as "normal," and a
measurement built on six usable frames is worse than no measurement at all. It'll get
believed.

The accessibility is clinical, not decorative. Low stimulus, capped luminance, no
motion, 44 px targets, full keyboard operation, and no finding ever carried by colour
alone. The readers are photophobic and motion-sensitive by definition, and print and
greyscale have to carry identical meaning.

And 116 tests over logic that genuinely earns them.

## What I learned

The interesting engineering in a health tool turns out to be mostly in what it declines
to say. Eye tracking wasn't the hard part. The dead bands were. The null-versus-zero
distinctions were. Four separate error messages were.

Also that the human iris sitting at a near-constant 11.7 mm is a lovely piece of free
calibration. One biological constant turns a webcam into a ruler.

And that rendering is a debugging technique. Three of the worst defects in this
project — a false clinical claim, an unreadable printout, an invisible focus ring on
the primary control — were all invisible in source and immediately obvious in a
screenshot.

## What's next for Baseline

Proper saccade latency, since the target-jump timing is already being recorded and it's
one of the better-evidenced concussion markers. Trending the objective gains over time
alongside symptoms.

Then the honest one: human validation. The oculomotor maths is tested against synthetic
signals with known answers, which validates the arithmetic and not the clinical claim.
Showing that these numbers actually track concussion in real people means recording a
cohort against a reference eye tracker. That's the work sitting between this and
anything a clinician should rely on.

All of it is written down in `docs/LIMITATIONS.md`, at length, including the things
Baseline deliberately doesn't do.

## Built with

react · typescript · vite · tailwindcss · mediapipe · webassembly · canvas · vitest · playwright · github-pages

## Try it out

- Live: https://rishikrrontala-bot.github.io/baseline/
- Source: https://github.com/rishikrrontala-bot/baseline
- Add `?demo=1` to walk the whole screening without a camera.
