// Grounded, story-time performances for the authored character rigs.
//
// The character exports are rigid segmented armatures: each leg is
// hip (leg_L/R) -> knee -> foot pivot, and each arm is a single rigid segment
// with a hand pivot. This module turns absolute story time into a small set of
// physical performances (side-step gait, kneel/settle/rise, reach/contact), so
// seeking, replay and reduced-motion sitting all evaluate the same pose.
//
// Contract:
//   - createPerformer() captures the authored base transforms at creation and
//     never renames/reparents model nodes.
//   - gait()/kneel()/aim() are pure functions of their inputs. They never read
//     the previous frame and write only the supplied rig bones plus root X/Z/Y.
//   - Leg pivots must have identity authored rotations (they do in paresh.bbmodel
//     and anshita.bbmodel); the solver uses the authored knee/foot offsets as
//     rigid segment lengths.
//   - Props are positioned/oriented from the real hand-pivot world matrix; no
//     duplicate prop geometry or new textures are created here.

import * as THREE from 'three';

const EPS = 1e-6;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const smoother = (x) => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const IDENTITY = new THREE.Quaternion();

// Acting accents are evaluated independently of the contact solver. Paresh's
// quicker, broader reactions contrast with Anshita's delayed, held attention.
export function attentionPose(name, chapter, seconds, dialogue, reduced) {
  const p = name === 'Paresh';
  const result = { yaw: 0, pitch: 0, lean: 0, gesture: p ? 1 : 0.65 };
  if (chapter.id === 'weather-turns') {
    const brace = smooth((seconds - chapter.dialogue[1].start) / 2);
    const gust = reduced ? 1 : 0.8 + 0.2 * Math.sin(seconds * 1.7 + (p ? 0 : 0.8));
    result.lean = (p ? 0.14 : 0.1) * brace * gust;
    result.pitch = 0.1 * brace;
  } else if (chapter.id === 'weather-report') {
    if (p) {
      const asked = chapter.dialogue[2].start;
      const reply = chapter.dialogue[3].start;
      const glance = smooth((seconds - asked - 0.55) / 0.8)
        * (1 - smooth((seconds - reply) / 0.7));
      result.yaw = 0.45 * glance;
      result.pitch = 0.2 * (1 - glance);
    } else {
      const away = smooth((seconds - chapter.dialogue[3].end) / 1.1)
        * (1 - smooth((seconds - chapter.dialogue[4].start) / 1));
      result.yaw = -0.5 * away;
    }
  } else if (dialogue.quiet && ['good-things', 'summer'].includes(chapter.id)) {
    result.yaw = p ? 0.16 : -0.12;
    result.pitch = -0.035;
  }
  return result;
}

// Scratch objects: applied once per actor per frame; no frame-to-frame state.
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3(), _v6 = new THREE.Vector3();
const _v7 = new THREE.Vector3(), _v8 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _e1 = new THREE.Euler();

function capture(node) {
  return {
    position: node.position.clone(),
    quaternion: node.quaternion.clone(),
    scale: node.scale.clone(),
  };
}

function restore(node, base) {
  node.position.copy(base.position);
  node.quaternion.copy(base.quaternion);
  node.scale.copy(base.scale);
}

function captureLegs(leg) {
  return {
    hip: leg.hip, knee: leg.knee, foot: leg.foot,
    base: { hip: capture(leg.hip), knee: capture(leg.knee), foot: capture(leg.foot) },
    hipBase: leg.hip.position.clone(),
    kneePosition: leg.knee.position.clone(), // hip-local knee pivot offset
    footPosition: leg.foot.position.clone(), // knee-local foot pivot offset
    upper: leg.knee.position.length(),
    lower: leg.foot.position.length(),
  };
}

/* ------------------------------------------------------------------ gait -- */

/**
 * Plan a side-step gait in world XZ. The plan is time-independent; sample it
 * with sampleGait(plan, storyT) for any story time (including history-free
 * seeks).
 */
