// Shot and light tracks are evaluated from story time, never previous frames.
// Coordinates describe the existing Blockbench set; no geometry lives here.
const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;
const pose = () => ({ position: [0, 0, 0], target: [0, 0, 0], shot: '', start: 0 });
const _rawPose = pose(), _cutFrom = pose(), _cutPose = pose(), _sceneFrom = pose(), _finalPose = pose();
const CUT_BLEND_SECONDS = 0.9;
const STORM_CUT_BLEND_SECONDS = 0.35;
const APPROACH_CUT_BLEND_SECONDS = 0.6;
export const SCENE_CAMERA_BLEND_SECONDS = 1.15;

function sampleShotPose(aspect, chapter, seconds, reduced, sowFocus, result) {
  const mobile = aspect < 1;
  const id = chapter.id;
  let target = [0, 19, 3], offset = [7, 12, mobile ? 130 : 100], start = 0;
  let shot = 'establishing';
  const frame = (name, at, aim, eye) => {
    shot = name; start = at; target = aim; offset = eye;
  };
  if (id === 'sowing') {
    // Low three-quarter insert from Paresh's side: the active pot opening, the
    // packet and both fingertips stay clear of the long-haired actor's head.
    // The insert is tighter than the old establishing distance so the near-rim
    // fingers and seed are separable at both viewports.
    frame('soil-and-hands', 0, [sowFocus, 13.5, 3.6],
      [0, mobile ? 72 : 42, mobile ? 105 : 44]);
  } else if (id === 'weather-turns') {
    frame('windup', 0, [0, 22, 8], [mobile ? 2 : 10, 16, mobile ? 112 : 76]);
    const gustAt = chapter.dialogue[2].start;
    if (seconds >= gustAt) frame('first-gust', gustAt, [0, 22, 6],
      [mobile ? -4 : 4, 14, mobile ? 104 : 70]);
  } else if (id === 'weather-report') {
    frame('separation', 0, [0, 23, -7], [12, 8, mobile ? 140 : 94]);
    const unansweredAt = chapter.dialogue[2].start;
    const behindAt = chapter.dialogue[3].start;
    const behindEnd = chapter.dialogue[3].end;
    const behindQuietEnd = chapter.dialogue[4].start;
    if (seconds >= unansweredAt) frame('unanswered-look', unansweredAt,
      mobile ? [0, 23, -7] : [24, 27, 2],
      mobile ? [12, 8, 140] : [-8, 4, 54]);
    if (seconds >= behindAt && seconds < behindEnd) frame('behind-the-screen', behindAt,
      [0, 23, -7], [12, 8, mobile ? 140 : 94]);
    else if (seconds >= behindEnd && seconds < behindQuietEnd) {
      frame('behind-the-screen', behindEnd, [-20, 26, -22], [10, 5, mobile ? 140 : 54]);
    }
  } else if (['storm','morning-after','seven-am'].includes(id)) {
    // The pot/plant set is fixed in every chapter. Storm and repair blocking was
    // authored around a bay 15 units toward camera; their shots aim at the
    // reblocked actors instead of the old bay, and the props never move.
    const careZ = id === 'morning-after' ? 12 : -3;
    frame('care-two-shot', 0, [0, 20, careZ], [4, 10, mobile ? 110 : 78]);
    if (id === 'storm') {
      const failedGripAt = chapter.dialogue[2].start - 0.2;
      const tapeRunAt = chapter.dialogue[4].end + 1;
      if (seconds >= failedGripAt && seconds < tapeRunAt) {
        frame('failed-grip', failedGripAt, [-6, 20, -2],
          [mobile ? 0 : -8, mobile ? 48 : 32, mobile ? 83 : 48]);
      } else if (seconds >= tapeRunAt && seconds < 24.5) {
        // Keep the held hinge and the tape in his working hand large enough to
        // read together; this is a closer, lower insert, not a new blocking mark.
        frame('tape-run', tapeRunAt, [-2, 22, 6], [0, mobile ? 40 : 18, mobile ? 135 : 39]);
      } else if (seconds >= 24.5) {
        // Frontal off-axis from the returning side: the kneeling figure and the
        // standing holder separate, with the stem still between them.
        frame('return-to-her', 24.5, [-9, 18, -3], [mobile ? 0 : 7, mobile ? 54 : 34, mobile ? 90 : 43]);
      }
    } else if (id === 'morning-after') {
      const doorwayHold = Math.max(0, chapter.dialogue[0].start - CUT_BLEND_SECONDS);
      if (seconds < doorwayHold) {
        // Quiet opening insert: a head-on level view of the open doorway, with
        // both actors behind the camera plane, so the opening is actually empty.
        frame('empty-doorway', 0, [-18, 20, -15.6], [0, 0, 17.6]);
      } else {
        frame('care-two-shot', doorwayHold, [0, 20, 12], [4, 10, mobile ? 110 : 78]);
      }
      if (seconds >= 11) frame('the-silence-between', 11, [0, 23, 5], [5, 4, mobile ? 100 : 70]);
      const handoffAt = chapter.dialogue[4].start;
      if (seconds >= handoffAt) frame('the-handoff', handoffAt, [0, 23, 6],
        [0, mobile ? 30 : 20, mobile ? 98 : 62]);
    } else if (id === 'seven-am' && seconds < 10) {
      // Shared middle-pot repair: the joint sits near face height for the
      // camera, so the two hands and the tape read against the sky instead of
      // under the leaves above the fixed pot.
      frame('shared-repair', 0, [0, 21, -2], [0, mobile ? 28 : 10, mobile ? 92 : 60]);
    } else if (id === 'seven-am') {
      // Use the quiet coda after the last repair line to set up the height
      // reveal. The following chapter then blends from a frame that already
      // contains the stalk tips instead of inheriting the tight repair insert.
      const preRevealAt = Math.max(chapter.dialogue.at(-1).end,
        chapter.dur - SCENE_CAMERA_BLEND_SECONDS);
      const radius = mobile ? 104 : 76;
      frame('height-reveal-prep', preRevealAt, [0, 25, 7],
        [Math.sin(-0.3) * radius, -15, Math.cos(-0.3) * radius]);
    }
  } else if (id === 'measure') {
    // Save the sustained orbit and crane for the title's payoff.
    // Remain on the balcony side of the doorway and preserve screen direction.
    const orbit = mix(-0.3, 0.3, ease((seconds - 2) / 14));
    const lift = reduced ? 1 : ease((seconds - 16) / 8);
    const radius = mobile ? 104 : 76;
    target = [0, mix(25, 29, lift), 7];
    result.position[0] = Math.sin(reduced ? 0 : orbit) * radius;
    result.position[1] = reduced ? 34 : mix(10, 50, lift);
    result.position[2] = 7 + Math.cos(reduced ? 0 : orbit) * radius;
    result.target[0] = target[0]; result.target[1] = target[1]; result.target[2] = target[2];
    result.shot = 'height-reveal'; result.start = 0;
    return result;
  } else if (id === 'bloom') {
    frame('flower-reveal', 0, [0, 35, 0], [12, 8, mobile ? 126 : 98]);
    if (seconds >= 15.5 && seconds < 16.2) {
      // Approach insert on the deck: the four alternating steps read before the
      // cut back up to the flowers and the shared reaction.
      frame('approach-steps', 15.5, [0, 17, 4], [6, 5, mobile ? 96 : 60]);
    } else if (seconds >= 16.2) {
      // Begin this move during the last step so the held hands are composed
      // when the shared contact completes at 17.1 seconds.
      frame('shared-joy', 16.2, [0, 25, 8], [0, mobile ? 28 : 18, mobile ? 105 : 68]);
    }
  } else if (id === 'summer') {
    frame('last-light', 0, [0, 27, 1], [14, 13, mobile ? 126 : 105]);
    const oneMoreMinuteAt = chapter.dialogue[4].start;
    const lastLineAt = chapter.dialogue.at(-1).start - 0.5;
    if (seconds >= oneMoreMinuteAt) frame('one-more-minute', oneMoreMinuteAt,
      [0, 27, 5], [8, 6, mobile ? 91 : 71]);
    if (seconds >= lastLineAt) frame('last-line', lastLineAt,
      [0, 25, 5], [6, 7, mobile ? 96 : 70]);
  } else if (id === 'good-things') {
    frame('evening-garden', 0, [0, 18, 8], [15, 21, mobile ? 128 : 95]);
    if (seconds >= 16) frame('shared-scent', 16, [0, 27, 5], [9, 6, mobile ? 91 : 70]);
  } else if (seconds >= 9 && id !== 'weather-turns') {
    frame('garden-two-shot', 9, [0, 25, -2], [6, 8, mobile ? 140 : 91]);
  }
  // A barely perceptible push inside the shot; authored cut times remain stable.
  const push = reduced ? 1 : 1 - 0.035 * ease((seconds - start) / 12);
  result.target[0] = target[0]; result.target[1] = target[1]; result.target[2] = target[2];
  result.position[0] = target[0] + offset[0] * push;
  result.position[1] = target[1] + offset[1] * push;
  result.position[2] = target[2] + offset[2] * push;
  result.shot = shot; result.start = start;
  return result;
}

