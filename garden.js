import * as THREE from 'three';
import { BBModelLoader } from './vendor/BBModelLoader.js';

/* Balcony Giants — five chapters of one sunflower year. All models are
   .bbmodel files built in Blockbench, loaded natively. No internet needed. */

const CHAPTERS = [
  { title: 'Spring — empty pots',
    text: 'Two people, three pots of soil, and a packet of seeds. That is how every big thing starts.',
    dur: 14, sky: 0x9fc7e8, sun: 1.1, sunCol: 0xfff2d8, rain: false, stage: null,         bees: false, mood: 'morning',
    cam: [0, 26, 78], look: [0, 14, 0],
    sayP: 'Three pots. One packet of seeds. 🌱', sayA: 'And a whole year ahead of us. ☀️' },
  { title: 'First green',
    text: 'Watering together every morning. Then one day — green, pushing up through the dark.',
    dur: 14, sky: 0xa8d8f0, sun: 1.25, sunCol: 0xfff6e0, rain: false, stage: 'stage_sprout', bees: false, mood: 'morning',
    cam: [0, 18, 58], look: [0, 10, 4],
    sayP: 'Told you the morning water works. 💧', sayA: 'Look — green! It heard us. 💚' },
  { title: 'Summer giants',
    text: 'Taller than both of us. The whole balcony turned its face to the sun, and so did we.',
    dur: 16, sky: 0x7ec8f5, sun: 1.6, sunCol: 0xffffff, rain: false, stage: 'stage_bloom',  bees: true,  mood: 'noon',
    cam: [0, 9, 66], look: [0, 24, 0],
    sayP: 'Taller than both of us now! 🌻', sayA: 'The bees found us before the neighbours did. 🐝' },
  { title: 'The storm',
    text: 'Tough weeks. Wind, rain, flowers bowed double. We stood close and held on — like the stems did.',
    dur: 16, sky: 0x3a4a5e, sun: 0.35, sunCol: 0x9fb4cc, rain: true, stage: 'stage_bloom',  bees: false, mood: 'storm',
    cam: [0, 20, 52], look: [0, 14, 6],
    sayP: 'Stems bend. They don\u2019t break. 🤝', sayA: 'Hold on with me? ⛈️' },
  { title: 'Gold again',
    text: 'It passed. Full bloom, heavy seed heads — next year\u2019s garden already hiding inside this one.',
    dur: 18, sky: 0xf5b85e, sun: 1.3, sunCol: 0xffd9a0, rain: false, stage: 'stage_bloom',  bees: true,  mood: 'gold',
    cam: [0, 24, 72], look: [0, 16, 0],
    sayP: 'Gold again. We made it. 🌻✨', sayA: 'Next year\u2019s garden is hiding in this one. 💛' },
];

const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CHAPTERS[0].sky);
scene.fog = new THREE.Fog(scene.background.clone(), 90, 260);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 26, 78);

const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6b5a48, 0.9);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.1);
sunLight.position.set(40, 60, 30);
scene.add(sunLight);

const loader = new BBModelLoader(undefined, { unitScale: 1 });
const loadModel = (f) => new Promise((res, rej) =>
  loader.load('./models/' + f, (m) => res(m), undefined, rej));

const world = new THREE.Group();
scene.add(world);

// state shared by the animate loop
const S = { chapter: 0, t: 0, playing: true, stages: {}, blooms: [], clouds: [],
            rain: null, bees: [], paresh: null, anshita: null, can: null, sunDisk: null,
            skyFrom: new THREE.Color(CHAPTERS[0].sky), skyTo: new THREE.Color(CHAPTERS[0].sky),
            skyK: 1, sunFrom: 1.1, sunTo: 1.1, lean: 0, leanTo: 0 };
window.__garden = { scene, camera, renderer, world, S, THREE, goto: (i) => enterChapter(i) };

function makeRain() {
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 140;
    pos[i * 3 + 1] = Math.random() * 70;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xaaccee, size: 0.55, transparent: true, opacity: 0.75 });
  const p = new THREE.Points(g, m);
  p.visible = false;
  p.userData.op = 0;
  scene.add(p);
  return p;
}

function makeBees() {
  const bees = [];
  const bodyG = new THREE.SphereGeometry(0.55, 8, 6);
  const bodyM = new THREE.MeshLambertMaterial({ color: 0xffc93c });
  const wingG = new THREE.PlaneGeometry(0.7, 0.45);
  const wingM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(bodyG, bodyM));
    const w = new THREE.Mesh(wingG, wingM);
    w.position.y = 0.5; w.rotation.x = -0.5;
    b.add(w); b.userData = { seed: Math.random() * 10, wing: w };
    b.visible = false;
    scene.add(b); bees.push(b);
  }
  return bees;
}

