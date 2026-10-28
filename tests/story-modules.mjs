// Run with: node tests/story-modules.mjs
// Pure-module checks for the extracted screenplay, named cues and bubble layout.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { CHAPTERS, STORY_DURATION, capturesFor, dialogueAt } from '../screenplay.js';
import { FOLEY_CUES, JOY_APPROACH, STORY_CUES, foleyCuesFor, lineCue } from '../story-cues.js';
import { layoutSpeechBubble, speechBubbleTailOffset } from '../speech-bubble-layout.js';
import { createPresentation } from '../presentation.js';
import { Soundscape } from '../soundscape.js';

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');

assert.equal(CHAPTERS.length, 12, 'screenplay must keep 12 chapters');
assert.equal(STORY_DURATION, 399, 'screenplay duration must remain 399 s');
assert.equal(sha(JSON.stringify(CHAPTERS.map((c) => c.dialogue))),
  '36a80f477a00f52dca55ab28df7276ec787bba458421e2079f90bb35f3284a81',
  'chapter dialogue text/timing changed');
assert.equal(sha(JSON.stringify(CHAPTERS.map((c) => [c.id, c.title, c.dur]))),
  '699c6c2361ab0a542534f190cec62b9425af4d928cbfaf92f5295c552c745434',
  'chapter ids/titles/durations changed');

const final = CHAPTERS.at(-1);
assert.equal(final.dialogue.at(-1).text, 'Especially the part with you.');
assert.equal(dialogueAt(11, 28).text, 'Especially the part with you.');
assert.equal(dialogueAt(0, 1).phase, 'quiet');
assert.equal(dialogueAt(0, 3).speaker, 'Paresh');
assert.equal(dialogueAt(0, 3).listener, 'Anshita');
assert.ok(capturesFor(CHAPTERS[0]).turn1 > 0);

assert.deepEqual([...JOY_APPROACH.footfalls], [15.9, 16.3, 16.7, 17.1]);
assert.deepEqual([...JOY_APPROACH.footfallSides], ['R', 'L', 'R', 'L']);
assert.equal(lineCue('storm', 4, 'end', 1), 18);
assert.equal(STORY_CUES.storm.leaving, 17.2);
assert.equal(STORY_CUES.storm.tapeRun, 18);
assert.equal(STORY_CUES.storm.return, 24.5);
assert.equal(STORY_CUES['morning-after'].holdStart, 22.8);
assert.equal(STORY_CUES.sowing.rise, 23.5);
assert.equal(STORY_CUES.summer.soundFadeStart, 29.6);

const bubbleLayout = (overrides = {}) => layoutSpeechBubble({
  anchor: { x: 195, y: 280 },
  size: { width: 220, height: 88 },
  viewport: { width: 390, height: 844 },
  safeArea: { top: 58, right: 12, bottom: 142, left: 12 },
  ...overrides,
});
const above = bubbleLayout();
assert.equal(above.placement, 'above');
assert.deepEqual([above.left, above.top], [85, 178]);
assert.equal(above.tailOffset, 0);
assert.equal(speechBubbleTailOffset(195, 85, 220), 0);
assert.equal(speechBubbleTailOffset(0, 12, 120), -42,
  'bubble tail remains inside the rounded corners when clamped');

const below = bubbleLayout({ anchor: { x: 195, y: 70 } });
assert.equal(below.placement, 'below', 'bubble moves below a head near the top safe area');
assert.ok(below.top >= 58);
assert.ok(below.top + below.height <= 844 - 142);

const avoiding = bubbleLayout({
  anchor: { x: 195, y: 400 },
  size: { width: 120, height: 80 },
  obstacles: [{ left: 135, right: 180, top: 300, bottom: 380 }],
});
assert.ok(avoiding.left >= 12 && avoiding.left + avoiding.width <= 390 - 12);
assert.ok(avoiding.top >= 58 && avoiding.top + avoiding.height <= 844 - 142);
assert.ok(!(avoiding.left < 180 && avoiding.left + avoiding.width > 135
  && avoiding.top < 380 && avoiding.top + avoiding.height > 300),
'bubble layout avoids an obstructed preferred position');
assert.deepEqual(bubbleLayout({ anchor: { x: 195, y: 70 } }), below,
  'speech-bubble placement is deterministic');
const shortViewport = layoutSpeechBubble({
  anchor: { x: 160, y: 90 },
  size: { width: 200, height: 80 },
  viewport: { width: 320, height: 180 },
  safeArea: { top: 86, right: 12, bottom: 118, left: 12 },
});
assert.deepEqual([shortViewport.left, shortViewport.top], [60, 50],
  'bubble centers safely when fixed UI insets exceed a short viewport');
