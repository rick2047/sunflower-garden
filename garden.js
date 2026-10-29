import * as THREE from 'three';
import { BBModelLoader } from './vendor/BBModelLoader.js';
import { directShot, lightFor, SCENE_CAMERA_BLEND_SECONDS } from './film-direction.js';
import { createPerformer, sharedHandPoint, attachProp, attentionPose, sampleGait } from './actor-performance.js';
import { Soundscape } from './soundscape.js';
import { CHAPTERS as CH, STORY_DURATION as storyDuration, capturesFor, dialogueAt } from './screenplay.js';
import { JOY_APPROACH, STORY_CUES } from './story-cues.js';
import { createPresentation } from './presentation.js';
import { layoutSpeechBubble, speechBubbleTailOffset } from './speech-bubble-layout.js';

/* Taller Than Us — a short film about one summer, told through a balcony garden.
   The garden is visual subtext; the relationship lives in their imagined dialogue.
   Screenplay data/timing live in screenplay.js; this module stages them. */
/* ---------- layout (world units: character ≈ 30 tall, balcony 60×40) ---------- */
const POT_X = [-13, 0, 13], POT_Z = -1;
// Authored deck surface: the props rig sits at y=4 and the authored pot/tile
// geometry adds ~0.15. Kneeling derives its root drop from this plus the real
// knee pivots, so both character exports land on the deck without guessing.
const DECK_TOP = 4.15;
const CHAPTER_LIGHTS = CH.map(lightFor);
const SPOTS = {
  tulip: [-26, 4, 20], petunia: [0, 4, 18], mogra: [26, 4, 20],
  tomato: [-9, 4, 13], capsicum: [9, 4, 13],
  seed_packet: [5, 4, 12], seeds: [0, 12, POT_Z], tape: [9, 4, 7], support: [-7, 4, 9],
};
const PA_BASE = [-20, 0, -6], AN_BASE = [20, 0, -6];

/* Scene-2: keep the authored pot row intact while the kneeling pair travels
   first → second → third. The action times are anchored to the corresponding
   dialogue turns so seeking and replay produce the same handoff. */
const SOW_ACTOR_Z = -3.5, SOW_SOIL_Z = -0.2;
/* The storm and repair chapters were originally staged by sliding the whole pot
   and plant set 15 units toward the camera inside those chapters. The authored
   set now keeps one geography everywhere, so the same action bay is expressed
   only by reblocked actors and shots. `ACTION_SET_DEPTH` is the distance those
   marks used to be displaced; the set itself never moves. */
const ACTION_SET_DEPTH = 15;
// Scene-10: the joy approach is a real four-step side gait over this window.
// Both actors start from their blocking marks and settle on the shared pose.
const JOY_MARKS = {
  paresh: { startX: -17, endX: -7.5, z: 6, yaw: Math.PI + 0.4 },
  anshita: { startX: 17, endX: 7.5, z: 6, yaw: Math.PI - 0.4 },
};
const BLOOM_BEE_FACE_DETOUR = {
  beeIndex: 1, lateralX: 6, startsAt: 14.8, rampSeconds: 0.7,
  fadesAt: 15.6, fadeSeconds: 1,
};
const STORM_RETURN_AT = STORY_CUES.storm.return;
const STORM_KNEEL = { inStart: STORY_CUES.storm.kneelIn, inEnd: STORY_CUES.storm.kneelEnd,
  settleEnd: STORY_CUES.storm.settleEnd };
/* Scene-10 measure: the taller authored actor bends slightly at the knees and
   settles his torso so the paired head tops read level without lifting either
   actor off the deck. */
const MEASURE_CROUCH = 0.5, MEASURE_TORSO_DROP = 0.85;
const MEASURE_HEAD_STAGGER = 0.75;

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = REDUCED.matches;

/* ---------- renderer / scene / camera / lights ---------- */
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CH[0].sky);
scene.fog = new THREE.Fog(scene.background.clone(), 280, 650);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 700);

const hemi = new THREE.HemisphereLight(0xfff8e9, 0x9b8167, 1.6);
scene.add(hemi);
const ambientLight = new THREE.AmbientLight(0xfff4dd, 0.25);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.1);
sunLight.position.set(40, 60, 30);
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xffedce, 1.0);
fillLight.position.set(-30, 35, 50);
scene.add(fillLight);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
Object.assign(sunLight.shadow.camera, {left:-60,right:60,top:70,bottom:-50,near:1,far:180});
sunLight.shadow.bias = -0.001;

// Reuse fetched model text/images across the three independent plant/bee rigs.
// Parsing still creates separate skeletons, so animation and disposal stay local.
THREE.Cache.enabled = true;
const loader = new BBModelLoader(undefined, { unitScale: 1 });
const loadModel = (f) => new Promise((res, rej) =>
  loader.load('./models/' + f, (m) => {
    m.scene.traverse(n => {
      if (!n.isMesh) return;
      // Native loader emits one draw range per polygon. Coalesce only adjacent
      // ranges with the same material; retain every authored vertex/index/UV.
      const ranges = [];
      for (const g of n.geometry.groups) {
        const last = ranges[ranges.length - 1];
        if (last && last.materialIndex === g.materialIndex && last.start + last.count === g.start) last.count += g.count;
        else ranges.push({ ...g });
      }
      n.geometry.groups = ranges;
      n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false;
    });
    S.models.push(m);
    S.assetWarnings.push(...m.warnings.map(w => ({file:f,code:w.code,message:w.message})));
    res(m);
  }, undefined, rej));

const world = new THREE.Group();
scene.add(world);

/* ---------- helpers ---------- */
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
function sowingPlan(chapter, storyT) {
  const lines = chapter.dialogue;
  const potSoilY = [10.9, 11.9, 12.9];
  // Per-pot kneeling distance keeps each soil point on that actor's hand-reach
  // sphere (Paresh and Anshita have different arm lengths and shoulder heights).
  const actorOffset = [
    { paresh: 12, anshita: 12 },
    { paresh: 12, anshita: 12 },
    { paresh: 12, anshita: 12 },
  ];
  // Elliptical cuts between pots instead of sliding kneeling bodies along tiles.
  const moveToSecond = Number(storyT >= (lines[2]?.start ?? 7));
  const moveToThird = Number(storyT >= (lines[4]?.start ?? 14));
  const firstSecondX = lerp(POT_X[0], POT_X[1], moveToSecond);
  const focusX = lerp(firstSecondX, POT_X[2], moveToThird);
  const offsetIndex = moveToThird ? 2 : moveToSecond ? 1 : 0;
  const offsets = actorOffset[offsetIndex];
  return {
    focusX, offsets, soilY: lerp(lerp(potSoilY[0], potSoilY[1], moveToSecond), potSoilY[2], moveToThird),
    pareshX: focusX - offsets.paresh,
    anshitaX: focusX + offsets.anshita,
    sown: [true, storyT >= (lines[3]?.end ?? 10), storyT >= (lines[4]?.end ?? 13)],
    share: smooth((storyT - (lines[5]?.start ?? 17)) / 0.7),
  };
}
const CHAPTER_END_SOW_FOCUS = CH.map((chapter) => chapter.id === 'sowing'
  ? sowingPlan(chapter, chapter.dur).focusX : 0);

const _actorRootTargets = { paresh: new THREE.Vector3(), anshita: new THREE.Vector3() };
function actorRootTargets(ch, storyT, result = _actorRootTargets) {
  const chapter = CH[ch], act = chapter.action;
  const actionShot = ch >= 6 && ch <= 8;
  const joyful = act === 'joy';
  const close = ['sow','repair','tend','sit_together','aftermath','ending'].includes(act);
  const sow = ch === 1 ? sowingPlan(chapter, storyT) : null;
  const txP = act === 'sow' ? sow.pareshX : act === 'aftermath' ? -8 :
    act === 'storm' ? 4 : act === 'repair' ? -10 : actionShot ? -22 : act === 'distance' ? -24 :
    act === 'measure' ? -3 : close ? -8 : ch === 9 ? -18 : joyful ? JOY_MARKS.paresh.startX : PA_BASE[0];
  const txA = act === 'sow' ? sow.anshitaX : act === 'aftermath' ? 8 :
    act === 'storm' ? -11.5 : act === 'repair' ? 10 : actionShot ? 22 : act === 'distance' ? 24 :
    act === 'measure' ? 3 : close ? 8 : ch === 9 ? 18 : joyful ? JOY_MARKS.anshita.startX : AN_BASE[0];
  const tz = act === 'sow' ? SOW_ACTOR_Z : act === 'aftermath' ? 5 :
    act === 'storm' ? 5.4 : act === 'repair' ? 9.0 : actionShot ? (ch === 8 ? 9.0 : 5) : act === 'distance' ? 2 :
    act === 'measure' ? 12.5 : close ? 5 : ch === 9 ? 8 : joyful ? 6 : PA_BASE[2];
  const rootY = act === 'sow' || act === 'storm' || act === 'measure' || joyful
    ? DECK_TOP : 4;
  result.paresh.set(txP, rootY, tz);
  result.anshita.set(txA, rootY, tz);
  if (ch === 4) result.paresh.set(-20, 4, -22);
  else if (ch === 6) {
    if (storyT >= STORM_RETURN_AT) result.paresh.set(0, DECK_TOP, -9.2);
    else if (storyT >= STORY_CUES.storm.tapeRun) result.paresh.set(9, DECK_TOP, 7);
    else result.paresh.set(3.2, DECK_TOP, 7.35 - ACTION_SET_DEPTH);
    result.anshita.set(-20, DECK_TOP, -9);
  } else if (ch === 8) {
    result.paresh.set(-8.4, 4, 8.45 - ACTION_SET_DEPTH);
    result.anshita.set(8.2, 4, 8.55 - ACTION_SET_DEPTH);
  }
  if (joyful && S.joyPlans) {
    const paresh = sampleGait(S.joyPlans.paresh, storyT);
    const anshita = sampleGait(S.joyPlans.anshita, storyT);
    result.paresh.set(paresh.rootX, paresh.rootY, paresh.rootZ);
    result.anshita.set(anshita.rootX, anshita.rootY, anshita.rootZ);
  }
  return result;
}

function actorKneelAt(ch, storyT) {
  const chapter = CH[ch];
  if (chapter.action === 'sow') {
    const rise = smooth((storyT - STORY_CUES.sowing.rise) / 1.5);
    const amount = 1 - rise;
    return { paresh: amount, anshita: amount,
      settle: amount * smooth((storyT - 21) / 1.5) };
  }
  if (chapter.action === 'storm') {
    const span = Math.max(0.01, STORM_KNEEL.inEnd - STORM_KNEEL.inStart);
    const amount = smooth((storyT - STORM_KNEEL.inStart) / span);
    const settle = amount * smooth((storyT - STORM_KNEEL.inEnd)
      / Math.max(0.01, STORM_KNEEL.settleEnd - STORM_KNEEL.inEnd));
    return { paresh: amount, anshita: 0, settle };
  }
  if (chapter.action === 'measure') return { paresh: MEASURE_CROUCH, anshita: 0, settle: 0 };
  return { paresh: 0, anshita: 0, settle: 0 };
}

function actorFacing(ch) {
  const act = CH[ch].action;
  const close = ['sow','repair','tend','sit_together','aftermath','ending'].includes(act);
  const joyful = act === 'joy';
  return {
    paresh: act === 'measure' ? Math.PI / 2 : act === 'sow' ? Math.PI - 0.1
      : close ? Math.PI + 0.3 : Math.PI + (joyful ? 0.4 : 0.15),
    anshita: act === 'measure' ? -Math.PI / 2 : act === 'sow' ? Math.PI + 0.1
      : close ? Math.PI - 0.3 : Math.PI - (joyful ? 0.4 : 0.15),
  };
}

function planEntryGait(performer, from, to, startTime, endTime, steps, yaw) {
  return performer.planGait({
    start: { x: from.x, z: from.z },
    end: { x: to.x, z: to.z },
    startTime, endTime, steps, lift: 0.9, yaw, groundY: DECK_TOP,
  });
}

