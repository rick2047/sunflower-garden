# Cinematic improvements

## Direct completion pass — 2026-10-28

The user authorized direct implementation after the delegated visibility review
stopped. The current pass supersedes the provisional notes below: grounded gait,
kneel/rise, real-pivot contact and fixed set geography passed `tests/cinematic.cjs`
in Chromium. Desktop/mobile action captures are in the ignored
`.artifacts/cinematic-direct-20261028/` directory.

Sowing now uses wider, rearward marks and a bounded axial sleeve extension for
the soil reach. Shared morning/joy hands are in front of the bodies. Storm-return
actors have separate lateral marks, with the shared point within 0.1 world unit
of the broken hinge at 27.5 seconds. Task eyelines are neck-limited; portrait
framing preserves the flower crowns. These changes preserve story text, the
399-second duration, fixed pot geography, character assets and all contact tests.

The previous review's requirement that both faces, all fingertips, and the soil
be simultaneously unobstructed is not claimed as universally met. Dense repair
geometry and small portrait contacts remain stylized. Auditory judgment and the
unchecked full-film artistic review items remain explicitly open; automated
playback and sampled images are not a substitute for those judgments.

Final combined browser gate passed after screenplay/UI extraction, footstep cues
and acting accents: 12 chapters, 399 seconds, no asset warnings, all prior
determinism/contact/grounding/geography/control/reduced-motion assertions intact.
`node tests/story-modules.mjs` also passed (exact original dialogue/timing hash,
named cue crossings and presentation controls); all six Python tests passed.

Continuous playback also completed all 399 seconds with sound enabled, no page
errors and a held ending card. Twelve chronological chapter captures were
inspected, alongside the action-specific desktop/mobile images. This is sampled
visual evidence, not a claim to have heard the soundtrack or screened every frame.

This tracks the user's approved review of the garden film. Preserve the existing
12-chapter story and character identity. Checked items are implemented; unchecked
items include partial work and optional ideas. Implementation baseline: `8c4bb07`.
Three.js is now the default authoring workflow; remaining model/animation work
is no longer blocked on Blockbench.

## 1. Animation continuity

- [x] Keep rain, bees and clouds moving beyond the bounded action duration.
- [x] Remove the embrace root-position snap and blend its arm target.
- [x] Replace generic scene-entry position glides with established blocking/cuts.
- [x] Keep character roots grounded; layer subtle breathing on the torso.
- [x] Make late aftermath tape cues reachable and preserve the broken state.
- [x] Use elapsed playback time instead of slowing the film at low frame rates.
- [x] Grounded walking, kneeling transitions and shuffling with planted feet.
  `actor-performance.js` supplies the absolute-time four-step joy gait,
  kneel/settle/rise and planted-foot IK. Final browser assertions passed.
- [x] Reliable hand/object contact, grip poses, hand-relative prop orientation,
  and believable reach/hold/release transitions.
  Real-pivot reach solving, shared-contact points, hand-relative seed/tape/support
  placement, storm slip/re-grip, repair and morning handoff passed final QA.
  A bounded axial sleeve adjustment exposes sowing without changing the feet.

## 2. Character performance

- [x] Differentiate reaction timing and breathing between the two characters.
- [x] Reusable reach, touch, hold and release performances.
  See the real-pivot contact assertions and action captures above.
- [x] Reusable step, kneel, settle and rise performances.
  `actor-performance.js`; final gait/kneel assertions passed.
- [x] Wind bracing, hesitation, accepting a hand and looking away/back.
  `attentionPose` adds wind lean and delayed laptop glance/averted gaze; existing
  shared-hand acceptance remains driven by the morning invitation.
- [x] Distinct character movement styles and intentional quiet poses.
  Paresh has broader gestures and quicker reactions; Anshita has smaller gestures
  and delayed attention. Quiet dusk/ending poses hold a partner eyeline.

## 3. Camera and editing

- [x] Add chapter-specific shot tracks with purposeful cuts and gentle pushes.
- [x] Add tighter laptop-tension, storm, repair and relationship framing.
- [x] Reserve the sustained arc/crane for the height reveal; avoid the doorway.
- [x] Add portrait-specific framing and inspect desktop/mobile captures.
- [ ] Complete insert/reaction coverage: seed contact, failed storm grip, empty
  doorway, shared repair hands and flower reaction.
  *(Provisional round 2: seed contact, failed grip, shared repair and flower
  reaction have named shots, and the empty-doorway insert now exists in the
  morning-after quiet opening (0–3 s). Image review of all five remains open.)*
- [x] Resolve the partially obscured kneeling character in the storm return.
  Direct pass separates the actor marks to x=-20/0, raises the task angle and
  widens portrait framing. Desktop/mobile captures show separate faces/torso
  silhouettes and the shared broken-stem hold; the pots still cover lower shins.

## 4. Geography and staging

- [x] Stop pots and flowers visibly sliding within shots.
- [x] Keep fully consistent set geography across chapters.
  The chapter-specific pot/plant/flower displacement is removed. Final browser
  checks assert invariant pot, plant-root and flower positions across ch1/ch5–ch9
  while the breakage state still changes.
