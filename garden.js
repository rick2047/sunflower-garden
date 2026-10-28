import * as THREE from 'three';
import { BBModelLoader } from './vendor/BBModelLoader.js';
import { directShot, lightFor } from './film-direction.js';
import { Soundscape } from './soundscape.js';

/* Taller Than Us — a short film about one summer, told through a balcony garden.
   The garden is visual subtext; the relationship lives in their imagined dialogue. */
const line = (speaker, emotion, text, pauseAfter = 0) => ({ speaker, emotion, text, pauseAfter });
const reactionFor = {
  '🙂': '🤭', '😏': '😳', '😄': '🥹', '🤭': '😏', '😳': '😏',
  '😤': '😤', '😔': '😶', '😶': '😔', '🥲': '🥹', '🥹': '🥲',
};

function paceDialogue(lines, duration, sceneId) {
  // Editorial entrances/exits leave room for looks and physical actions.
  const editorial = {
    'weather-report': [[3,5.6],[7,9],[11,13.5],[16,18],[21,23.8]],
    'weather-turns': [[3,6],[8,10],[13,16]],
    storm: [[2,3.6],[3.9,5.5],[7,8.8],[10,12.2],[15,17]],
    'morning-after': [[3,5],[7,9],[12,14],[18,20],[23,25],[28,30.5]],
    'seven-am': [[2,4],[5,7],[11,13],[15,17],[21,23],[25,27]],
    measure: [[2,4],[5,7],[8,10],[11,13],[16,18],[19,21],[24,26],[27,29]],
    summer: [[2,3.8],[4,5.8],[7,9],[10,12],[14,16],[17,19],[20,22],[23,25],[27,29.2]],
  }[sceneId];
  const opening = sceneId === 'dawn' ? 2.15 : sceneId === 'good-things' ? 16 : 1.15;
  const gap = sceneId === 'summer' ? 0.22 : 0.78;
  const closing = {
    dawn: 8, sowing: 7, days: 6, 'good-things': 2.2, 'weather-report': 8,
    'weather-turns': 9, storm: 11, 'morning-after': 4, 'seven-am': 8,
    measure: 2, bloom: 2, summer: 6,
  }[sceneId] ?? 5;
  const weight = (entry) => Math.max(1.65, entry.text.trim().split(/\s+/).length / 3.4 + 0.3);
  const total = lines.reduce((sum, entry) => sum + weight(entry), 0);
  const pauses = lines.reduce((sum, entry) => sum + entry.pauseAfter, 0);
  const room = Math.max(1, duration - opening - closing - gap * Math.max(0, lines.length - 1) - pauses);
  const pace = Math.min(1, room / total);
  let at = opening;
  const dialogue = lines.map((entry, index) => {
    const next = lines[index + 1];
    const listener = entry.speaker === 'Paresh' ? 'Anshita' : 'Paresh';
    const listenerEmotion = next && next.speaker === listener ? next.emotion : reactionFor[entry.emotion];
    const span = weight(entry) * pace;
    const scheduled = { ...entry, start: editorial?.[index]?.[0] ?? at,
      end: editorial?.[index]?.[1] ?? at + span, listener,
      reaction: listenerEmotion || '🙂' };
    at += span + gap + entry.pauseAfter;
    return scheduled;
  });
  return dialogue;
}