function buildEntryPlans() {
  const plans = Array(CH.length).fill(null);
  const from = { paresh: new THREE.Vector3(), anshita: new THREE.Vector3() };
  const to = { paresh: new THREE.Vector3(), anshita: new THREE.Vector3() };
  for (let ch = 1; ch < CH.length; ch++) {
    actorRootTargets(ch - 1, CH[ch - 1].dur, from);
    actorRootTargets(ch, 0, to);
    const duration = CH[ch].entryDuration;
    const previousPose = actorKneelAt(ch - 1, CH[ch - 1].dur);
    const nextPose = actorKneelAt(ch, 0);
    const previousFacing = actorFacing(ch - 1);
    const nextFacing = actorFacing(ch);
    const distance = Math.max(
      Math.hypot(to.paresh.x - from.paresh.x, to.paresh.z - from.paresh.z),
      Math.hypot(to.anshita.x - from.anshita.x, to.anshita.z - from.anshita.z));
    const recoveringFromKneel = Math.max(previousPose.paresh, previousPose.anshita) > 0.05;
    const kind = CH[ch].id === 'morning-after' ? 'cut'
      : recoveringFromKneel || distance < 0.15 ? 'ease' : 'gait';
    const poseDuration = 0.65;
    const walkStart = 0;
    const walkEnd = Math.max(walkStart + 0.1, duration - poseDuration);
    const steps = Math.max(2, Math.min(8, Math.ceil(distance / 6)));
    const plan = { duration, walkStart, walkEnd, kind,
      from: { paresh: from.paresh.clone(), anshita: from.anshita.clone() },
      to: { paresh: to.paresh.clone(), anshita: to.anshita.clone() },
      fromPose: previousPose, toPose: nextPose,
      fromFacing: previousFacing, toFacing: nextFacing, paresh: null, anshita: null,
      pareshWalkEndY: to.paresh.y, anshitaWalkEndY: to.anshita.y };
    if (plan.kind === 'gait' && walkEnd > walkStart) {
      plan.paresh = planEntryGait(S.performers.paresh, from.paresh, to.paresh,
        walkStart, walkEnd, steps, previousFacing.paresh);
      plan.anshita = planEntryGait(S.performers.anshita, from.anshita, to.anshita,
        walkStart, walkEnd, steps, previousFacing.anshita);
      plan.pareshWalkEndY = sampleGait(plan.paresh, walkEnd).rootY;
      plan.anshitaWalkEndY = sampleGait(plan.anshita, walkEnd).rootY;
    }
    plans[ch] = plan;
  }
  return plans;
}

// deterministic pseudo-random (no Math.random anywhere → reproducible frames)
const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

/* The BBModel loader adds each element's SkinnedMesh to the model root and the
   matching pivot bone inside its group; a group bone's `visible` flag therefore
   does NOT hide the visible geometry. These helpers resolve a group to the real
   meshes so variant toggling hides what is actually drawn. */
const meshMaps = new WeakMap();
const groupMeshMaps = new WeakMap();
function meshMap(root) {
  let m = meshMaps.get(root);
  if (!m) {
    m = new Map();
    root.traverse((n) => { if (n.isMesh && n.userData.blockbenchUUID) m.set(n.userData.blockbenchUUID, n); });
    meshMaps.set(root, m);
  }
  return m;
}
function groupMeshes(root, group) {
  let cache = groupMeshMaps.get(root);
  if (!cache) { cache = new WeakMap(); groupMeshMaps.set(root, cache); }
  if (cache.has(group)) return cache.get(group);
  const map = meshMap(root), out = [];
  group.traverse((b) => {
    const u = b.userData && b.userData.blockbenchUUID;
    const m = u && map.get(u);
    if (m && m.isMesh) out.push(m);
  });
  cache.set(group, out);
  return out;
}
function setGroupVisible(root, group, on) {
  if (!group) return;
  group.visible = !!on;
  for (const m of groupMeshes(root, group)) m.visible = !!on;
}

/* ---------- shared state ---------- */
const S = {
  chapter: 0, t: 0, playing: !reduced, frozen: false, ready: false,
  variants: {}, hinges: {}, plants: [], bees: [], clouds: [],
  rain: null, rainBase: null, rainPhase: null,
  paresh: null, anshita: null, rig: null, can: null, sunDisk: null, beeCount: 0,
  stage: null, door: null, stageLamp: null, roomLight: null, doorAngle: 0,
  laptopScreen: null, laptopKeyboard: null, laptopHome: null, laptopMode: 'hidden',
  models: [], assetWarnings: [], filmCard: null,
  bubbleLayout: null, bubblePlacement: null, listenerReactionLayout: null,
  entryPlans: null, entryProgress: 1,
  bubbleOffset: { x: 0, y: 0 },
  bubbleSize: { width: 0, height: 0 }, bubbleNeedsLayout: true, bubbleUpdateCount: 0,
  performers: null, performance: { joy: {}, kneel: {}, contacts: {}, entry: null },
};

window.__garden = {
  THREE, scene, camera, renderer, world, S,
  ready: false,
  storyDuration,
  chapters: CH.map((c) => ({ id: c.id, title: c.title, duration: c.dur,
    visualDuration: c.visualDur, entryDuration: c.entryDuration,
    dialogue: c.dialogue.map(line => ({ ...line })),
    captures: capturesFor(c), cues: c.cues || null,
     endCardStart: c.id === 'summer' ? STORY_CUES.summer.endCardStart : null,
     endCardTitleStart: c.id === 'summer' ? STORY_CUES.summer.endCardTitleStart : null })),
  goto: (i) => enterChapter(i),
  seek, freeze, resume, state, dialogue: () => dialogueAt(S.chapter, S.t), continue: continueStory,
  performance: () => S.performance,
};

function enterChapter(i) {
  S.chapter = ((i % CH.length) + CH.length) % CH.length;
  S.t = 0;
  S.bubbleNeedsLayout = true;
  updateCaption();
  if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
}

/* ---------- deterministic camera framing (adapts to viewport) ---------- */
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  presentation.measureDialogue(S.bubbleSize);
  S.bubbleNeedsLayout = true;
  if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
});

/* ---------- UI ---------- */
const barEl = document.getElementById('bar');
const filmCard = document.getElementById('film-card');
const filmCardContent = document.getElementById('film-card-content');
const filmCardTitle = document.getElementById('film-card-title');
const filmCardSubtitle = document.getElementById('film-card-subtitle');
const timeSuper = document.getElementById('time-super');
const progressEl = document.getElementById('progress');
const sound = new Soundscape();
const soundBtn = document.getElementById('sound');
const presentation = createPresentation({
  chapters: CH,
  handlers: {
    enterChapter: (value, mode) => enterChapter(mode === 'relative' ? S.chapter + value : value),
    continue: continueStory,
    replay: () => { S.frozen = false; S.playing = true; enterChapter(0); setPlayLabel(); },
    togglePlay: togglePlayback,
    openNotes: () => freeze(true),
    isPlaying: () => S.playing && !S.frozen,
  },
});
soundBtn.onclick = async () => {
  try {
    const enabled = await sound.toggle();
    soundBtn.textContent = enabled ? 'Sound on' : 'Sound off';
    soundBtn.setAttribute('aria-pressed', String(enabled));
    sound.update(CH[S.chapter], S.t, S.playing && !S.frozen);
  } catch (error) {
    sound.enabled = false; sound.silence();
    soundBtn.textContent = 'Sound unavailable';
  }
};

function updateDialogue(dialogue = dialogueAt(S.chapter, S.t)) {
  if (!presentation.updateDialogue(dialogue)) return;
  S.bubbleNeedsLayout = true;
  if (dialogue.phase === 'line') {
    presentation.measureDialogue(S.bubbleSize);
  }
}

function updateCaption(dialogue) {
  presentation.updateCaption(S.chapter);
  updateDialogue(dialogue);
}

function setPlayLabel() {
  const playing = S.playing && !S.frozen;
  presentation.setPlayLabel(playing);
  if (!playing) sound.silence();
  presentation.revealControls(playing);
}

function togglePlayback() {
  if (S.frozen) { resume(); return; }
  S.playing = !S.playing;
  setPlayLabel();
  if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
}

const _dialoguePoint = new THREE.Vector3();
const _dialogueAnchor = { x: 0, y: 0 };
const _dialogueListenerAnchor = { x: 0, y: 0 };
const _dialogueObstacle = { left: 0, right: 0, top: 0, bottom: 0 };
const _dialogueObstacles = [_dialogueObstacle];
const _dialogueViewport = { width: innerWidth, height: innerHeight };
const _dialogueSafeArea = { top: 86, right: 12, bottom: 118, left: 12 };
const _bubbleLayout = {
  rect: { left: 0, top: 0, right: 0, bottom: 0 },
  anchor: { x: 0, y: 0 }, speaker: '', chapter: 0, time: 0,
};
const _bubbleLayoutInput = {
  anchor: _dialogueAnchor, size: S.bubbleSize, viewport: _dialogueViewport,
  obstacles: _dialogueObstacles, safeArea: _dialogueSafeArea, gap: 18,
};
const _listenerReactionLayout = {
  left: 0, top: 0, width: 0, height: 0, listener: '', anchor: { x: 0, y: 0 },
};

function layoutListenerReaction(listener, compact) {
  const size = compact ? 40 : 44;
  const gap = compact ? 8 : 12;
  const left = clamp(_dialogueListenerAnchor.x + (compact ? 18 : 22),
    8, Math.max(8, innerWidth - size - 8));
  const top = clamp(_dialogueListenerAnchor.y - size - gap,
    8, Math.max(8, innerHeight - size - 8));
  _listenerReactionLayout.left = left;
  _listenerReactionLayout.top = top;
  _listenerReactionLayout.width = size;
  _listenerReactionLayout.height = size;
  _listenerReactionLayout.listener = listener;
  _listenerReactionLayout.anchor.x = _dialogueListenerAnchor.x;
  _listenerReactionLayout.anchor.y = _dialogueListenerAnchor.y;
  return _listenerReactionLayout;
}

function projectDialogueHead(name, target) {
  const isParesh = name === 'Paresh';
  const character = isParesh ? S.paresh : S.anshita;
  const anchor = S.rig?.base?.[isParesh ? 'pHeadAnchor' : 'aHeadAnchor'];
  if (!character || !anchor) return false;
  camera.updateMatrixWorld(true);
  character.updateWorldMatrix(true, false);
  _dialoguePoint.fromArray(anchor);
  const body = S.rig[isParesh ? 'pBody' : 'aBody'];
  const bodyBase = S.rig.base[isParesh ? 'pBody' : 'aBody'];
  _dialoguePoint.y += body.position.y - bodyBase.position[1];
  _dialoguePoint.y += 4;
  character.localToWorld(_dialoguePoint);
  _dialoguePoint.project(camera);
  if (_dialoguePoint.z < -1 || _dialoguePoint.z > 1) return false;
  target.x = (_dialoguePoint.x * 0.5 + 0.5) * innerWidth;
  target.y = (-_dialoguePoint.y * 0.5 + 0.5) * innerHeight;
  return true;
}

function layoutDialogueBubble(ch, storyT, dialogue) {
  S.bubbleUpdateCount++;
  if (dialogue.phase !== 'line' || !projectDialogueHead(dialogue.speaker, _dialogueAnchor)) {
    S.bubbleLayout = null;
    S.bubblePlacement = null;
    S.listenerReactionLayout = null;
    S.bubbleNeedsLayout = true;
    presentation.positionDialogue(null);
    presentation.positionReaction(null);
    return;
  }

  const compact = innerWidth <= 620;
  const listenerProjected = projectDialogueHead(dialogue.listener, _dialogueListenerAnchor);
  if (listenerProjected) {
    S.listenerReactionLayout = layoutListenerReaction(dialogue.listener, compact);
    presentation.positionReaction(S.listenerReactionLayout);
  } else {
    S.listenerReactionLayout = null;
    presentation.positionReaction(null);
  }

  if (S.bubbleNeedsLayout || !S.bubblePlacement) {
    if (listenerProjected) {
      const reaction = S.listenerReactionLayout;
      _dialogueObstacle.left = Math.min(_dialogueListenerAnchor.x - (compact ? 24 : 32),
        reaction.left - 8);
      _dialogueObstacle.right = Math.max(_dialogueListenerAnchor.x + (compact ? 24 : 32),
        reaction.left + reaction.width + 8);
      _dialogueObstacle.top = Math.min(_dialogueListenerAnchor.y - (compact ? 25 : 32),
        reaction.top - 8);
      _dialogueObstacle.bottom = Math.max(_dialogueListenerAnchor.y + (compact ? 20 : 25),
        reaction.top + reaction.height + 8);
      _dialogueObstacles.length = 1;
    } else {
      _dialogueObstacles.length = 0;
    }
    _dialogueViewport.width = innerWidth;
    _dialogueViewport.height = innerHeight;
    _dialogueSafeArea.bottom = compact ? 150 : 118;
    _bubbleLayoutInput.gap = compact ? 15 : 18;
    S.bubblePlacement = layoutSpeechBubble(_bubbleLayoutInput);
    S.bubbleOffset.x = S.bubblePlacement.left - _dialogueAnchor.x;
    S.bubbleOffset.y = S.bubblePlacement.top - _dialogueAnchor.y;
    S.bubbleNeedsLayout = false;
  }
  const placement = S.bubblePlacement;
  const left = clamp(_dialogueAnchor.x + S.bubbleOffset.x, placement.minLeft, placement.maxLeft);
  const top = clamp(_dialogueAnchor.y + S.bubbleOffset.y, placement.minTop, placement.maxTop);
  const tailOffset = speechBubbleTailOffset(_dialogueAnchor.x, left, placement.width);
  _bubbleLayout.left = left;
  _bubbleLayout.top = top;
  _bubbleLayout.width = placement.width;
  _bubbleLayout.height = placement.height;
  _bubbleLayout.placement = placement.placement;
  _bubbleLayout.tailOffset = tailOffset;
  _bubbleLayout.rect.left = left;
  _bubbleLayout.rect.top = top;
  _bubbleLayout.rect.right = left + placement.width;
  _bubbleLayout.rect.bottom = top + placement.height;
  _bubbleLayout.anchor.x = _dialogueAnchor.x;
  _bubbleLayout.anchor.y = _dialogueAnchor.y;
  _bubbleLayout.speaker = dialogue.speaker;
  _bubbleLayout.chapter = ch;
  _bubbleLayout.time = storyT;
  presentation.positionDialogue(_bubbleLayout);
  S.bubbleLayout = _bubbleLayout;
}

