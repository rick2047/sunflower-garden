# GitHub publishing checklist

Goal: share the finished garden film through GitHub Pages, with public source.
GitHub CLI authentication was verified for `rick2047`.

Public repository: https://github.com/rick2047/sunflower-garden
Site: https://rick2047.github.io/sunflower-garden/

- [ ] Finish and validate the cinematic work tracked in
  [cinematic-improvements.md](cinematic-improvements.md).
  Validated implementation milestone `b442885` is published; remaining subjective
  full-film/audio review and strict insert-visibility polish are tracked there.
- [x] Check Git remotes and repository-name availability; preserve existing remotes.
- [ ] Verify project-relative URLs work under `/sunflower-garden/`, including
  JavaScript modules, models, textures, and other runtime assets.
- [x] Review tracked files for credentials, private material, and asset attribution
  requirements before publishing. Keep local reports and browser captures excluded.
  Common credential/private-key patterns found no matches across Git history;
  no captures or local reports are tracked. Vendored loader files match npm
  three-blockbench 0.1.0; its MIT notice and Three.js r160's MIT notice are included.
- [x] Create the public GitHub repository using the authenticated GitHub CLI.
- [x] Add a GitHub Pages deployment workflow that publishes only the static site
  and required runtime assets.
- [ ] Commit the deployment configuration and push the validated project.
- [ ] Enable GitHub Pages and confirm the deployment succeeds.
- [ ] Test the public URL on desktop and mobile: asset loading, playback,
  subtitles, chapter navigation, pause/replay, and opt-in sound.
- [ ] Add the live link to the README and GitHub repository description/website.
- [ ] Share the verified public link with the user.

GitHub Pages is configured for Actions with HTTPS enforcement. The implementation
passed the browser regression suite, pure-module checks and six server tests
before its first push. Deployment and public-site checks below must pass before
the site is reported as verified live.
