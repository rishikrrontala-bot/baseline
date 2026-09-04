# What Baseline cannot tell you

Written while building, not after. Everything here is a limitation we know
about and chose to ship with; the honest failure mode of a tool like this is
implying more certainty than a webcam can carry.

## It does not diagnose anything

Baseline is a screening aid. Concussion is a clinical diagnosis made by a
person who examines you, takes a history, and rules out the things that
matter. Nothing in this app is capable of any of that, and no output here
should be read as "you do" or "do not" have a concussion.

It also cannot clear you to return to contact. The Amsterdam 2022 consensus
gates the contact stages behind in-person medical assessment, and so does
this app — stages 5 and 6 are marked `gate: 'clinician'` and the staging
function will never recommend them.

## VOMS is a symptom-provocation instrument, not an eye tracker

This is the most important thing to understand about what is being measured.
VOMS asks you to perform seven eye and head movements and rate four symptoms
0–10 after each. The validated signal is **your ratings**. The camera adds
movement-adherence confirmation and one objective number. Where the two
disagree, the ratings are the instrument and the camera is a supporting
observation.

We are also not administering VOMS as published. A clinician holds a target
at a specified distance and moves it a specified number of degrees; a browser
knows neither its own screen size nor how far away you are sitting. Amplitudes
are expressed as fractions of the stimulus field instead. That substitution
alone means these results are not comparable to a clinic-administered VOMS.

## The convergence measurement, specifically

The near-point-of-convergence estimate is the one genuinely objective number
here, and it has real error sources:

- **Iris diameter varies.** The method treats the horizontal visible iris
  diameter as 11.7 mm. Population SD is roughly 0.5 mm, so about 4% scale
  error before anything else goes wrong. Distance error scales with it.
- **The eye's rotation radius varies.** 12.0 mm is an average, not your
  measurement.
- **The far reference is not far.** Clinically, the reference is the eyes at
  optical infinity. Ours is captured while you look at a screen roughly an
  arm away, where the eyes are already slightly converged. This biases the
  measured narrowing and therefore the reported centimetres.
- **The break point is still subjective.** The camera cannot know when you
  see double. You press a key; we record the geometry at that instant. All
  the reaction-time error in that loop lands in the number.
- **Landmark noise.** Iris landmarks jitter frame to frame, more in low light
  — which is exactly the light a photophobic person will be sitting in.

Where the geometry cannot resolve an answer, the code returns
`beyond_range`, `implausible`, or `insufficient_signal` rather than a
number, and failed trials are dropped from the average instead of being
counted as zero. A failure and a finding of "nothing" are never merged.

## The symptom inventory is four items, not twenty-two

The full PCSS is a 22-item checklist. The screening collects the four VOMS
symptoms and maps them onto their PCSS items. `scorePcss` counts only what it
is given, and every place the band appears it says how many items it rests
on. It is a proxy, and a thin one.

## No baseline comparison is shipped yet

The product is named for pre-injury baseline testing, and the design intends
each person to be their own control. That comparison is not implemented in
this build: sessions are scored against published cut points, not against
your own healthy numbers. This is the largest gap between the concept and the
code.

## Nothing persists

There is no account, no server, and currently no local history either. Close
the tab and the session is gone. That is a deliberate trade for the privacy
guarantee, but it means the recovery tracking the product describes does not
yet exist.

## Demo mode invents data

`?demo=1` runs the whole flow with synthesised eye geometry so the interface
can be reviewed without a webcam. Every number it produces is fabricated. It
is labelled on screen wherever it appears, and it must never be presented as
a measurement.

## Not validated, not tested on patients

No user testing. No clinical validation. No patient data. No endorsement by
any organisation, including any partner of the hackathon this was built for.
The cut points are taken from published literature; the *implementation* of
them has been checked only against unit tests we wrote ourselves.

## The objective eye-movement measures

Five of the seven tasks now produce a number from the camera as well as a
symptom rating: a pursuit gain for smooth pursuit, a tracking accuracy for the
two saccade tasks, and a vestibulo-ocular reflex gain for the two VOR tasks.
Convergence is measured separately, in centimetres, and visual motion
sensitivity has no objective measure at all — those two are excluded rather
than given a number that would have nothing behind it.

**What these numbers are not.** They are not a validated instrument. VOMS is
validated as a *symptom-provocation* screening, and that is what the ratings
are. A gain computed from a webcam at 30 frames a second, through a face-mesh
model that was trained for animation rather than oculometry, is supporting
evidence. It is not equivalent to an infrared eye tracker running at 500 Hz,
and no clinical cut point published for laboratory oculometry transfers to it.
The 0.7–1.3 band this app uses to say "inside the usual range" is a sanity
band drawn from the ordinary description of healthy pursuit and VOR gain
sitting near unity; it is not a diagnostic threshold and is not calibrated
against a patient population.

**How they were validated here.** The mathematics is tested against
synthesised signals where the true answer is known in advance: a sinusoidal
target with an eye following it at a set gain and a set lag, and a head
rotation with eyes counter-rotating at a set gain. The tests confirm the code
recovers those known values, rejects blink frames, and refuses when the target
did not move, when the head did not move, when there are too few frames, or
when the fit is too poor to mean anything.

That is a test of the arithmetic, **not** of the claim that these numbers
track concussion in real people. No human validation has been done. Doing it
properly would mean recording a cohort against a reference eye tracker, and
that is the work between this and anything a clinician should rely on.

**Why "not measured" is printed rather than left blank.** A blank reads as
normal. When the camera cannot produce a usable gain the app says so, gives
the fit that made it refuse, and states plainly that failing to measure
something is not the same as measuring it and finding nothing wrong.
