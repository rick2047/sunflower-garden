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
      for (const chapter of g.chapters) {
        let end = 0;
        for (const line of chapter.dialogue) {
          assert(line.start >= end && line.end > line.start && line.end <= chapter.duration,
            `Invalid dialogue timing: ${chapter.id}: ${line.text}`);
          end = line.end;
        }
      }
      // Repeated/nonsequential seeks must produce the same physical world.
      for (const [ch,t] of [[1,12],[6,28],[7,30],[9,25],[10,18],[11,28]]) {
        g.seek(ch,t); const before = snapshot();
        g.seek(0,8); g.seek(8,7); g.seek(ch,t);
        assert(snapshot() === before, `History-dependent pose at ${ch}:${t}`);
      }
      g.seek(6,20); const rain = g.S.rain.geometry.attributes.position.getY(0);
      g.seek(6,21); assert(rain !== g.S.rain.geometry.attributes.position.getY(0), 'Rain freezes after visualDur');
      g.seek(10,22); const bee = g.S.bees[0].position.clone();
      g.seek(10,23); assert(bee.distanceTo(g.S.bees[0].position) > 0.01, 'Bees freeze after visualDur');
      g.seek(10,15.499); const p = g.S.paresh.position.clone(), a = g.S.anshita.position.clone();
      g.seek(10,15.501);
      assert(p.distanceTo(g.S.paresh.position) < 0.01 && a.distanceTo(g.S.anshita.position) < 0.01, 'Embrace snaps');
      g.seek(6,1); const pot = g.S.potPivots[0].bone.position.clone();
      g.seek(6,2); assert(pot.equals(g.S.potPivots[0].bone.position), 'Set slides within storm shot');
      g.seek(7,30); assert(g.state().visible.includes('tape'), 'Late aftermath tape cue unreachable');
      g.seek(11,28); assert(g.dialogue().text === 'Especially the part with you.', 'Final line lost');
      g.seek(11,31); assert(g.state().filmCard?.kind === 'end', 'Missing ending card');
      return { chapters: g.chapters.length, duration: g.storyDuration,
        drawCalls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles,
        assetWarnings: g.state().assetWarnings };
    });
    for (const [width,height] of [[1440,900],[390,844]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(() => window.__garden.seek(7,12.5));
      const layout = await page.locator('#subtitles').boundingBox();
      assert(layout.x >= 0 && layout.x + layout.width <= width && layout.y + layout.height <= height, 'Subtitle overflow');
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
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert(errors.length === 0, errors.join('\n'));
    return {status:'PASS', ...results};
  } finally {
    await page.evaluate(() => window.__garden?.ready && window.__garden.freeze(true));
    page.off('pageerror', onError);
  }
}
