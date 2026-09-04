# Baseline — handoff (paused 2026-09-02, low tokens)

Hack for Humanity Summer 2026. **Deadline Sep 4 2026, 11:45pm EDT.** Solo, student.

## Decisions locked
- **Option 1**: webcam oculomotor screener + return-to-activity pacer. Named **Baseline**.
- Tracks stacked: Concussion Recovery + Responsible AI + Best AI/ML + Best Design + Innovation + Girls Who Code (solo student = 100% student team). **Skip Render** (needs a backend, kills the privacy story).
- **Two rooms**: loud editorial landing (bright) → announced transition into **Low Stimulus Mode** (dim, motion off) for the actual instrument. Photophobia/motion sensitivity are symptoms, so the calm mode is clinical, not a preference. `:root[data-room='calm']` already implements it in `src/index.css`.
- Clinical basis: **VOMS** (Mucha 2014) is symptom-provocation, not objective eye tracking — so honest framing is "ratings are the validated part, camera is a supporting signal". Pacer = PCSS-22 + Amsterdam 2023 six-stage protocol. Include return-to-LEARN, not just return-to-play (underserved; judges are student org members).

## Design system (built, verified on screen)
Blend of his portfolio + Unseen Studio, deliberately not a copy.
- Display **Instrument Serif** 400, `lh .92`, tracking `-.02em` — the inversion of his portfolio's Archivo 800 condensed uppercase.
- UI **Archivo**; micro-labels **JetBrains Mono** `.14em` uppercase (his signature, kept).
- paper `#EFE7E2` / ink `#16110F` / ash `#7A716B` / terra `#C4491F`. Calm room: bg `#12100F`, text `#C9BFB6`, amber `#B8794A`.
- Grain + vignette carried over from portfolio; **both suppressed in calm room**. No custom cursor.

## MediaPipe spike: PASS (verified in browser)
478 landmarks incl. iris · 52 blendshapes · facial transform matrix (head pose → enables VOR).
IPD .1051 norm · gaze ratio L .449 R .559 · iris/IPD .1973.
- **Iris is ~11.7mm in every adult** → iris-diameter-in-px is a true absolute scale ⇒ real cm ⇒ **NPC measurable** (break >6cm = abnormal, key concussion marker).
- WASM (11.7MB) + model (3.7MB) vendored to `baseline/public/mp/` — zero runtime calls to Google. Privacy claim is structural.
- Gotcha: `img.decode()` hangs in a backgrounded tab — use `createImageBitmap`. rAF is also throttled there, so don't trust in-pane settle timings.

## State of the code
`baseline/` = Vite + React 19 + TS + Tailwind 3 + GSAP + Lenis + Vitest. Dev server: `.claude/launch.json` name `baseline`, port 5199.
Done: design system (`src/index.css`, `tailwind.config.js`), `index.html`, `Hero.tsx` (renders correctly, fits one viewport), `Aperture.tsx` (cursor-tracked pursuit motif — the hero IS the test stimulus, not a mascot), `lib/motion.ts`.
Fixed: aperture error-line showed a permanent residual because target and pupil were clamped to different radii — it read clipping as pursuit lag. Both now share `MAX_EXCURSION`.
**Tailwind gotcha:** Vite caches postcss config at startup. If components/utilities layers vanish, restart the server.

## Print path — verified, and it was broken

The finish reviewer flagged the clinician printout as the one shipped output
nobody had ever seen rendered. Rendering it proved the point: it printed
near-black text on a near-black ground, completely unreadable.

Cause: the rooms used Tailwind's literal `calm-*` colours (`bg-calm-bg`,
`text-calm-text`), so the `@media print` overrides of `--paper` / `--ink` never
reached them. Every room component now reads the token vars instead, which is
what DESIGN.md already claimed the system did — one vocabulary, three worlds.

`scripts/capture-print.mjs` walks a full demo screening, switches to print
media and emits both `.impeccable/review/print-findings.png` and a real A4
`handoff.pdf`. Re-run it after any change to the rooms. Provocation survives
losing its colour: print sets `--terra` to black, and the row still reads
"PROVOKED +3 8.4 CM (≥5)" against "NO RISE".

## Next
1. `rm baseline/spike.html baseline/src/spike.ts` (verified, superseded) — capture numbers above in `docs/SPIKE.md`.
2. Build the calm-room transition + the 7-task VOMS battery (webcam loop, live).
3. PCSS-22 + staging engine as pure functions in `src/lib/` with Vitest coverage (the Habitat Pulse pattern — it's what made that read credible).
4. `docs/LIMITATIONS.md` (what a webcam cannot measure) + `docs/RESEARCH.md` (real citations). These carry Research Foundation + Responsible AI.
5. GH Pages deploy, 4-min video, Devpost writeup.