export function planGait({
  start, end, startTime, endTime, steps = 4, lift = 1.3, yaw = 0,
  groundY = 0, hipX = { L: -4, R: 4 },
}) {
  const dx = end.x - start.x, dz = end.z - start.z;
  const distance = Math.hypot(dx, dz);
  if (!(endTime > startTime) || steps < 2) throw new Error('Invalid gait plan');
  const n = Math.max(2, Math.round(steps));
  const point = (u) => ({ x: start.x + dx * u, z: start.z + dz * u });
  const sideOffset = (side) => {
    const x = hipX[side] || 0;
    return { x: Math.cos(yaw) * x, z: -Math.sin(yaw) * x };
  };
  const plant = (side, u) => {
    const p = point(clamp(u, 0, 1)), o = sideOffset(side);
    return { x: p.x + o.x, z: p.z + o.z };
  };
  return {
    start: { ...start }, end: { ...end }, startTime, endTime, steps: n,
    lift, yaw, groundY, distance, sideOffset, point, plant, leg: {},
  };
}

export function sampleGait(plan, storyT) {
  const { startTime, endTime, steps, lift, groundY } = plan;
  const span = Math.max(EPS, endTime - startTime);
  const u = clamp((storyT - startTime) / span, 0, 1);
  // Foot plants are distributed linearly along the path. Advancing the root on
  // the same clock keeps each support foot fixed in world space (no skating);
  // the settled root pose comes from the final planted stance, not a glide.
  const rootU = u;
  const step = Math.min(steps - 1, Math.floor(u * steps));
  const s = clamp(u * steps - step, 0, 1);
  const support = step % 2 === 0 ? 'L' : 'R';
  const swing = support === 'L' ? 'R' : 'L';
  const supportU = step === 0 ? 0 : step / steps;
  const fromU = step === 0 ? 0 : (step - 1) / steps;
  const toU = Math.min(1, (step + 1) / steps);
  const supportPlant = plan.plant(support, supportU);
  const swingFrom = plan.plant(swing, fromU);
  const swingTo = plan.plant(swing, toU);
  const swingEase = smooth(s);
  const feet = {
    [support]: { x: supportPlant.x, z: supportPlant.z, y: groundY, planted: true, step },
    [swing]: {
      x: swingFrom.x + (swingTo.x - swingFrom.x) * swingEase,
      z: swingFrom.z + (swingTo.z - swingFrom.z) * swingEase,
      y: groundY + lift * Math.sin(Math.PI * s), planted: false, step,
    },
  };
  const rootPoint = plan.point(rootU);
  // One root height keeps both foot targets reachable while the support sole
  // stays on the deck. This is a geometric bob, not a decorative sine.
  let rootY = groundY;
  for (const side of ['L', 'R']) {
    const leg = plan.leg[side];
    if (!leg) continue;
    const o = plan.sideOffset(side);
    const hipXWorld = rootPoint.x + o.x, hipZWorld = rootPoint.z + o.z;
    const rH = Math.hypot(feet[side].x - hipXWorld, feet[side].z - hipZWorld);
    const reach = leg.length;
    const allowed = feet[side].y - leg.hipY
      + Math.sqrt(Math.max(reach * reach - rH * rH, 0));
    rootY = Math.min(rootY, allowed);
  }
  return {
    t: storyT, active: storyT >= startTime && storyT <= endTime,
    progress: u, step, phase: s, support, swing,
    rootX: rootPoint.x, rootY, rootZ: rootPoint.z,
    feet,
    supportPlant: { ...supportPlant, side: support },
  };
}

/* --------------------------------------------------------------- performer -- */