function updateFilmCard(ch, seconds) {
  const chapter = CH[ch];
  const titleEnd = CH[0].dialogue[0].start;
  const titleCard = chapter.id === 'dawn' && seconds < titleEnd;
  const endingCard = chapter.id === 'summer' && seconds >= STORY_CUES.summer.endCardStart;
  if (!titleCard && !endingCard) {
    filmCard.style.visibility = 'hidden';
    filmCard.style.opacity = '0';
    S.filmCard = null;
    return;
  }
  const endStart = chapter.id === 'summer' ? STORY_CUES.summer.endCardStart : chapter.dur - 4.4;
  const titleFadeStart = Math.min(0.45, titleEnd * 0.3);
  const opacity = titleCard
    ? 1 - smooth((seconds - titleFadeStart) / Math.max(0.1, titleEnd - titleFadeStart))
    : smooth((seconds - endStart) / 1.05);
  const titleOpacity = titleCard ? opacity : smooth((seconds - endStart - 1.2) / 0.45);
  filmCardTitle.textContent = 'TALLER THAN US';
  filmCardSubtitle.textContent = endingCard ? '— an imagined telling' : '';
  filmCard.style.visibility = 'visible';
  filmCard.style.opacity = String(opacity);
  filmCardContent.style.opacity = String(titleOpacity);
  S.filmCard = { kind: endingCard ? 'end' : 'title', opacity, titleOpacity };
}

function continueStory() {
  S.playing = false;
  const c = CH[S.chapter];
  // Skip the opening stillness, but never skip an unread reply. Include the
  // final quiet bridge as a deliberate manual step before the next chapter.
  const next = [...c.dialogue.map(line => line.start), c.dialogue.at(-1).end]
    .find(at => at > S.t + 0.001);
  if (next !== undefined) return seek(S.chapter, next);
  return seek((S.chapter + 1) % CH.length, CH[(S.chapter + 1) % CH.length].dialogue[0].start);
}

/* ---------- props: sun, clouds, spare soil, watering can, pots ---------- */
function placeProps(props) {
  props.scene.position.y = 4;
  world.add(props.scene); // whole prop rig: group bones + their skinned meshes
  S.props = props.scene;
  const sunG = props.scene.getObjectByName('sun');
  if (sunG) { sunG.position.set(34, 52, -34); sunG.scale.setScalar(0.95); S.sunDisk = sunG; }
  for (const n of ['cloud_a', 'cloud_b']) {
    const cl = props.scene.getObjectByName(n);
    if (cl) { cl.position.set(n === 'cloud_a' ? -30 : 25, 48, -30); S.clouds.push(cl); }
  }
  const mound = props.scene.getObjectByName('soil_mound');
  if (mound) setGroupVisible(props.scene, mound, false);
  const can = props.scene.getObjectByName('watering_can');
  if (can) { S.can = can; can.position.set(15, 0, 10); can.rotation.z = -0.25; setGroupVisible(props.scene, can, false); }

  // Pots: the authored 'pots' group owns nine element pivot bones; the visible
  // pot meshes are skinned siblings at the prop root. Move each pot (body+rim+
  // soil) as ONE rigid unit so the full authored assembly is preserved.
  const pots = props.scene.getObjectByName('pots');
  if (pots) {
    S.potPivots = [];
    const sizes = ['sm', 'md', 'lg'];
    sizes.forEach((size, i) => {
      const body = pots.getObjectByName('pot_' + size + '_body__pivot');
      if (!body) return;
      const dx = POT_X[i] - body.position.x;
      const dz = POT_Z - body.position.z;
      for (const child of pots.children) {
        if (child.name.startsWith('pot_' + size + '_')) {
          child.position.x += dx;
          child.position.z += dz;
          S.potPivots.push({ bone: child, base: child.position.clone() });
        }
      }
    });
  }
}

/* ---------- flowers (garden-flowers) ---------- */
function placeFlowers(gf) {
  world.add(gf.scene);
  const put = (name, spot, rotY) => {
    const g = gf.scene.getObjectByName(name);
    if (g) { g.position.set(spot[0], spot[1], spot[2]); if (rotY) g.rotation.y = rotY; addVariant(name, gf.scene, g); }
  };
  put('tulip_green', SPOTS.tulip, 0.2);
  put('tulip_bloom', SPOTS.tulip, 0.2);
  put('tulip_faded', SPOTS.tulip, 0.2);
  put('petunia_bloom', SPOTS.petunia, -0.4);
  put('mogra_bloom', SPOTS.mogra, 0.3);
  put('tomato_no_yield', SPOTS.tomato, 0.1);
  put('capsicum_no_yield', SPOTS.capsicum, -0.1);
  for (const plant of ['tomato','capsicum']) for (const part of ['marker','marker_post']) {
    const bone = gf.scene.getObjectByName(`${plant}_${part}__pivot`);
    if (bone) bone.userData.restY = bone.position.y;
  }
  // The nameplates are authored decoration hidden every frame; resolve their
  // pivots once instead of walking the flower rig during animation.
  S.flowersRoot = S.variants.tomato_no_yield?.[0]?.meshes[0]?.parent || gf.scene;
  S.flowerMarkers = ['tomato', 'capsicum'].map((plant) => ({
    label: S.flowersRoot.getObjectByName(plant + '_marker__pivot'),
    post: S.flowersRoot.getObjectByName(plant + '_marker_post__pivot'),
  }));
}
/* ---------- care props (garden-care) ---------- */
function placeCare(gcare) {
  S.careProps = gcare.scene;
  world.add(gcare.scene);
  const put = (name, spot, rotY) => {
    const g = gcare.scene.getObjectByName(name);
    if (g) { g.position.set(spot[0], spot[1], spot[2]); if (rotY) g.rotation.y = rotY; addVariant(name, gcare.scene, g); }
  };
  put('seed_packet', SPOTS.seed_packet, -0.5);
  put('seeds', SPOTS.seeds, 0);
  put('tape', SPOTS.tape, 0.4);
  put('support', SPOTS.support, 0.2);
  S.variants.seed_packet[0].group.scale.setScalar(0.55);
  const bee = gcare.scene.getObjectByName('bee');
  if (bee) setGroupVisible(gcare.scene, bee, false); // this instance is the props rig only
}

/* ---------- authored screenplay set dressing ---------- */
function placeStage(stage) {
  S.stage = stage.scene;
  world.add(S.stage);
  for (const name of [
    'room_backdrop','doorway_frame','door_leaf','threshold','room_lamp','room_table',
    'mug_left','mug_right','coffee_surfaces','tile_drain','tulip_petals_floor',
    'tulip_petal_drain','storm_petunia_flattened','storm_mogra_fallen',
  ]) {
    addVariant(name, S.stage, S.stage.getObjectByName(name));
  }
  S.door = S.stage.getObjectByName('door_leaf');
  S.stageLamp = S.stage.getObjectByName('room_lamp');
  S.roomLight = new THREE.PointLight(0xffc783, 0, 48, 2);
  S.roomLight.position.set(-11.7, 24.2, -13.5);
  world.add(S.roomLight);
}

/* ---------- plants: 3 pots, each with care + classic variant sets ---------- */
function addVariant(name, root, g) {
  if (!g) return;
  (S.variants[name] || (S.variants[name] = [])).push({ group: g, meshes: groupMeshes(root, g) });
}

function placePlant(care, classic, x, z, index) {
  const soilY = 4 + [6.9, 7.9, 8.9][index];
  care.scene.position.set(x, soilY, z);
  classic.scene.position.set(x, soilY, z);
  world.add(care.scene);
  world.add(classic.scene);
  // classic stages are authored side-by-side in z; normalise each to the base
  for (const n of ['stage_sprout', 'stage_growing', 'stage_bloom']) {
    const g = classic.scene.getObjectByName(n);
    if (g) g.position.set(0, 0, 0);
  }
  const plant = { care: care.scene, classic: classic.scene, index, hinge: {} };
  plant.flower = classic.scene.getObjectByName('bloom_flower');
  // Static authored rig lookups are done once; per-frame visibility work only
  // flips the cached nodes and their precomputed meshes.
  plant.hiddenClassicSoil = ['sprout_soil__pivot', 'grow_soil__pivot', 'bloom_soil__pivot']
    .map((n) => classic.scene.getObjectByName(n));
  plant.repairWraps = [
    ['repair_stake', 3], ['repair_tie_lo', 4], ['repair_tie_hi', 6],
    ['repair_tape_1', 5 + index * 0.7], ['repair_tape_2', 6 + index * 0.7],
    ['repair_tape_strand', 6],
  ].map(([name, at]) => ({ node: care.scene.getObjectByName(name + '__pivot'), at }));
  for (const n of ['stage_small', 'stage_broken', 'stage_repair', 'stage_healed', 'stage_tall_green']) {
    addVariant(n, care.scene, care.scene.getObjectByName(n));
  }
  for (const n of ['stage_sprout', 'stage_growing', 'stage_bloom']) addVariant(n, classic.scene, classic.scene.getObjectByName(n));
  plant.hinge.broken = care.scene.getObjectByName('broken_hinge');
  plant.hinge.repair = care.scene.getObjectByName('repair_hinge');
  plant.hinge.broken2 = care.scene.getObjectByName('broken_hinge_2');
  plant.hinge.repair2 = care.scene.getObjectByName('repair_hinge_2');
  plant.hinge.healed = care.scene.getObjectByName('healed_hinge');
  plant.hinge.tall = care.scene.getObjectByName('tall_hinge');
  for (const n of ['tall_stake__pivot','tall_tape__pivot']) addVariant('repair_traces', care.scene, care.scene.getObjectByName(n));
  S.plants.push(plant);
}

/* ---------- atmosphere ---------- */
function makeRain() {
  const n = 700;
  const pos = new Float32Array(n * 3);
  const base = new Float32Array(n * 2);
  const phase = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const bx = (rnd(i, 1) - 0.5) * 150, bz = (rnd(i, 2) - 0.5) * 120;
    base[i * 2] = bx; base[i * 2 + 1] = bz;
    pos[i * 3] = bx; pos[i * 3 + 2] = bz;
    phase[i] = rnd(i, 3) * 70;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xbcd8f2, size: 0.6, transparent: true, opacity: 0, depthWrite: false });
  const pts = new THREE.Points(g, m);
  pts.visible = false;
  scene.add(pts);
  S.rainBase = base; S.rainPhase = phase;
  return pts;
}

function addBee(gcare, index) {
  world.add(gcare.scene);
  for (const n of ['seed_packet', 'seeds', 'tape', 'support']) {
    const g = gcare.scene.getObjectByName(n);
    if (g) setGroupVisible(gcare.scene, g, false);
  }
  gcare.scene.userData.seed = index * 2.3;
  S.bees.push(gcare.scene);
}

