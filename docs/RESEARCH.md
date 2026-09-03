# What this is built on

Every clinical constant in the code traces to one of these. Where we depart
from the source, the departure is noted here and in `docs/LIMITATIONS.md`.

## The screening instrument

**Mucha A, Collins MW, Elbin RJ, Furman JM, Troutman-Enseki C, DeWolf RM,
Marchetti G, Kontos AP.** "A Brief Vestibular/Ocular Motor Screening (VOMS)
Assessment to Evaluate Concussions: Preliminary Findings." *American Journal
of Sports Medicine*, 2014;42(10):2479–2486.

Supplies the seven tasks, the four symptom items rated 0–10 before and after
each, and two cut points the code uses directly:

- `PROVOCATION_THRESHOLD = 2` — a rise of 2 or more points on any of the four
  symptoms is treated as clinically significant (`src/lib/clinical/voms.ts`).
- `NPC_ABNORMAL_CM = 5` — near point of convergence at or beyond 5 cm.
  Some groups use 6 cm; we use the more sensitive figure and say so rather
  than quietly taking the more permissive one.

## Return-to-activity staging

**Patricios JS, Schneider KJ, Dvorak J, et al.** "Consensus statement on
concussion in sport: the 6th International Conference on Concussion in Sport
— Amsterdam, October 2022." *British Journal of Sports Medicine*,
2023;57:695–711.

Supplies both stage tables in `src/lib/clinical/staging.ts`. Two points from
this consensus shape the product more than anything else:

1. Prolonged rest is **not** recommended. Relative rest for 24–48 hours, then
   gradual reintroduction of activity.
2. The early stages may be attempted with mild, brief symptom exacerbation —
   a rise of no more than 2 points that settles within an hour. Being
   symptom-free is not the gate for stages 1–3.

Both of these contradict the "sit in a dark room until you feel fine" advice
most people still repeat, which is part of why the return-to-learn half is
worth building at all.

## The symptom inventory

**McCrory P, Meeuwisse W, Dvorak J, et al.** "Sport Concussion Assessment
Tool — 5th Edition (SCAT5)." *British Journal of Sports Medicine*,
2017;51:851–858.

Supplies the 22-item Post-Concussion Symptom Scale checklist and its 0–6
per-item severity scale (`src/lib/clinical/pcss.ts`). The four-factor
clustering (somatic / cognitive / sleep / emotional) used for reporting
follows the grouping common in the concussion literature (e.g. Kontos et al.,
2012); the printed SCAT5 checklist itself is not clustered.

## The measurement geometry

**Rüfer F, Schröder A, Erb C.** "White-to-white corneal diameter: normal
values in healthy humans obtained with the Orbscan II topography system."
*Cornea*, 2005;24(3):259–261.

The basis for treating the horizontal visible iris diameter as an anatomical
constant of roughly 11.7 mm with low variance. This is what makes the
convergence measurement self-calibrating: the iris is a ruler lying in the
image at exactly the depth being measured, so millimetres-per-pixel falls out
of the landmarks without any knowledge of the camera's focal length.

The rest of the geometry is ordinary optics, derived and unit-tested in
`src/lib/clinical/npc.ts` and its test file, which inverts a forward model to
confirm known fixation distances are recovered.

## The landmark model

Google MediaPipe **Face Landmarker** (`face_landmarker.task`, float16),
478-point refined mesh including iris landmarks, plus 52 blendshapes and a
facial transformation matrix. Run under `@mediapipe/tasks-vision` in WASM.

The model and runtime are vendored into `public/mp/` and served from this
app's own origin. This is not a detail: an "on-device" claim is not true if
the model is fetched from a third-party CDN at load time, because that
request still reports who is using the tool and when.