export function createPerformer({ character, groundY, joints, name = 'actor' }) {
  if (!character) throw new Error(`${name}: missing character root`);
  const { torso, head, armL, armR, legL, legR } = joints || {};
  for (const [key, node] of Object.entries({ torso, head, armL, armR })) {
    if (!node) throw new Error(`${name}: missing rig joint ${key}`);
  }
  if (!legL?.hip || !legL?.knee || !legL?.foot || !legR?.hip || !legR?.knee || !legR?.foot) {
    throw new Error(`${name}: missing leg joints`);
  }
  const legs = { L: captureLegs(legL), R: captureLegs(legR) };
  // The analytic solver assumes authored leg groups are unrotated. Fail loudly
  // rather than silently produce a contact a modeller cannot see.
  for (const [side, leg] of Object.entries(legs)) {
    if (leg.base.hip.quaternion.angleTo(IDENTITY) > 1e-4
        || leg.base.knee.quaternion.angleTo(IDENTITY) > 1e-4) {
      throw new Error(`${name}: leg ${side} must have identity authored rotations`);
    }
  }
  const hands = {
    L: character.getObjectByName('hand_L_smooth__pivot')
      || character.getObjectByName('hand_L_mesh__pivot'),
    R: character.getObjectByName('hand_R_smooth__pivot')
      || character.getObjectByName('hand_R_mesh__pivot'),
  };
  if (!hands.L || !hands.R) throw new Error(`${name}: missing authored hand pivots`);
  const base = {
    torso: capture(torso), head: capture(head), armL: capture(armL), armR: capture(armR),
  };
  const arms = { L: armL, R: armR };
  const handsBase = { L: hands.L.position.clone(), R: hands.R.position.clone() };

  function reset() {
    restore(torso, base.torso);
    restore(head, base.head);
    restore(armL, base.armL);
    restore(armR, base.armR);
    hands.L.scale.set(1, 1, 1);
    hands.R.scale.set(1, 1, 1);
    for (const leg of Object.values(legs)) {
      restore(leg.hip, leg.base.hip);
      restore(leg.knee, leg.base.knee);
      restore(leg.foot, leg.base.foot);
      leg.knee.position.copy(leg.kneePosition);
      leg.foot.position.copy(leg.footPosition);
    }
  }

  function reachLength(side) { return handsBase[side].length(); }

  function shoulderWorld(side) {
    return arms[side].getWorldPosition(new THREE.Vector3());
  }

  function handWorld(side) {
    hands[side].updateWorldMatrix(true, false);
    return hands[side].getWorldPosition(new THREE.Vector3());
  }

  function handNode(side) { return hands[side]; }

  /**
   * Solve a two-bone leg for a foot-pivot target in character-local space. The
   * knee bends toward `pole` (default: authored forward, -Z) and the foot is
   * counter-rotated to keep the authored sole level.
   */
  function solveLeg(side, target, pole = _v8.set(0, 0, -1)) {
    const leg = legs[side];
    const hipPos = leg.hip.position;
    _v1.copy(target).sub(hipPos); // hip -> foot
    let r = _v1.length();
    const minR = Math.abs(leg.upper - leg.lower) + 0.02;
    const maxR = leg.upper + leg.lower - 0.02;
    if (r < EPS) { _v1.set(0, -1, 0); r = 0; }
    if (r < minR || r > maxR) {
      r = clamp(r, minR, maxR);
      _v1.setLength(r);
    }
    const dir = _v2.copy(_v1).normalize();
    const cosA = clamp((leg.upper * leg.upper + r * r - leg.lower * leg.lower)
      / (2 * leg.upper * r), -1, 1);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    _v3.copy(pole).addScaledVector(dir, -pole.dot(dir));
    if (_v3.lengthSq() < EPS) _v3.set(0, 1, 0).addScaledVector(dir, -dir.y);
    if (_v3.lengthSq() < EPS) _v3.set(1, 0, 0).addScaledVector(dir, -dir.x);
    _v3.normalize();
    const u = _v4.copy(dir).multiplyScalar(cosA).addScaledVector(_v3, sinA).normalize();
    const v = _v5.copy(dir).multiplyScalar(r).addScaledVector(u, -leg.upper).normalize();
    const kneeCos = clamp(u.dot(v), -1, 1);
    const kneeAngle = Math.acos(kneeCos);
    _v6.copy(u).multiplyScalar(-1); // hip-local +Y
    _v7.copy(v).addScaledVector(u, -kneeCos);
    if (_v7.lengthSq() < EPS) _v7.copy(_v3);
    _v7.normalize(); // hip-local +Z
    _v8.crossVectors(_v6, _v7).normalize(); // hip-local +X (hinge)
    _m1.makeBasis(_v8, _v6, _v7);
    const qHip = _q1.setFromRotationMatrix(_m1);
    // Local -Y is the shin rest direction and a positive local-X rotation moves
    // it toward -Z. Our bend vector _v7 is the +Z side of the shin, so the
    // matching hinge rotation is negative.
    const qKnee = _q2.setFromAxisAngle(_v3.set(1, 0, 0), -kneeAngle);
    leg.hip.quaternion.copy(qHip);
    leg.knee.quaternion.copy(qKnee);
    leg.knee.position.copy(leg.kneePosition);
    leg.foot.position.copy(leg.footPosition);
    // Cancel hip+knee rotation so the authored shoe sole stays level.
    _q3.copy(qHip).multiply(qKnee);
    leg.foot.quaternion.copy(_q3.invert());
    // Achieved foot pivot in character-local space.
    const achieved = new THREE.Vector3().copy(hipPos)
      .add(_v1.copy(leg.kneePosition).applyQuaternion(qHip))
      .add(_v1.copy(leg.footPosition).applyQuaternion(_q3.copy(qHip).multiply(qKnee)));
    return achieved;
  }

  function attachPlanLegs(plan) {
    return { ...plan, leg: {
      L: { length: legs.L.upper + legs.L.lower, hipY: legs.L.hipBase.y },
      R: { length: legs.R.upper + legs.R.lower, hipY: legs.R.hipBase.y },
    } };
  }

  function planGaitFor(spec) {
    const plan = planGait({
      ...spec,
      hipX: { L: legs.L.hipBase.x, R: legs.R.hipBase.x },
      groundY: spec.groundY ?? groundY,
    });
    return attachPlanLegs(plan);
  }

  function applyGait(plan, storyT) {
    const ready = plan.leg?.L ? plan : attachPlanLegs(plan);
    const sample = sampleGait(ready, storyT);
    character.position.set(sample.rootX, sample.rootY, sample.rootZ);
    const cos = Math.cos(ready.yaw), sin = Math.sin(ready.yaw);
    const contacts = {};
    for (const side of ['L', 'R']) {
      const footTarget = sample.feet[side];
      const dx = footTarget.x - sample.rootX, dz = footTarget.z - sample.rootZ;
      _v1.set(dx * cos - dz * sin, footTarget.y - sample.rootY, dx * sin + dz * cos);
      const achieved = solveLeg(side, _v1);
      contacts[side] = {
        target: { x: footTarget.x, y: footTarget.y, z: footTarget.z },
        achieved: achieved.toArray(), planted: footTarget.planted,
      };
    }
    sample.legContacts = contacts;
    return sample;
  }

  /**
   * Grounded kneel/settle/rise. `amount` 0 = authored standing pose, 1 = both
   * knees on the deck with shins folded back. The torso and leg roots drop; the
   * character root stays at ground level and both feet stay on the deck.
   */
  function kneel(amount, settle = 0) {
    const a = clamp(amount, 0, 1), s = clamp(settle, 0, 1);
    reset();
    if (a <= 0.001 && s <= 0.001) {
      return { amount: 0, settle: 0, drop: 0, knees: {}, rootY: character.position.y };
    }
    const kneeHeight = 0.45, extra = 0.12 * s;
    const drops = {};
    const knees = {};
    for (const side of ['L', 'R']) {
      const leg = legs[side];
      const kneelHipY = kneeHeight + leg.upper;
      drops[side] = (leg.hipBase.y - kneelHipY) * a + extra;
      leg.hip.position.copy(leg.hipBase);
      leg.hip.position.y -= drops[side];
      // The foot starts under the hip and slides back along the deck as the
      // shin folds; this keeps the sole in contact through the whole kneel.
      _v1.set(leg.hipBase.x, 0, leg.lower * a);
      const foot = solveLeg(side, _v1);
      leg.hip.updateWorldMatrix(true, true);
      const kneeWorld = leg.knee.getWorldPosition(new THREE.Vector3());
      const footWorld = leg.foot.getWorldPosition(new THREE.Vector3());
      knees[side] = { knee: kneeWorld.toArray(), foot: footWorld.toArray(),
        footTarget: foot.toArray() };
    }
    const drop = (drops.L + drops.R) * 0.5;
    torso.position.copy(base.torso.position);
    torso.position.y -= drop;
    return { amount: a, settle: s, drop, knees, rootY: character.position.y };
  }

  /**
   * Aim a rigid arm so its hand pivot points at the goal. The arm has one rigid
   * segment, so the hand can only sit on a sphere of radius `reachLength(side)`
   * around the shoulder: a goal inside that sphere is overshot, not reached.
   * `blend` fades between the authored arm pose and the aim. The returned hand
   * and distance are a pre-final-pose estimate; garden.js replaces them with
   * `measureAim()` after the complete frame pose before exposing contacts.
   */
  function aim(side, goal, blend = 1, maxExtension = 1) {
    const arm = arms[side];
    const b = clamp(blend, 0, 1);
    if (!goal) return null;
    arm.parent.updateWorldMatrix(true, false);
    arm.updateWorldMatrix(true, false);
    _v1.copy(goal);
    arm.parent.worldToLocal(_v1);
    _v2.copy(_v1).sub(arm.position);
    const dist = _v2.length();
    // A small authored sleeve extension is available for a low soil reach.
    // Scale along the limb only; counter-scale the hand to preserve its shape.
    const extension = 1 + b * (clamp(dist / reachLength(side),
      maxExtension > 1 ? 0.75 : 1, maxExtension) - 1);
    arm.scale.y = extension;
    hands[side].scale.y = 1 / extension;
    const rest = _v7.copy(handsBase[side]);
    rest.y *= extension;
    const len = rest.length();
    if (dist < EPS) {
      return { owner: name, side, blend: b, hand: handWorld(side).toArray(),
        target: goal.toArray(), goal: goal.toArray(), distance: dist, reach: len,
        active: false };
    }
    _v2.normalize();
    _v3.copy(rest).normalize();
    _q1.setFromUnitVectors(_v3, _v2);
    const baseQ = side === 'L' ? base.armL.quaternion : base.armR.quaternion;
    _q2.copy(baseQ).slerp(_q1, b);
    arm.quaternion.copy(_q2);
    _v4.copy(rest).applyQuaternion(_q2).add(arm.position);
    _v5.copy(arm.position).addScaledVector(_v2, len);
    arm.parent.localToWorld(_v4);
    arm.parent.localToWorld(_v5);
    const actual = _v4.clone();
    return { owner: name, side, blend: b, hand: actual.toArray(),
      target: _v5.toArray(), goal: goal.toArray(),
      distance: actual.distanceTo(goal), reach: len,
      active: b > 0.001 && actual.distanceTo(goal) <= 0.9 };
  }

  /**
   * Re-measure an aim result from the loaded named hand pivot after the whole
   * frame pose has been applied. Contacts are only truth if they agree with the
   * matrix the renderer uses; this is the value garden.js publishes.
   */
  function measureAim(result) {
    if (!result) return null;
    const actual = handWorld(result.side);
    const goal = _v6.fromArray(result.goal);
    const distance = actual.distanceTo(goal);
    return { ...result, hand: actual.toArray(), distance,
      active: result.blend > 0.001 && distance <= 0.9 };
  }

  function aimShared(sideA, sideB, goal, blend = 1) {
    const point = sharedHandPoint({ shoulderWorld, reachLength }, sideA,
      { shoulderWorld, reachLength }, sideB, goal);
    return { point: point.toArray(), a: aim(sideA, point, blend), b: aim(sideB, point, blend) };
  }

  function attach(propRoot, group, side, options) {
    return attachProp(propRoot, group, hands[side], options);
  }

  const api = {
    name, character, groundY, torso, head, arms, legs, hands, base,
    reset, reachLength, shoulderWorld, handWorld, handNode, solveLeg, kneel,
    aim, measureAim, aimShared, attach, planGait: planGaitFor, gait: applyGait,
  };
  return api;
}