- [ ] Verify silhouettes, contact and screen direction throughout moving shots,
  beyond the captured checkpoints.

## 5. Dialogue

- [x] Shorten conflict dialogue and make accusations/replies more direct.
- [x] Preserve early warmth and restore gentleness during repair.
- [x] Keep “Taller than us,” “One more minute” / “Okay. Two,” and the final line.
- [ ] Watch the entire revised film for emotional progression and voice
  consistency; checkpoint checks do not establish full-film dramatic quality.

## 6. Ending

- [x] Trim the vegetable aside and reduce competing final exchanges.
- [x] Establish next summer together and give the final line a clear setup.
- [x] Leave room after the final line; hold the end card rather than auto-loop.

## 7. Pacing

- [x] Hand-time key conflict, repair, reveal and ending exchanges.
- [x] Add pauses for replies and reactions independently of action duration.
- [ ] Synchronize all important gestures, gazes, prop reveals and interruptions
  to dialogue cues. Some physical cues still use independent fixed timestamps.
  *(Provisional round 1 covers the storm slip/re-grip at 7.0/10.2 s, tape pickup
  at 18 s, return cut at 24.5 s, morning hold at 23 s and final-line shot at
  26.5 s; other cues remain fixed.)*
- [ ] Review the full 399-second running time for unearned pauses/repetition.

## 8. Presentation

- [x] Present every dialogue line in a speaker-attributed bubble anchored to the
  speaking character; playback dialogue is not a fixed subtitle panel.
  `tests/cinematic.cjs` checks all 12 chapters for speaker/text attribution,
  deterministic placement and viewport bounds at 1440×900 and 390×844; quiet
  beats hide the bubble.
- [x] Fade controls during playback; restore them on interaction/keyboard focus.
- [x] Reduce permanent scrims; retain transcript and reduced-motion support.
- [x] Replace the former emoji expressiveness with richer physical acting.
  Grounded approach, shared holds, release/re-grip, neck-limited task glances,
  wind bracing, hesitation and differentiated conversational gestures carry
  emotion; dialogue bubbles show only speaker-attributed spoken lines.

## 9. Lighting and sound

- [x] Add warm, tense, storm, aftermath and ending light palettes.
- [x] Add opt-in local synthesized ambience and soil/tape/ceramic sound cues.
- [x] Support mute/pause and suppress cue retriggering on seeks.
- [ ] Listen to the whole soundtrack and tune levels, cue timing and transitions.
  Browser sound-toggle checks passed; auditory quality has not been evaluated.
- [x] Add footsteps tied to the grounded locomotion.
  Low-pass footstep cues at 15.9/16.3/16.7/17.1 use the gait's alternating plants;
  pure-module tests verify crossings and seek suppression.
- [x] Consider higher-quality recorded foley and a sparse score.
  Deferred: retain the small locally synthesized soundtrack for this release.
  Recorded foley/score remain optional future polish after human listening.

## 10. Technical structure and verification

- [x] Extract camera/light direction into `film-direction.js` and audio into
  `soundscape.js`, retaining the static local stack.
- [x] Cache group-to-mesh lookups and keep speech-bubble layout deterministic.
- [x] Add meaningful browser regressions in `tests/cinematic.cjs`.
- [x] Extract screenplay, actor tracks and speech-bubble/control logic into
  focused modules: `screenplay.js`, `actor-performance.js`, `presentation.js`,
  `story-cues.js` and `speech-bubble-layout.js`. Preserve exact dialogue/timing.
- [x] Cache remaining repeated rig references and reduce frame-loop allocations.
  Cached plant soil/wrap and flower-nameplate pivots, attachment hands and progress
  element; reused contact/laptop vector scratch space. Deterministic QA passed.
- [x] Profile frame times, duplicate asset loading and disabled frustum culling
  before targeted optimization. At 960×600 on headless Chromium/SwiftShader, 12
  explicit seek+render samples averaged 63.2 ms (49.8–82.0 ms); the ending had 518
  draw calls and 11,684 triangles. All 792 mesh instances have culling disabled;
  leave that conservative choice intact because the skin/variant bounds animate.
  Repeated garden-care loads made three network requests. Enabling Three's fetch
  cache reduced every model URL to one request while keeping independent parsed
  skeleton roots; the loader returned no warnings. This is a software-renderer
  profile, not a production desktop/mobile FPS claim.

## Validation recorded for the implementation baseline

- Six Python server tests passed: `python3 -m unittest discover -s tests -v`.
- JS syntax checks and `git diff --check` passed.
- `tests/cinematic.cjs` passed in Chromium: dialogue bubble visibility/bounds,
  deterministic poses on nonsequential seeks, ambient clocks, embrace boundary,
  stationary storm pots, late tape cue, final line/card, sound toggles, controls,
  ending hold and reduced-motion camera. No page errors or loader asset warnings.
- Desktop 1440×900 and mobile 390×844 screenshots were captured and selected
  images inspected. The final lateral storm-camera adjustment was checked by
  captures after the regression run. Full motion/independent review remains open.