function setCaption(i) {
  document.querySelector('#caption h1').textContent = CHAPTERS[i].title;
  document.querySelector('#caption p').textContent = CHAPTERS[i].text;
  document.querySelectorAll('.dot').forEach((d, k) => d.classList.toggle('active', k === i));
}

function enterChapter(i) {
  S.chapter = i; S.t = 0;
  const c = CHAPTERS[i];
  setCaption(i);
  S.skyFrom.copy(scene.background);
  S.skyTo.set(c.sky); S.skyK = 0;
  S.sunFrom = sunLight.intensity; S.sunTo = c.sun;
  sunLight.color.set(c.sunCol);
  S.leanTo = c.rain ? 0.16 : 0;
  // stage visibility + growth is driven per-frame in tick() via S.stageLists
  S.bees.forEach(b => b.visible = c.bees);
  if (S.can) S.can.visible = (i === 1);
  document.getElementById('bub-p').textContent = c.sayP;
  document.getElementById('bub-a').textContent = c.sayA;
  S.camFrom = camera.position.clone();
  S.lookFrom = S.lookCur ? S.lookCur.clone() : new THREE.Vector3(0, 14, 0);
  S.camTo = new THREE.Vector3(...c.cam);
  S.lookTo = new THREE.Vector3(...c.look);
  S.shotK = 0;
}

