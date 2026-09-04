# Baseline — portfolio copy

**Live:** https://rishikrrontala-bot.github.io/baseline/
**Code:** https://github.com/rishikrrontala-bot/baseline

---

## One-liner

An oculomotor concussion screening that runs entirely in the browser, and refuses to
give you a number when the number would not mean anything.

## Card blurb (~55 words)

Concussion is diagnosed on what the injured person tells you, and they are usually
motivated to say they're fine. Baseline screens for it by watching the eyes instead.
Seven VOMS-style tasks, near point of convergence measured in real centimetres, and a
recovery curve read against your own baseline. The camera never leaves your machine.

## Case study intro (~180 words)

We diagnose concussion almost entirely on self-report, from people who want to get back
on the field. Eye movement is harder to lie about, and roughly half of concussion
patients develop an oculomotor or vestibular problem that a validated seven-task
screening can surface.

Baseline runs that screening in a browser tab. MediaPipe's face mesh runs in
WebAssembly on the user's own machine, and I vendored the 11.7 MB runtime and 3.7 MB
model into the app's own origin, so not even the model download tells a third party who
is using it. Near point of convergence comes out in centimetres by exploiting a
biological constant: the human iris is about 11.7 mm across in every adult, which turns
a webcam into a ruler.

The part I care about most is what it declines to say. It won't report a gain from too
few frames, or call 0.1 cm of webcam noise a deterioration, and when it can't measure
something it says so rather than leaving a blank that reads as normal.

Light and motion sensitivity are concussion symptoms, so the interface dims itself
before the screening starts, and tells you it's doing it.

## Details

**Role:** Solo. Design, clinical logic, ML pipeline, tests, deployment.
**Stack:** React 19, TypeScript, Vite, Tailwind, MediaPipe (WASM), Canvas, Vitest, Playwright.
**Scale:** 116 tests over the clinical logic. Fully static, no backend, no account, no analytics.
**Context:** Built for Hack for Humanity 2026.

## Pull quotes

> The app ran the camera for five tasks and produced no usable measurement. It said so,
> and said that is not the same as finding nothing wrong.

> A test I wrote failed, and the test was right: the first implementation reported
> 0.1 cm of webcam noise as deterioration, to a frightened person, about their brain.