const rawScenes = [
  { id:'dawn', title:'Scene 1 · Dawn', dur:35, lines:[
    line('Paresh','🙂','Are they awake?'),
    line('Anshita','😏',"Only if we're worth opening up for."),
    line('Paresh','😄',"It's early. Give us a chance."),
    line('Anshita','🤭','Tell them yourself.',2.2),
    line('Paresh','😄','I brought an idea.'),
    line('Anshita','😏','You brought a packet.'),
    line('Paresh','🙂','Ideas come in packets now.'),
  ], sky:0x9fc7e8,sun:1.1,sunCol:0xfff2d8,rain:false,mood:'morning',tulip:'green',grow:null,seeds:false,bees:false,action:'invite',cam:[0,20,66],look:[-6,9,2] },

  { id:'sowing', title:'Scene 2 · Morning, continuous', dur:35, lines:[
    line('Paresh','🙂','Two centimetres.'), line('Anshita','😏','Is that deep enough?'),
    line('Paresh','🙂','The packet says two.'), line('Anshita','😏',"The packet doesn't know us."),
    line('Paresh','🤭','A little deeper, then.',2.5),
    line('Anshita','🥲',"This corner's ours now."), line('Paresh','😏','The neighbours will contest it.'),
    line('Anshita','🙂','Let them come and water it.'),
  ], sky:0xa8d8f0,sun:1.25,sunCol:0xfff6e0,rain:false,mood:'morning',tulip:'green',grow:'sprout',seeds:true,bees:false,action:'sow',cam:[0,17,58],look:[0,7,6] },

  { id:'days', title:'Scene 3 · Days, time-lapse', dur:40,
    cues:{ petuniaBloomStart:10, petuniaBloomEnd:15 }, lines:[
    line('Paresh','😄',"It's up! Anshita, it's up."), line('Anshita','🙂',"It's a green line."),
    line('Paresh','😏',"It's a very confident green line."), line('Anshita','😏','Taller than the can by Sunday?'),
    line('Paresh','🙂','Give it a week.',1.8), line('Anshita','😳','Paresh. The petunias did a thing.'),
    line('Paresh','😄','Did they ask permission?'), line('Anshita','🙂',"They didn't."),
    line('Paresh','🤭','Good. Neither did we.'),
  ], sky:0x7ec8f5,sun:1.4,sunCol:0xffffff,rain:false,mood:'noon',tulip:'green',petunia:true,grow:'small',bees:true,action:'time_lapse',cam:[8,16,62],look:[6,9,2] },

  { id:'good-things', title:'Scene 4 · Dusk', dur:40,
    cues:{ tulipBloomStart:2.5, tulipBloomEnd:7, mograBloomStart:16, mograBloomEnd:21 }, lines:[
    line('Paresh','🥲','Smell that.'), line('Anshita','😶',"Don't make me say it."),
    line('Paresh','🙂',"You already did."), line('Anshita','🥹',"Fine. Best smell in the building."),
    line('Paresh','😏','Better than the coffee?'), line('Anshita','😏',"Don't push it."),
    line('Anshita','🥲',"Let's remember this."), line('Paresh','🙂','I will.'),
  ], sky:0x8fd0f6,sun:1.45,sunCol:0xffffff,rain:false,mood:'gold',tulip:'bloom',petunia:true,mogra:true,grow:'small',bees:true,action:'sit_together',cam:[-8,16,62],look:[-6,9,2] },

  { id:'weather-report', title:'Scene 5 · Morning', dur:30, lines:[
    line('Anshita','😔',"You said you'd help."), line('Paresh','🙂',"I'm here."),
    line('Anshita','😶','Then look at me.'), line('Paresh','😔','Just a minute.'),
    line('Anshita','😔',"You said that before."),
  ], sky:0xa8cfeb,sun:1.2,sunCol:0xfff0d2,rain:false,mood:'afternoon',tulip:'faded',petunia:true,mogra:true,grow:'small',bees:true,action:'distance',cam:[0,19,68],look:[0,10,0] },

  { id:'weather-turns', title:'Scene 6 · Afternoon', dur:25, lines:[
    line('Anshita','🙂','The petunias are dancing.'),
    line('Paresh','😤',"They don't know what's coming."),
    line('Anshita','😏','Then let them dance a minute.'),
  ], sky:0x64778b,sun:0.55,sunCol:0xc4d1df,rain:false,mood:'storm',tulip:'faded',petunia:true,mogra:true,grow:'small',bees:false,action:'windup',cam:[0,20,62],look:[0,10,2] },

  { id:'storm', title:'Scene 7 · Storm', dur:35, lines:[
    line('Paresh','😤','Hold this!'), line('Anshita','😤',"I am!"),
    line('Paresh','😤',"It's slipping."), line('Anshita','😔',"Don't let go."),
    line('Paresh','😔','I need the tape.'),
  ], sky:0x3a4a5e,sun:0.35,sunCol:0x9fb4cc,rain:true,mood:'storm',tulip:'faded',petunia:true,mogra:true,grow:'broken',bees:false,action:'storm',cam:[0,21,60],look:[0,9,2] },

  { id:'morning-after', title:'Scene 8 · Morning after', dur:35, lines:[
    line('Anshita','😶','You left.'), line('Paresh','😔','For the tape.'),
    line('Anshita','😔','I needed you.'), line('Paresh','🥲','I know.'),
    line('Anshita','🥲','Then hold it with me.'), line('Paresh','🙂',"I'm here."),
  ], sky:0x9aaec0,sun:0.65,sunCol:0xe2e6e7,rain:false,mood:'dawn',tulip:'faded',petunia:true,mogra:true,grow:'broken',bees:false,action:'aftermath',cam:[0,18,58],look:[0,9,4] },

  { id:'seven-am', title:'Scene 9 · Seven a.m., days later', dur:35, lines:[
    line('Paresh','🙂','Not too tight.'), line('Anshita','🙂',"I know. Gently."),
    line('Paresh','😔',"Still bent."), line('Anshita','🙂',"Still growing."),
    line('Paresh','🥲','Tomorrow?'), line('Anshita','🙂','Seven. Bring the tape.'),
  ], sky:0x86c2ee,sun:1.1,sunCol:0xfff4dd,rain:false,mood:'morning',tulip:null,petunia:true,mogra:true,grow:'repair',bees:false,action:'repair',cam:[0,15,52],look:[0,8,4] },

  { id:'measure', title:'Scene 10 · Morning', dur:30, lines:[
    line('Paresh','😄','Back to back. Measure us.'), line('Anshita','😏',"We'll need a ladder."),
    line('Paresh','🙂',"We'll need a witness."), line('Anshita','😏',"The sun saw everything."),
    line('Paresh','🙂','Taller than the railing.'), line('Anshita','🙂','Taller than the door.',3.6),
    line('Paresh','🥹','...Taller than us.'), line('Anshita','🥹','Taller than us.'),
  ], sky:0x7ec8f5,sun:1.5,sunCol:0xffffff,rain:false,mood:'noon',tulip:null,petunia:true,mogra:true,grow:'tall',bees:true,action:'measure',cam:[0,27,86],look:[0,20,0] },

  { id:'bloom', title:'Scene 11 · Noon', dur:25, lines:[
    line('Anshita','😄',"It's doing it."), line('Paresh','🥹','I know.'),
    line('Anshita','😏',"Don't cry on the sunflower."), line('Paresh','😏',"I'm not crying. It's pollen."),
    line('Anshita','🙂','Look. The bees are voting.'), line('Paresh','🙂','On what?'),
    line('Anshita','🥹',"Whether we're worth opening up for."), line('Paresh','🥹','Looks like yes.'),
  ], sky:0xf5b85e,sun:1.4,sunCol:0xffd9a0,rain:false,mood:'gold',tulip:null,petunia:true,mogra:true,grow:'bloom',bees:true,action:'joy',cam:[0,28,88],look:[0,22,0] },

  { id:'summer', title:'Scene 12 · Dusk', dur:34, lines:[
    line('Paresh','😏','Zero tomatoes.'), line('Anshita','😏','Zero capsicum.'),
    line('Paresh','🤭','Next year?'), line('Anshita','🙂','Same corner. You and me.'),
    line('Paresh','🥲','One more minute?'),
    line('Anshita','🥲','One more minute.'), line('Paresh','😏','Okay. Two.'),
    line('Anshita','🥲',"I'd live this summer again."),
    line('Paresh','🥲','Especially the part with you.'),
  ], sky:0xe9a765,sun:1.2,sunCol:0xffd9a0,rain:false,mood:'gold',tulip:null,petunia:true,mogra:true,tomato:true,capsicum:true,grow:'bloom',bees:true,action:'ending',cam:[0,23,80],look:[0,13,-2] },
];

// The supplied scene spans total 6:30; the explicitly requested final line adds
// nine seconds to Scene 12 so its short turns and ending silence remain readable.
const CH = rawScenes.map((scene) => ({ ...scene, visualDur: scene.visualDur ||
  ({dawn:12,sowing:14,days:12,'good-things':12,'weather-report':12,'weather-turns':14,
    storm:16,'morning-after':16,'seven-am':16,measure:14,bloom:18,summer:16}[scene.id]),
  dialogue: paceDialogue(scene.lines, scene.dur, scene.id) }));
const storyDuration = CH.reduce((sum, chapter) => sum + chapter.dur, 0);

function capturesFor(chapter) {
  const captures = { openingQuiet: chapter.dialogue[0].start / 2 };
  chapter.dialogue.forEach((entry, index) => {
    captures[`turn${index + 1}`] = (entry.start + entry.end) / 2;
    const next = chapter.dialogue[index + 1];
    captures[`quietAfter${index + 1}`] = next
      ? (entry.end + next.start) / 2
      : (entry.end + chapter.dur) / 2;
  });
  return captures;
}

/* ---------- layout (world units: character ≈ 30 tall, balcony 60×40) ---------- */
const POT_X = [-13, 0, 13], POT_Z = -1;
// Authored deck surface: the props rig sits at y=4 and the authored pot/tile
// geometry adds ~0.15. Kneeling derives its root drop from this plus the real
// knee pivots, so both character exports land on the deck without guessing.
const DECK_TOP = 4.15;
const SPOTS = {
  tulip: [-26, 4, 20], petunia: [0, 4, 18], mogra: [26, 4, 20],
  tomato: [-9, 4, 13], capsicum: [9, 4, 13],
  seed_packet: [5, 4, 12], seeds: [0, 12, POT_Z], tape: [9, 4, 7], support: [-7, 4, 9],
};
const PA_BASE = [-20, 0, -6], AN_BASE = [20, 0, -6];

/* Scene-2: keep the authored pot row intact while the kneeling pair travels
   first → second → third. The action times are anchored to the corresponding
   dialogue turns so seeking and replay produce the same handoff. */
