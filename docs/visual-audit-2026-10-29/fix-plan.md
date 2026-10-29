# Proposed visual-fix plan — 2026-10-29

**Status: user-authorized implementation; targeted fixes landed, broader visual
review remains open.** The original plan-only boundary was superseded by the
user's explicit implementation request on 2026-10-29. Findings and original
screenshots remain in this directory's reports and the local ignored artifact set
at `.artifacts/visual-audit-2026-10-29/`.

## Goals and guardrails

- Resolve the high-confidence shot/readability problems and user-approved model
  candidates without changing story text, duration, character identity, or the
  fixed balcony geography.
- Keep animation deterministic from story time so seeking and replay match.
- Treat the reviewed images as evidence, not proof: classify ambiguous props
  before deleting or moving them. Some are intentional flowers, petals, bees, or
  storm damage.
- Preserve the documented limitation that every face, fingertip, and soil contact
  need not be simultaneously unobstructed in every stylized shot.
- Keep screenshots and local captures in the Git-ignored `.artifacts/` directory;
  commit only source/model changes and documentation.

## Current implementation status — 2026-10-29

- **A — tape-run:** `film-direction.js` uses a closer insert centered on the
  tape hand and held hinge. Paresh now approaches the fixed broken hinge during
  the existing tape run, and the working hand/tape reach the held hinge at t=22.5.
  Desktop and mobile captures were inspected; small-prop visibility remains
  stylized, but the action reads as fastening contact. Set positions are
  unchanged.
- **B — contacts/readability:** sowing hands and placed seeds moved inward together
  (`SOW_SOIL_Z = -0.2`); the shared-repair view is less overhead; the shared-joy
  move begins at 16.2 s and is settled at the 17.1 s hand contact; one bee has a
  small deterministic lateral detour around Anshita's face. Morning handoff poses
  were sampled, passed hand-to-face clearance assertions at the cited times, and
  were left unchanged. The storm slip now moves Paresh's hand visibly off the
  hinge and restores it for re-grip; the bloom camera is slightly off-axis and the
  joined hands move farther toward camera, clearing foreground blooms in sampled
  desktop/mobile captures. This is not a complete review of every listed action
  frame.
- **C — measure:** the end of seven-am now pre-rolls into the measure camera pose.
  Projected stalk-tip bounds pass at 0.08, 14.58, and 29.58 s in both viewports.
  Measure actors are spaced farther apart and the orbit moves to the balcony side;
  mobile uses a wider camera radius. Sampled captures at 1440×900 and 390×844 keep
  both faces and tall stalks in frame. Continuous reveal review remains open.
- **D — models:** no model geometry changed. Paresh's headphone, shoe, and jaw
  candidates were not confirmed defects. The apparent Anshita hip canister is the
  coffee cup/steam group; the scalp wedge and reach-pose hair clearance remain
  unconfirmed and untouched.
- **E — floating pieces:** no props were removed. The dawn pale cluster matches
  coffee steam; the colored deck shard matches the scaled tulip bloom; the storm
  piece is the attached support; and the horizontal repair piece is a bent stalk.
  Seeds are authored and intentional, but their placement moved inward under B.

Validation: `tests/cinematic.cjs` passed at both target viewports with no page
errors or asset warnings. It now checks hand/tape-to-hinge contact at the
fastening beat. Story-module and Python server tests, JavaScript syntax checks,
and `git diff --check` passed. Selected captures are in the ignored
`.artifacts/visual-fix-20261029/`; independent full-film/silhouette review remains
open.

## Issue register and acceptance targets

### A. Storm tape-run shot — highest priority

Evidence: `storm-and-morning-after.md`, especially
`058_event_g165.42_07-storm_t21.00.png`. The runtime reports the `tape-run` shot
and a visible tape variant, but the image reads as a door/lamp/railing insert with
no visible characters or tape action.

Target: at storm t≈20.5–22, the shot clearly contains the tape, Paresh's working
hand, and Anshita's still-held stem. The contact must be visible in the rendered
image, not only in runtime visibility state. Preserve the intended screen
direction and deterministic shot blend.

### B. Contact and interaction readability

Review sowing t2.08/t6/t7.68, storm t8.0/8.4/8.8/11.5/18.6, shared repair
seven-am t8, morning handoff t23.8/24.5 and t29/30.5, and bloom t15.5–17.1.
The reports identify hand/stem/tool contacts that are obscured or visually
ambiguous, plus a bee that briefly overlaps Anshita's face.

Target: each authored action reads as a connected hand/object/target relationship
in its action insert; no hand appears detached or passes through a face, hair mass,
or prop. Avoid overcorrecting into a pose that breaks character identity or
grounding. Recheck bee clearance at the face while retaining its garden flight.

### C. Measure / height-reveal framing

