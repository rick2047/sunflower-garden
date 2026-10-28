// Shot and light tracks are evaluated from story time, never previous frames.
// Coordinates describe the existing Blockbench set; no geometry lives here.
const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;

export function directShot(camera, look, chapter, seconds, reduced, sowFocus = 0) {
  const mobile = camera.aspect < 1;
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
    if (seconds >= 13) frame('first-gust', 13, [0, 22, 6], [mobile ? -4 : 4, 14, mobile ? 104 : 70]);
  } else if (id === 'weather-report') {
    frame('separation', 0, [0, 23, -7], [12, 8, mobile ? 140 : 94]);
    if (seconds >= 10) frame('unanswered-look', 10, [24, 27, 2], [-8, 4, mobile ? 65 : 54]);
    if (seconds >= 16 && seconds < 20) frame('behind-the-screen', 16, [-20, 26, -22], [10, 5, mobile ? 65 : 54]);
  } else if (['storm','morning-after','seven-am'].includes(id)) {
    // The pot/plant set is fixed in every chapter. Storm and repair blocking was
    // authored around a bay 15 units toward camera; their shots aim at the
    // reblocked actors instead of the old bay, and the props never move.
    const careZ = id === 'morning-after' ? 12 : -3;
    frame('care-two-shot', 0, [0, 20, careZ], [4, 10, mobile ? 110 : 78]);
    if (id === 'storm') {
      if (seconds >= 6.8 && seconds < 18) {
        frame('failed-grip', 6.8, [-6, 20, -2], [mobile ? 0 : -8, mobile ? 48 : 32, mobile ? 83 : 48]);
      } else if (seconds >= 18 && seconds < 24.5) {
        // The tape cue is at the fixed tape prop; frame him away from her so the
        // working hand and the still-held stem are separate screen events.
        frame('tape-run', 18, [-2, 21, 2], [0, mobile ? 45 : 30, mobile ? 100 : 65]);
      } else if (seconds >= 24.5) {
        // Frontal off-axis from the returning side: the kneeling figure and the
        // standing holder separate, with the stem still between them.
        frame('return-to-her', 24.5, [-9, 18, -3], [mobile ? 0 : 7, mobile ? 54 : 34, mobile ? 90 : 43]);
      }
    } else if (id === 'morning-after') {
      if (seconds < 3) {
        // Quiet opening insert: a head-on level view of the open doorway, with
        // both actors behind the camera plane, so the opening is actually empty.
        frame('empty-doorway', 0, [-18, 20, -15.6], [0, 0, 17.6]);
      } else {
        frame('care-two-shot', 3, [0, 20, 12], [4, 10, mobile ? 110 : 78]);
      }
      if (seconds >= 11) frame('the-silence-between', 11, [0, 23, 5], [5, 4, mobile ? 100 : 70]);
      if (seconds >= 23) frame('the-handoff', 23, [0, 23, 6], [0, mobile ? 30 : 20, mobile ? 98 : 62]);
    } else if (id === 'seven-am' && seconds < 10) {
      // Shared middle-pot repair: the joint sits near face height for the
      // camera, so the two hands and the tape read against the sky instead of
      // under the leaves above the fixed pot.
      frame('shared-repair', 0, [0, 21, -2], [0, mobile ? 58 : 37, mobile ? 82 : 42]);
    }
  } else if (id === 'measure') {
    // Save the sustained orbit and crane for the title's payoff.
    // Remain on the balcony side of the doorway and preserve screen direction.
    const orbit = mix(-0.3, 0.3, ease((seconds - 2) / 14));
    const lift = reduced ? 1 : ease((seconds - 16) / 8);
    const radius = mobile ? 104 : 76;
    target = [0, mix(25, 29, lift), 7];
    camera.position.set(Math.sin(reduced ? 0 : orbit) * radius,
      reduced ? 34 : mix(10, 50, lift), 7 + Math.cos(reduced ? 0 : orbit) * radius);
    look.set(...target); camera.lookAt(look);
    return 'height-reveal';
  } else if (id === 'bloom') {
    frame('flower-reveal', 0, [0, 35, 0], [12, 8, mobile ? 126 : 98]);
    if (seconds >= 15.5 && seconds < 17.1) {
      // Approach insert on the deck: the four alternating steps read before the
      // cut back up to the flowers and the shared reaction.
      frame('approach-steps', 15.5, [0, 17, 4], [6, 5, mobile ? 96 : 60]);
    } else if (seconds >= 17.1) {
      frame('shared-joy', 17.1, [0, 32, 5], [0, mobile ? 38 : 23, mobile ? 135 : 88]);
    }
  } else if (id === 'summer') {
    frame('last-light', 0, [0, 27, 1], [14, 13, mobile ? 126 : 105]);
    if (seconds >= 14) frame('one-more-minute', 14, [0, 27, 5], [8, 6, mobile ? 91 : 71]);
    if (seconds >= 26.5) frame('last-line', 26.5, [0, 25, 5], [6, 7, mobile ? 96 : 70]);
  } else if (id === 'good-things') {
    frame('evening-garden', 0, [0, 18, 8], [15, 21, mobile ? 128 : 95]);
    if (seconds >= 16) frame('shared-scent', 16, [0, 27, 5], [9, 6, mobile ? 91 : 70]);
  } else if (seconds >= 9 && id !== 'weather-turns') {
    frame('garden-two-shot', 9, [0, 25, -2], [6, 8, mobile ? 140 : 91]);
  }
  // A barely perceptible push inside a shot; cuts never interpolate through the set.
  const push = reduced ? 1 : 1 - 0.035 * ease((seconds - start) / 12);
  look.set(...target);
  camera.position.set(target[0] + offset[0] * push, target[1] + offset[1] * push,
    target[2] + offset[2] * push);
  camera.lookAt(look);
  return shot;
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
