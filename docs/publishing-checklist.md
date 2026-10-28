# GitHub publishing checklist

Goal: share the finished garden film through GitHub Pages, with public source.
GitHub CLI authentication was verified for `rick2047`.

Public repository: https://github.com/rick2047/sunflower-garden
Site: https://rick2047.github.io/sunflower-garden/

- [x] Finish and validate the cinematic work tracked in
  [cinematic-improvements.md](cinematic-improvements.md).
  Published milestones `b442885` and `515a592`; remaining subjective full-film,
  audio and strict insert-visibility review is explicitly left open there.
- [x] Check Git remotes and repository-name availability; preserve existing remotes.
- [x] Verify project-relative URLs work under `/sunflower-garden/`, including
  JavaScript modules, models, textures, and other runtime assets.
  The public Pages URL returned HTTP 200 for all 40 tracked runtime JS/model/vendor
  paths. The public browser regression suite also passed on desktop and mobile.
- [x] Review tracked files for credentials, private material, and asset attribution
  requirements before publishing. Keep local reports and browser captures excluded.
  Common credential/private-key patterns found no matches across Git history;
  no captures or local reports are tracked. Vendored loader files match npm
  three-blockbench 0.1.0; its MIT notice and Three.js r160's MIT notice are included.
- [x] Create the public GitHub repository using the authenticated GitHub CLI.
- [x] Add a GitHub Pages deployment workflow that publishes only the static site
  and required runtime assets.
- [x] Commit the deployment configuration and push the validated project.
- [x] Enable GitHub Pages and confirm the deployment succeeds.
  Latest verified deployment: commit `515a592`, Actions run
  [40685706097](https://github.com/rick2047/sunflower-garden/actions/runs/40685706097).
- [x] Test the public URL on desktop and mobile: asset loading, playback,
  speaker-attributed speech bubbles, chapter navigation, pause/replay, and opt-in sound.
  `tests/cinematic.cjs` passed against the public origin at both viewports; sampled
  public action captures are in the ignored `.artifacts/cinematic-direct-20261028/`.
- [x] Add the live link to the README and GitHub repository description/website.
- [x] Share the verified public link with the user.

Verified live: **https://rick2047.github.io/sunflower-garden/**

GitHub Pages is configured for Actions with HTTPS enforcement. The deployment
workflow runs the pure story-module checks and six Python server tests before
publishing the explicit static-site allowlist.
