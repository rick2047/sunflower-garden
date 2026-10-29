// Run with: playwright-cli -s=<owned-session> run-code --filename=tests/cinematic.cjs
// The session must already be on this project's preview URL.
async page => {
  const errors = [];
  const onError = error => errors.push(String(error));
  page.on('pageerror', onError);
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  try {
    await page.reload();
    await page.waitForFunction(() => window.__garden?.ready);
    const results = await page.evaluate(() => {
      const g = window.__garden;
      const assert = (ok, message) => { if (!ok) throw new Error(message); };
      const snapshot = () => {
        const nodes = [];
        g.scene.traverseVisible(n => nodes.push([n.uuid, n.visible, ...n.position.toArray(),
          ...n.quaternion.toArray(), ...n.scale.toArray()]));
        return JSON.stringify([nodes, g.camera.position.toArray(), g.camera.quaternion.toArray()]);
      };
      const faceAnchorAt = who => {
        const paresh = who === 'paresh';
        const character = g.S[who];
        const anchor = new g.THREE.Vector3(...g.S.rig.base[paresh ? 'pHeadAnchor' : 'aHeadAnchor']);
        const body = g.S.rig[paresh ? 'pBody' : 'aBody'];
        const base = g.S.rig.base[paresh ? 'pBody' : 'aBody'];
        anchor.y += body.position.y - base.position[1] + 4;
        return character.localToWorld(anchor);
      };
      for (const chapter of g.chapters) {
        let end = 0;
        for (const line of chapter.dialogue) {
          assert(line.start >= end && line.end > line.start && line.end <= chapter.duration,
            `Invalid dialogue timing: ${chapter.id}: ${line.text}`);
          end = line.end;
        }
      }
      // Repeated/nonsequential seeks must produce the same physical world.
      for (const [ch,t] of [[1,12],[6,28],[7,30],[9,25],[10,18],[11,28],
          [1,6],[1,17],[1,24.25],[6,8.4],[6,21],[6,27.5],[7,24],[7,29],
          [8,8],[10,15.6],[10,16.3],[10,17.1],[7,1.5]]) {
        g.seek(ch,t); const before = snapshot();
        g.seek(0,8); g.seek(8,7); g.seek(ch,t);
        assert(snapshot() === before, `History-dependent pose at ${ch}:${t}`);
      }
      g.seek(6,20); const rain = g.S.rain.geometry.attributes.position.getY(0);
      g.seek(6,21); assert(rain !== g.S.rain.geometry.attributes.position.getY(0), 'Rain freezes after visualDur');
      g.seek(10,22); const bee = g.S.bees[0].position.clone();
      g.seek(10,23); assert(bee.distanceTo(g.S.bees[0].position) > 0.01, 'Bees freeze after visualDur');
      for (const time of [15.5, 15.6]) {
        g.seek(10, time);
        const face = faceAnchorAt('anshita');
        const bee = g.S.bees[1];
        bee.updateWorldMatrix(true, false);
        const beePosition = bee.getWorldPosition(new g.THREE.Vector3());
        assert(beePosition.distanceTo(face) > 12,
          `Bloom bee crowds Anshita's face at ${time}: ${beePosition.distanceTo(face).toFixed(2)}`);
      }
      g.seek(10,15.499); const p = g.S.paresh.position.clone(), a = g.S.anshita.position.clone();
      g.seek(10,15.501);
      assert(p.distanceTo(g.S.paresh.position) < 0.01 && a.distanceTo(g.S.anshita.position) < 0.01, 'Embrace snaps');
      g.seek(6,1); const pot = g.S.potPivots[0].bone.position.clone();
      g.seek(6,2); assert(pot.equals(g.S.potPivots[0].bone.position), 'Set slides within storm shot');

      // ---- Authored set geography is chapter-invariant ----
      // Pots, plant roots and flowering props keep one world position in every
      // chapter. Only plant state (growth, breakage, bloom scale) may change.
      const setSnapshot = () => ({
        pots: g.S.potPivots.map(({ bone }) => bone.position.toArray()),
        plants: g.S.plants.map(p => [p.care.position.toArray(), p.classic.position.toArray()]),
        flowers: ['tulip_green', 'petunia_bloom', 'mogra_bloom', 'tomato_no_yield',
          'capsicum_no_yield'].map(name => g.S.variants[name][0].group.position.toArray()),
      });
      g.seek(1, 6);
      const setAt = JSON.stringify(setSnapshot());
      assert(g.S.potPivots.every(({ bone }) => bone.position.z === -1
        && [-13, 0, 13].includes(bone.position.x)),
        'Pot pivots are not on the authored pot row');
      assert(JSON.stringify(g.S.plants.map(p => [p.care.position.x, p.care.position.z]))
        === JSON.stringify([[-13, -1], [0, -1], [13, -1]]),
        'Plant roots are not on the authored pot row');
      for (const [ch, t] of [[5, 22], [6, 8.4], [6, 18.6], [6, 27.5], [7, 23.8], [8, 8], [9, 25]]) {
        g.seek(ch, t);
        assert(JSON.stringify(setSnapshot()) === setAt,
          `Set geography jumps between chapters at ${ch}:${t}`);
      }
      g.seek(5, 22);
      const unbrokenBend = g.S.plants[0].hinge.broken.rotation.z;
      g.seek(6, 8.4);
      assert(Math.abs(g.S.plants[0].hinge.broken.rotation.z - unbrokenBend) > 0.5,
        'Authored plant breakage no longer changes the broken hinge');
      g.seek(7,30); assert(g.state().visible.includes('tape'), 'Late aftermath tape cue unreachable');
      g.seek(11,28); assert(g.dialogue().text === 'Especially the part with you.', 'Final line lost');
      assert(g.state().filmCard === null, 'End card appears before the final line is read');
      g.seek(11,31); assert(g.state().filmCard?.kind === 'end', 'Missing ending card');

      // ---- Grounded joy approach: absolute-time side gait ----
      const footAt = (who, side) => {
        const node = g.S[who].getObjectByName(`foot_${side}__pivot`);
        node.updateWorldMatrix(true, false);
        return node.getWorldPosition(new g.THREE.Vector3());
      };
      const kneeAt = (who, side) => {
        const node = g.S[who].getObjectByName(`knee_${side}`);
        node.updateWorldMatrix(true, false);
        return node.getWorldPosition(new g.THREE.Vector3());
      };
      // The loaded rig names the actual runtime hand pivots per character.
      const handAt = (who, side) => {
        const root = g.S[who];
        const node = root.getObjectByName(`hand_${side}_smooth__pivot`)
          || root.getObjectByName(`hand_${side}_mesh__pivot`);
        assert(node, `Missing ${who} hand_${side} pivot`);
        node.updateWorldMatrix(true, false);
        return node.getWorldPosition(new g.THREE.Vector3());
      };
      // performance().contacts must be the final named pivot after the complete
      // frame pose, not the earlier analytic solve.
      const finalContact = (entry, who, side, label) => {
        assert(entry && entry.hand && entry.goal, `${label}: missing contact sample`);
        const actual = handAt(who, side);
        const recorded = new g.THREE.Vector3(...entry.hand);
        assert(recorded.distanceTo(actual) < 1e-4,
          `${label}: contact hand is not the final ${who} ${side} pivot`
          + ` (${recorded.distanceTo(actual).toFixed(4)})`);
        const goal = new g.THREE.Vector3(...entry.goal);
        assert(Math.abs(entry.distance - actual.distanceTo(goal)) < 1e-4,
          `${label}: contact distance is stale`
          + ` (${entry.distance.toFixed(4)} vs ${actual.distanceTo(goal).toFixed(4)})`);
        return actual;
      };
      const hingeAt = (plant, kind) => {
        const node = g.S.plants[plant].hinge[kind];
        node.updateWorldMatrix(true, false);
        return node.getWorldPosition(new g.THREE.Vector3());
      };
      const DECK = 4.15;
      const seenSupport = {};
      for (const who of ['paresh','anshita']) {
        let last = null, changes = 0;
        const lift = { L: 0, R: 0 };
        seenSupport[who] = new Set();
        for (let i = 0; i <= 32; i++) {
          const t = Math.min(17.1, 15.5 + i * 0.05);
          g.seek(10, t);
          const gait = g.performance().joy[who];
          assert(gait, `Missing joy gait at ${who} ${t.toFixed(2)}`);
          seenSupport[who].add(gait.support);
          const l = footAt(who, 'L'), r = footAt(who, 'R');
          lift.L = Math.max(lift.L, l.y - DECK);
          lift.R = Math.max(lift.R, r.y - DECK);
          const supportFoot = gait.support === 'L' ? l : r;
          const swingFoot = gait.support === 'L' ? r : l;
          assert(Math.abs(supportFoot.y - DECK) < 0.06,
            `${who} support sole off deck at ${t.toFixed(2)}: ${supportFoot.y.toFixed(3)}`);
          assert(swingFoot.y >= DECK - 0.06,
            `${who} swing foot below deck at ${t.toFixed(2)}: ${swingFoot.y.toFixed(3)}`);
          assert(g.S[who].position.y <= DECK + 0.01 && g.S[who].position.y > DECK - 0.4,
            `${who} root not deck-grounded at ${t.toFixed(2)}: ${g.S[who].position.y.toFixed(3)}`);
          if (last && last.support === gait.support) {
            const held = last[gait.support];
            assert(held.distanceTo(supportFoot) < 0.04,
              `${who} support foot skates at ${t.toFixed(2)}: ${held.distanceTo(supportFoot).toFixed(3)}`);
          }
          if (last && last.support !== gait.support) changes++;
          last = { support: gait.support, L: l.clone(), R: r.clone() };
        }
        assert(seenSupport[who].has('L') && seenSupport[who].has('R'),
          `${who} gait never alternates support feet`);
        assert(lift.L > 0.7 && lift.R > 0.7, `${who} gait swing feet do not visibly lift`);
        assert(changes >= 2, `${who} completed fewer than two steps`);
      }
      // The settled destination holds after the window (no post-gait glide).
      g.seek(10, 17.1);
      const settled = {
        p: g.S.paresh.position.toArray(), a: g.S.anshita.position.toArray(),
        pl: footAt('paresh','L').toArray(), pr: footAt('paresh','R').toArray(),
        al: footAt('anshita','L').toArray(), ar: footAt('anshita','R').toArray(),
      };
      g.seek(10, 20);
      for (const [key, fn] of [
        ['p', () => g.S.paresh.position.toArray()], ['a', () => g.S.anshita.position.toArray()],
        ['pl', () => footAt('paresh','L').toArray()], ['pr', () => footAt('paresh','R').toArray()],
        ['al', () => footAt('anshita','L').toArray()], ['ar', () => footAt('anshita','R').toArray()],
      ]) {
        const now = fn();
        assert(now.every((v, i) => Math.abs(v - settled[key][i]) < 1e-6),
          `Joy approach does not settle at its destination (${key})`);
      }
      const settleL = footAt('paresh','L'), settleR = footAt('paresh','R');
      assert(Math.abs(settleL.y - DECK) < 0.06 && Math.abs(settleR.y - DECK) < 0.06,
        'Settled joy stance is not planted on the deck');

      // ---- Kneel/settle/rise: feet and knees stay on the deck ----
      const kneelFeetOnDeck = (who, label) => {
        for (const side of ['L','R']) {
          const f = footAt(who, side);
          assert(Math.abs(f.y - DECK) < 0.12,
            `${label}: ${who} ${side} foot leaves the deck (${f.y.toFixed(3)})`);
        }
        assert(Math.abs(g.S[who].position.y - DECK) < 0.03,
          `${label}: ${who} root drifts off the deck (${g.S[who].position.y.toFixed(3)})`);
      };
      for (const t of [24.15, 24.45, 24.75, 25.05, 25.35, 25.65, 25.95]) {
        g.seek(1, t);
        const kneel = g.performance().kneel;
        assert(kneel.paresh && kneel.anshita, `Missing sow kneel sample at ${t}`);
        kneelFeetOnDeck('paresh', `sow rise ${t}`);
        kneelFeetOnDeck('anshita', `sow rise ${t}`);
        if (t <= 24.15) {
          assert(kneel.paresh.amount > 0.95 && kneel.anshita.amount > 0.95,
            `Sowing kneel not established at ${t}`);
          for (const who of ['paresh','anshita']) for (const side of ['L','R']) {
            const k = kneeAt(who, side);
            assert(k.y > DECK + 0.15 && k.y < DECK + 0.95,
              `${who} ${side} knee misses the deck during ${t} (${k.y.toFixed(3)})`);
          }
        }
        if (t >= 25.85) {
          assert(kneel.paresh.amount < 0.06 && kneel.anshita.amount < 0.06,
            `Sowing rise not complete at ${t}`);
        }
      }
      g.seek(1, 6); assert(g.performance().kneel.paresh.amount > 0.95, 'Sowing starts ungrounded');
      g.seek(1, 17); assert(g.performance().kneel.paresh.amount > 0.95, 'Sowing kneel lost');
      for (const t of [24.6, 25.0, 25.4, 25.8, 26.2, 26.6, 27.0, 27.5]) {
        g.seek(6, t);
        const kneel = g.performance().kneel;
        kneelFeetOnDeck('paresh', `storm return ${t}`);
        kneelFeetOnDeck('anshita', `storm return ${t}`);
        assert(kneel.paresh.amount >= 0 && kneel.paresh.amount <= 1,
          `Storm kneel amount out of range at ${t}`);
      }
      g.seek(6, 27.5);
      assert(g.performance().kneel.paresh.amount > 0.95, 'Storm return does not reach the kneel');
      for (const side of ['L','R']) {
        const k = kneeAt('paresh', side);
        assert(k.y > DECK + 0.15 && k.y < DECK + 0.95,
          `Storm return knee ${side} misses the deck (${k.y.toFixed(3)})`);
      }

      // ---- Contact/grip/release events, measured on final named pivots ----
      const stormLines = g.chapters[6].dialogue;
      const slipAt = stormLines[2].start;
      const regripAt = stormLines[3].start + 0.2;
      const tapeRunAt = stormLines[4].end + 1;
      g.seek(1, 6);
      let contacts = g.performance().contacts;
      finalContact(contacts.seed.paresh, 'paresh', 'L', 'sow 6 Paresh');
      finalContact(contacts.seed.anshita, 'anshita', 'R', 'sow 6 Anshita');
      assert(contacts.seed.paresh.distance < 0.7 && contacts.seed.anshita.distance < 0.7,
        'Sowing hand misses the soil at the first pot');
      g.seek(1, 17);
      contacts = g.performance().contacts;
      finalContact(contacts.seed.paresh, 'paresh', 'L', 'sow 17 Paresh');
      finalContact(contacts.seed.anshita, 'anshita', 'R', 'sow 17 Anshita');
      assert(contacts.seed.paresh.distance < 0.7 && contacts.seed.anshita.distance < 0.7,
        'Sowing hand misses the soil at the third pot');
      for (const [time, potX, seedIndex] of [[2.08, -13, 1], [6, -13, 1], [7.68, 0, 0]]) {
        g.seek(1, time);
        contacts = g.performance().contacts.seed;
        const pot = g.S.potPivots.find(({ bone }) => Math.abs(bone.position.x - potX) < 0.01);
        assert(pot, `Missing sowing pot at x=${potX}`);
        const potZ = pot.bone.position.z;
        const seedGroup = g.S.variants.seeds[seedIndex].group;
        seedGroup.updateWorldMatrix(true, false);
        const seedPosition = seedGroup.getWorldPosition(new g.THREE.Vector3());
        assert(Math.abs(contacts.target[2] - potZ) <= 1.0,
          `Sowing contact is still near the rim at ${time}`);
        assert(Math.abs(seedPosition.z - potZ) <= 1.0,
          `Placed seed is still near the rim at ${time}`);
        finalContact(contacts.paresh, 'paresh', 'L', `sow ${time} Paresh`);
        finalContact(contacts.anshita, 'anshita', 'R', `sow ${time} Anshita`);
      }
      g.seek(1, 26);
      contacts = g.performance().contacts;
      assert(contacts.seed.paresh.distance > 2,
        'Sowing hands still claim soil contact after the grounded rise');

      // Storm grip: both performance() and the final named pivots must agree.
      g.seek(6, slipAt + 0.45);
      let stem = g.performance().contacts.stem;
      let brokenHinge = hingeAt(0, 'broken');
      assert(new g.THREE.Vector3(...stem.target).distanceTo(brokenHinge) < 1e-6,
        'Storm contact target is not the loaded broken hinge');
      assert(new g.THREE.Vector3(...stem.hinge).distanceTo(brokenHinge) < 1e-6,
        'Storm hinge metadata disagrees with the loaded hinge');
      let handA = finalContact(stem.anshitaL, 'anshita', 'L', 'storm 8.4 Anshita');
      let handP = finalContact(stem.pareshR, 'paresh', 'R', 'storm 8.4 Paresh');
      assert(stem.anshitaL.distance < 0.5 && handA.distanceTo(brokenHinge) < 0.5,
        'Anshita loses the storm stem hold');
      assert(stem.pareshR.distance > 0.8 && handP.distanceTo(brokenHinge) > 0.8,
        'Failed grip does not visibly slip');
      assert(handP.distanceTo(brokenHinge) < 4.5,
        'Failed grip drops the hand entirely instead of slipping off the stem');

      g.seek(6, regripAt + 1.2);
      stem = g.performance().contacts.stem;
      brokenHinge = hingeAt(0, 'broken');
      handA = finalContact(stem.anshitaL, 'anshita', 'L', 'storm 11.5 Anshita');
      handP = finalContact(stem.pareshR, 'paresh', 'R', 'storm 11.5 Paresh');
      assert(stem.pareshR.distance < 0.6 && stem.anshitaL.distance < 0.5,
        'Storm grip does not re-close on "Don\'t let go."');
      assert(handA.distanceTo(brokenHinge) < 0.5 && handP.distanceTo(brokenHinge) < 0.6,
        'Storm re-grip hands miss the broken hinge');

      g.seek(6, stormLines[4].start + 0.5);
      stem = g.performance().contacts.stem;
      brokenHinge = hingeAt(0, 'broken');
      handP = finalContact(stem.pareshR, 'paresh', 'R', 'storm 15.5 Paresh');
      assert(stem.pareshR.distance < 0.6 && handP.distanceTo(brokenHinge) < 0.6,
        'Storm grip releases before "I need the tape" ends');

      g.seek(6, tapeRunAt + 0.2);
      stem = g.performance().contacts.stem;
      brokenHinge = hingeAt(0, 'broken');
      handP = finalContact(stem.pareshR, 'paresh', 'R', 'storm 18.6 Paresh');
      assert(stem.pareshR.distance > 1.5 && handP.distanceTo(brokenHinge) > 1.5,
        'Storm grip does not release for the tape run');

      g.seek(6, tapeRunAt + 1.5);
      stem = g.performance().contacts.stem;
      brokenHinge = hingeAt(0, 'broken');
      handA = finalContact(stem.anshitaL, 'anshita', 'L', 'storm 21 Anshita');
      assert(stem.anshitaL.distance < 0.5 && handA.distanceTo(brokenHinge) < 0.5,
        'Anshita does not hold the stem through the tape run');
      assert(g.state().visible.includes('tape'), 'Tape cue is not present during the storm');
      const tapeGroup = g.S.variants.tape[0].group;
      tapeGroup.updateWorldMatrix(true, false);
      assert(tapeGroup.getWorldPosition(new g.THREE.Vector3())
        .distanceTo(handAt('paresh', 'R')) < 1.5,
      'Storm tape is detached from Paresh\'s working hand');

      g.seek(6, 27.5);
      stem = g.performance().contacts.stem;
      assert(stem.return, 'Missing return contact');
      const retP = finalContact(stem.return.paresh, 'paresh', 'R', 'storm 27.5 Paresh');
      const retA = finalContact(stem.return.anshita, 'anshita', 'L', 'storm 27.5 Anshita');
      assert(stem.return.paresh.distance < 0.2 && stem.return.anshita.distance < 0.2,
        'Returning hands do not share the broken stem contact');
      const returnPoint = new g.THREE.Vector3(...stem.return.point);
      assert(returnPoint.distanceTo(new g.THREE.Vector3(...stem.target)) < 1.2,
        'Return hand contact is not on the broken stem');
      assert(returnPoint.distanceTo(new g.THREE.Vector3(...stem.return.target)) < 1.2,
        'Return contact metadata disagrees with its target');
      const returnHinge = hingeAt(0, 'broken');
      assert(returnPoint.distanceTo(returnHinge) < 1.0,
        'Returned hands miss the broken hinge');
      assert(retP.distanceTo(retA) < 0.2 && retP.distanceTo(returnHinge) < 1.0
        && retA.distanceTo(returnHinge) < 1.0,
        'Final named return hands do not meet on the broken hinge');

      g.seek(8, 8);
      contacts = g.performance().contacts.joint;
      assert(contacts.paresh.distance < 0.6 && contacts.anshita.distance < 0.6,
        'Repair hands do not meet the shared joint');
      const repairHinge = hingeAt(1, 'repair');
      assert(new g.THREE.Vector3(...contacts.point).distanceTo(repairHinge) < 0.7,
        'Repair hands are not on the repaired hinge');
      const repP = finalContact(contacts.paresh, 'paresh', 'L', 'repair Paresh');
      const repA = finalContact(contacts.anshita, 'anshita', 'R', 'repair Anshita');
      assert(repP.distanceTo(repA) < 0.2, 'Final named repair hands are apart');
      assert(repP.distanceTo(repairHinge) < 0.7 && repA.distanceTo(repairHinge) < 0.7,
        'Final named repair hands miss the repaired hinge');
      assert(g.state().visible.includes('tape'), 'Repair tape is not visible');

      for (const t of [23.8, 24.5, 29, 30.5]) {
        g.seek(7, t);
        contacts = g.performance().contacts.handHold;
        assert(contacts && contacts.active, `Morning-after hand hold inactive at ${t}`);
        assert(contacts.paresh.distance < 0.2 && contacts.anshita.distance < 0.2,
          `Morning-after hands miss the hold at ${t}`);
        const hp = finalContact(contacts.paresh, 'paresh', 'L', `morning ${t} Paresh`);
        const ha = finalContact(contacts.anshita, 'anshita', 'R', `morning ${t} Anshita`);
        assert(hp.distanceTo(ha) < 0.2, `Morning-after hands are apart at ${t}`);
        const faceClearance = Math.min(hp.distanceTo(faceAnchorAt('paresh')),
          hp.distanceTo(faceAnchorAt('anshita')), ha.distanceTo(faceAnchorAt('paresh')),
          ha.distanceTo(faceAnchorAt('anshita')));
        assert(faceClearance > 9,
          `Morning-after hand hold crowds a face at ${t}: ${faceClearance.toFixed(2)}`);
      }
      g.seek(7, g.chapters[7].dialogue[4].start + 0.1);
      assert(g.dialogue().text === 'Then hold it with me.', 'Handoff line not sampled');
      assert(g.state().shot === 'the-handoff', 'Handoff shot not active during its dialogue');
      g.seek(7, (g.chapters[7].dialogue[5].start + g.chapters[7].dialogue[5].end) / 2);
      assert(g.dialogue().text === "I'm here.", 'Reply line not sampled');

      for (const t of [17, 17.1]) {
        g.seek(10, t);
        contacts = g.performance().contacts.hands;
        assert(contacts.paresh.distance < 0.2 && contacts.anshita.distance < 0.2,
          `Joy hands do not meet at ${t}`);
        const joyP = finalContact(contacts.paresh, 'paresh', 'L', `joy ${t} Paresh`);
        const joyA = finalContact(contacts.anshita, 'anshita', 'R', `joy ${t} Anshita`);
        assert(joyP.distanceTo(joyA) < 0.2, `Joy hand contact drifts apart at ${t}`);
      }

      // ---- Camera/staging coverage ----
      g.seek(5, 22);
      assert(g.state().shot !== 'establishing', 'Weather-turns has no named windup shot');
      g.seek(6, stormLines[2].start - 0.1);
      assert(g.state().shot === 'failed-grip', 'Failed-grip insert missing');
      g.seek(6, tapeRunAt + 0.1);
      assert(g.state().shot === 'tape-run', 'Tape-run shot missing');
      g.seek(6, 24.6); assert(g.state().shot === 'return-to-her', 'Return shot missing');
      g.seek(8, 8); assert(g.state().shot === 'shared-repair', 'Repair insert missing');
      g.seek(7, 1.5);
      assert(g.state().shot === 'empty-doorway', 'Empty-doorway insert missing');
      {
        const forward = g.camera.getWorldDirection(new g.THREE.Vector3());
        for (const who of ['paresh', 'anshita']) {
          const depth = g.S[who].position.clone().sub(g.camera.position).dot(forward);
          assert(depth < 0, `Empty-doorway insert frames ${who}`);
        }
        const door = new g.THREE.Vector3(-18, 20, -15.6).project(g.camera);
        assert(Math.abs(door.x) < 1 && Math.abs(door.y) < 1 && door.z < 1,
          'Empty-doorway insert does not frame the open doorway');
      }
      g.seek(7, 2.2); assert(g.state().shot === 'care-two-shot',
        'Empty-doorway insert overruns the quiet beat');
      g.seek(10, 16); assert(g.state().shot === 'approach-steps', 'Approach step shot missing');
      g.seek(10, 16.3); assert(g.state().shot === 'shared-joy', 'Shared-joy frame starts too late');
      g.seek(10, 17.2); assert(g.state().shot === 'shared-joy', 'Shared joy shot missing');
      g.seek(11, 28); assert(g.state().shot === 'last-line', 'Final-line shot missing');
      return { chapters: g.chapters.length, duration: g.storyDuration,
        drawCalls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles,
        assetWarnings: g.state().assetWarnings };
    });
    for (const [width,height] of [[1440,900],[390,844]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(({width,height}) => {
        const g = window.__garden;
        const assert = (ok, message) => { if (!ok) throw new Error(message); };
        const cameraPose = () => ({ position: g.camera.position.clone(), quaternion: g.camera.quaternion.clone() });
        const cameraStep = (from, to) => ({
          distance: from.position.distanceTo(to.position),
          angle: from.quaternion.angleTo(to.quaternion),
        });
        const rootAt = who => g.S[who].position.clone();
        const footAt = (who, side) => {
          const foot = g.S[who].getObjectByName(`foot_${side}__pivot`);
          foot.updateWorldMatrix(true, false);
          return foot.getWorldPosition(new g.THREE.Vector3());
        };
        const tapeCut = g.chapters[6].dialogue[4].end + 1;
        g.seek(6, tapeCut - 0.01);
        const beforeTapeCut = cameraPose();
        g.seek(6, tapeCut + 0.01);
        const tapeStep = cameraStep(beforeTapeCut, cameraPose());
        assert(tapeStep.distance < 0.25 && tapeStep.angle < 0.02,
          `${width}x${height}: abrupt storm camera cut`);

        // The tape hand, tape prop and Anshita's held hinge must be composed
        // together, with enough screen scale to read the small fastening prop.
        g.seek(6, 21);
        const tapeFocus = new g.THREE.Vector3(-2, 22, 6);
        const maxTapeDistance = width < 500 ? 150 : 50;
        assert(g.camera.position.distanceTo(tapeFocus) < maxTapeDistance,
          `${width}x${height}: tape-run action is framed too far away`);
        const pointInSafeFrame = (point, label, margin = 0.9) => {
          const projected = point.clone().project(g.camera);
          assert(Math.abs(projected.x) < margin && Math.abs(projected.y) < margin && projected.z < 1,
            `${width}x${height}: ${label} leaves the tape-run frame`);
        };
        const handNode = (who, side) => {
          const root = g.S[who];
          const node = root.getObjectByName(`hand_${side}_smooth__pivot`)
            || root.getObjectByName(`hand_${side}_mesh__pivot`);
          assert(node, `Missing ${who} ${side} hand for tape-run framing`);
          node.updateWorldMatrix(true, false);
          return node.getWorldPosition(new g.THREE.Vector3());
        };
        const tape = g.S.variants.tape[0].group;
        tape.updateWorldMatrix(true, false);
        pointInSafeFrame(tape.getWorldPosition(new g.THREE.Vector3()), 'tape');
        pointInSafeFrame(handNode('paresh', 'R'), 'Paresh working hand');
        pointInSafeFrame(handNode('anshita', 'L'), 'Anshita stem hand');
        for (const who of ['pHead', 'aHead']) {
          const head = g.S.rig[who];
          head.updateWorldMatrix(true, false);
          pointInSafeFrame(head.getWorldPosition(new g.THREE.Vector3()), `${who} face`, 0.72);
        }
        const stormHinge = g.S.plants[0].hinge.broken;
        stormHinge.updateWorldMatrix(true, false);
        pointInSafeFrame(stormHinge.getWorldPosition(new g.THREE.Vector3()), 'held stem');

        g.seek(8, 8);
        const repairView = g.camera.getWorldDirection(new g.THREE.Vector3());
        assert(repairView.y > -0.35,
          `${width}x${height}: shared-repair camera looks too steeply down at the hands`);
        const repairHands = g.performance().contacts.joint;
        pointInSafeFrame(new g.THREE.Vector3(...repairHands.paresh.hand), 'Paresh repair hand');
        pointInSafeFrame(new g.THREE.Vector3(...repairHands.anshita.hand), 'Anshita repair hand');
        const repairHinge = g.S.plants[1].hinge.repair;
        repairHinge.updateWorldMatrix(true, false);
        pointInSafeFrame(repairHinge.getWorldPosition(new g.THREE.Vector3()), 'repair hinge');

        g.seek(10, 16.19);
        const beforeJoyCut = cameraPose();
        g.seek(10, 16.21);
        const joyCutStep = cameraStep(beforeJoyCut, cameraPose());
        assert(joyCutStep.distance < 0.25 && joyCutStep.angle < 0.02,
          `${width}x${height}: abrupt shared-joy camera move`);
        g.seek(10, 17.1);
        assert(g.state().shot === 'shared-joy',
          `${width}x${height}: shared-joy composition missing at hand contact`);
        const joyHands = g.performance().contacts.hands;
        pointInSafeFrame(new g.THREE.Vector3(...joyHands.paresh.hand), 'Paresh shared-joy hand');
        pointInSafeFrame(new g.THREE.Vector3(...joyHands.anshita.hand), 'Anshita shared-joy hand');

        // The height-reveal cut starts from a dedicated wide composition so
        // the first authored frame does not clip stalk tips.
        g.seek(8, g.chapters[8].duration);
        assert(g.state().shot === 'height-reveal-prep',
          `${width}x${height}: missing height-reveal pre-roll`);
        for (const time of [0.08, 14.58, 29.58]) {
          g.seek(9, time);
          for (const [index, plant] of g.S.plants.entries()) {
            const upper = plant.care.getObjectByName('tall_upper');
            assert(upper, `Missing tall stalk mesh for pot ${index}`);
            upper.geometry.computeBoundingBox();
            upper.updateWorldMatrix(true, false);
            const tip = new g.THREE.Vector3(0, upper.geometry.boundingBox.max.y, 0)
              .applyMatrix4(upper.matrixWorld).project(g.camera);
            assert(Math.abs(tip.x) < 0.95 && tip.y < 0.95 && tip.y > -0.95 && tip.z < 1,
              `${width}x${height}: measure stalk tip ${index} clips at ${time}: ${tip.toArray()}`);
          }
          for (const who of ['pHead', 'aHead']) {
            const head = g.S.rig[who];
            head.updateWorldMatrix(true, false);
            const face = head.getWorldPosition(new g.THREE.Vector3()).project(g.camera);
            assert(Math.abs(face.x) < 0.9 && Math.abs(face.y) < 0.9 && face.z < 1,
              `${width}x${height}: measure face anchor ${who} leaves frame at ${time}`);
          }
        }

        for (let chapter = 1; chapter < g.chapters.length; chapter++) {
          g.seek(chapter - 1, g.chapters[chapter - 1].duration - 0.01);
          const priorCamera = cameraPose();
          g.seek(chapter, 0);
          const entryCamera = cameraStep(priorCamera, cameraPose());
          assert(entryCamera.distance < 0.25 && entryCamera.angle < 0.02,
            `${width}x${height}: abrupt camera entry to chapter ${chapter}`);
          if (g.chapters[chapter].id === 'morning-after') continue;

          const entryEnd = g.chapters[chapter].entryDuration;
          g.seek(chapter - 1, g.chapters[chapter - 1].duration);
        const from = { paresh: rootAt('paresh'), anshita: rootAt('anshita') };
        g.seek(chapter, 0);
        const start = { paresh: rootAt('paresh'), anshita: rootAt('anshita') };
        const entryStep = (a, b) => ({ xz: Math.hypot(a.x - b.x, a.z - b.z), y: Math.abs(a.y - b.y) });
        const pareshStep = entryStep(from.paresh, start.paresh);
        const anshitaStep = entryStep(from.anshita, start.anshita);
        assert(pareshStep.xz < 0.2 && anshitaStep.xz < 0.2
          && pareshStep.y < 0.3 && anshitaStep.y < 0.3,
          `Actor blocking teleports at chapter ${chapter}`);

          for (const time of [entryEnd / 2, entryEnd]) {
            g.seek(chapter, time);
            for (const who of ['paresh','anshita']) {
              const heights = ['L','R'].map(side => footAt(who, side).y);
              assert(heights.every(y => y >= 3.85 && y <= 5.55),
                `${who} leaves the deck during chapter ${chapter} entry: ${heights}`);
            }
          }
          const entryPlan = g.S.entryPlans[chapter];
          if (entryPlan?.kind === 'gait') {
            const stepDuration = (entryPlan.walkEnd - entryPlan.walkStart) / entryPlan.paresh.steps;
            const supportSamples = [entryPlan.walkStart + stepDuration * 0.15,
              entryPlan.walkStart + stepDuration * 0.65];
            const firstSupport = {};
            for (const time of supportSamples) {
              g.seek(chapter, time);
              const entryGait = g.performance().entry;
              assert(entryGait, `Missing entry gait in chapter ${chapter} at ${time.toFixed(2)}`);
              for (const who of ['paresh','anshita']) {
                const gait = entryGait[who];
                const world = footAt(who, gait.support);
                assert(gait.step === 0 && gait.feet[gait.support].planted
                  && Math.abs(world.y - 4.15) < 0.12,
                `${who} entry support foot leaves the deck in chapter ${chapter}`);
                if (firstSupport[who]) {
                  assert(gait.support === firstSupport[who].side
                    && world.distanceTo(firstSupport[who].world) < 0.06,
                  `${who} entry support foot skates in chapter ${chapter}`);
                }
                firstSupport[who] = { side: gait.support, world };
              }
            }
          }
          g.seek(chapter, entryEnd);
          const dialogueRoots = { paresh: rootAt('paresh'), anshita: rootAt('anshita') };
          g.seek(chapter, entryEnd + 0.05);
          assert(dialogueRoots.paresh.distanceTo(rootAt('paresh')) < 0.15
            && dialogueRoots.anshita.distanceTo(rootAt('anshita')) < 0.15,
          `Actor blocking is not settled before dialogue in chapter ${chapter}`);
        }
      }, { width, height });
    }
    // The character-attributed bubble remains in bounds on every dialogue turn.
    for (const [width,height] of [[1440,900],[390,844]]) {
      await page.setViewportSize({width,height});
      const { bubbles, expectedCount } = await page.evaluate(() => {
        const g = window.__garden;
        const bubble = document.getElementById('speech-bubble');
        const reactionBadge = document.getElementById('listener-reaction');
        const projectHead = (name) => {
          const isParesh = name === 'Paresh';
          const character = isParesh ? g.S.paresh : g.S.anshita;
          const anchor = g.S.rig.base[isParesh ? 'pHeadAnchor' : 'aHeadAnchor'];
          const body = g.S.rig[isParesh ? 'pBody' : 'aBody'];
          const bodyBase = g.S.rig.base[isParesh ? 'pBody' : 'aBody'];
          const point = new g.THREE.Vector3(...anchor);
          point.y += body.position.y - bodyBase.position[1] + 4;
          character.localToWorld(point);
          point.project(g.camera);
          return { x: (point.x * 0.5 + 0.5) * innerWidth,
            y: (-point.y * 0.5 + 0.5) * innerHeight };
        };
        const results = [];
        let expectedCount = 0;
        for (let chapter = 0; chapter < g.chapters.length; chapter++) {
          const lines = g.chapters[chapter].dialogue;
          expectedCount += lines.length;
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const time = (line.start + line.end) / 2;
            g.seek(chapter, time);
            const state = g.state();
            const rect = bubble.getBoundingClientRect();
            const reactionRect = reactionBadge?.getBoundingClientRect();
            const listenerHead = projectHead(line.listener);
            const first = state.bubbleLayout && { left: state.bubbleLayout.left,
              top: state.bubbleLayout.top, width: state.bubbleLayout.width,
              height: state.bubbleLayout.height, speaker: state.bubbleLayout.speaker,
              anchor: state.bubbleLayout.anchor, tailOffset: state.bubbleLayout.tailOffset,
              placement: state.bubbleLayout.placement };
            let repeated = null;
            if (lineIndex === 0 && [0, 6, 11].includes(chapter)) {
              g.seek(0, 8);
              g.seek(chapter, time);
              repeated = g.state().bubbleLayout;
            }
            results.push({ chapter, lineIndex, dialogue: g.dialogue(), first, repeated,
              rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom,
                width: rect.width, height: rect.height },
              visible: bubble.classList.contains('visible'), speaker: bubble.dataset.speaker,
              placement: bubble.dataset.placement,
              tailOffset: parseFloat(getComputedStyle(bubble).getPropertyValue('--bubble-tail-offset')),
              speakerText: document.getElementById('bubble-speaker').textContent,
              text: document.getElementById('bubble-text').textContent,
              reaction: reactionBadge && { visible: reactionBadge.classList.contains('visible'),
                text: reactionBadge.textContent, listener: reactionBadge.dataset.listener,
                rect: { left: reactionRect.left, top: reactionRect.top,
                  right: reactionRect.right, bottom: reactionRect.bottom,
                  width: reactionRect.width, height: reactionRect.height }, listenerHead },
              announcement: document.getElementById('announcement').textContent });
          }
        }
        return { bubbles: results, expectedCount };
      });
      assert(bubbles.length === expectedCount, 'Not every dialogue turn has a speech-bubble sample');
      for (const sample of bubbles) {
        const { rect, dialogue, first, repeated } = sample;
        assert(sample.visible, `Speech bubble hidden in chapter ${sample.chapter}`);
        assert(sample.speaker === dialogue.speaker && sample.speakerText === dialogue.speaker,
          `Speech bubble speaker mismatch in chapter ${sample.chapter}`);
        assert(sample.text === dialogue.text, `Speech bubble text mismatch in chapter ${sample.chapter}`);
        assert(sample.announcement === `${dialogue.speaker}: ${dialogue.text}`,
          `Accessible dialogue announcement missing in chapter ${sample.chapter}`);
        assert(sample.reaction?.visible, `Listener reaction hidden in chapter ${sample.chapter}`);
        assert(sample.reaction.text === dialogue.reaction,
          `Listener reaction emoji mismatch in chapter ${sample.chapter}`);
        assert(sample.reaction.listener === dialogue.listener,
          `Listener reaction attributed to wrong character in chapter ${sample.chapter}`);
        const reaction = sample.reaction.rect;
        assert(reaction.left >= 0 && reaction.right <= width
          && reaction.top >= 0 && reaction.bottom <= height,
        `Listener reaction overflows ${width}x${height} in chapter ${sample.chapter}`);
        assert(Math.hypot((reaction.left + reaction.width / 2) - sample.reaction.listenerHead.x,
          (reaction.top + reaction.height / 2) - sample.reaction.listenerHead.y) < 100,
        `Listener reaction is detached from the character in chapter ${sample.chapter}`);
        assert(first?.speaker === dialogue.speaker, `Missing projected bubble layout in chapter ${sample.chapter}`);
        assert(Math.abs(rect.left - first.left) < 1 && Math.abs(rect.top - first.top) < 1,
          `Bubble DOM position differs from its layout in chapter ${sample.chapter}`);
        assert(sample.placement === first.placement
          && Math.abs(sample.tailOffset - first.tailOffset) < 0.1,
        `Bubble tail does not follow its speaker anchor in chapter ${sample.chapter}`);
        const tailX = rect.left + rect.width / 2 + sample.tailOffset;
        assert(Math.abs(tailX - first.anchor.x) <= rect.width / 2,
          `Bubble tail is detached from its speaker in chapter ${sample.chapter}`);
        if (repeated) {
          assert(Math.abs(first.left - repeated.left) < 0.01 && Math.abs(first.top - repeated.top) < 0.01,
            `Speech bubble layout is history-dependent in chapter ${sample.chapter}`);
        }
        assert(rect.left >= 0 && rect.right <= width && rect.top >= 0 && rect.bottom <= height,
          `Speech bubble overflows ${width}x${height} in chapter ${sample.chapter}`);
        assert(rect.width > 0 && rect.height > 0, `Speech bubble has no size in chapter ${sample.chapter}`);
      }
      assert(await page.locator('#subtitles').count() === 0,
        'Legacy fixed subtitle panel remains in the playback presentation');
      const opening = await page.evaluate(() => {
        const g = window.__garden;
        g.seek(0, g.chapters[0].dialogue[0].start);
        return { card: g.state().filmCard,
          bubble: document.getElementById('speech-bubble').classList.contains('visible'),
          reaction: document.getElementById('listener-reaction').classList.contains('visible') };
      });
      assert(opening.card === null && opening.bubble && opening.reaction,
        'Opening title still covers the first dialogue/reaction');
      await page.evaluate(() => window.__garden.seek(0, 1));
      assert(!(await page.locator('#speech-bubble').evaluate(el => el.classList.contains('visible'))),
        'Speech bubble remains visible during a quiet beat');
      assert(!(await page.locator('#listener-reaction').evaluate(el => el.classList.contains('visible'))),
        'Listener reaction remains visible during a quiet beat');
    }
    // Every required action contact must stay inside both viewports. This is a
    // framing check only; it is not image evidence that the contact is visible.
    for (const [width,height] of [[1440,900],[390,844]]) {
      await page.setViewportSize({width,height});
      const framing = await page.evaluate(() => {
        const g = window.__garden, THREE = g.THREE;
        const inFrame = (entry) => {
          const p = new THREE.Vector3(...entry.hand).project(g.camera);
          return { ok: Math.abs(p.x) < 0.92 && Math.abs(p.y) < 0.92 && p.z < 1, p: p.toArray() };
        };
        const checks = [];
        const sample = (ch, t, pick, label) => {
          g.seek(ch, t);
          for (const entry of pick(g.performance().contacts)) checks.push([label, inFrame(entry)]);
        };
        sample(1, 6, c => [c.seed.paresh, c.seed.anshita], 'sowing 6');
        sample(1, 17, c => [c.seed.paresh, c.seed.anshita], 'sowing 17');
        sample(6, 8.4, c => [c.stem.anshitaL, c.stem.pareshR], 'storm slip 8.4');
        sample(6, 11.5, c => [c.stem.anshitaL, c.stem.pareshR], 'storm re-grip 11.5');
        sample(6, 18.6, c => [c.stem.anshitaL, c.stem.pareshR], 'storm tape 18.6');
        sample(6, 21, c => [c.stem.anshitaL, c.stem.pareshR], 'storm tape 21');
        sample(6, 27.5, c => [c.stem.return.paresh, c.stem.return.anshita], 'storm return 27.5');
        sample(8, 8, c => [c.joint.paresh, c.joint.anshita], 'repair 8');
        for (const t of [23.8, 24.5, 29, 30.5]) {
          sample(7, t, c => [c.handHold.paresh, c.handHold.anshita], `morning ${t}`);
        }
        for (const t of [17, 17.1]) {
          sample(10, t, c => [c.hands.paresh, c.hands.anshita], `joy ${t}`);
        }
        return checks;
      });
      for (const [label, { ok, p }] of framing) {
        assert(ok, `${label} contact leaves the ${width}x${height} frame `
          + `(${p.map(v => v.toFixed(2)).join(', ')})`);
      }
    }
    await page.locator('#sound').click();
    assert(await page.evaluate(() => window.__garden.state().soundEnabled), 'Sound toggle failed');
    await page.locator('#sound').click();
    await page.evaluate(() => window.__garden.seek(0,6));
    await page.locator('#play').click();
    await page.waitForTimeout(200);
    await page.locator('#play').click();
    const paused = await page.evaluate(() => window.__garden.state().t);
    await page.waitForTimeout(150);
    assert(await page.evaluate(() => window.__garden.state().t) === paused, 'Pause advances time');
    await page.locator('#continue').click();
    assert(await page.evaluate(() => window.__garden.state().t) > paused, 'Continue does not advance');
    await page.locator('#replay').click();
    assert(await page.evaluate(() => window.__garden.state().chapter) === 0, 'Replay failed');
    await page.evaluate(() => { window.__garden.seek(11,33.95); window.__garden.resume(); });
    await page.waitForFunction(() => !window.__garden.state().playing);
    assert(await page.evaluate(() => window.__garden.state().chapter) === 11, 'Ending loops instead of holding');
    await page.evaluate(() => window.__garden.freeze(true));
    await page.emulateMedia({reducedMotion:'reduce'});
    assert(await page.evaluate(() => !window.__garden.state().playing), 'Reduced motion autoplays');
    await page.evaluate(() => window.__garden.seek(9,25));
    assert(await page.evaluate(() => window.__garden.camera.position.toArray().every(Number.isFinite)), 'Invalid reduced-motion camera');
    const reducedCamera = await page.evaluate(() => window.__garden.camera.quaternion.toArray());
    await page.evaluate(() => window.__garden.seek(9,4));
    assert(JSON.stringify(await page.evaluate(() => window.__garden.camera.quaternion.toArray())) === JSON.stringify(reducedCamera), 'Reduced-motion reveal still moves');
    const reducedJoy = await page.evaluate(() => {
      const g = window.__garden;
      g.seek(10, 16.3);
      const feet = ['L','R'].map(side =>
        g.S.paresh.getObjectByName(`foot_${side}__pivot`).getWorldPosition(new g.THREE.Vector3()).toArray());
      return JSON.stringify({ p: g.S.paresh.position.toArray(), a: g.S.anshita.position.toArray(),
        feet, support: g.performance().joy.paresh.support });
    });
    await page.evaluate(() => { window.__garden.seek(0, 2); window.__garden.seek(10, 16.3); });
    assert(reducedJoy === await page.evaluate(() => {
      const g = window.__garden;
      const feet = ['L','R'].map(side =>
        g.S.paresh.getObjectByName(`foot_${side}__pivot`).getWorldPosition(new g.THREE.Vector3()).toArray());
      return JSON.stringify({ p: g.S.paresh.position.toArray(), a: g.S.anshita.position.toArray(),
        feet, support: g.performance().joy.paresh.support });
    }), 'Reduced-motion gait is history-dependent');
    await page.evaluate(() => window.__garden.seek(10, 16.3));
    assert(await page.evaluate(() => {
      const g = window.__garden;
      return ['L','R'].every(side => Math.abs(
        g.S.paresh.getObjectByName(`foot_${side}__pivot`).getWorldPosition(new g.THREE.Vector3()).y - 4.15) < 0.06);
    }), 'Reduced-motion joy stance floats');
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert(errors.length === 0, errors.join('\n'));
    return {status:'PASS', ...results};
  } finally {
    await page.evaluate(() => window.__garden?.ready && window.__garden.freeze(true));
    page.off('pageerror', onError);
  }
}