async function init() {
  const [balcony, props, sunflower, pareshM, anshitaM] = await Promise.all([
    loadModel('balcony.bbmodel'), loadModel('props.bbmodel'),
    loadModel('sunflower.bbmodel'), loadModel('paresh.bbmodel'), loadModel('anshita.bbmodel'),
  ]);
  world.add(balcony.scene);

  // sun + clouds drift overhead from props
  const sunG = props.scene.getObjectByName('sun');  if (sunG) { S.sunDisk = sunG; sunG.position.set(34, 52, -34); sunG.scale.setScalar(1.4); world.add(sunG); }
  for (const n of ['cloud_a', 'cloud_b']) {
    const c = props.scene.getObjectByName(n);
    if (c) { c.position.set(n === 'cloud_a' ? -30 : 25, 48, -30); world.add(c); S.clouds.push(c); }
  }
  // spare soil mound + watering can
  const mound = props.scene.getObjectByName('soil_mound');
  if (mound) { mound.position.set(-24, 0, 10); world.add(mound); }
  const can = props.scene.getObjectByName('watering_can');
  if (can) { S.can = can; can.position.set(14, 0, 10); can.rotation.z = -0.25; world.add(can); can.visible = false; }

  // pots from props, graduated, in a row
  // NOTE: props.bbmodel has broken group links — pot meshes are located by name below
  S.propsScene = props.scene;
  const potX = [-13, 0, 13];
  if (pots) {
    const kids = [...pots.children];
    kids.forEach((k, i) => { k.position.set(potX[i % 3], 0, 4); world.add(k); });
  }

  // three sunflowers, one per pot — chapter toggles which stage shows
  const stages = ['stage_sprout', 'stage_growing', 'stage_bloom'];
  for (const x of potX) {
    const plant = sunflower.scene.clone(true);
    plant.position.set(x, 0, 4);
    for (const n of stages) {
      const g = plant.getObjectByName(n);
      if (g) { g.visible = false; g.userData.grow = 0; S.stages[n] = S.stages[n] || g; }
    }
    // per-plant stage refs for sway/lean
    plant.userData.stageGroups = stages.map(n => plant.getObjectByName(n)).filter(Boolean);
    world.add(plant);
    S.blooms.push(plant);
  }
  // keep one canonical ref per stage name (first plant) for visibility toggling
  S.blooms.forEach(p => p.userData.stageGroups.forEach(g => {
    (S.stageLists ||= {})[g.name] ||= [];
    S.stageLists[g.name].push(g);
  }));

  S.paresh = pareshM.scene; S.paresh.position.set(-22, 0, 12); S.paresh.rotation.y = 0.35; world.add(S.paresh);
  S.anshita = anshitaM.scene; S.anshita.position.set(22, 0, 12); S.anshita.rotation.y = -0.35; world.add(S.anshita);
  // animation rig: Blockbench groups arrive as bones — rotate them, the bodies follow
  const B = (root, n) => root.getObjectByName(n);
  S.rig = {
    pArmL: B(S.paresh, 'arm_L'), pArmR: B(S.paresh, 'arm_R'), pHead: B(S.paresh, 'head'),
    aArmL: B(S.anshita, 'arm_L'), aArmR: B(S.anshita, 'arm_R'), aHead: B(S.anshita, 'head'),
  };

  S.rain = makeRain();
  S.bees = makeBees();

  // chapter dots
  const ui = document.getElementById('ui');
  CHAPTERS.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'dot'; d.title = CHAPTERS[i].title;
    d.onclick = () => enterChapter(i);
    ui.insertBefore(d, document.getElementById('play').nextSibling);
  });
  document.getElementById('prev').onclick = () => enterChapter((S.chapter + CHAPTERS.length - 1) % CHAPTERS.length);
  document.getElementById('next').onclick = () => enterChapter((S.chapter + 1) % CHAPTERS.length);
  document.getElementById('play').onclick = (e) => {
    S.playing = !S.playing;
    e.target.textContent = S.playing ? 'Pause' : 'Play';
  };

  enterChapter(0);
  requestAnimationFrame(tick);
}

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const c = CHAPTERS[S.chapter];

  if (S.playing) {
    S.t += dt;
    if (S.t >= c.dur) enterChapter((S.chapter + 1) % CHAPTERS.length);
  }
  // sky + light easing
  if (S.skyK < 1) {
    S.skyK = Math.min(1, S.skyK + dt * 0.5);
    scene.background.copy(S.skyFrom).lerp(S.skyTo, S.skyK);
    scene.fog.color.copy(scene.background);
    sunLight.intensity = S.sunFrom + (S.sunTo - S.sunFrom) * S.skyK;
  }
  // growth: the garden grows as the year turns, like the relationship
  const k = Math.min(1, S.t / c.dur);
  const ease = (x) => x * x * (3 - 2 * x);
  let sT = 0, gT = 0, bT = 0;
  if (S.chapter === 1) { sT = ease(k); if (k > 0.7) gT = (k - 0.7) / 0.3 * 0.3; }
  else if (S.chapter === 2) {
    if (k < 0.3) { sT = 1; gT = 0.3 + (k / 0.3) * 0.7; }
    else { const bk = (k - 0.3) / 0.7; bT = ease(bk); gT = Math.max(0, 1 - bT * 1.6); sT = 0; }
  }
  else if (S.chapter >= 3) { bT = 1; }
  for (const list of Object.values(S.stageLists || {})) {
    for (const g of list) {
      const want = g.name === 'stage_sprout' ? sT : g.name === 'stage_growing' ? gT : bT;
      g.userData.grow += (want - (g.userData.grow || 0)) * Math.min(1, dt * 3);
      const gr = g.userData.grow;
      g.visible = gr > 0.01;
      // bloom opens with a little overshoot, like a held breath let go
      const over = g.name === 'stage_bloom' && gr < 1 ? 1 + Math.sin(Math.min(1, gr) * Math.PI) * 0.12 : 1;
      g.scale.setScalar(Math.max(0.001, gr * over));
    }
  }
  // wind sway + storm lean
  S.lean += (S.leanTo - S.lean) * dt;
  const sway = Math.sin(time * (c.rain ? 3.2 : 1.1)) * (c.rain ? 0.05 : 0.02);
  for (const p of S.blooms) { p.rotation.z = S.lean + sway; }
  // clouds drift (fast in storm)
  S.clouds.forEach((cl, i) => {
    cl.position.x += dt * (c.rain ? 3.5 : 0.7) * (i ? 1 : -1);
    if (cl.position.x > 70) cl.position.x = -70;
    if (cl.position.x < -70) cl.position.x = 70;
  });
  if (S.sunDisk) S.sunDisk.rotation.z += dt * 0.1;
  // rain
  if (S.rain) {
    const want = c.rain ? 1 : 0;
    S.rain.userData.op += (want - S.rain.userData.op) * dt * 2;
    S.rain.visible = S.rain.userData.op > 0.02;
    S.rain.material.opacity = 0.75 * S.rain.userData.op;
    if (S.rain.visible) {
      const pos = S.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - dt * 38;
        if (y < 0) y = 70;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  }
  // bees loop around blooms
  S.bees.forEach((b, i) => {
    if (!b.visible) return;
    const s = b.userData.seed, cx = (i - 2) * 7;
    b.position.set(cx + Math.sin(time * 0.9 + s) * 9, 30 + Math.sin(time * 1.7 + s) * 4, 4 + Math.cos(time * 0.7 + s) * 7);
    b.userData.wing.rotation.z = Math.sin(time * 40 + s) * 0.6;
  });
  // storm: the two of them step closer
  const together = c.rain ? 1 : 0;
  const celebrate = (S.chapter === 4) ? 1 : 0;
  if (S.paresh && S.anshita) {
    S.paresh.position.x += ((-22 + together * 14) - S.paresh.position.x) * dt;
    S.anshita.position.x += ((22 - together * 14) - S.anshita.position.x) * dt;
    // acting: idle bob, storm lean-in, gold bounce
    const bob = Math.sin(time * 2.2) * 0.35;
    const bounce = celebrate ? Math.abs(Math.sin(time * 3.5)) * 1.6 : 0;
    S.paresh.position.y = bob * 0.5 + bounce;
    S.anshita.position.y = -bob * 0.5 + bounce * 0.8;
    const faceP = together ? -Math.PI / 2 - 0.4 : 0.35;
    const faceA = together ? Math.PI / 2 + 0.4 : -0.35;
    S.paresh.rotation.y += (faceP - S.paresh.rotation.y) * dt * 2;
    S.anshita.rotation.y += (faceA - S.anshita.rotation.y) * dt * 2;
    // body language: arms and heads act each chapter
    actRig(dt, time);
  }
  // cinematography: ease to chapter shot + gentle drift
  if (S.camTo) {
    S.shotK = Math.min(1, (S.shotK || 0) + dt * 0.4);
    const k = S.shotK * S.shotK * (3 - 2 * S.shotK);
    S.lookCur = S.lookFrom.clone().lerp(S.lookTo, k);
    const drift = Math.sin(time * 0.05) * 3;
    camera.position.copy(S.camFrom).lerp(S.camTo, k);
    camera.position.x += drift * k;
  }
  camera.lookAt(S.lookCur || new THREE.Vector3(0, 14, 0));
  // dialogue bubbles track heads
  placeBubble('bub-p', S.paresh, 35);
  placeBubble('bub-a', S.anshita, 31);

  renderer.render(scene, camera);
}