Evidence: `085_edge_g235.50_10-measure_t00.08.png` clips the stalk tips at entry;
later measure frames `090`–`093` fit more of the plant but let stalks/leaves cross
character silhouettes.

Target: avoid an accidental entry-frame crop and keep both faces readable through
the reveal. Preserve the scale payoff; do not require all plant tips and all
character details in one shot if that defeats the authored height emphasis.

### D. Character-model candidates

- **Paresh (`models/paresh.bbmodel`):** check the unusually high open headphone
  arch, the asymmetric shoe block, and the fragmented jaw/neck outline. Preserve
  the readable headphones, clothing, and back pack; these are candidates, not
  confirmed broken geometry.
- **Anshita (`models/anshita.bbmodel`):** check the exposed scalp wedge under the
  top hair, clearance of the long locks around the shoulder/arm in reach poses,
  and the mount for the banded hip canister. Preserve the long-hair silhouette
  and outfit identity.
- **Both models:** mitten-like hands and simple facial features are style choices
  but constrain contact and expression readability. Treat finger detail or
  expression geometry as optional polish, not mandatory scope.

Target: no visible gaps or unintended intersections in front/side/back views and
representative action poses, verified through the actual runtime loader. Avoid
adding detail that breaks the established low-poly style.

### E. Uncertain floating/debris candidates — classify before editing

Inspect the pale cluster at dawn t5 (`001`), seeds near the rim at sowing t2.08
(`007`), the magenta/green deck shard at good-things t2.58 (`027`), the thin brown
piece near the storm railing at t27.5 (`060`), and the green horizontal piece near
the railing in repair (`079`–`080`). Determine each asset/group and its authored
purpose from the runtime and model source. Only alter an item if its attachment or
persistence is unintended; document intentional debris/flowers rather than
removing them as “ghosts.”

The morning-after empty-doorway insert at t1.5 (`062`) is intentional and is not
an issue to fix. The ending card is stable. The sampled audit found no definite
pot/deck/door geography pop.

## Parallel work plan

The current `AGENTS.md` assigns source, asset, tests, and browser validation to the
primary agent. Therefore subagents should run **read-only analysis/review** in
parallel; they should not edit assets or source. Suggested parallel assignments:

1. **Camera/source attribution:** map the tape-run projection, measure entry
   crop, and bloom shot cut to `film-direction.js` and exact runtime states.
2. **Interaction/pose attribution:** map storm, sowing, repair, and handoff
   contacts to `actor-performance.js` / `garden.js`; identify the smallest
   deterministic pose seam for each.
3. **Paresh asset review:** inspect the `.bbmodel` structure and runtime views;
   return attachment/clearance measurements and a proposed low-poly-safe target.
4. **Anshita asset review:** inspect hairline, long-lock clearance, and canister
   mount in the `.bbmodel` and runtime views.
5. **Prop identity review:** identify the pale cluster, seed spheres, deck shard,
   and storm/repair debris by source group and visibility schedule; classify
   intended vs unintended before any removal.

After those reports, the primary agent should integrate and edit in small,
non-overlapping milestones:

1. `film-direction.js`: shot/framing adjustments for A and C.
2. `models/paresh.bbmodel` and `models/anshita.bbmodel`: separate asset milestones
   for D, each checked with the runtime loader before proceeding.
3. `actor-performance.js` and, only where necessary, `garden.js`: deterministic
   pose/contact work for B and confirmed visibility/attachment corrections for E.
   Keep `garden.js` under one owner because it contains shared scene state.
4. `tests/cinematic.cjs`: one integrated test update after behavior is settled;
   this file is shared by the tracks and should not be edited concurrently.

Camera, character assets, and actor-contact analysis can proceed independently;
prop identity is a gate for E; final tests and cinematic captures are an
integration gate after the source/model work. Do not run multiple QA browsers at
once.

## Validation and completion gate

- Add or update targeted deterministic assertions for the tape-run projection,
  entry framing, hand/object contacts, and model/rig contacts where the existing
  runtime test seam supports them.
- Run `node tests/story-modules.mjs`,
  `python3 -m unittest discover -s tests -v`, JavaScript syntax checks, and
  `git diff --check`.
- Run `tests/cinematic.cjs` in Chromium at 1440×900 and 390×844. Re-seek the
  exact cited frames and compare before/after captures against
  `.artifacts/visual-audit-2026-10-29/`.
- Confirm no page errors, asset warnings, story timing/text changes, history-
  dependent poses, planted-foot regressions, or unwanted changes to the empty
  doorway/end card.
- Keep uncertain candidates unchecked/unresolved until the user or source review
  confirms their intended state. Record validation evidence with each completed
  implementation milestone; do not mark findings fixed based on code assertions
  alone when the issue is visual.
