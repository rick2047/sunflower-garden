# GitHub publishing checklist

Goal: share the finished garden film through GitHub Pages, with public source.
GitHub CLI authentication was verified for `rick2047`.

Planned repository: `rick2047/sunflower-garden` (confirm availability).
Expected site: https://rick2047.github.io/sunflower-garden/

- [ ] Finish and validate the cinematic work tracked in
  [cinematic-improvements.md](cinematic-improvements.md).
- [ ] Check Git remotes and repository-name availability; preserve existing remotes.
- [ ] Verify project-relative URLs work under `/sunflower-garden/`, including
  JavaScript modules, models, textures, and other runtime assets.
- [ ] Review tracked files for credentials, private material, and asset attribution
  requirements before publishing. Keep local reports and browser captures excluded.
- [ ] Create the public GitHub repository using the authenticated GitHub CLI.
- [ ] Add a GitHub Pages deployment workflow that publishes only the static site
  and required runtime assets.
- [ ] Commit the deployment configuration and push the validated project.
- [ ] Enable GitHub Pages and confirm the deployment succeeds.
- [ ] Test the public URL on desktop and mobile: asset loading, playback,
  subtitles, chapter navigation, pause/replay, and opt-in sound.
- [ ] Add the live link to the README and GitHub repository description/website.
- [ ] Share the verified public link with the user.

Coordinate publishing with the active cinematic implementation so only validated
milestones are deployed. This checklist records the agreed plan; no repository
has been created or pushed as part of writing it.