// per-chapter body language, eased toward targets every frame
function actRig(dt, time) {
  const R = S.rig;
  if (!R || !R.pArmR) return;
  const ch = S.chapter;
  const e = Math.min(1, dt * 3);
  const L = (bone, x, y, z) => {
    if (!bone) return;
    bone.rotation.x += (x - bone.rotation.x) * e;
    bone.rotation.y += (y - bone.rotation.y) * e;
    bone.rotation.z += (z - bone.rotation.z) * e;
  };
  const wave = Math.sin(time * 5) * 0.45;
  if (ch === 0) {
    // showing off the empty pots: his arm sweeps out, she looks on
    L(R.pArmR, -0.9, 0, -0.5 + Math.sin(time * 1.5) * 0.15);
    L(R.pArmL, 0, 0, 0.1); L(R.aArmR, 0, 0, -0.1); L(R.aArmL, 0, 0, 0.1);
    L(R.pHead, 0.1, 0, 0); L(R.aHead, -0.05, 0.3, 0);
  } else if (ch === 1) {
    // watering: her arm reaches forward-down, his rests proud
    L(R.aArmR, -0.8, 0, -0.15 + Math.sin(time * 2) * 0.06);
    L(R.aArmL, 0, 0, 0.1);
    L(R.pArmR, -0.2, 0, -0.2); L(R.pArmL, 0, 0, 0.1);
    L(R.pHead, 0.15, -0.2, 0); L(R.aHead, 0.3, 0, 0);
    if (S.can) S.can.rotation.z = -0.25 + Math.sin(time * 2) * 0.08;
  } else if (ch === 2) {
    // giants! both wave at the flowers
    L(R.pArmR, -0.4, 0, -1.9 + wave); L(R.pArmL, 0, 0, 0.25);
    L(R.aArmR, -0.3, 0, -1.7 - wave * 0.7); L(R.aArmL, 0, 0, 0.2);
    L(R.pHead, -0.25, 0, 0); L(R.aHead, -0.25, 0, 0);
  } else if (ch === 3) {
    // storm: heads bowed, arms drawn in close
    L(R.pArmL, 0.15, 0, 0.45); L(R.pArmR, 0.15, 0, -0.45);
    L(R.aArmL, 0.15, 0, 0.4); L(R.aArmR, 0.15, 0, -0.4);
    L(R.pHead, 0.35, 0.3, 0); L(R.aHead, 0.35, -0.3, 0);
  } else {
    // gold: celebration, both arms up
    L(R.pArmR, 0, 0, -2.4 + wave * 0.5); L(R.pArmL, 0, 0, 2.4 - wave * 0.5);
    L(R.aArmR, 0, 0, -2.2 - wave * 0.4); L(R.aArmL, 0, 0, 2.2 + wave * 0.4);
    L(R.pHead, -0.2, 0, 0); L(R.aHead, -0.2, 0, 0);
  }
}

const _v = new THREE.Vector3();
function placeBubble(id, char, height) {
  const el = document.getElementById(id);
  if (!char) { el.style.opacity = 0; return; }
  _v.set(char.position.x, char.position.y + height, char.position.z).project(camera);
  if (_v.z > 1) { el.style.opacity = 0; return; }
  el.style.opacity = 1;
  el.style.left = ((_v.x * 0.5 + 0.5) * innerWidth) + 'px';
  el.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight) + 'px';
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

init().catch((e) => {
  document.querySelector('#caption h1').textContent = 'Something wilted';
  document.querySelector('#caption p').textContent = String(e && e.message || e);
  console.error(e);
});