/* ---------------------------------------------------------- shared contact -- */

/**
 * Closest common point to two hand targets: the intersection of the two hand
 * reach spheres nearest the authored goal. Each arm is one rigid segment, so a
 * hand can only be at exactly `reachLength` from its shoulder; an interior goal
 * cannot be held. This is why the solve returns a sphere point rather than the
 * raw goal. If the arms cannot share a point, returns the goal and lets the
 * caller report the residual it actually measured.
 */
export function sharedHandPoint(a, sideA, b, sideB, goal) {
  const s1 = a.shoulderWorld(sideA), s2 = b.shoulderWorld(sideB);
  const r1 = a.reachLength(sideA), r2 = b.reachLength(sideB);
  const dvec = new THREE.Vector3().subVectors(s2, s1);
  const d = dvec.length();
  if (d < EPS || d > r1 + r2 - 1e-4 || d < Math.abs(r1 - r2) + 1e-4) return goal.clone();
  const along = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - along * along;
  if (h2 < 0) return goal.clone();
  const base = s1.clone().addScaledVector(dvec, along / d);
  const perp = goal.clone().sub(base);
  perp.addScaledVector(dvec, -perp.dot(dvec) / (d * d));
  if (perp.lengthSq() < EPS) perp.set(0, 1, 0).addScaledVector(dvec, -dvec.y / (d * d));
  perp.normalize();
  const h = Math.sqrt(h2);
  const p1 = base.clone().addScaledVector(perp, h);
  const p2 = base.clone().addScaledVector(perp, -h);
  return p1.distanceToSquared(goal) <= p2.distanceToSquared(goal) ? p1 : p2;
}