const SOW_ACTOR_OFFSET_X = 11.5, SOW_FIRST_ANSHITA_X = -10;
const SOW_ACTOR_Z = 7, SOW_SOIL_Z = 3.8;
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
  // Elliptical cuts between pots instead of sliding kneeling bodies along tiles.
  const moveToSecond = Number(storyT >= (lines[2]?.start ?? 7));
  const moveToThird = Number(storyT >= (lines[4]?.start ?? 14));
  const firstSecondX = lerp(POT_X[0], POT_X[1], moveToSecond);
  const focusX = lerp(firstSecondX, POT_X[2], moveToThird);
  const firstSecondAnshitaX = lerp(SOW_FIRST_ANSHITA_X, POT_X[1] + SOW_ACTOR_OFFSET_X, moveToSecond);
  return {
    focusX, soilY: lerp(lerp(potSoilY[0], potSoilY[1], moveToSecond), potSoilY[2], moveToThird),
    anshitaX: lerp(firstSecondAnshitaX, POT_X[2] + SOW_ACTOR_OFFSET_X, moveToThird),
    sown: [true, storyT >= (lines[3]?.end ?? 10), storyT >= (lines[4]?.end ?? 13)],
    share: smooth((storyT - (lines[5]?.start ?? 17)) / 0.7),
  };
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
  models: [], assetWarnings: [], bubbleLayout: {}, bubbleUpdateCount: 0, filmCard: null,
};

window.__garden = {
  THREE, scene, camera, renderer, world, S,
  ready: false,
  storyDuration,
  chapters: CH.map((c) => ({ id: c.id, title: c.title, duration: c.dur,
    visualDuration: c.visualDur, dialogue: c.dialogue.map(line => ({ ...line })),
    captures: capturesFor(c), cues: c.cues || null,
     endCardStart: c.id === 'summer' ? c.dur - 4.4 : null,
     endCardTitleStart: c.id === 'summer' ? c.dur - 3.2 : null })),
  goto: (i) => enterChapter(i),
  seek, freeze, resume, state, dialogue: () => dialogueAt(S.chapter, S.t), continue: continueStory,
};

function enterChapter(i) {
  S.chapter = ((i % CH.length) + CH.length) % CH.length;
  S.t = 0;
  updateCaption();
  if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
}

/* ---------- deterministic camera framing (adapts to viewport) ---------- */
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
});

/* ---------- UI ---------- */
const h1 = document.querySelector('#caption h1');
const announcement = document.getElementById('announcement');
const counterEl = document.getElementById('counter');
const barEl = document.getElementById('bar');
const filmCard = document.getElementById('film-card');
const filmCardContent = document.getElementById('film-card-content');
const filmCardTitle = document.getElementById('film-card-title');
const filmCardSubtitle = document.getElementById('film-card-subtitle');
const timeSuper = document.getElementById('time-super');
const dotsWrap = document.getElementById('dots');
const playBtn = document.getElementById('play');
const subtitles = document.getElementById('subtitles');
const subtitleSpeaker = document.getElementById('subtitle-speaker');
const subtitleText = document.getElementById('subtitle-text');
const sound = new Soundscape();
const soundBtn = document.getElementById('sound');
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
let chromeTimer;
function revealControls() {
  document.body.classList.remove('cinema');
  clearTimeout(chromeTimer);
  if (S.playing && !S.frozen) chromeTimer = setTimeout(() => document.body.classList.add('cinema'), 2600);
}
addEventListener('pointermove', revealControls);
addEventListener('pointerdown', revealControls);
addEventListener('keydown', revealControls);
document.addEventListener('focusin', revealControls);
const speechBubbles = {
  Paresh: document.getElementById('bubble-paresh'),
  Anshita: document.getElementById('bubble-anshita'),
};
const reactionBubbles = {
  Paresh: document.getElementById('reaction-paresh'),
  Anshita: document.getElementById('reaction-anshita'),
};
const dots = [];
let captionChapter = -1, dialogueKey = '';

function dialogueAt(ch, seconds) {
  const c = CH[ch];
  const index = c.dialogue.findIndex(line => seconds >= line.start && seconds < line.end);
  const line = c.dialogue[index];
  let quietAfter = null, nextTurn = null;
  if (!line) {
    for (let i = 0; i < c.dialogue.length; i++) {
      if (c.dialogue[i].end <= seconds) quietAfter = i;
      if (nextTurn === null && c.dialogue[i].start > seconds) nextTurn = i;
    }
  }
  return { chapter: ch, index, phase: line ? 'line' : 'quiet',
    speaker: line?.speaker || null, text: line?.text || '', listener: line?.listener || null,
    reaction: line?.reaction || null, emotion: line?.emotion || null,
    start: line?.start ?? null, end: line?.end ?? null,
    quiet: !line, quietAfter, nextTurn,
    turnCount: c.dialogue.length };
}

function updateDialogue() {
  const d = dialogueAt(S.chapter, S.t);
  const key = `${S.chapter}:${d.index}:${d.text}:${d.reaction}`;
  if (key === dialogueKey) return; // No DOM/live-region writes every frame.
  dialogueKey = key;
  subtitleSpeaker.textContent = d.speaker || '';
  subtitleText.textContent = d.text;
  subtitles.classList.toggle('visible', d.phase === 'line');
  for (const name of ['Paresh','Anshita']) {
    const bubble = speechBubbles[name], reaction = reactionBubbles[name];
    const speaking = d.phase === 'line' && d.speaker === name;
    const reacting = d.phase === 'line' && d.listener === name;
    bubble.querySelector('.bubble-text').textContent = speaking ? d.text : '';
    bubble.classList.toggle('visible', speaking);
    reaction.textContent = reacting ? d.reaction : '';
    reaction.classList.toggle('visible', reacting);
  }
  // Announce spoken text once; the decorative listener reaction is aria-hidden.
  announcement.textContent = d.phase === 'line' ? `${d.speaker}: ${d.text}` : '';
}

const _bubblePoint = new THREE.Vector3();
const _bubbleWorldPoint = new THREE.Vector3();
function projectHead(character, name) {
  if (!character) return null;
  camera.updateMatrixWorld(true);
  character.updateWorldMatrix(true, true);
  const key = name === 'Paresh' ? 'p' : 'a';
  const anchor = S.rig?.base?.[`${key}HeadAnchor`];
  const body = S.rig?.[`${key}Body`];
  const bodyBase = S.rig?.base?.[`${key}Body`];
  if (anchor && body && bodyBase) {
    // Project the authored head pivot in character-root space, compensating
    // only for the torso's deliberate kneel drop. Head nods/yaw do not drag UI.
    _bubblePoint.fromArray(anchor);
    _bubblePoint.y += body.position.y - bodyBase.position[1];
    character.localToWorld(_bubblePoint);
  } else {
    const head = character.getObjectByName('head');
    if (head) head.getWorldPosition(_bubblePoint);
    else _bubblePoint.set(character.position.x, character.position.y + 28, character.position.z);
  }
  _bubblePoint.y += 4;
  _bubblePoint.project(camera);
  if (_bubblePoint.z < -1 || _bubblePoint.z > 1 || Math.abs(_bubblePoint.x) > 1.08 || Math.abs(_bubblePoint.y) > 1.08) return null;
  return { x: (_bubblePoint.x * 0.5 + 0.5) * innerWidth,
    y: (-_bubblePoint.y * 0.5 + 0.5) * innerHeight };
}

function projectWorldPoint(point) {
  _bubbleWorldPoint.copy(point).project(camera);
  if (_bubbleWorldPoint.z < -1 || _bubbleWorldPoint.z > 1 ||
      Math.abs(_bubbleWorldPoint.x) > 1.12 || Math.abs(_bubbleWorldPoint.y) > 1.12) return null;
  return { x: (_bubbleWorldPoint.x * 0.5 + 0.5) * innerWidth,
    y: (-_bubbleWorldPoint.y * 0.5 + 0.5) * innerHeight };
}