function addSeeds(gcare, index) {
  const root = gcare.scene;
  world.add(root);
  for (const name of ['seed_packet','tape','support','bee']) setGroupVisible(root, root.getObjectByName(name), false);
  const seeds = root.getObjectByName('seeds');
  seeds.position.set(POT_X[index], 4 + [6.9,7.9,8.9][index], POT_Z);
  addVariant('seeds', root, seeds);
}

/* ---------- per-frame state (a pure function of chapter + time) ---------- */
const _skyA = new THREE.Color(), _skyB = new THREE.Color(), _sunCol = new THREE.Color();
const _lookCur = new THREE.Vector3();
const _gazeOrigin = new THREE.Vector3(), _gazeTargetLocal = new THREE.Vector3();
const _gazeDirection = new THREE.Vector3(), _gazeForward = new THREE.Vector3(0, 0, -1);
const _gazeRotation = new THREE.Quaternion();
const _sowSoilTarget = new THREE.Vector3(0, 12, -1);
const _packetWorldTarget = new THREE.Vector3(), _partnerHandWorldTarget = new THREE.Vector3();
const _headWorkTarget = new THREE.Vector3();
const _headAnchorPoint = new THREE.Vector3();
// Reused per-frame scratch vectors. Contact results are copied to arrays before
// the next frame, so these never leak between chapter seeks.
const _contactGoal = new THREE.Vector3(), _hingeWorld = new THREE.Vector3();
const _sowP = new THREE.Vector3(), _sowA = new THREE.Vector3(), _sowShared = new THREE.Vector3();
const _repairP = new THREE.Vector3(), _repairA = new THREE.Vector3();
const _stormL = new THREE.Vector3(), _stormR = new THREE.Vector3();
const _laptopTarget = new THREE.Vector3(), _laptopCenter = new THREE.Vector3();
const _attachHandPoint = new THREE.Vector3();
const NEUTRAL = { aLx: 0, aRx: 0, aLz: 0.12, aRz: -0.12, hx: 0, hy: 0 };

function aimAtLocalNegativeZ(bone, targetWorld) {
  if (!bone?.parent || !targetWorld) return;
  bone.parent.updateWorldMatrix(true, false);
  bone.updateWorldMatrix(true, false);
  bone.getWorldPosition(_gazeOrigin);
  bone.parent.worldToLocal(_gazeOrigin);
  _gazeTargetLocal.copy(targetWorld);
  bone.parent.worldToLocal(_gazeTargetLocal);
  _gazeDirection.copy(_gazeTargetLocal).sub(_gazeOrigin).normalize();
  _gazeRotation.setFromUnitVectors(_gazeForward, _gazeDirection);
  bone.quaternion.copy(_gazeRotation);
}

function setVis(name, on) {
  const list = S.variants[name];
  if (!list) return;
  for (const {group, meshes} of list) {
    group.visible = !!on;
    for (const mesh of meshes) mesh.visible = !!on;
  }
}

function poseFor(action, t) {
  const wob = reduced ? 0 : Math.sin(t * 2.1) * 0.25;
  switch (action) {
    case 'invite': return { aLx: 0, aRx: -0.35, aLz: 0.12, aRz: -0.2, hx: 0.04, hy: 0.08 };
    case 'sow': return { aLx: 0.05, aRx: 0.05, aLz: 0.12, aRz: -0.12, hx: 0, hy: 0 };
    case 'time_lapse': return { aLx: 0.35, aRx: 0.75 + wob * 0.2, aLz: 0.38, aRz: -0.35, hx: -0.18, hy: 0.1 };
    case 'sit_together': return { aLx: 0.1, aRx: 0.12, aLz: 0.2, aRz: -0.2, hx: 0.08, hy: 0.12, bodyY: 0 };
    case 'distance': return { aLx: 0, aRx: 0, aLz: 0.08, aRz: -0.08, hx: 0.02, hy: 0 };
    case 'windup': return { aLx: 0.1, aRx: 0.15, aLz: 0.3, aRz: -0.25, hx: 0.3, hy: 0.06 };
    case 'storm': return { aLx: -0.25, aRx: -0.35, aLz: 0.52, aRz: -0.5, hx: 0.24, hy: 0.12 };
    case 'aftermath': return { aLx: 0.05, aRx: 0.08, aLz: 0.16, aRz: -0.16, hx: 0.32, hy: 0.08 };
    case 'tend': return { aLx: 0.65, aRx: 0.95 + wob * 0.2, aLz: 0.5, aRz: -0.5, hx: -0.25, hy: 0.1 };
    case 'repair': return { aLx: -0.8, aRx: -1.0, aLz: -0.5, aRz: 0.5, hx: -0.08, hy: 0 };
    case 'together': return { aLx: 0.15, aRx: 0.15, aLz: 0.5, aRz: -0.5, hx: 0.35, hy: 0.25, bodyY: 0 };
    case 'look_up': return { aLx: 0, aRx: 0, aLz: 0.2 + wob * 0.05, aRz: -0.2 - wob * 0.05, hx: 0.35, hy: 0, bodyY: 0 };
    case 'measure': return { aLx: 0, aRx: 0, aLz: 0.08, aRz: -0.08, hx: -0.14, hy: 0, bodyY: 0 };
    case 'joy': return { aLx: -0.4, aRx: -0.4, aLz: -0.9, aRz: 0.9, hx: 0.18, hy: 0.35 };
    case 'ending': return { aLx: 0.08, aRx: 0.12, aLz: 0.15, aRz: -0.15, hx: -0.05, hy: 0.12, bodyY: 0 };
    default: return { aLx: 0, aRx: 0, aLz: 0.12 + wob * 0.05, aRz: -0.12 - wob * 0.05, hx: 0.06, hy: 0.1, bodyY: wob * 0.4 };
  }
}

const LAPTOP_LOCAL_CENTER = new THREE.Vector3(10.5, 13.25, 0);
function setLaptopPanels(open) {
  if (S.laptopScreen) setGroupVisible(S.paresh, S.laptopScreen, open);
  if (S.laptopKeyboard) setGroupVisible(S.paresh, S.laptopKeyboard, open);
}

function placeLaptopAt(target, targetRotationZ, blend = 1) {
  if (!S.laptop || !S.paresh || !S.laptopHome) return;
  const angle = lerp(S.laptopHome.rotation.z, targetRotationZ, blend);
  S.laptop.rotation.set(0, 0, angle);
  S.paresh.updateWorldMatrix(true, false);
  _laptopTarget.fromArray(target);
  S.paresh.worldToLocal(_laptopTarget);
  _laptopCenter.copy(LAPTOP_LOCAL_CENTER).applyEuler(S.laptop.rotation);
  _laptopTarget.sub(_laptopCenter);
  S.laptop.position.copy(S.laptopHome.position).lerp(_laptopTarget, blend);
}

function updateLaptop(ch, storyT) {
  if (!S.laptop) return;
  const present = ch === 0 || ch === 4 || ch === 11;
  setGroupVisible(S.paresh, S.laptop, present);
  if (!present) { S.laptopMode = 'hidden'; return; }
  if (ch === 0) {
    setLaptopPanels(false);
    const setDown = smooth((storyT - 0.75) / 1.45);
    placeLaptopAt([-14, 4.45, -8], Math.PI / 2, setDown);
    S.laptopMode = setDown > 0.98 ? 'closed-on-tiles' : 'carried-closed';
  } else if (ch === 4) {
    setLaptopPanels(true);
    placeLaptopAt([-20, 13.25, -27], 0, 1);
    S.laptopMode = 'open-on-room-table';
  } else {
    setLaptopPanels(false);
    placeLaptopAt([-19, 4.45, -12], Math.PI / 2, 1);
    S.laptopMode = 'closed-by-doorway';
  }
}

const KNEEL_KNEE_Y = 0.45;
const KNEEL_FLEX = 85 * Math.PI / 180;

function setBaseRotation(node, base, x = 0, y = 0, z = 0) {
  if (!node || !base) return;
  const r = base.rotation;
  node.rotation.set(r[0] + x, r[1] + y, r[2] + z, r[3]);
}

function setGroundedKneel(body, bodyBase, legs, blend) {
  const t = clamp(blend, 0, 1);
  const angle = KNEEL_FLEX * t;
  const footCos = Math.cos(angle);
  const hipHeights = [];
  for (const side of legs) {
    const { hip, knee, foot, hipBase, kneeBase, footBase } = side;
    const standingKneeY = hipBase.position[1] + kneeBase.position[1];
    const kneeY = lerp(standingKneeY, KNEEL_KNEE_Y, t);
    hip.position.fromArray(hipBase.position);
    hip.position.y = kneeY - kneeBase.position[1];
    knee.position.fromArray(kneeBase.position);
    knee.rotation.set(...kneeBase.rotation);
    knee.rotation.x -= angle;
    foot.position.fromArray(footBase.position);
    // The authored foot pivot is at model-ground y=0. As the shin folds,
    // solve its parent-local offset so the shoe sole remains on that plane.
    foot.position.y = Math.abs(footCos) > 0.08 ? -kneeY / footCos : 0;
    foot.rotation.set(...footBase.rotation);
    foot.rotation.x += angle;
    hipHeights.push(hip.position.y);
  }
  body.position.fromArray(bodyBase.position);
  body.position.y = lerp(bodyBase.position[1],
    hipHeights.reduce((sum, value) => sum + value, 0) / hipHeights.length, t);
  body.rotation.set(...bodyBase.rotation);
}

/**
 * Replace every aim result in the contact tree with a final-pose measurement
 * from its loaded named hand pivot. This runs after all body/head/arm/prop
 * transforms so performance().contacts can never claim a contact the rendered
 * rig does not have.
 */
function measureContactTree(node, performers) {
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const owner = value.owner ? performers[String(value.owner).toLowerCase()] : null;
    if (value.side && owner) {
      node[key] = owner.measureAim(value);
    } else {
      measureContactTree(value, performers);
    }
  }
}

