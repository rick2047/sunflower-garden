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
    frame('soil-and-hands', 0, [sowFocus, 12, 3], [mobile ? 0 : 8, 26, mobile ? 112 : 65]);
  } else if (id === 'weather-report') {
    frame('separation', 0, [0, 23, -7], [12, 8, mobile ? 140 : 94]);
    if (seconds >= 10) frame('unanswered-look', 10, [24, 27, 2], [-8, 4, mobile ? 65 : 54]);
    if (seconds >= 16 && seconds < 20) frame('behind-the-screen', 16, [-20, 26, -22], [10, 5, mobile ? 65 : 54]);
  } else if (['storm','morning-after','seven-am'].includes(id)) {
    frame('care-two-shot', 0, [0, 20, 12], [4, 10, mobile ? 110 : 78]);
    if (id === 'storm' && seconds >= 18 && seconds < 26) {
      frame('holding-alone', 18, [-11, 22, 13], [16, 5, mobile ? 60 : 48]);
    } else if (id === 'storm' && seconds >= 26) {
      frame('return-to-her', 26, [-5, 20, 12], [mobile ? -12 : -22, 9, mobile ? 92 : 61]);
    } else if (id === 'morning-after' && seconds >= 11) {
      frame('the-silence-between', 11, [0, 23, 5], [5, 4, mobile ? 100 : 70]);
    } else if (id === 'seven-am' && seconds < 10) {
      frame('the-wrap', 0, [mobile ? -18 : -13, 20, 14], [mobile ? 0 : 12, 7, mobile ? 90 : 61]);
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
    if (seconds >= 15.5) frame('shared-joy', 15.5, [0, 27, 5], [5, 7, mobile ? 100 : 77]);
  } else if (id === 'summer') {
    frame('last-light', 0, [0, 27, 1], [14, 13, mobile ? 126 : 105]);
    if (seconds >= 14) frame('one-more-minute', 14, [0, 27, 5], [8, 6, mobile ? 91 : 71]);
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