function screenRectAround(point, halfWidth, halfHeight) {
  return { left: point.x - halfWidth, right: point.x + halfWidth,
    top: point.y - halfHeight, bottom: point.y + halfHeight };
}

function rectanglesOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function rectOverlapArea(a, b) {
  if (!rectanglesOverlap(a, b)) return 0;
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
}

function getBubbleObstacles() {
  const obstacles = [];
  const addDOM = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return;
    const style = getComputedStyle(element), r = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || r.width < 1 || r.height < 1) return;
    obstacles.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  };
  for (const selector of ['#title', '#counter', '#story-notes', '#caption', '#time-super', '#ui', '#dots', '#film-card']) addDOM(selector);

  for (const [name, character] of [['Paresh', S.paresh], ['Anshita', S.anshita]]) {
    const head = projectHead(character, name);
    if (head) obstacles.push(screenRectAround(head, innerWidth <= 620 ? 34 : 42, innerWidth <= 620 ? 31 : 38));
    character?.updateWorldMatrix(true, true);
    character?.traverse((node) => {
      if (!node.isBone || !node.name.startsWith('hand_') || !node.name.endsWith('__pivot')) return;
      node.getWorldPosition(_bubbleWorldPoint);
      const hand = projectWorldPoint(_bubbleWorldPoint);
      if (hand) obstacles.push(screenRectAround(hand, innerWidth <= 620 ? 18 : 22, innerWidth <= 620 ? 19 : 23));
    });
  }

  // Protect visible plant/action silhouettes as well as the characters. These
  // projected rectangles are only placement constraints; bubble tests below
  // use the browser's actual DOMClientRect geometry.
  for (const [name, variants] of Object.entries(S.variants)) {
    if (!/tulip|petunia|mogra|stage_|seed_packet|tape|support/.test(name)) continue;
    for (const { group } of variants) {
      if (!group?.visible) continue;
      group.getWorldPosition(_bubbleWorldPoint);
      _bubbleWorldPoint.y += /stage_/.test(name) ? 10 : /mogra/.test(name) ? 12 : 8;
      const point = projectWorldPoint(_bubbleWorldPoint);
      if (point) obstacles.push(screenRectAround(point, innerWidth <= 620 ? 19 : 25, innerWidth <= 620 ? 24 : 31));
    }
  }
  return obstacles;
}

function placeSpeechBubbles() {
  S.bubbleUpdateCount++;
  S.bubbleLayout = {};
  if (!S.paresh || !S.anshita) return;
  const d = dialogueAt(S.chapter, S.t);
  // Never expose a previous speaker/listener's inline coordinates. A line
  // boundary can switch the listener to the other character; keep every bubble
  // hidden until its new projected position has been written.
  for (const name of ['Paresh','Anshita']) {
    const speaking = d.phase === 'line' && d.speaker === name;
    const reacting = d.phase === 'line' && d.listener === name;
    const speech = speechBubbles[name], reaction = reactionBubbles[name];
    speech.style.visibility = 'hidden';
    reaction.style.visibility = 'hidden';
    if (!speaking) { speech.style.left = ''; speech.style.top = ''; }
    if (!reacting) { reaction.style.left = ''; reaction.style.top = ''; }
    reaction.style.opacity = '0';
  }
  if (d.phase !== 'line') {
    return;
  }
  const chars = { Paresh: S.paresh, Anshita: S.anshita };
  const placed = [];
  const obstacles = getBubbleObstacles();
  const bottomSafe = innerWidth <= 620 ? 126 : 104;
  const topSafe = Math.max(64, innerWidth <= 620 ? 68 : 54);
  // Place the listener reaction first at a fixed identity-side offset from its
  // stable root/head projection. The speaker's candidate layout then avoids it;
  // the emoji itself never hops between obstacle-selected positions.
  for (const name of [d.listener, d.speaker]) {
    const speaking = d.speaker === name;
    const reacting = d.listener === name;
    const point = projectHead(chars[name], name);
    const el = speaking ? speechBubbles[name] : reactionBubbles[name];
    if (!point) { el.style.left = ''; el.style.top = ''; continue; }
    const measured = el.getBoundingClientRect();
    const width = measured.width || (speaking ? 240 : 42);
    const height = measured.height || (speaking ? 82 : 42);
    if (reacting) {
      const side = name === 'Paresh' ? -1 : 1;
      const x = clamp(point.x + side * (innerWidth <= 620 ? 42 : 48),
        width * 0.5 + 8, innerWidth - width * 0.5 - 8);
      const y = clamp(point.y - (innerWidth <= 620 ? 36 : 40),
        height + topSafe, innerHeight - bottomSafe);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.visibility = 'visible';
      const age = Math.max(0, S.t - d.start);
      // A new listener fades in at its own anchor after the quiet/boundary
      // change. This is story-time-derived (seek/replay safe), not CSS motion.
      el.style.opacity = String(reduced ? 1 : smooth((age - 0.06) / 0.24));
      const actual = el.getBoundingClientRect();
      const rect = { left: actual.left, right: actual.right, top: actual.top, bottom: actual.bottom };
      placed.push(rect);
      S.bubbleLayout[name] = { role: 'listener', element: el.id,
        anchor: { ...point }, x, y, width: actual.width, height: actual.height, rect,
        speaker: d.speaker, listener: d.listener, chapter: S.chapter, time: S.t };
      continue;
    }
    const outward = point.x < innerWidth / 2 ? -1 : 1;
    const shift = Math.max(speaking ? 42 : 26, Math.min(72, width * 0.2));
    const baseBottom = point.y - (speaking ? 42 : 34);
    const candidates = [
      { x: point.x + outward * shift, y: baseBottom },
      { x: point.x - outward * shift, y: baseBottom },
      { x: point.x, y: baseBottom - 45 },
      { x: point.x + outward * shift, y: baseBottom - 64 },
      { x: point.x - outward * shift, y: baseBottom - 64 },
      { x: point.x, y: baseBottom - 92 },
      { x: point.x + outward * shift, y: point.y + 30 },
      { x: point.x - outward * shift, y: point.y + 30 },
    ];
    const firstX = clamp(candidates[0].x, width * 0.5 + 8, innerWidth - width * 0.5 - 8);
    const firstY = clamp(candidates[0].y, height + topSafe, innerHeight - bottomSafe);
    el.style.left = `${firstX}px`;
    el.style.top = `${firstY}px`;
    const firstRect = el.getBoundingClientRect();
    const offsetX = firstRect.left - firstX, offsetY = firstRect.top - firstY;
    let best = null;
    for (const candidate of candidates) {
      const x = clamp(candidate.x, width * 0.5 + 8, innerWidth - width * 0.5 - 8);
      const y = clamp(candidate.y, height + topSafe, innerHeight - bottomSafe);
      // The translation below comes from the actual DOMRect measured above;
      // all candidates share the same fixed bubble transform and dimensions.
      const rect = { left: x + offsetX, right: x + offsetX + width,
        top: y + offsetY, bottom: y + offsetY + height };
      let penalty = Math.hypot((rect.left + rect.right) / 2 - point.x, rect.bottom - baseBottom);
      for (const other of placed) penalty += rectOverlapArea(rect, other) * 100000 + (rectanglesOverlap(rect, other) ? 1000000 : 0);
      for (const obstacle of obstacles) penalty += rectOverlapArea(rect, obstacle) * 10000 + (rectanglesOverlap(rect, obstacle) ? 100000 : 0);
      if (best === null || penalty < best.penalty) best = { x, y, rect, penalty };
    }
    el.style.left = `${best.x}px`;
    el.style.top = `${best.y}px`;
    el.style.visibility = 'visible';
    // Fade only the reaction's opacity at the new listener anchor. This is a
    // pure function of story time, not a CSS position transition, so seek,
    // pause, replay and quiet beats remain deterministic without screen flight.
    el.style.opacity = '';
    const actual = el.getBoundingClientRect();
    const rect = { left: actual.left, right: actual.right, top: actual.top, bottom: actual.bottom };
    placed.push(rect);
    S.bubbleLayout[name] = { role: 'speaker', element: el.id,
      anchor: { ...point }, x: best.x, y: best.y, width: actual.width, height: actual.height, rect,
      speaker: d.speaker, listener: d.listener, chapter: S.chapter, time: S.t };
  }
}