function applyState(ch, t) {
  const c = CH[ch];
  const act = c.action;
  const storyT = t;
  const entry = S.entryPlans?.[ch] || null;
  const entryActive = !reduced && entry && storyT < entry.duration;
  const entryWalking = Boolean(entryActive && entry.kind === 'gait' && storyT < entry.walkEnd);
  const entryProgress = entryActive ? smooth(storyT / entry.duration) : 1;
  S.entryProgress = entryProgress;
  const dialogue = dialogueAt(ch, storyT);
  S.performance.contacts = {};
  S.performance.entry = null;
  S.performance.joy.paresh = null;
  S.performance.joy.anshita = null;
  S.performance.kneel.paresh = null;
  S.performance.kneel.anshita = null;
  const sow = ch === 1 ? sowingPlan(c, storyT) : null;
  // Keep accepted physical cue times exactly (repair t2/t5/t10 etc). Once its
  // original visual beat is complete, let it rest while the dialogue breathes.
  t = Math.min(t, c.visualDur);
  const prev = CH[(ch - 1 + CH.length) % CH.length];
  const k = clamp(t / c.visualDur, 0, 1);

  // Authored set geography is chapter-invariant: every pot and plant keeps its
  // authored base. Growth, breakage, bloom scale and visibility may change,
  // never the world position of the garden. Action chapters reblock actors and
  // cameras instead of sliding the set forward.
  for (const {bone, base} of S.potPivots || []) {
    bone.position.copy(base);
  }
  for (const plant of S.plants) {
    plant.care.position.x = plant.classic.position.x = POT_X[plant.index];
    plant.care.position.z = plant.classic.position.z = POT_Z;
  }
  for (const name of ['tulip_green','tulip_bloom','tulip_faded','petunia_bloom','mogra_bloom','tomato_no_yield','capsicum_no_yield']) {
    const key = name.split('_')[0], spot = SPOTS[key];
    for (const {group} of S.variants[name] || []) {
      group.position.fromArray(spot);
      group.rotation.z = reduced ? 0 : Math.sin(storyT * 1.8 + spot[0]) * (ch === 5 ? 0.055 : 0.008);
    }
  }

  const previousLight = ch > 0 ? CHAPTER_LIGHTS[ch - 1] : CHAPTER_LIGHTS[ch];
  const lighting = CHAPTER_LIGHTS[ch];
  const lightProgress = ch > 0 && !reduced
    ? smooth(storyT / c.entryDuration)
    : 1;
  _skyA.set(previousLight.sky); _skyB.set(lighting.sky);
  scene.background.copy(_skyA).lerp(_skyB, lightProgress);
  scene.fog.color.copy(scene.background);
  sunLight.intensity = lerp(previousLight.key, lighting.key, lightProgress);
  sunLight.color.set(previousLight.color).lerp(_sunCol.set(lighting.color), lightProgress);
  sunLight.position.set(lerp(previousLight.x, lighting.x, lightProgress), 48,
    lerp(previousLight.z, lighting.z, lightProgress));
  hemi.intensity = lerp(previousLight.hemi, lighting.hemi, lightProgress);
  fillLight.intensity = lerp(previousLight.fill, lighting.fill, lightProgress);
  ambientLight.intensity = lerp(previousLight.ambient, lighting.ambient, lightProgress);

  // Camera direction is independent of the bounded physical-action clock.
  S.shot = directShot(camera, _lookCur, c, storyT, reduced, sow?.focusX,
    ch > 0 ? prev : null, ch > 0 ? CHAPTER_END_SOW_FOCUS[ch - 1] : 0);

  // variant visibility
  const firstBloom = c.id === 'good-things';
  const flowerTime = c.cues ? storyT : t;
  const tulipOpenAt = c.cues?.tulipBloomStart ?? 0;
  const mograOpenAt = c.cues?.mograBloomStart ?? 0;
  const petuniaOpenAt = c.cues?.petuniaBloomStart;
  setVis('tulip_green', c.tulip === 'green' || (firstBloom && flowerTime < tulipOpenAt));
  setVis('tulip_bloom', c.tulip === 'bloom' && (!firstBloom || flowerTime >= tulipOpenAt));
  setVis('tulip_faded', c.tulip === 'faded');
  setVis('petunia_bloom', !!c.petunia && (petuniaOpenAt === undefined || flowerTime >= petuniaOpenAt));
  setVis('mogra_bloom', !!c.mogra && (!firstBloom || flowerTime >= mograOpenAt));
  if (petuniaOpenAt !== undefined) {
    const petuniaEnd = c.cues.petuniaBloomEnd;
    for (const {group} of S.variants.petunia_bloom || []) {
      group.scale.setScalar(0.05 + 0.95 * smooth((flowerTime - petuniaOpenAt) / (petuniaEnd - petuniaOpenAt)));
    }
  } else {
    for (const {group} of S.variants.petunia_bloom || []) group.scale.setScalar(1);
  }
  if (firstBloom) {
    for (const {group} of S.variants.tulip_bloom || []) {
      group.scale.setScalar(0.05 + 0.95 * smooth((flowerTime - tulipOpenAt) / (c.cues.tulipBloomEnd - tulipOpenAt)));
    }
    for (const {group} of S.variants.mogra_bloom || []) {
      group.scale.setScalar(0.05 + 0.95 * smooth((flowerTime - mograOpenAt) / (c.cues.mograBloomEnd - mograOpenAt)));
    }
  } else {
    for (const {group} of S.variants.tulip_bloom || []) group.scale.setScalar(1);
    for (const {group} of S.variants.mogra_bloom || []) group.scale.setScalar(1);
  }
  // The same authored leafy attempts sit quietly in the back from early summer.
  // Their outcome is not narrated until the ending; nothing is newly planted there.
  setVis('tomato_no_yield', ch >= 2);
  setVis('capsicum_no_yield', ch >= 2);
  for (const { label, post } of S.flowerMarkers) {
    // Override the parent variant's real meshes each frame: earlier attempts
    // remain leafy background plants, with nameplates revealed only at the end.
    // These are authored nameplate meshes, not screenplay props. The dialogue
    // already conveys the no-yield aside; keep the unapproved labels out of the
    // couple's faces, torsos and speech bubbles.
    setGroupVisible(S.flowersRoot, label, false);
    setGroupVisible(S.flowersRoot, post, false);
  }
  setVis('seed_packet', !!c.seeds || (ch === 0 && storyT >= STORY_CUES.dawn.packetReveal));
  if (act === 'sow' && c.seeds) {
    // These existing authored seed groups map to first, middle, and third
    // pots. Keep the pot row fixed and leave each placed seed behind as the
    // kneeling pair moves to the next pot.
    const seedPot = [1, 0, 2]; // group creation order: middle, first, third
    const soilY = [10.9, 11.9, 12.9];
    (S.variants.seeds || []).forEach(({group, meshes}, i) => {
      const pot = seedPot[i];
      const visible = pot !== undefined && sow.sown[pot];
      if (pot !== undefined) group.position.set(POT_X[pot], soilY[pot], SOW_SOIL_Z);
      group.visible = visible;
      meshes.forEach(mesh => { mesh.visible = visible; });
      group.scale.setScalar(visible ? 1.05 : 1);
    });
  } else setVis('seeds', !!c.seeds);
  setVis('tape', (ch === 6 && storyT >= STORY_CUES.storm.tapeRun) || (ch === 7 && (storyT < 2 || storyT >= 29)) || ch === 8);
  setVis('support', (ch === 6 && storyT >= STORY_CUES.storm.support) || (ch === 7 && t < 2) || (ch === 8 && t < 3));
  for (const n of ['seed_packet','tape','support']) {
    const g = S.variants[n][0].group;
    g.position.fromArray(SPOTS[n]);
  }
  // Sowing ends with seed in soil; germination belongs to the next time-lapse.
  setVis('stage_sprout', false);
  setVis('stage_small', c.grow === 'small');
  setVis('stage_broken', c.grow === 'broken' || (c.grow === 'repair' && t < 2));
  setVis('stage_repair', c.grow === 'repair' && t >= STORY_CUES['seven-am'].repairVisible);
  setVis('stage_healed', c.grow === 'healed');
  setVis('stage_tall_green', c.grow === 'tall');
  setVis('stage_bloom', c.grow === 'bloom');
  setVis('stage_growing', false);
  setVis('repair_traces', c.grow === 'bloom');

  // Blockbench-authored screenplay set pieces. Only transforms/visibility and
  // lighting are animated here; all visible surfaces come from taller-stage.
  setVis('room_backdrop', true);
  setVis('doorway_frame', true);
  setVis('threshold', true);
  setVis('tile_drain', true);
  setVis('room_lamp', true);
  setVis('room_table', ch === 4 || ch === 6);
  const quietMugs = ch === 3 || ch === 7 || ch === 11;
  setVis('mug_left', quietMugs);
  setVis('mug_right', quietMugs);
  setVis('coffee_surfaces', ch === 11);
  setVis('tulip_petals_floor', ch >= 4 && ch <= 6);
  setVis('tulip_petal_drain', ch >= 4 && ch <= 6);
  const flattenedFlowers = (ch === 5 && storyT >= STORY_CUES['weather-turns'].flowersFall)
    || ch === 6 || ch === 7;
  setVis('storm_petunia_flattened', flattenedFlowers);
  if (flattenedFlowers) setVis('petunia_bloom', false);
  setVis('storm_mogra_fallen', ch === 7);
  for (const { meshes } of S.variants.mogra_bloom || []) {
    for (const mesh of meshes) {
      if (mesh.name.startsWith('mogra_flower_')) mesh.visible = ch !== 7;
    }
  }

  const door = S.door;
  let doorAngle = 0;
  if (ch === 3) doorAngle = 0.22; // room light reaches the tulips at dusk
  else if (ch === 4) doorAngle = 0.88; // Paresh is visible at the room table
  else if (ch === 6) {
    const gust = reduced ? 0 : (0.35 + 0.8 * Math.sin(storyT * 2.4) - 0.12) * (1 - smooth((storyT - 5) / 2));
    doorAngle = 0.12 + gust + 1.03 * smooth((storyT - 18) / 1.2);
  } else if (ch === 7) doorAngle = 1.05;
  else if (ch === 11) doorAngle = 0.2;
  if (door) door.rotation.y = doorAngle;
  S.doorAngle = doorAngle;
  if (S.roomLight) {
    const lampOn = ch === 3 || ch === 6 || ch === 11;
    S.roomLight.intensity = lampOn ? 1.75 : 0;
  }
  const superOpacity = ch === 8 ? 1 - smooth((storyT - 4.8) / 0.7) : 0;
  timeSuper.style.opacity = String(superOpacity);
  timeSuper.style.visibility = superOpacity > 0.01 ? 'visible' : 'hidden';

  // young growth rises through its beat
  const grow = c.grow === 'sprout' ? 0.2 + 0.8 * smooth((t - 7) / 7) :
    0.5 + 0.5 * smooth(((ch - 2) + k) / 4);
  for (const n of ['stage_sprout', 'stage_small']) {
    for (const {group} of (S.variants[n] || [])) group.scale.setScalar(grow);
  }
  for (const n of ['stage_healed', 'stage_tall_green', 'stage_bloom']) {
    for (const {group} of (S.variants[n] || [])) group.scale.setScalar(n === 'stage_healed' ? lerp(0.82, 1, smooth(t / c.visualDur)) : 1);
  }

  // Native short upper stalks hang DOWN beside high exposed jagged cut ends.
  // Rejoin their cut faces first, wrap them, then lift each separate stalk.
  // Both variants have identical hinge-local meshes: switching at t2 cannot jump.
  const fall = ch === 7 ? 1 : smooth((t - 1) / 2.5);
  const held = c.grow === 'broken' ? fall : c.grow === 'repair' ? 1 - smooth((t - 2) / 2) : 0;
  for (const p of S.plants) {
    // Use the pot rig's real soil, rather than layering classic stage soil on it.
    for (const node of p.hiddenClassicSoil) setGroupVisible(p.classic, node, false);
    const h = p.hinge;
    const liftAt = 5.5 + p.index * 0.7; // each primary wrap precedes lifting
    const bend = c.grow === 'broken' ? fall : c.grow === 'repair' ? 1 - smooth((t - liftAt) / (10 - liftAt)) : 0;
    for (const [hinge, x, z] of [[h.broken,0,0],[h.repair,0,0],[h.broken2,1.4,-1.4],[h.repair2,1.4,-1.4]]) {
      if (!hinge) continue;
      hinge.position.set(x + 3 * held, 9 + 2.2 * held, z);
      hinge.rotation.set(0, 0, -155 * Math.PI / 180 * bend);
    }
    if (h.healed) h.healed.rotation.z = 0;
    if (h.tall) h.tall.rotation.z = 0;
    // Supports are placed first; the matching wraps follow the couple's work,
    // rather than appearing fully repaired at the chapter cut.
    for (const { node, at } of p.repairWraps) {
      setGroupVisible(p.care, node, c.grow === 'repair' && t >= at);
    }
     if (p.flower) p.flower.scale.setScalar(ch === 10 ? lerp(0.18, 1, smooth(t / 7)) : 1);
    // Fixed camera-facing joint planes, same lower stalk/position through repair.
      p.care.rotation.z = ch >= 6 && ch <= 8 ? 0 : (p.index - 1) * 0.02 +
        (reduced ? 0 : Math.sin(storyT * 1.5 + p.index) * (ch === 5 ? 0.04 : 0.006));
    p.classic.rotation.z = reduced ? 0 : Math.sin(storyT * 1.15 + p.index) * 0.006;
  }

  // the couple: position, facing and authored rig poses
  if (S.paresh && S.anshita) {
    const P = S.performers.paresh, A = S.performers.anshita;
    // Every authored bone this frame is rebuilt from the captured base; no
    // previous-frame pose can leak across a seek.
    P.reset(); A.reset();
    const joyful = act === 'joy';
    const close = ['sow','repair','tend','sit_together','aftermath','ending'].includes(act);
    const joyApproach = joyful ? smooth((storyT - JOY_APPROACH.start) / (JOY_APPROACH.end - JOY_APPROACH.start)) : 0;
    // Each scene has a deterministic move from the prior scene's final marks.
    const marks = actorRootTargets(ch, storyT, _actorRootTargets);
    S.paresh.position.copy(marks.paresh);
    S.anshita.position.copy(marks.anshita);
    if (entryActive && entry.kind === 'cut' && c.id === 'morning-after'
        && storyT < SCENE_CAMERA_BLEND_SECONDS) {
      S.paresh.position.copy(entry.from.paresh);
      S.anshita.position.copy(entry.from.anshita);
    } else if (entryActive && entry.kind === 'ease') {
      S.paresh.position.lerpVectors(entry.from.paresh, entry.to.paresh, entryProgress);
      S.anshita.position.lerpVectors(entry.from.anshita, entry.to.anshita, entryProgress);
    } else if (entryActive && entry.kind === 'gait' && storyT >= entry.walkEnd) {
      const settle = smooth((storyT - entry.walkEnd)
        / Math.max(0.01, entry.duration - entry.walkEnd));
      S.paresh.position.y = lerp(entry.pareshWalkEndY, marks.paresh.y, settle);
      S.anshita.position.y = lerp(entry.anshitaWalkEndY, marks.anshita.y, settle);
    }
    const et = entryProgress;
    const bob = 0; // Root height stays grounded; breathing belongs to the torso.
    const pose = poseFor(act, t);
    const facing = actorFacing(ch);
    const facingProgress = entryActive && entry.kind === 'gait'
      ? smooth((storyT - entry.walkEnd) / Math.max(0.01, entry.duration - entry.walkEnd))
      : entryProgress;
    S.paresh.rotation.y = entryActive
      ? lerp(entry.fromFacing.paresh, facing.paresh, facingProgress)
      : facing.paresh;
    S.anshita.rotation.y = entryActive
      ? lerp(entry.fromFacing.anshita, facing.anshita, facingProgress)
      : facing.anshita;

    // Scene 11: four real side-steps each, planted in world space, ending in the
    // shared posing mark. The gait sets root X/Y/Z from story time.
    if (entryWalking) {
      S.performance.entry = {
        paresh: P.gait(entry.paresh, storyT),
        anshita: A.gait(entry.anshita, storyT),
      };
    } else if (joyful && !entryActive) {
      S.performance.joy.paresh = P.gait(S.joyPlans.paresh, storyT);
      S.performance.joy.anshita = A.gait(S.joyPlans.anshita, storyT);
    }

    const R = S.rig;
    const E = entryProgress;

    // Grounded kneel/settle/rise and the joy gait own the legs and root. The
    // measure crouch retains its own authored head-height solve.
    const authoredKneel = actorKneelAt(ch, storyT);
    let pKneel = authoredKneel.paresh, aKneel = authoredKneel.anshita;
    let pSettle = authoredKneel.settle, aSettle = authoredKneel.settle;
    if (entryActive) {
      const poseProgress = entry.kind === 'gait'
        ? smooth((storyT - entry.walkEnd) / Math.max(0.01, entry.duration - entry.walkEnd))
        : entryProgress;
      pKneel = lerp(entry.fromPose.paresh, entry.toPose.paresh, poseProgress);
      aKneel = lerp(entry.fromPose.anshita, entry.toPose.anshita, poseProgress);
      pSettle = aSettle = lerp(entry.fromPose.settle, entry.toPose.settle, poseProgress);
    }
    if (act === 'measure') {
      if (!entryWalking) {
        setGroundedKneel(R.pBody, R.base.pBody, [
          { hip:R.pHipL, knee:R.pKneeL, foot:R.pFootL, hipBase:R.base.pHipL, kneeBase:R.base.pKneeL, footBase:R.base.pFootL },
          { hip:R.pHipR, knee:R.pKneeR, foot:R.pFootR, hipBase:R.base.pHipR, kneeBase:R.base.pKneeR, footBase:R.base.pFootR },
        ], pKneel);
        setGroundedKneel(R.aBody, R.base.aBody, [
          { hip:R.aHipL, knee:R.aKneeL, foot:R.aFootL, hipBase:R.base.aHipL, kneeBase:R.base.aKneeL, footBase:R.base.aFootL },
          { hip:R.aHipR, knee:R.aKneeR, foot:R.aFootR, hipBase:R.base.aHipR, kneeBase:R.base.aKneeR, footBase:R.base.aFootR },
        ], aKneel);
      }
      S.performance.kneel.paresh = { amount: pKneel, settle: pSettle, stance: 'measure' };
      S.performance.kneel.anshita = { amount: aKneel, settle: aSettle, stance: 'measure' };
    } else if (act === 'sow' || act === 'storm'
        || (entryActive && entry.kind !== 'gait')) {
      if (!entryWalking) {
        S.performance.kneel.paresh = P.kneel(pKneel, pSettle);
        S.performance.kneel.anshita = A.kneel(aKneel, aSettle);
      }
    } else {
      S.performance.kneel.paresh = { amount: 0, settle: 0, stance: joyful ? 'gait' : 'stand' };
      S.performance.kneel.anshita = { amount: 0, settle: 0, stance: joyful ? 'gait' : 'stand' };
    }

    // blend from neutral into the action pose as the beat opens
    const b = (from, to) => lerp(from, to, E);
    const lean = act === 'sow' ? -0.04 : act === 'repair' ? -0.08 : act === 'tend' ? -0.15 : 0;
    setBaseRotation(R.pBody, R.base.pBody, lean * E);
    setBaseRotation(R.aBody, R.base.aBody, lean * E);
    // The grounded-pose solver resets rotations; layer lean/breath afterward.
    const breathP = reduced ? 0 : Math.sin(storyT * 1.35) * 0.006;
    const breathA = reduced ? 0 : Math.sin(storyT * 1.12 + 1.1) * 0.005;
    R.pBody.rotation.x += lean + breathP;
    R.aBody.rotation.x += lean * 0.8 + breathA;
    // The measure stance settles the tall actor's torso a little further so the
    // paired head tops read level without raising either actor off the deck.
    if (act === 'measure') R.pBody.position.y -= MEASURE_TORSO_DROP * E;
    if (act === 'measure') {
      // Small opposing authored-head offsets separate the two readable faces
      // while the torso planes stay in physical back-to-back contact.
      R.pHead.position.fromArray(R.base.pHead.position);
      R.aHead.position.fromArray(R.base.aHead.position);
      for (const head of [R.pHead, R.aHead]) {
        head.position.x += MEASURE_HEAD_STAGGER * E;
        head.position.z -= MEASURE_HEAD_STAGGER * E;
      }
    } else {
      R.pHead.position.fromArray(R.base.pHead.position);
      R.aHead.position.fromArray(R.base.aHead.position);
    }
    setBaseRotation(R.pArmL, R.base.pArmL, b(NEUTRAL.aLx, pose.aLx), 0, b(NEUTRAL.aLz, pose.aLz));
    setBaseRotation(R.pArmR, R.base.pArmR, b(NEUTRAL.aRx, pose.aRx), 0, b(NEUTRAL.aRz, pose.aRz));
    setBaseRotation(R.aArmL, R.base.aArmL, b(NEUTRAL.aLx, pose.aLx), 0, b(NEUTRAL.aLz, pose.aLz));
    setBaseRotation(R.aArmR, R.base.aArmR, b(NEUTRAL.aRx, pose.aRx), 0, b(NEUTRAL.aRz, pose.aRz));
    setBaseRotation(R.pHead, R.base.pHead, b(0, pose.hx), b(0, pose.hy));
    setBaseRotation(R.aHead, R.base.aHead, b(0, pose.hx), b(0, -pose.hy));
    // The shared task remains in their hands; the exchange lives in attention.
    // Authored head/shoulder/torso bones drive the native skinned meshes. Modest
    // partner yaw preserves both faces rather than turning them into profiles.
    // Body yaw is applied before the contact solve: the arm is a child of the
    // torso, so solving first and turning the torso afterwards would publish a
    // hand position the renderer never reaches.
    const age = dialogue.start === null ? 0 : storyT - dialogue.start;
    const emphasis = dialogue.speaker ? (reduced ? 1 : smooth(age / 0.45) * smooth((dialogue.end - storyT) / 0.5)) : 0;
    const sober = ch >= 4 && ch <= 8;
    const attentive = close ? 0.13 : 0.22;
    for (const [name, sign, body, head, arm, bodyBase, headBase] of [
      ['Paresh', 1, R.pBody, R.pHead, R.pArmR, R.base.pBody, R.base.pHead],
      ['Anshita', -1, R.aBody, R.aHead, R.aArmL, R.base.aBody, R.base.aHead],
    ]) {
      const speaking = dialogue.speaker === name;
      const acting = attentionPose(name, c, storyT, dialogue, reduced);
      const listening = dialogue.speaker && !speaking;
      const delay = name === 'Anshita' ? 0.22 : 0;
      const reactionAge = Math.max(0, age - delay);
      const nod = reduced ? 0 : Math.sin(reactionAge * (speaking ? 2.1 : 1.3)) * Math.exp(-reactionAge * 0.8);
      if (body) {
        body.rotation.x += acting.lean;
        body.rotation.y = bodyBase.rotation[1] + sign * (close ? 0.02 : 0.055) * E;
        body.rotation.z = bodyBase.rotation[2] + sign * (speaking ? 0.022 : 0.008) * emphasis;
      }
      if (head) {
        // Scene 10: the paired torsos stay back-to-back, so each authored head
        // bone turns over the shoulder toward the camera for a readable face.
        head.rotation.y = headBase.rotation[1] + sign * (attentive + (speaking ? 0.06 : listening ? 0.12 : 0.03)) * E;
        head.rotation.x += (speaking ? 0.025 : 0.05) * nod * emphasis;
        head.rotation.x += acting.pitch;
        head.rotation.y += acting.yaw;
        head.rotation.z = headBase.rotation[2] + sign * (sober ? 0.025 : 0.05) * emphasis * (listening ? 1 : 0.35);
      }
      // Don't interrupt sowing, taping or the watering-can attachment. For the
      // ordinary conversations, a small outside-hand gesture distinguishes turns.
      if (arm && !close && act !== 'storm' && speaking) {
        arm.rotation.x -= (sober ? 0.16 : 0.35) * emphasis * acting.gesture;
        arm.rotation.z += sign * (sober ? -0.07 : -0.18) * emphasis;
      }
    }

    // Hand targets are solved against the real hand-pivot reach. Props are then
    // placed from the hand's world matrix, so grip orientation follows the arm.
    if (act === 'sow') {
      // Both remain grounded as they move along the fixed pot row. The packet
      // and seed hands meet over the active soil; after the third tuck, his
      // free hand settles over hers for the closing beat.
      _sowSoilTarget.set(sow.focusX, sow.soilY + 0.15, SOW_SOIL_Z);
      const work = pKneel;
      const pSoil = _sowP.copy(_sowSoilTarget); pSoil.x -= 0.35; pSoil.y += 0.05;
      const aSoil = _sowA.copy(_sowSoilTarget); aSoil.x += 0.35; aSoil.y += 0.05;
      S.performance.contacts.seed = {
        target: _sowSoilTarget.toArray(),
        paresh: P.aim('L', pSoil, work, 1.4),
        anshita: A.aim('R', aSoil, work, 1.4),
      };
      if (sow.share > 0) {
        const sharedGoal = _sowShared.copy(_sowSoilTarget);
        sharedGoal.x += 0.15; sharedGoal.y += 0.5; sharedGoal.z += 0.25;
        S.performance.contacts.seedShare = {
          goal: sharedGoal.toArray(),
          paresh: P.aim('R', sharedGoal, sow.share * work),
        };
      }
    } else if (act === 'repair') {
      // Both work the same repaired hinge on the middle pot; the shared point
      // is on both hand-reach spheres instead of two impossible reaches.
      const hinge = S.plants[1]?.hinge.repair || S.plants[1]?.hinge.broken;
      const goal = _contactGoal.set(0, 20.6, 14);
      if (hinge) {
        hinge.updateWorldMatrix(true, false);
        hinge.getWorldPosition(goal);
        goal.y += 0.2;
      }
      const shared = sharedHandPoint(P, 'L', A, 'R', goal);
      const pOther = _repairP.copy(shared);
      pOther.x += 0.55; pOther.y += 0.5; pOther.z += 0.25;
      const aOther = _repairA.copy(shared);
      aOther.x -= 0.55; aOther.y += 0.35; aOther.z += 0.25;
      S.performance.contacts.joint = {
        point: shared.toArray(),
        target: goal.toArray(),
        paresh: P.aim('L', shared, E),
        anshita: A.aim('R', shared, E),
        pareshTape: P.aim('R', pOther, E),
        anshitaHold: A.aim('L', aOther, E),
      };
    } else if (act === 'joy') {
      // Inside hands greet the flowers and each other; outside arms stay soft.
      // The joined hold finishes in front of the pot foliage (toward camera) so
      // the stems and leaves cannot cover it from the shared-joy angle.
      const goal = _contactGoal.set(0, lerp(30.5, 19, joyApproach),
        lerp(-1, 12, joyApproach));
      const shared = sharedHandPoint(P, 'L', A, 'R', goal);
      S.performance.contacts.hands = {
        point: shared.toArray(),
        goal: goal.toArray(),
        paresh: P.aim('L', shared, E),
        anshita: A.aim('R', shared, E),
      };
      setBaseRotation(R.pArmR, R.base.pArmR, 0, 0, -0.15);
      setBaseRotation(R.aArmL, R.base.aArmL, 0, 0, 0.15);
    } else if (act === 'storm') {
      const nearHinge = S.plants[0]?.hinge.broken;
      if (nearHinge) {
        nearHinge.updateWorldMatrix(true, false);
        const near = nearHinge.getWorldPosition(_hingeWorld);
        // The hold is on the actual broken hinge, not a helper point above it.
        // Small hand offsets keep the two hands from occupying one coordinate.
        const goal = _contactGoal.copy(near);
        const holding = smooth((storyT - 0.35) / 0.85);
        // She holds the same broken section through his tape run. "It's
        // slipping" loosens his grip; "Don't let go" re-closes it; "I need the
        // tape" releases him on the cut.
        const slip = smooth((storyT - STORY_CUES.storm.slip) / 0.9)
          * (1 - smooth((storyT - STORY_CUES.storm.regrip) / 1.0));
        const leaving = smooth((storyT - STORY_CUES.storm.leaving) / 0.6);
        // "It's slipping." Keep the arm reaching for the stem but visibly off
        // the grip instead of dropping it to his side; "Don't let go." closes
        // the hand again, and the tape cut releases it completely.
        const pareshHold = holding * (1 - leaving) * (1 - 0.28 * slip);
        const aL = _stormL.copy(goal);
        aL.x += 0.06; aL.y += 0.14; aL.z += 0.06;
        const aR = _stormR.copy(goal);
        aR.x -= 0.06; aR.y -= 0.14; aR.z += 0.06;
        S.performance.contacts.stem = {
          hinge: near.toArray(),
          target: goal.toArray(),
          handTargets: { anshitaL: aL.toArray(), pareshR: aR.toArray() },
          anshitaL: A.aim('L', aL, holding),
          pareshR: P.aim('R', aR, pareshHold),
        };
        if (storyT >= STORY_CUES.storm.tapeRun && storyT < STORM_RETURN_AT) {
          // Carry the tape at chest height, clear of the foreground flowers.
          // Preserve the stem target in the diagnostics: this is a release.
          P.aim('R', _headWorkTarget.set(8, 23, 15), 1);
        }
        const returnHold = smooth((storyT - STORY_CUES.storm.returnHold) / 0.9);
        if (returnHold > 0) {
          // The shared return point is solved against the actual hinge; the
          // test and performance() both compare it with the loaded hinge world.
          const shared = sharedHandPoint(P, 'R', A, 'L', goal);
          S.performance.contacts.stem.return = {
            point: shared.toArray(),
            target: goal.toArray(),
            paresh: P.aim('R', shared, returnHold),
            anshita: A.aim('L', shared, returnHold),
          };
        }
      }
    } else if (act === 'aftermath') {
      // "Then hold it with me." / "I'm here." — the gesture begins as she asks
      // and stays through his reply. No dialogue or story beat is added.
      const hold = smooth((storyT - STORY_CUES['morning-after'].holdStart) / 0.6)
        * (1 - smooth((storyT - STORY_CUES['morning-after'].holdEnd) / 1.0));
      const goal = _contactGoal.set(0, 23, 12);
      const shared = sharedHandPoint(P, 'L', A, 'R', goal);
      S.performance.contacts.handHold = {
        point: shared.toArray(),
        goal: goal.toArray(),
        active: hold > 0.6,
        paresh: P.aim('L', shared, hold),
        anshita: A.aim('R', shared, hold),
      };
    }
    if (act === 'measure') {
      // Torsos remain opposing; each original head tracks the camera so both
      // faces stay turned toward the viewer through the full half-turn.
      // A restrained upward eyeline keeps the head within the authored neck's
      // range while preserving readable faces through the small camera arc.
      _packetWorldTarget.copy(camera.position);
      _packetWorldTarget.y = 45;
      aimAtLocalNegativeZ(R.pHead, _packetWorldTarget);
      aimAtLocalNegativeZ(R.aHead, _packetWorldTarget);
      for (const head of [R.pHead, R.aHead]) {
        head.rotation.x = clamp(head.rotation.x, -0.25, 0.25);
        head.rotation.y = clamp(head.rotation.y, -1.3, 1.3);
        head.rotation.z = 0;
      }
    }
    const attach = (root, group, hand, scale) => {
      if (!hand || !group) return;
      hand.updateWorldMatrix(true, false);
      const point = hand.localToWorld(_attachHandPoint.set(0, 1.2, 0));
      root.updateMatrixWorld(true);
      group.position.copy(root.worldToLocal(point));
      group.scale.setScalar(scale);
      group.rotation.set(0, 0, 0);
    };
    if (act === 'sow' || (act === 'invite' && storyT >= STORY_CUES.dawn.packetReveal)) {
      const group = S.variants.seed_packet?.[0]?.group;
      if (group) {
        if (act === 'sow') {
          P.attach(S.careProps, group, 'L',
            { offset: [0, 1.0, 0.3], rotation: [0.1, -0.15, 0.2], scale: 0.24 });
        } else {
          attachProp(S.careProps, group, S.handPivots.pareshSmoothR,
            { offset: [0, 1.0, 0.3], rotation: [0.1, 0.1, 0.2], scale: 0.75 });
        }
      }
    }
    if (act === 'repair' || (act === 'storm' && storyT >= STORY_CUES.storm.tapeRun)
        || (act === 'aftermath' && storyT >= 29)) {
      const group = S.variants.tape?.[0]?.group;
      if (group) {
        P.attach(S.careProps, group, 'R',
          { offset: [0, 0.8, 0.4], rotation: [0.2, 0, 0.3], scale: 0.8 });
      }
    }
    if (act === 'storm' && storyT >= STORY_CUES.storm.support && S.variants.support?.[0]) {
      P.attach(S.careProps, S.variants.support[0].group, 'L',
        { offset: [0, 1.4, 0.2], rotation: [0, 0, 0.2], scale: 0.5 });
    }
    updateLaptop(ch, storyT);
    if (S.coffee) setGroupVisible(S.anshita, S.coffee, act === 'invite');
    if (S.can) {
      const canOwner = act === 'time_lapse' ? S.paresh : S.anshita;
      setGroupVisible(S.props, S.can, ['invite','time_lapse','tend'].includes(act));
      if (['invite','time_lapse','tend'].includes(act)) {
        const hand = canOwner === S.paresh ? S.handPivots.pareshSmoothR : S.handPivots.anshitaMeshR;
        attach(S.props, S.can, hand, 0.6);
      }
      S.can.rotation.z = -0.45 + (reduced ? 0 : Math.sin(storyT * 1.2) * 0.035);
    }
    if (act === 'sow') {
      // Look at the working soil from above the hands, not straight down into
      // the pot: this keeps both faces and the seed contact uncovered by hair.
      const risen = 1 - pKneel;
      _headWorkTarget.set(sow.focusX, sow.soilY + 6.5 + risen * 8,
        SOW_SOIL_Z + 6.0 + risen * 2);
      aimAtLocalNegativeZ(R.pHead, _headWorkTarget);
      aimAtLocalNegativeZ(R.aHead, _headWorkTarget);
    } else if (act === 'storm') {
      const near = S.plants[0]?.hinge.broken;
      if (near) {
        near.updateWorldMatrix(true, false);
        near.getWorldPosition(_partnerHandWorldTarget);
        if (storyT >= STORY_CUES.storm.lookBack) {
          // Return: faces to camera while the hands keep the stem between them.
          aimAtLocalNegativeZ(R.pHead, camera.position);
          aimAtLocalNegativeZ(R.aHead, camera.position);
        } else if (storyT >= STORY_CUES.storm.tapeRun) {
          // Tape run: he looks at the tape in his hands; she keeps the stem.
          _headWorkTarget.set(9, 19, 9.5);
          aimAtLocalNegativeZ(R.pHead, _headWorkTarget);
          _partnerHandWorldTarget.y += 1.6;
          _partnerHandWorldTarget.z += 2.4;
          aimAtLocalNegativeZ(R.aHead, _partnerHandWorldTarget);
        } else {
          _partnerHandWorldTarget.y += 1.6;
          _partnerHandWorldTarget.z += 2.4;
          aimAtLocalNegativeZ(R.pHead, _partnerHandWorldTarget);
          aimAtLocalNegativeZ(R.aHead, _partnerHandWorldTarget);
        }
      }
    } else if (act === 'repair') {
      // The fixed middle pot sits 15 units behind the old bay; look at the
      // actual joint rather than the old staged position.
      _headWorkTarget.set(0, 25, 18 - ACTION_SET_DEPTH);
      aimAtLocalNegativeZ(R.pHead, _headWorkTarget);
      aimAtLocalNegativeZ(R.aHead, _headWorkTarget);
    } else if (act === 'aftermath' && storyT >= STORY_CUES['morning-after'].headLook) {
      _headWorkTarget.set(0, 22, 6);
      aimAtLocalNegativeZ(R.pHead, _headWorkTarget);
      aimAtLocalNegativeZ(R.aHead, _headWorkTarget);
    }
    // Task eyelines stay within the neck's range instead of folding the face
    // into the hands. The hands carry the action; a glance need not be a bow.
    if (['sow', 'storm', 'repair', 'aftermath'].includes(act)) {
      for (const head of [R.pHead, R.aHead]) {
        head.rotation.x = clamp(head.rotation.x, -0.25, 0.35);
        head.rotation.y = clamp(head.rotation.y, -0.7, 0.7);
        head.rotation.z = 0;
      }
    }
    measureContactTree(S.performance.contacts, S.performers);
  }

  // clouds drift deterministically with time
  S.clouds.forEach((cl, i) => {
    const base = cl.name === 'cloud_a' ? -30 : 25;
    const speed = c.rain ? 3.2 : 0.7;
    let x = base + (i ? 1 : -1) * (reduced ? 0 : storyT) * speed;
    x = ((x + 70) % 140 + 140) % 140 - 70;
    cl.position.x = x;
  });
  if (S.sunDisk) S.sunDisk.rotation.z = 0;
  if (S.sunDisk) setGroupVisible(S.props, S.sunDisk, !c.rain && ch !== 4 && ch !== 7);

  // rain: deterministic fall from (chapter, time)
  if (S.rain) {
    const want = c.rain ? 1 : 0;
    S.rain.material.opacity = 0.8 * want * smooth(t / 1.0);
    S.rain.visible = S.rain.material.opacity > 0.02;
    if (S.rain.visible) {
      const pos = S.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = 70 - ((S.rainPhase[i] + (reduced ? 0 : storyT) * 38) % 70);
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  }

  // bees orbit the blooms deterministically
  S.bees.forEach((b, i) => {
    b.visible = !!c.bees;
    if (!c.bees) return;
    const s = b.userData.seed, bt = reduced ? 0 : storyT;
    // Bee 2 briefly crosses Anshita's lower face at the joy approach. Give it
    // a small, smooth lateral detour through that shot; the path remains an
    // absolute-time orbit and rejoins the garden route before the shared hold.
    const bloomBeeDetourX = c.id === 'bloom' && i === BLOOM_BEE_FACE_DETOUR.beeIndex
      ? BLOOM_BEE_FACE_DETOUR.lateralX
        * smooth((bt - BLOOM_BEE_FACE_DETOUR.startsAt) / BLOOM_BEE_FACE_DETOUR.rampSeconds)
        * (1 - smooth((bt - BLOOM_BEE_FACE_DETOUR.fadesAt) / BLOOM_BEE_FACE_DETOUR.fadeSeconds))
      : 0;
    b.position.set(Math.sin(bt * 0.8 + s) * 15 + (i - 1) * 7 - bloomBeeDetourX,
      21 + Math.sin(bt * 1.6 + s) * 3.5,
      4 + Math.cos(bt * 0.6 + s) * 11);
    b.rotation.y = Math.sin(bt * 0.8 + s);
  });

  updateCaption(dialogue);
  updateFilmCard(ch, storyT);
  layoutDialogueBubble(ch, storyT, dialogue);
  sound.update(c, storyT, S.playing && !S.frozen && !document.hidden);
  const progress = clamp(storyT / c.dur, 0, 1) * 100;
  barEl.style.width = progress.toFixed(2) + '%';
  const value = progress.toFixed(0);
  if (progressEl.getAttribute('aria-valuenow') !== value) progressEl.setAttribute('aria-valuenow', value);
}

/* ---------- loop ---------- */
const clock = new THREE.Clock();
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.ready) freeze(true);
});
let loopId = 0;
function tick() {
  loopId = requestAnimationFrame(tick);
  const dt = clock.getDelta();
  if (!S.frozen && S.playing) {
    S.t += dt;
    while (S.t >= CH[S.chapter].dur) {
      if (S.chapter === CH.length - 1) {
        S.t = CH[S.chapter].dur; applyState(S.chapter, S.t);
        renderer.render(scene, camera); S.playing = false; setPlayLabel(); break;
      } else { S.t -= CH[S.chapter].dur; S.chapter++; updateCaption(); }
    }
  }
  if (!S.frozen && S.playing) {
    applyState(S.chapter, S.t);
    renderer.render(scene, camera);
  }
}

