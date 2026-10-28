# Cinematic improvements

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
- [ ] Grounded walking, kneeling transitions and shuffling with planted feet.
  Sowing and storm travel currently use editorial cuts; the joy approach still
  needs actual steps rather than root translation.
- [ ] Reliable hand/object contact, grip poses, hand-relative prop orientation,
  and believable reach/hold/release transitions.

## 2. Character performance

- [x] Differentiate reaction timing and breathing between the two characters.
- [ ] Reusable reach, touch, hold and release performances.
- [ ] Reusable step, kneel, settle and rise performances.
- [ ] Wind bracing, hesitation, accepting a hand and looking away/back.
- [ ] Distinct character movement styles and intentional quiet poses.
  Small timing differences are implemented; full performance direction remains.

## 3. Camera and editing

- [x] Add chapter-specific shot tracks with purposeful cuts and gentle pushes.
- [x] Add tighter laptop-tension, storm, repair and relationship framing.
- [x] Reserve the sustained arc/crane for the height reveal; avoid the doorway.
- [x] Add portrait-specific framing and inspect desktop/mobile captures.
- [ ] Complete insert/reaction coverage: seed contact, failed storm grip, empty
  doorway, shared repair hands and flower reaction.
- [ ] Resolve the partially obscured kneeling character in the storm return.

## 4. Geography and staging

- [x] Stop pots and flowers visibly sliding within shots.
- [ ] Keep fully consistent set geography across chapters. Current reblocking is
  hidden by chapter cuts; replace that accommodation with camera/actor blocking.
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
- [ ] Review the full 399-second running time for unearned pauses/repetition.

## 8. Presentation

- [x] Replace visible floating speech/emoji bubbles with stable subtitles.
- [x] Fade controls during playback; restore them on interaction/keyboard focus.
- [x] Reduce permanent scrims; retain transcript and reduced-motion support.
- [ ] Replace the former emoji expressiveness with richer physical acting.

## 9. Lighting and sound

- [x] Add warm, tense, storm, aftermath and ending light palettes.
- [x] Add opt-in local synthesized ambience and soil/tape/ceramic sound cues.
- [x] Support mute/pause and suppress cue retriggering on seeks.
- [ ] Listen to the whole soundtrack and tune levels, cue timing and transitions.
  Browser sound-toggle checks passed; auditory quality has not been evaluated.
- [ ] Add footsteps tied to the eventual grounded locomotion.
- [ ] Consider higher-quality recorded foley and a sparse score after listening
  review. These are optional polish ideas, not prerequisites.

## 10. Technical structure and verification

- [x] Extract camera/light direction into `film-direction.js` and audio into
  `soundscape.js`, retaining the static local stack.
- [x] Cache group-to-mesh lookups and stop per-frame floating-bubble layout work.
- [x] Add meaningful browser regressions in `tests/cinematic.cjs`.
- [ ] Extract screenplay, actor tracks and subtitle/control logic into focused
  modules; remove unused bubble-projection compatibility code.
- [ ] Cache remaining repeated rig references and reduce frame-loop allocations.
- [ ] Profile frame times, duplicate asset loading and disabled frustum culling
  before targeted optimization. The sampled ending render had 518 draw calls and
  11,684 triangles; this is not an FPS benchmark.

## Validation recorded for the implementation baseline

- Six Python server tests passed: `python3 -m unittest discover -s tests -v`.
- JS syntax checks and `git diff --check` passed.
- `tests/cinematic.cjs` passed in Chromium: dialogue bounds, deterministic visible
  poses on nonsequential seeks, ambient clocks, embrace boundary, stationary storm
  pots, late tape cue, final line/card, subtitle bounds, sound toggles, controls,
  ending hold and reduced-motion camera. No page errors or loader asset warnings.
- Desktop 1440×900 and mobile 390×844 screenshots were captured and selected
  images inspected. The final lateral storm-camera adjustment was checked by
  captures after the regression run. Full motion/independent review remains open.
- Local evidence: `.artifacts/cinematic-overhaul-20261028/` (ignored, not required
  for checkout). Historical agent delegation failed due to an expired API key;
  direct implementation and browser checks were used instead.
