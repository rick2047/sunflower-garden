// Named story cues shared by blocking, sound and QA. Times are derived from
// screenplay dialogue wherever the existing beat is anchored to a line; fixed
// editorial cuts stay explicit so a timing edit remains auditable.
import { CHAPTERS } from './screenplay.js';

function chapterById(id) {
  const chapter = CHAPTERS.find((entry) => entry.id === id);
  if (!chapter) throw new Error(`Unknown chapter: ${id}`);
  return chapter;
}

/** Story time of one dialogue edge, optionally offset by seconds. */
export function lineCue(id, index, edge = 'start', offset = 0) {
  const line = chapterById(id).dialogue[index];
  if (!line) throw new Error(`Unknown line ${index} in ${id}`);
  return roundTime(line[edge] + offset);
}

const roundTime = (value) => Math.round(value * 100) / 100;

/* Scene 11's joy approach is an authored four-step gait. Foot plants fall on
   the quarter boundaries of that window; the first moving foot is the right
   one because the left support is already planted at the start. */
export const JOY_APPROACH = Object.freeze({
  start: 15.5,
  end: 17.1,
  steps: 4,
  lift: 1.3,
  footfalls: Object.freeze(Array.from({ length: 4 },
    (_, i) => roundTime(15.5 + (17.1 - 15.5) * ((i + 1) / 4)))),
  footfallSides: Object.freeze(['R', 'L', 'R', 'L']),
});

export const STORY_CUES = Object.freeze({
  dawn: Object.freeze({ packetReveal: lineCue('dawn', 4, 'start', 0.81) }),
  sowing: Object.freeze({
    // The pair rises after their final line, then the chapter holds.
    rise: lineCue('sowing', 7, 'end', 0.53),
  }),
  'weather-turns': Object.freeze({ flowersFall: chapterById('weather-turns').endBeat.at }),
  storm: Object.freeze({
    slip: lineCue('storm', 2),
    regrip: lineCue('storm', 3, 'start', 0.2),
    leaving: lineCue('storm', 4, 'end', 0.2),
    tapeRun: lineCue('storm', 4, 'end', 1.0),
    lookBack: 25.5,
    return: 24.5,
    kneelIn: 24.7,
    kneelEnd: 26.0,
    settleEnd: chapterById('storm').endBeat.at,
    returnHold: 26.15,
    support: 26,
  }),
  'morning-after': Object.freeze({
    holdStart: lineCue('morning-after', 4, 'start', -0.2),
    holdEnd: chapterById('morning-after').endBeat.at,
    headLook: lineCue('morning-after', 4, 'start'),
  }),
  'seven-am': Object.freeze({
    repairVisible: lineCue('seven-am', 0, 'start'),
  }),
  summer: Object.freeze({
    soundFadeStart: lineCue('summer', 8, 'end', 0.4),
    endCardStart: lineCue('summer', 8, 'end', 0.4),
    endCardTitleStart: lineCue('summer', 8, 'end', 1.6),
  }),
  bloom: Object.freeze({
    approachStart: JOY_APPROACH.start,
    approachEnd: JOY_APPROACH.end,
    footfalls: JOY_APPROACH.footfalls,
  }),
});

/**
 * Existing foley beats, named once. Sowing/dawn keep their authored editorial
 * times; the seven-am tape beats and the joy footsteps are derived from their
 * dialogue/gait anchors above.
 */
export const FOLEY_CUES = Object.freeze({
  dawn: Object.freeze([
    Object.freeze({ at: lineCue('dawn', 0, 'start', 0.05), kind: 'ceramic', name: 'packet-set-down' }),
  ]),
  sowing: Object.freeze([
    Object.freeze({ at: 4, kind: 'soil', name: 'first-seed' }),
    Object.freeze({ at: 9, kind: 'soil', name: 'second-seed' }),
    Object.freeze({ at: 14, kind: 'soil', name: 'third-seed' }),
  ]),
  'seven-am': Object.freeze([
    Object.freeze({ at: lineCue('seven-am', 1, 'start'), kind: 'tape', name: 'tape-pull' }),
    Object.freeze({ at: lineCue('seven-am', 1, 'end', -0.3), kind: 'tape', name: 'tape-press' }),
  ]),
  bloom: Object.freeze(JOY_APPROACH.footfalls.map((at, i) => Object.freeze({
    at, kind: 'footstep', side: JOY_APPROACH.footfallSides[i], name: `joy-footfall-${i + 1}`,
  }))),
});

export function foleyCuesFor(id) {
  return FOLEY_CUES[id] || [];
}