/* ---------- deterministic QA hooks ---------- */
function seek(ch, seconds) {
  const i = clamp(Math.round(ch), 0, CH.length - 1);
  S.frozen = true; S.playing = false;
  if (!S.ready) throw new Error('Garden assets are not ready');
  S.chapter = i; S.t = clamp(Number(seconds) || 0, 0, CH[i].dur);
  S.bubbleNeedsLayout = true;
  updateCaption(); setPlayLabel();
  applyState(i, S.t);
  renderer.render(scene, camera);
  return state();
}
function freeze(on) {
  S.frozen = !!on;
  if (on) S.playing = false;
  setPlayLabel();
  if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
  return state();
}
function resume() {
  S.frozen = false; S.playing = true;
  setPlayLabel();
  if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
  return state();
}
function state() {
  const vis = [];
  for (const [name, list] of Object.entries(S.variants)) {
    if (list.some(({group, meshes}) => group.visible && meshes.some(m => m.visible))) vis.push(name);
  }
  return {
    ready: S.ready, chapter: S.chapter, t: +S.t.toFixed(3),
    shot: S.shot,
    soundEnabled: sound.enabled,
    frozen: S.frozen, playing: S.playing, chapterCount: CH.length,
    storyDuration,
    chapterId: CH[S.chapter].id, titles: CH.map((c) => c.title), visible: vis,
    actions: { doorAngle: S.doorAngle, laptopMode: S.laptopMode,
      timeSuper: timeSuper.style.visibility === 'visible', roomLight: S.roomLight?.intensity ?? 0 },
    dialogue: dialogueAt(S.chapter, S.t),
    bubbleLayout: S.bubbleLayout ? { ...S.bubbleLayout, anchor: { ...S.bubbleLayout.anchor } } : null,
    listenerReactionLayout: S.listenerReactionLayout ? { ...S.listenerReactionLayout,
      anchor: { ...S.listenerReactionLayout.anchor } } : null,
    bubbleUpdateCount: S.bubbleUpdateCount, filmCard: S.filmCard,
    frame: renderer.info.render.frame, reducedMotion: reduced, assetWarnings: S.assetWarnings,
  };
}