- Local evidence: `.artifacts/cinematic-overhaul-20261028/` (ignored, not required
  for checkout). Historical agent delegation failed due to an expired API key;
  direct implementation and browser checks were used instead.

## Round 1 provisional implementation (`cinematic-resume-20261028`)

`actor-performance.js` is the new focused module for absolute-time gait,
kneel/settle/rise and reach/shared-contact solving. It does not change model
files, loader behavior, character identity, the 12-chapter screenplay or the
static runtime. Required evidence before any provisional item is treated as
final:

- QA runs `tests/cinematic.cjs`; the four-step joy gait must alternate support,
  keep the support sole on the deck at every sample, keep the root within
  `DECK_TOP − 0.4` and lift each swing foot above 0.7, and the settled stance
  must hold after 17.1 s.
- QA captures desktop 1440×900 and mobile 390×844 at ch1 t6/t17 (sowing contact),
  ch6 t8.4/t11.5 (failed grip/re-grip), ch6 t21 (tape run), ch6 t27.5 (return
  kneel), ch7 t23.8/t29 (handoff lines/contact), ch8 t8 (shared repair), ch10
  t15.6/t16.3/t17.2 (steps and flower reaction) and ch11 t28 (final line).
- Visual review confirms the sowing and repair contacts are unobscured, the
  storm return silhouettes separate, and the joy steps read; narrative review
  confirms the handoff and final-line samples.
- Contact assertions use real runtime hand/prop positions; no contact state is
  fabricated. Unverified items remain unchecked.

## Round 2 implementation (`cinematic-publish-20261028`, round 1)

**Historical handoff below:** its “evidence required” notes were resolved or
superseded by the direct completion pass at the top of this file. Outstanding
unchecked subjective items above remain open; do not interpret those old notes as
the current validation status.

Scope: `garden.js`, `film-direction.js`, `tests/cinematic.cjs`, this checklist.
No model, loader, vendor, screenplay, cast or publishing file changed.

- **Fixed set geography.** The chapter 6–8 block that moved every pot pivot,
  plant root and flowering prop forward is removed. All chapters now use the
  authored pot row (`x = -13/0/13`, `z = -1`) and authored flower spots; only
  growth, breakage, bloom scale and visibility change. Storm and repair marks
  and their shots are reblocked by `ACTION_SET_DEPTH = 15` (actors and camera
  aim points only). `tests/cinematic.cjs` compares pot pivots, both plant roots
  and representative flower roots across ch1 and ch5–ch9, and separately checks
  that the broken hinge angle still changes.
- **Contact visibility pass (image result not asserted here).**
  - Sowing: the soil/hand insert is tighter in both viewports and the working
    head aim sits a little higher/in front, keeping faces toward the camera and
    hair away from the near rim. Existing hand targets and reach are unchanged.
  - Storm: "It's slipping." now keeps Paresh's reaching hand engaged but
    visibly off the grip (`0.28` arm blend at peak slip) instead of dropping it
    to his side; "Don't let go." re-closes it. The tape mark remains at the
    fixed tape prop, and the tape shot separates his working hand from
    Anshita's still-held stem.
  - Storm return and repair: shots are re-aimed at the fixed pot positions and
    the return camera is more frontal, so the kneeling and standing silhouettes
    have more screen separation. Repair eye height is lowered toward the joint.
  - Joy: the joined-hand hold finishes toward the camera (`z` 3.2 instead of
    1.0) so the shared contact sits in front of the fixed pot foliage; the
    gait, shared-point solve and hand-separation threshold are unchanged.
  - Chapter 7: the empty-doorway insert is shot at 0–3 s, before "You left.";
    both actors are behind the camera plane and the open doorway is framed.
- **Deterministic contracts unchanged.** All camera/actor changes are pure
  functions of chapter and story time; no previous-frame state, new random
  source, prop motion or contact threshold was introduced. The story remains
  12 chapters / 399 s with identical text and cast. Reduced motion still holds
  the camera and gait state.
- **Evidence still required.** Round-2 sets the same checklist gate: QA must run
  `tests/cinematic.cjs` twice (including the new geography, empty-doorway and
  contact-projection assertions) and capture desktop 1440×900 and mobile 390×844
  at ch1 t6/t17; ch6 t8.4/t11.5/t18.6/t21/t27.5; ch7 t1.5/t23.8/t24.5/t29/t30.5;
  ch8 t8; ch10 t15.5–17.1 and ch11 t28. Independent visual and narrative review
  must pass the sowing, storm slip/tape/return, repair, morning shared hold and
  joy hand contact before any related item above is checked. Full-film playback,
  sound and audio review remain unassessed.
- **Local static checks only (implementation handoff):** `garden.js`,
  `film-direction.js` and `actor-performance.js` parse as ES modules;
  `tests/cinematic.cjs` parses as CommonJS; `git diff --check` is clean;
  `python3 -m unittest discover -s tests -v` passes 6 tests. The browser test,
  captures and reviews were not run by the implementer, so no image or runtime
  claim is made here.
