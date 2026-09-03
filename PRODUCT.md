# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is **the concussed person themselves, self-administering, alone**, usually at home in the days or weeks after a suspected concussion. No clinician, trainer, or parent is present or assumed. They are frequently symptomatic *while using the product* — headache, photophobia, motion sensitivity, difficulty concentrating and remembering — so the interface is being read by an impaired brain, and that impairment is the product's operating condition rather than an edge case.

A secondary, non-operating audience receives output but never touches the app: the clinician, athletic trainer, or teacher who reads the summary the user brings them.

## Product Purpose

Baseline runs a vestibular/ocular-motor screening (VOMS) in the browser and turns the result into a paced return-to-activity plan and a summary the user can hand to a professional.

It exists because concussion symptoms are self-reported and people systematically under-report them to get back to sport, school, and normal life. Eye movement is harder to talk yourself out of. Success is the user gaining an honest read on whether their eyes are still affected, being paced accordingly, and being routed *to* care — never diverted from it.

## Positioning

Two mechanisms a neighboring product could not truthfully copy:

1. **Near point of convergence measured from iris geometry alone.** The horizontal visible iris diameter is ~11.7 mm in nearly every adult, so the iris is a stable anatomical ruler lying at exactly the depth being measured. That makes millimetres-per-pixel self-calibrating and removes any need for camera intrinsics or a calibration card. Working from interpupillary narrowing rather than absolute iris position makes rigid head translation cancel out.
2. **Each person is their own control.** The product captures a pre-injury healthy baseline and compares against it, rather than scoring a single session against population norms a consumer webcam cannot justify.

Everything runs on-device: the MediaPipe WASM and model are served from the app's own origin, no frames are transmitted, and there is no server, account, or database.

## Operating Context

Used on a laptop or desktop with a webcam, in a room the user controls, often with the lights deliberately down because light hurts. Sessions are short and may be abandoned partway when symptoms flare — stopping early is expected behavior, not failure. Repeat sessions happen over days and weeks, so the product is encountered many times by the same person in changing states.

The healthy-baseline capture happens at a completely different moment: before any injury, when the user feels fine, and typically because a coach, parent, or team suggested it.

## Capabilities and Constraints

- Seven-task VOMS battery: smooth pursuit, horizontal and vertical saccades, near point of convergence, horizontal and vertical VOR, visual motion sensitivity.
- VOMS is a **symptom-provocation instrument, not an eye tracker**. The validated signal is the user's own 0–10 symptom ratings before and after each task. The camera contributes movement-adherence confirmation and one objective measure (NPC in cm). Camera output is always labelled supporting evidence.
- PCSS-22 symptom inventory (SCAT5 checklist) and the Amsterdam 2023 six-stage return-to-activity protocol, covering **return to learn as well as return to play**.
- Outputs: the screening result itself, a return-to-activity stage with a daily plan, and a printable summary for a clinician or teacher.
- Persistence is local to the device only. There is no account and no sync, so a lost device means lost history — this is a deliberate trade for the privacy guarantee and must be stated to the user, not hidden.
- The product must never diagnose, never clear anyone to return to play, and must surface emergency red-flag guidance.

## Brand Commitments

Name: **Baseline** — simultaneously the clinical term for pre-injury testing and the typographic term. Both readings are intended.

The visual world is already implemented and is binding: Bodoni Moda display, Archivo UI and action labels, JetBrains Mono for measured data; paper `#EFE7E2`, ink `#16110F`, ash `#6A615B`, terra `#C4491F`; a dim room palette on `:root[data-room='calm']`. Voice is precise and unhyped, and refuses false certainty — the user's prior work states limitations plainly rather than manufacturing confidence.

## Evidence on Hand

- Working clinical logic with 30 passing tests: `src/lib/clinical/{pcss,voms,npc}.ts`.
- Verified MediaPipe capability, measured in-browser: 478 landmarks including iris, 52 blendshapes, facial transformation matrix for head pose.
- Published cut points used: symptom provocation ≥2 points and NPC ≥5 cm (Mucha et al. 2014, *Am J Sports Med*); staging from Patricios et al., Amsterdam 2022 consensus (*BJSM* 2023).
- No user testing, no clinical validation, no real patient data, and no endorsement by any of the partner organizations. None of these may be implied.

## Product Principles

1. **The impaired brain is the design target.** Low stimulus, low motion, and low memory load are clinical requirements, not preferences or a theme.
2. **Never fake certainty.** "Not measured," "we couldn't resolve this," and "we measured it and found nothing" are three different statements and must never collapse into one.
3. **Route to care, never replace it.** The product's best outcome is the user seeing a professional with better information.
4. **Stopping is a supported path.** A session abandoned because symptoms flared is a valid, well-handled outcome.
5. **Privacy is structural, not promised.** The claim holds because there is no server to send anything to.

## Accessibility & Inclusion

Target WCAG 2.2 AA, plus concussion-specific requirements that exceed it: capped luminance and no pure-white surfaces (photophobia); no autoplaying, parallax, or scroll-driven motion in the clinical room (motion sensitivity and vestibular symptoms); short instructions that persist on screen rather than requiring recall (memory and concentration deficits); generous targets and full keyboard operation; and no meaning carried by color alone. The stimulus motion the tasks genuinely require is the single exception, is always user-initiated, and must be stoppable at any moment.