const pureLayoutInput = Object.freeze({
  anchor: Object.freeze({ x: 195, y: 280 }),
  size: Object.freeze({ width: 220, height: 88 }),
  viewport: Object.freeze({ width: 390, height: 844 }),
  safeArea: Object.freeze({ top: 58, right: 12, bottom: 142, left: 12 }),
  obstacles: Object.freeze([Object.freeze({ left: 135, right: 180, top: 300, bottom: 380 })]),
});
const pureInputBefore = JSON.stringify(pureLayoutInput);
const pureLayoutResult = layoutSpeechBubble(pureLayoutInput);
assert.equal(JSON.stringify(pureLayoutInput), pureInputBefore,
  'pure layout does not mutate its input');
assert.deepEqual(layoutSpeechBubble(pureLayoutInput), pureLayoutResult,
  'pure layout returns the same geometry for unchanged inputs');

const steps = foleyCuesFor('bloom');
assert.equal(steps.length, 4);
assert.deepEqual(steps.map((cue) => cue.at), [15.9, 16.3, 16.7, 17.1]);
assert.ok(steps.every((cue) => cue.kind === 'footstep'));
assert.deepEqual(steps.map((cue) => cue.side), ['R', 'L', 'R', 'L']);
assert.deepEqual(FOLEY_CUES.dawn.map((cue) => cue.at), [2.2]);
assert.deepEqual(FOLEY_CUES['seven-am'].map((cue) => cue.at), [5, 6.7]);

// Exercise the extracted control module against a minimal DOM double.
function fakeClassList() {
  const values = new Set();
  return {
    contains: (name) => values.has(name),
    add(name) { values.add(name); },
    remove(name) { values.delete(name); },
    toggle(name, on) { if (on) values.add(name); else values.delete(name); },
  };
}
function fakeControlElement(id = '') {
  const children = [];
  const element = {
    id, textContent: '', title: '', open: false, onclick: null, children,
    classList: fakeClassList(), attrs: {},
    get childElementCount() { return children.length; },
    setAttribute(name, value) { element.attrs[name] = String(value); },
    appendChild(child) { children.push(child); return child; },
    append(...nodes) { children.push(...nodes); },
    showModal() { element.open = true; },
    close() { element.open = false; },
  };
  return element;
}
function fakeDocument() {
  const ids = new Map();
  for (const id of ['caption', 'counter', 'dots', 'play', 'speech-bubble', 'bubble-speaker',
    'bubble-text', 'announcement', 'transcript-lines', 'prev', 'next', 'replay',
    'continue', 'story-notes', 'transcript', 'transcript-close']) ids.set(id, fakeControlElement(id));
  ids.get('transcript-lines').appendChild = (child) => ids.get('transcript-lines').children.push(child);
  const body = fakeControlElement('body');
  return {
    body,
    getElementById: (id) => ids.get(id) || null,
    querySelector: (selector) => selector === '#caption h1' ? ids.get('caption') : null,
    createElement: () => fakeControlElement(),
    createTextNode: (text) => ({ textContent: text }),
    addEventListener() {},
  };
}
const doc = fakeDocument();
const called = [];
const ui = createPresentation({
  document: doc,
  chapters: CHAPTERS,
  handlers: {
    enterChapter: (value, mode) => called.push(['enter', value, mode]),
    continue: () => called.push(['continue']),
    replay: () => called.push(['replay']),
    togglePlay: () => called.push(['play']),
    openNotes: () => called.push(['notes']),
    isPlaying: () => true,
  },
});
ui.mount();
assert.equal(ui.dots.length, 12);
ui.dots[3].onclick();
assert.deepEqual(called.at(-1), ['enter', 3, undefined]);
doc.getElementById('next').onclick();
assert.deepEqual(called.at(-1), ['enter', 1, 'relative']);
doc.getElementById('play').onclick();
assert.deepEqual(called.at(-1), ['play']);
ui.updateCaption(2);
assert.equal(doc.getElementById('caption').textContent, CHAPTERS[2].title);
assert.equal(doc.getElementById('counter').textContent, '3 / 12');
assert.equal(ui.dots[2].classList.contains('active'), true);
ui.setPlayLabel(true);
assert.equal(doc.getElementById('play').textContent, 'Pause');
ui.revealControls(false);
assert.equal(doc.body.classList.contains('cinema'), false);

// Drive the real cue-crossing clock with a fake audio graph; foley itself is
// replaced so the test observes exactly when the four joy footsteps fire.
const sound = new Soundscape();
sound.context = { currentTime: 0 };
sound.enabled = true;
sound.master = { gain: { setTargetAtTime() {} } };
sound.filter = { frequency: { setTargetAtTime() {} } };
sound.buffer = {};
const struck = [];
sound.foley = (kind, cue) => struck.push([cue.name, cue.at]);
for (let t = 15.5; t <= 17.1 + 1e-9; t += 0.05) sound.update({ id: 'bloom' }, t, true);
assert.deepEqual(struck, [
  ['joy-footfall-1', 15.9], ['joy-footfall-2', 16.3],
  ['joy-footfall-3', 16.7], ['joy-footfall-4', 17.1],
], 'joy gait footfalls did not fire at their plants');
assert.equal(struck.every(([, at]) => JOY_APPROACH.footfalls.includes(at)), true);

console.log('story modules ok: 12 chapters, 399 s, named cues, speech-bubble layout');