function updateFilmCard(ch, seconds) {
  const chapter = CH[ch];
  const titleCard = chapter.id === 'dawn' && seconds < 2.15;
  const endingCard = chapter.id === 'summer' && seconds >= chapter.dur - 4.4;
  if (!titleCard && !endingCard) {
    filmCard.style.visibility = 'hidden';
    filmCard.style.opacity = '0';
    S.filmCard = null;
    return;
  }
  const endStart = chapter.dur - 4.4;
  const opacity = titleCard ? 1 - smooth((seconds - 0.45) / 1.7)
    : smooth((seconds - endStart) / 1.05);
  const titleOpacity = titleCard ? opacity : smooth((seconds - endStart - 1.2) / 0.45);
  filmCardTitle.textContent = 'TALLER THAN US';
  filmCardSubtitle.textContent = endingCard ? '— an imagined telling' : '';
  filmCard.style.visibility = 'visible';
  filmCard.style.opacity = String(opacity);
  filmCardContent.style.opacity = String(titleOpacity);
  S.filmCard = { kind: endingCard ? 'end' : 'title', opacity, titleOpacity };
}

function updateCaption() {
  const c = CH[S.chapter];
  if (captionChapter !== S.chapter) {
    captionChapter = S.chapter;
    h1.textContent = c.title;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === S.chapter);
      d.setAttribute('aria-selected', String(i === S.chapter));
    });
    counterEl.textContent = (S.chapter + 1) + ' / ' + CH.length;
  }
  updateDialogue();
}