/* ------------------------------------------------------------- prop attach -- */

/**
 * Place an authored prop group in a hand using the hand's real world matrix.
 * `offset`/`rotation` are hand-pivot-local, so grip orientation follows the arm
 * instead of staying world-axis aligned. Returns the prop world position.
 */
export function attachProp(propRoot, group, hand, {
  offset = [0, 1.2, 0], rotation = [0, 0, 0], scale = 1,
} = {}) {
  if (!propRoot || !group || !hand) return null;
  hand.updateWorldMatrix(true, false);
  _v1.set(offset[0], offset[1], offset[2]).applyMatrix4(hand.matrixWorld);
  hand.getWorldQuaternion(_q1);
  _e1.set(rotation[0], rotation[1], rotation[2], 'XYZ');
  _q2.setFromEuler(_e1);
  _q1.multiply(_q2);
  const parent = group.parent || propRoot;
  parent.updateWorldMatrix(true, false);
  parent.getWorldQuaternion(_q3).invert();
  group.position.copy(parent.worldToLocal(_v1));
  group.quaternion.copy(_q3.multiply(_q1));
  group.scale.setScalar(scale);
  group.updateWorldMatrix(true, false);
  return group.getWorldPosition(new THREE.Vector3());
}

export const PERFORMANCE = Object.freeze({
  groundY: 4.15,
  joySteps: 4,
  joyLift: 1.3,
  kneeHeight: 0.45,
});