/* ---------- init ---------- */
async function init() {
  const [balcony, props, gf, gcare, pareshM, anshitaM, stage] = await Promise.all([
    loadModel('balcony.bbmodel'), loadModel('props.bbmodel'),
    loadModel('garden-flowers.bbmodel'), loadModel('garden-care.bbmodel'),
    loadModel('paresh.bbmodel'), loadModel('anshita.bbmodel'), loadModel('taller-stage.bbmodel'),
  ]);
  world.add(balcony.scene);
  placeProps(props);
  placeFlowers(gf);
  placeCare(gcare);
  placeStage(stage);

  // three pots, each a full care + classic variant set
  const [care0, care1, care2, class0, class1, class2] = await Promise.all([
    loadModel('sunflower-care.bbmodel'), loadModel('sunflower-care.bbmodel'), loadModel('sunflower-care.bbmodel'),
    loadModel('sunflower.bbmodel'), loadModel('sunflower.bbmodel'), loadModel('sunflower.bbmodel'),
  ]);
  placePlant(care0, class0, POT_X[0], POT_Z, 0);
  placePlant(care1, class1, POT_X[1], POT_Z, 1);
  placePlant(care2, class2, POT_X[2], POT_Z, 2);

  // three bees from the care asset (replaces procedural bees)
  const beeLoads = await Promise.all([
    loadModel('garden-care.bbmodel'), loadModel('garden-care.bbmodel'), loadModel('garden-care.bbmodel'),
  ]);
  beeLoads.forEach((m, i) => addBee(m, i));
  const seedLoads = await Promise.all([loadModel('garden-care.bbmodel'), loadModel('garden-care.bbmodel')]);
  seedLoads.forEach((m, i) => addSeeds(m, i === 0 ? 0 : 2));

  // characters + authored rig
  S.paresh = pareshM.scene; S.paresh.position.set(PA_BASE[0], 0, PA_BASE[2]); S.paresh.rotation.y = 0.4; world.add(S.paresh);
  S.anshita = anshitaM.scene; S.anshita.position.set(AN_BASE[0], 0, AN_BASE[2]); S.anshita.rotation.y = -0.4; world.add(S.anshita);
  const B = (root, n) => root.getObjectByName(n);
  S.rig = {
    pArmL: B(S.paresh, 'arm_L'), pArmR: B(S.paresh, 'arm_R'), pHead: B(S.paresh, 'head'),
    aArmL: B(S.anshita, 'arm_L'), aArmR: B(S.anshita, 'arm_R'), aHead: B(S.anshita, 'head'),
    pBody: B(S.paresh, 'torso'), aBody: B(S.anshita, 'torso'),
    pHipL: B(S.paresh, 'leg_L'), pHipR: B(S.paresh, 'leg_R'),
    pKneeL: B(S.paresh, 'knee_L'), pKneeR: B(S.paresh, 'knee_R'),
    pFootL: B(S.paresh, 'foot_L__pivot'), pFootR: B(S.paresh, 'foot_R__pivot'),
    aHipL: B(S.anshita, 'leg_L'), aHipR: B(S.anshita, 'leg_R'),
    aKneeL: B(S.anshita, 'knee_L'), aKneeR: B(S.anshita, 'knee_R'),
    aFootL: B(S.anshita, 'foot_L__pivot'), aFootR: B(S.anshita, 'foot_R__pivot'),
  };
  const requiredRig = ['pArmL','pArmR','pHead','pBody','pHipL','pHipR','pKneeL','pKneeR','pFootL','pFootR',
    'aArmL','aArmR','aHead','aBody','aHipL','aHipR','aKneeL','aKneeR','aFootL','aFootR'];
  const missingRig = requiredRig.filter((key) => !S.rig[key]);
  if (missingRig.length) throw new Error(`Character exports are missing authored rig groups: ${missingRig.join(', ')}`);
  const transformSnapshot = (node) => Object.freeze({
    position: Object.freeze(node.position.toArray()),
    rotation: Object.freeze([node.rotation.x, node.rotation.y, node.rotation.z, node.rotation.order]),
  });
  const headAnchor = (character, head) => {
    character.updateWorldMatrix(true, true);
    head.getWorldPosition(_headAnchorPoint);
    character.worldToLocal(_headAnchorPoint);
    return Object.freeze(_headAnchorPoint.toArray());
  };
  S.rig.base = Object.freeze({
    pBody: transformSnapshot(S.rig.pBody), aBody: transformSnapshot(S.rig.aBody),
    pArmL: transformSnapshot(S.rig.pArmL), pArmR: transformSnapshot(S.rig.pArmR),
    aArmL: transformSnapshot(S.rig.aArmL), aArmR: transformSnapshot(S.rig.aArmR),
    pHead: transformSnapshot(S.rig.pHead), aHead: transformSnapshot(S.rig.aHead),
    pHipL: transformSnapshot(S.rig.pHipL), pHipR: transformSnapshot(S.rig.pHipR),
    aHipL: transformSnapshot(S.rig.aHipL), aHipR: transformSnapshot(S.rig.aHipR),
    pKneeL: transformSnapshot(S.rig.pKneeL), pKneeR: transformSnapshot(S.rig.pKneeR),
    aKneeL: transformSnapshot(S.rig.aKneeL), aKneeR: transformSnapshot(S.rig.aKneeR),
    pFootL: transformSnapshot(S.rig.pFootL), pFootR: transformSnapshot(S.rig.pFootR),
    aFootL: transformSnapshot(S.rig.aFootL), aFootR: transformSnapshot(S.rig.aFootR),
    pHeadAnchor: headAnchor(S.paresh, S.rig.pHead), aHeadAnchor: headAnchor(S.anshita, S.rig.aHead),
  });
  // Focused, reusable performance module. It captures the authored rig base
  // transforms here, before any frame pose, and owns legs/root/contact solving.
  const performerFor = (character, prefix, name) => createPerformer({
    character, groundY: DECK_TOP, name,
    joints: {
      torso: S.rig[prefix + 'Body'], head: S.rig[prefix + 'Head'],
      armL: S.rig[prefix + 'ArmL'], armR: S.rig[prefix + 'ArmR'],
      legL: { hip: S.rig[prefix + 'HipL'], knee: S.rig[prefix + 'KneeL'], foot: S.rig[prefix + 'FootL'] },
      legR: { hip: S.rig[prefix + 'HipR'], knee: S.rig[prefix + 'KneeR'], foot: S.rig[prefix + 'FootR'] },
    },
  });
  S.performers = {
    paresh: performerFor(S.paresh, 'p', 'Paresh'),
    anshita: performerFor(S.anshita, 'a', 'Anshita'),
  };
  S.joyPlans = {
    paresh: S.performers.paresh.planGait({
      start: { x: JOY_MARKS.paresh.startX, z: JOY_MARKS.paresh.z },
      end: { x: JOY_MARKS.paresh.endX, z: JOY_MARKS.paresh.z },
      startTime: JOY_APPROACH.start, endTime: JOY_APPROACH.end,
      steps: JOY_APPROACH.steps, lift: JOY_APPROACH.lift, yaw: JOY_MARKS.paresh.yaw,
    }),
    anshita: S.performers.anshita.planGait({
      start: { x: JOY_MARKS.anshita.startX, z: JOY_MARKS.anshita.z },
      end: { x: JOY_MARKS.anshita.endX, z: JOY_MARKS.anshita.z },
      startTime: JOY_APPROACH.start, endTime: JOY_APPROACH.end,
      steps: JOY_APPROACH.steps, lift: JOY_APPROACH.lift, yaw: JOY_MARKS.anshita.yaw,
    }),
  };
  S.entryPlans = buildEntryPlans();
  // Preserve authored personal accessories in the exports, but free their hands
  // for garden actions; no replacement character geometry is constructed here.
  S.laptop = B(S.paresh, 'laptop');
  S.laptopScreen = B(S.paresh, 'laptop_screen__pivot');
  S.laptopKeyboard = B(S.paresh, 'keyboard__pivot');
  if (S.laptop) S.laptopHome = { position: S.laptop.position.clone(), rotation: S.laptop.rotation.clone() };
  S.coffee = B(S.anshita, 'items_coffee');
  S.carry = B(S.anshita, 'items_carry');
  // Attachment pivots keep their authored per-export names; resolve them once.
  S.handPivots = {
    pareshSmoothR: B(S.paresh, 'hand_R_smooth__pivot'),
    anshitaMeshR: B(S.anshita, 'hand_R_mesh__pivot'),
  };
  setGroupVisible(S.paresh, S.laptop, false);
  setGroupVisible(S.anshita, S.coffee, false);
  setGroupVisible(S.anshita, S.carry, false);

  S.rain = makeRain();

  presentation.mount();
  REDUCED.addEventListener?.('change', (e) => {
    reduced = e.matches;
    if (reduced) S.playing = false;
    setPlayLabel();
    if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
  });

  updateCaption();
  setPlayLabel();
  applyState(0, 0);
  renderer.render(scene, camera);

  S.ready = true;
  window.__garden.ready = true;
  document.getElementById('loading').classList.add('done');
  loopId = requestAnimationFrame(tick);
}

addEventListener('beforeunload', () => {
  presentation.dispose();
  sound.dispose();
  cancelAnimationFrame(loopId);
  for (const m of S.models) { m.dispose(); m.skeleton.dispose(); }
  if (S.rain) { S.rain.geometry.dispose(); S.rain.material.dispose(); }
  sunLight.shadow.dispose();
  renderer.dispose();
  THREE.Cache.clear();
});

init().catch((e) => {
  const loading = document.getElementById('loading');
  loading.textContent = `Unable to load the garden: ${(e && e.message) || e}`;
  loading.setAttribute('role', 'alert');
  loading.classList.remove('done');
  console.error(e);
});