function setPlayLabel() {
  const playing = S.playing && !S.frozen;
  playBtn.textContent = playing ? 'Pause' : 'Play';
  playBtn.setAttribute('aria-label', playing ? 'Pause story' : 'Play story');
  if (!playing) sound.silence();
  revealControls();
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
const _restHand = new THREE.Vector3();
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
  const localTarget = S.paresh.worldToLocal(new THREE.Vector3(...target));
  const center = LAPTOP_LOCAL_CENTER.clone().applyEuler(S.laptop.rotation);
  const destination = localTarget.sub(center);
  S.laptop.position.copy(S.laptopHome.position).lerp(destination, blend);
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

function applyState(ch, t) {
  const c = CH[ch];
  const act = c.action;
  const storyT = t;
  const sow = ch === 1 ? sowingPlan(c, storyT) : null;
  // Keep accepted physical cue times exactly (repair t2/t5/t10 etc). Once its
  // original visual beat is complete, let it rest while the dialogue breathes.
  t = Math.min(t, c.visualDur);
  const prev = CH[(ch - 1 + CH.length) % CH.length];
  const k = clamp(t / c.visualDur, 0, 1);
  const skyT = 1; // Editorial cuts include the new scene's light, not yesterday's sky.

  // Move complete authored assemblies together for the action shots.
  // Continuous entrance/exit staging, no replacement pots or plant geometry.
  // Reblocking happens at chapter cuts, never by visibly sliding the set.
  const foreground = ch >= 6 && ch <= 8 ? 1 : 0;
  for (const {bone, base} of S.potPivots || []) {
    bone.position.copy(base);
    bone.position.z += 15 * foreground;
  }
  for (const plant of S.plants) {
    plant.care.position.x = plant.classic.position.x = POT_X[plant.index];
    plant.care.position.z = plant.classic.position.z = POT_Z + 15 * foreground;
  }
  for (const name of ['tulip_green','tulip_bloom','tulip_faded','petunia_bloom','mogra_bloom','tomato_no_yield','capsicum_no_yield']) {
    const key = name.split('_')[0], spot = SPOTS[key];
    for (const {group} of S.variants[name] || []) {
      group.position.fromArray(spot);
      group.position.z -= 29 * foreground;
      group.rotation.z = reduced ? 0 : Math.sin(storyT * 1.8 + spot[0]) * (ch === 5 ? 0.055 : 0.008);
      // Background attempt foliage must not masquerade as a fallen sunflower.
      if (key === 'tomato') group.position.x -= 12 * foreground;
      if (key === 'capsicum') group.position.x += 12 * foreground;
    }
  }

  // sky + light ease from the previous beat
  _skyA.set(prev.sky); _skyB.set(c.sky);
  scene.background.copy(_skyA).lerp(_skyB, skyT);
  scene.fog.color.copy(scene.background);
  sunLight.intensity = lerp(prev.sun, c.sun, skyT);
  sunLight.color.set(prev.sunCol).lerp(_sunCol.set(c.sunCol), skyT);
  hemi.intensity = lerp(1.6, c.rain ? 0.8 : 1.6, skyT);
  const lighting = lightFor(c);
  scene.background.set(lighting.sky); scene.fog.color.copy(scene.background);
  sunLight.intensity = lighting.key; sunLight.color.set(lighting.color);
  sunLight.position.set(lighting.x, 48, lighting.z);
  hemi.intensity = lighting.hemi; fillLight.intensity = lighting.fill;
  ambientLight.intensity = lighting.ambient;

  // Camera direction is independent of the bounded physical-action clock.
  S.shot = directShot(camera, _lookCur, c, storyT, reduced, sow?.focusX);

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
  const flowersRoot = S.variants.tomato_no_yield[0].meshes[0].parent;
  for (const plant of ['tomato','capsicum']) {
    const label = flowersRoot.getObjectByName(plant + '_marker__pivot');
    // Override the parent variant's real meshes each frame: earlier attempts
    // remain leafy background plants, with nameplates revealed only at the end.
    // These are authored nameplate meshes, not screenplay props. The dialogue
    // already conveys the no-yield aside; keep the unapproved labels out of the
    // couple's faces, torsos and speech bubbles.
    setGroupVisible(flowersRoot, label, false);
    const post = flowersRoot.getObjectByName(plant + '_marker_post__pivot');
    setGroupVisible(flowersRoot, post, false);
  }
  setVis('seed_packet', !!c.seeds || (ch === 0 && storyT >= 16));
  if (act === 'sow' && c.seeds) {
    // These existing authored seed groups map to first, middle, and third
    // pots. Keep the pot row fixed and leave each placed seed behind as the
    // kneeling pair moves to the next pot.
    const seedPot = [1, 0, 2]; // group creation order: middle, first, third
    const soilY = [10.9, 11.9, 12.9];
    (S.variants.seeds || []).forEach(({group, meshes}, i) => {
      const pot = seedPot[i];
      const visible = pot !== undefined && sow.sown[pot];
      if (pot !== undefined) group.position.set(POT_X[pot], soilY[pot], POT_Z + SOW_SOIL_Z);
      group.visible = visible;
      meshes.forEach(mesh => { mesh.visible = visible; });
      group.scale.setScalar(visible ? 1.05 : 1);
    });
  } else setVis('seeds', !!c.seeds);
  setVis('tape', (ch === 6 && storyT >= 26) || (ch === 7 && (storyT < 2 || storyT >= 29)) || ch === 8);
  setVis('support', (ch === 6 && storyT >= 26) || (ch === 7 && t < 2) || (ch === 8 && t < 3));
  for (const n of ['seed_packet','tape','support']) {
    const g = S.variants[n][0].group;
    g.position.fromArray(SPOTS[n]);
  }
  // Sowing ends with seed in soil; germination belongs to the next time-lapse.
  setVis('stage_sprout', false);
  setVis('stage_small', c.grow === 'small');
  setVis('stage_broken', c.grow === 'broken' || (c.grow === 'repair' && t < 2));
  setVis('stage_repair', c.grow === 'repair' && t >= 2);
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
  const flattenedFlowers = (ch === 5 && storyT >= 18) || ch === 6 || ch === 7;
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
    for (const n of ['sprout_soil__pivot','grow_soil__pivot','bloom_soil__pivot']) setGroupVisible(p.classic, p.classic.getObjectByName(n), false);
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
    for (const [name, at] of [['repair_stake',3],['repair_tie_lo',4],['repair_tie_hi',6],['repair_tape_1',5 + p.index * 0.7],['repair_tape_2',6 + p.index * 0.7],['repair_tape_strand',6]]) {
      setGroupVisible(p.care, p.care.getObjectByName(name + '__pivot'), c.grow === 'repair' && t >= at);
    }
     if (p.flower) p.flower.scale.setScalar(ch === 10 ? lerp(0.18, 1, smooth(t / 7)) : 1);
    // Fixed camera-facing joint planes, same lower stalk/position through repair.
      p.care.rotation.z = ch >= 6 && ch <= 8 ? 0 : (p.index - 1) * 0.02 +
        (reduced ? 0 : Math.sin(storyT * 1.5 + p.index) * (ch === 5 ? 0.04 : 0.006));
    p.classic.rotation.z = reduced ? 0 : Math.sin(storyT * 1.15 + p.index) * 0.006;
  }

  // the couple: position, facing and authored rig poses
  if (S.paresh && S.anshita) {
    const actionShot = ch >= 6 && ch <= 8;
    const joyful = act === 'joy';
    const close = ['sow','repair','tend','sit_together','aftermath','ending'].includes(act);
    const joyApproach = joyful ? smooth((storyT - 15.5) / 1.6) : 0;
    // At the tall-green beat they step in front of the leafy backdrop together;
    // otherwise its authored leaves cross their faces during the conversation.
    const txP = act === 'sow' ? sow.focusX - SOW_ACTOR_OFFSET_X : act === 'aftermath' ? -8 : act === 'storm' ? 4 : actionShot ? -22 : act === 'distance' ? -24 :
      act === 'measure' ? -3 : close ? -8 : ch === 9 ? -18 : joyful ? lerp(-17, -7.5, joyApproach) : PA_BASE[0];
    const txA = act === 'sow' ? sow.anshitaX : act === 'aftermath' ? 8 : act === 'storm' ? -10 : actionShot ? 22 : act === 'distance' ? 24 :
      act === 'measure' ? 3 : close ? 8 : ch === 9 ? 18 : joyful ? lerp(17, 7.5, joyApproach) : AN_BASE[0];
    const tz = act === 'sow' ? SOW_ACTOR_Z : act === 'aftermath' ? 5 : act === 'storm' ? 8 : actionShot ? (ch === 8 ? 10 : 5) : act === 'distance' ? 2 :
      act === 'measure' ? 12.5 : close ? 5 : ch === 9 ? 8 : joyful ? 6 : PA_BASE[2];
    // Blocking is established at the cut. Do not glide in from generic bases.
    const et = 1;
    const bob = 0; // Root height stays grounded; breathing belongs to the torso.
    const pose = poseFor(act, t);
    // deterministic from the fixed bases (no frame-to-frame accumulation)
    const fromP = ch === 6 ? 4 : ch >= 7 && ch <= 9 ? -22 : PA_BASE[0];
    const fromA = ch === 6 ? -10 : ch >= 7 && ch <= 9 ? 22 : AN_BASE[0];
    const fromZ = ch === 6 ? 8 : ch === 8 ? 10 : ch === 9 ? 5 : PA_BASE[2];
    S.paresh.position.x = lerp(fromP, txP, et);
    S.paresh.position.z = lerp(fromZ, tz, et);
    S.anshita.position.x = lerp(fromA, txA, et);
    S.anshita.position.z = lerp(fromZ, tz, et);
    S.paresh.position.y = act === 'sow' || act === 'storm' || act === 'measure' ? DECK_TOP : 4 + bob * 0.5;
    S.anshita.position.y = act === 'sow' || act === 'storm' || act === 'measure' ? DECK_TOP : 4 + bob * 0.4;
    const stormReturn = ch === 6 ? Number(storyT >= 26) : 0;
    if (ch === 4) {
      const inside = 1;
      S.paresh.position.x = lerp(-24, -20, inside);
      S.paresh.position.z = lerp(2, -22, inside);
    } else if (ch === 6) {
      const leaves = Number(storyT >= 18);
      const returns = stormReturn;
      const roomX = lerp(4, -20, leaves), roomZ = lerp(8, -22, leaves);
      // Return on her side of the first pot as written; the close camera moves
      // off-axis to separate their silhouettes without moving the hand target.
      S.paresh.position.x = lerp(roomX, -3.5, returns);
      S.paresh.position.z = lerp(roomZ, 5.5, returns);
      S.anshita.position.x = -10;
      S.anshita.position.z = 8;
    }
    // Scene 10 pins the authored backs together along one axis: each actor
    // faces outward, so the pair reads as opposing back-to-back torsos while
    // the authored head bones turn far enough for both faces to stay readable.
    const faceP = act === 'measure' ? Math.PI / 2 : act === 'sow' ? Math.PI + 0.80 : close ? Math.PI + 0.3 : Math.PI + (joyful ? 0.4 : 0.15);
    const faceA = act === 'measure' ? -Math.PI / 2 : act === 'sow' ? Math.PI - 0.80 : close ? Math.PI - 0.3 : Math.PI - (joyful ? 0.4 : 0.15);
    S.paresh.rotation.y = lerp(Math.PI + 0.25, faceP, et);
    S.anshita.rotation.y = lerp(Math.PI - 0.25, faceA, et);

    const R = S.rig;
    const E = 1;
    // blend from neutral into the action pose as the beat opens
    const b = (from, to) => lerp(from, to, E);
    const lean = act === 'sow' ? -0.12 : act === 'repair' ? -0.1 : act === 'tend' ? -0.15 : 0;
    setBaseRotation(R.pBody, R.base.pBody, lean * E);
    setBaseRotation(R.aBody, R.base.aBody, lean * E);
    const returnKneel = act === 'storm' ? smooth((storyT - 26.5) / 1.5) :
      act === 'aftermath' ? smooth((storyT - 25) / 2) : 0;
    const pKneel = act === 'sow' ? E : act === 'measure' ? MEASURE_CROUCH : returnKneel;
    const aKneel = act === 'sow' ? E : 0;
    // The authored groups are parent-local: knee.position.y is a negative
    // offset below its leg group, and the foot pivots are at model-ground y=0.
    // Move hips/torso to the real knee height and fold shins back while solving
    // the foot pivot's local offset so the shoes remain on the deck.
    setGroundedKneel(R.pBody, R.base.pBody, [
      { hip:R.pHipL, knee:R.pKneeL, foot:R.pFootL, hipBase:R.base.pHipL, kneeBase:R.base.pKneeL, footBase:R.base.pFootL },
      { hip:R.pHipR, knee:R.pKneeR, foot:R.pFootR, hipBase:R.base.pHipR, kneeBase:R.base.pKneeR, footBase:R.base.pFootR },
    ], pKneel);
    setGroundedKneel(R.aBody, R.base.aBody, [
      { hip:R.aHipL, knee:R.aKneeL, foot:R.aFootL, hipBase:R.base.aHipL, kneeBase:R.base.aKneeL, footBase:R.base.aFootL },
      { hip:R.aHipR, knee:R.aKneeR, foot:R.aFootR, hipBase:R.base.aHipR, kneeBase:R.base.aKneeR, footBase:R.base.aFootR },
    ], aKneel);
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
    // Aim the original shoulder bones, not the root meshes. The rigid authored
    // hands keep their arm length; targets are the soil/joint being cared for.
    const reach = (arm, target, blend = E) => {
      if (!arm || !target || blend <= 0) return;
      arm.parent.updateWorldMatrix(true, false);
      const worldTarget = target.isVector3 ? target.clone() : new THREE.Vector3(...target);
      const direction = arm.parent.worldToLocal(worldTarget).sub(arm.position).normalize();
      const aim = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
      arm.quaternion.slerp(aim, clamp(blend, 0, 1));
    };
    if (act === 'sow') {
      // Both remain grounded as they move along the fixed pot row. The packet
      // and seed hands meet over the active soil; after the third tuck, his
      // free hand settles over hers for the closing beat.
      _sowSoilTarget.set(sow.focusX, sow.soilY + 0.15, SOW_SOIL_Z);
      const restOnKnee = (root, arm) => {
        if (!arm) return;
        root.updateWorldMatrix(true, false);
        arm.getWorldPosition(_restHand);
        _restHand.y = 6.2;
        reach(arm, _restHand);
      };
      reach(R.pArmL, _sowSoilTarget.clone().add(new THREE.Vector3(-0.4, 1.15, 0)));
      reach(R.aArmR, _sowSoilTarget.clone().add(new THREE.Vector3(0.4, 0.9, 0)));
      restOnKnee(S.paresh, R.pArmR);
      if (sow.share > 0) {
        reach(R.pArmR, _sowSoilTarget.clone().add(new THREE.Vector3(0.15, 0.45, 0)), sow.share);
      }
      restOnKnee(S.anshita, R.aArmL);
    } else if (act === 'repair') {
      const joint = act === 'repair';
      reach(R.pArmL, [-13, joint ? 20 : 13, joint ? 14 : -1]);
      reach(R.pArmR, [-19, 19, joint ? 14 : 6]); // packet/tape in the visible near hand
      reach(R.aArmR, [13, joint ? 22 : 15, joint ? 14 : -1]);
      reach(R.aArmL, joint ? [16, 19, 14] : [18, 17, 4]);
    } else if (act === 'joy') {
      // Inside hands greet the flowers and each other; outside arms stay soft.
      const target = [0, lerp(30.5, 19, joyApproach), lerp(-1, 1, joyApproach)];
      reach(R.pArmL, target);
      reach(R.aArmR, target);
      setBaseRotation(R.pArmR, R.base.pArmR, 0, 0, -0.15);
      setBaseRotation(R.aArmL, R.base.aArmL, 0, 0, 0.15);
    } else if (act === 'storm') {
      const nearHinge = S.plants[0]?.hinge.broken;
      const farHinge = S.plants[2]?.hinge.broken;
      const stemPoint = (hinge, out) => {
        if (!hinge) return null;
        hinge.updateWorldMatrix(true, false);
        return hinge.getWorldPosition(out);
      };
      const near = stemPoint(nearHinge, new THREE.Vector3());
      const far = stemPoint(farHinge, new THREE.Vector3());
      if (near) {
        // Both hands close on the same broken section she is holding, and stay
        // there through the quiet so the hold reads at story scale.
        const anshitaL = near.clone().add(new THREE.Vector3(0.55, 0.35, 0.2));
        const anshitaR = near.clone().add(new THREE.Vector3(-0.55, 0.2, -0.2));
        reach(R.aArmL, anshitaL, smooth((storyT - 0.35) / 0.85));
        reach(R.aArmR, anshitaR, smooth((storyT - 0.35) / 0.85));
        // He kneels back beside her holding hand and takes the same section;
        // the tape stays in that hand, the ties bundle in the other.
        const taking = smooth((storyT - 26) / 1.2);
        reach(R.pArmR, near.clone().add(new THREE.Vector3(0.05, 0.15, 0)), taking);
        reach(R.pArmL, near.clone().add(new THREE.Vector3(-0.75, -0.35, 0.35)), taking);
      }
      if (far) {
        const leaving = smooth((storyT - 18.5) / 0.8);
        reach(R.pArmL, far.clone().add(new THREE.Vector3(0, 0.6, 0)), 1 - leaving);
      }
    }
    // The shared task remains in their hands; the exchange lives in attention.
    // Authored head/shoulder/torso bones drive the native skinned meshes. Modest
    // partner yaw preserves both faces rather than turning them into profiles.
    const d = dialogueAt(ch, storyT);
    const age = d.start === null ? 0 : storyT - d.start;
    const emphasis = d.speaker ? (reduced ? 1 : smooth(age / 0.45) * smooth((d.end - storyT) / 0.5)) : 0;
    const sober = ch >= 4 && ch <= 8;
    const attentive = close ? 0.13 : 0.22;
    for (const [name, sign, body, head, arm, bodyBase, headBase] of [
      ['Paresh', 1, R.pBody, R.pHead, R.pArmR, R.base.pBody, R.base.pHead],
      ['Anshita', -1, R.aBody, R.aHead, R.aArmL, R.base.aBody, R.base.aHead],
    ]) {
      const speaking = d.speaker === name;
      const listening = d.speaker && !speaking;
      const delay = name === 'Anshita' ? 0.22 : 0;
      const reactionAge = Math.max(0, age - delay);
      const nod = reduced ? 0 : Math.sin(reactionAge * (speaking ? 2.1 : 1.3)) * Math.exp(-reactionAge * 0.8);
      if (body) {
        body.rotation.y = bodyBase.rotation[1] + sign * (close ? 0.02 : 0.055) * E;
        body.rotation.z = bodyBase.rotation[2] + sign * (speaking ? 0.022 : 0.008) * emphasis;
      }
      if (head) {
        // Scene 10: the paired torsos stay back-to-back, so each authored head
        // bone turns over the shoulder toward the camera for a readable face.
        head.rotation.y = headBase.rotation[1] + sign * (attentive + (speaking ? 0.06 : listening ? 0.12 : 0.03)) * E;
        head.rotation.x += (speaking ? 0.025 : 0.05) * nod * emphasis;
        head.rotation.z = headBase.rotation[2] + sign * (sober ? 0.025 : 0.05) * emphasis * (listening ? 1 : 0.35);
      }
      // Don't interrupt sowing, taping or the watering-can attachment. For the
      // ordinary conversations, a small outside-hand gesture distinguishes turns.
      if (arm && !close && act !== 'storm' && speaking) {
        arm.rotation.x -= (sober ? 0.16 : 0.35) * emphasis;
        arm.rotation.z += sign * (sober ? -0.07 : -0.18) * emphasis;
      }
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
    const attach = (root, group, character, handName, scale) => {
      const hand = character.getObjectByName(handName);
      if (!hand || !group) return;
      character.updateMatrixWorld(true);
      const point = hand.localToWorld(new THREE.Vector3(0, 1.2, 0));
      root.updateMatrixWorld(true);
      group.position.copy(root.worldToLocal(point));
      group.scale.setScalar(scale);
      group.rotation.set(0, 0, 0);
    };
    if (act === 'sow' || (act === 'invite' && storyT >= 16)) {
      attach(S.careProps, S.variants.seed_packet[0].group, S.paresh,
        act === 'sow' ? 'hand_L_smooth__pivot' : 'hand_R_smooth__pivot', 0.75);
    }
    if (act === 'repair' || (act === 'storm' && storyT >= 26) || (act === 'aftermath' && storyT >= 29)) {
      attach(S.careProps, S.variants.tape[0].group, S.paresh, 'hand_R_smooth__pivot', 0.8);
    }
    if (act === 'storm' && storyT >= 26 && S.variants.support?.[0]) {
      attach(S.careProps, S.variants.support[0].group, S.paresh, 'hand_L_smooth__pivot', 0.5);
    }
    updateLaptop(ch, storyT);
    if (S.coffee) setGroupVisible(S.anshita, S.coffee, act === 'invite');
    if (S.can) {
      const canOwner = act === 'time_lapse' ? S.paresh : S.anshita;
      setGroupVisible(S.props, S.can, ['invite','time_lapse','tend'].includes(act));
      if (['invite','time_lapse','tend'].includes(act)) {
        const hand = canOwner === S.paresh ? 'hand_R_smooth__pivot' : 'hand_R_mesh__pivot';
        attach(S.props, S.can, canOwner, hand, 0.6);
      }
      S.can.rotation.z = -0.45 + (reduced ? 0 : Math.sin(storyT * 1.2) * 0.035);
    }
    if (act === 'sow') {
      aimAtLocalNegativeZ(R.pHead, _sowSoilTarget);
      aimAtLocalNegativeZ(R.aHead, _sowSoilTarget);
    } else if (act === 'storm') {
      const near = S.plants[0]?.hinge.broken;
      const far = S.plants[2]?.hinge.broken;
      if (storyT < 18.5 && far) {
        far.getWorldPosition(_packetWorldTarget);
        near?.getWorldPosition(_partnerHandWorldTarget);
        aimAtLocalNegativeZ(R.pHead, _packetWorldTarget);
        aimAtLocalNegativeZ(R.aHead, _partnerHandWorldTarget);
      } else if (storyT >= 25.5 && near) {
        // Turn faces toward the camera while the hands keep working together;
        // the stem remains the close-focus point between them.
        aimAtLocalNegativeZ(R.pHead, camera.position);
        aimAtLocalNegativeZ(R.aHead, camera.position);
      }
    }
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
    b.position.set(Math.sin(bt * 0.8 + s) * 15 + (i - 1) * 7,
      21 + Math.sin(bt * 1.6 + s) * 3.5,
      4 + Math.cos(bt * 0.6 + s) * 11);
    b.rotation.y = Math.sin(bt * 0.8 + s);
  });

  updateCaption();
  updateFilmCard(ch, storyT);
  // Stable subtitles require no projected-head traversal or per-frame DOM reads.
  sound.update(c, storyT, S.playing && !S.frozen && !document.hidden);
  const progress = clamp(storyT / c.dur, 0, 1) * 100;
  barEl.style.width = progress.toFixed(2) + '%';
  const progressEl = document.getElementById('progress'), value = progress.toFixed(0);
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
    bubbleLayout: Object.fromEntries(Object.entries(S.bubbleLayout).map(([name, layout]) => [name, { ...layout, anchor: { ...layout.anchor } }])),
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
    head.getWorldPosition(_bubblePoint);
    character.worldToLocal(_bubblePoint);
    return Object.freeze(_bubblePoint.toArray());
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
  // Preserve authored personal accessories in the exports, but free their hands
  // for garden actions; no replacement character geometry is constructed here.
  S.laptop = B(S.paresh, 'laptop');
  S.laptopScreen = B(S.paresh, 'laptop_screen__pivot');
  S.laptopKeyboard = B(S.paresh, 'keyboard__pivot');
  if (S.laptop) S.laptopHome = { position: S.laptop.position.clone(), rotation: S.laptop.rotation.clone() };
  S.coffee = B(S.anshita, 'items_coffee');
  S.carry = B(S.anshita, 'items_carry');
  setGroupVisible(S.paresh, S.laptop, false);
  setGroupVisible(S.anshita, S.coffee, false);
  setGroupVisible(S.anshita, S.carry, false);

  S.rain = makeRain();

  // chapter dots
  CH.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'dot'; d.title = CH[i].title;
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', CH[i].title);
    d.onclick = () => enterChapter(i);
    dotsWrap.appendChild(d);
    dots.push(d);
  });
  document.getElementById('prev').onclick = () => enterChapter(S.chapter - 1);
  document.getElementById('next').onclick = () => enterChapter(S.chapter + 1);
  document.getElementById('replay').onclick = () => { S.frozen = false; S.playing = true; enterChapter(0); setPlayLabel(); };
  document.getElementById('continue').onclick = continueStory;
  const transcript = document.getElementById('transcript');
  const transcriptLines = document.getElementById('transcript-lines');
  CH.forEach(c => {
    const li = document.createElement('li'), heading = document.createElement('h3');
    heading.textContent = c.title; li.appendChild(heading);
    for (const line of c.dialogue) {
      const p = document.createElement('p'), speaker = document.createElement('strong');
      speaker.textContent = line.speaker + ': ';
      p.append(speaker, document.createTextNode(line.text)); li.appendChild(p);
    }
    transcriptLines.appendChild(li);
  });
  document.getElementById('story-notes').onclick = () => {
    freeze(true); transcript.showModal();
  };
  document.getElementById('transcript-close').onclick = () => transcript.close();
  playBtn.onclick = () => {
    if (S.frozen) { resume(); return; }
    S.playing = !S.playing; setPlayLabel();
    if (S.ready) { applyState(S.chapter, S.t); renderer.render(scene, camera); }
  };
  addEventListener('keydown', (e) => {
    if (transcript.open || e.target.closest('button, a, input, select, textarea')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); enterChapter(S.chapter + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); enterChapter(S.chapter - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); continueStory(); }
    else if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
  });
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
  clearTimeout(chromeTimer);
  sound.dispose();
  cancelAnimationFrame(loopId);
  for (const m of S.models) { m.dispose(); m.skeleton.dispose(); }
  if (S.rain) { S.rain.geometry.dispose(); S.rain.material.dispose(); }
  sunLight.shadow.dispose();
  renderer.dispose();
});

init().catch((e) => {
  const loading = document.getElementById('loading');
  loading.textContent = `Unable to load the garden: ${(e && e.message) || e}`;
  loading.setAttribute('role', 'alert');
  loading.classList.remove('done');
  console.error(e);
});