function blendPose(from, to, amount, result) {
  const t = ease(amount);
  for (let axis = 0; axis < 3; axis++) {
    result.position[axis] = mix(from.position[axis], to.position[axis], t);
    result.target[axis] = mix(from.target[axis], to.target[axis], t);
  }
  result.shot = to.shot;
  result.start = to.start;
  return result;
}

function copyPose(source, result) {
  for (let axis = 0; axis < 3; axis++) {
    result.position[axis] = source.position[axis];
    result.target[axis] = source.target[axis];
  }
  result.shot = source.shot;
  result.start = source.start;
  return result;
}

export function directShot(camera, look, chapter, seconds, reduced, sowFocus = 0,
  previousChapter = null, previousSowFocus = 0) {
  const current = sampleShotPose(camera.aspect, chapter, seconds, reduced, sowFocus, _rawPose);
  let destination = copyPose(current, _cutPose);
  const cutBlend = chapter.id === 'storm' ? STORM_CUT_BLEND_SECONDS
    : current.shot === 'approach-steps' ? APPROACH_CUT_BLEND_SECONDS : CUT_BLEND_SECONDS;

  if (!reduced && current.start > 0 && seconds < current.start + cutBlend) {
    const from = sampleShotPose(camera.aspect, chapter, current.start - 0.001,
      false, sowFocus, _cutFrom);
    destination = blendPose(from, current,
      (seconds - current.start) / cutBlend, _cutPose);
  }

  if (!reduced && previousChapter && seconds < SCENE_CAMERA_BLEND_SECONDS) {
    const from = sampleShotPose(camera.aspect, previousChapter, previousChapter.dur,
      false, previousSowFocus, _sceneFrom);
    destination = blendPose(from, destination, seconds / SCENE_CAMERA_BLEND_SECONDS, _finalPose);
  }

  look.set(destination.target[0], destination.target[1], destination.target[2]);
  camera.position.set(destination.position[0], destination.position[1], destination.position[2]);
  camera.lookAt(look);
  return current.shot;
}

export function lightFor(chapter) {
  if (chapter.id === 'storm' || chapter.id === 'weather-turns') {
    return { sky: 0x46586b, key: 1.15, color: 0xc9dcf3, hemi: 0.65, fill: 0.22, ambient: 0.16, x: -38, z: 12 };
  }
  if (chapter.id === 'morning-after') {
    return { sky: 0x9baab5, key: 1.05, color: 0xe1eaf1, hemi: 0.95, fill: 0.25, ambient: 0.18, x: -30, z: 24 };
  }
  if (chapter.id === 'weather-report') {
    return { sky: 0xa2b9c9, key: 1.4, color: 0xe0e9ee, hemi: 1, fill: 0.3, ambient: 0.22, x: 38, z: 10 };
  }
  const gold = chapter.mood === 'gold';
  return { sky: gold ? 0xc5997e : chapter.sky, key: gold ? 2.05 : 1.65,
    color: gold ? 0xffd1a0 : 0xfff1da, hemi: gold ? 1.05 : 1.25,
    fill: gold ? 0.35 : 0.48, ambient: 0.25, x: gold ? -38 : 40, z: gold ? -12 : 30 };
}
