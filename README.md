# Sunflower Garden

**[Watch the latest published build](https://rick2047.github.io/sunflower-garden/)**

An approximately 5-minute 23-second animated story about Paresh, Anshita, and a balcony garden.
This source build presents spoken lines in character speech bubbles; the public
link tracks the latest deployment and can lag unreleased changes. Use **Play** to
watch, **Continue** to advance through dialogue, or the chapter dots to jump
between scenes. The transcript is a separate reading aid. Sound is optional;
enable it with **Sound off**.

A Three.js garden story served as static HTML/JavaScript. Geometry, materials,
rigs and animation can be created or refined directly in code. Existing
Blockbench assets remain supported through the local loader; Blockbench is
optional. Modeling and animation conventions live in `AGENTS.md`.

The approved cinematic work and its completed/remaining items are tracked in
[`docs/cinematic-improvements.md`](docs/cinematic-improvements.md).

## Serve locally

Requires Python 3; no package install or build step:

```sh
python3 scripts/serve.py
```

Open **http://localhost:8098**, or **http://<this-machine-ip>:8098** on the local
network. The default bind address is `0.0.0.0`. For loopback-only access:

```sh
python3 scripts/serve.py --bind 127.0.0.1
```

Keep the process running while developing; Ctrl+C stops a foreground server.
For a detached process that survives closing the terminal, from the project root:

```sh
mkdir -p .local
nohup python3 scripts/serve.py > .local/server.log 2>&1 &
```

Start only one server on the port. This is a trusted-network development server,
not a production deployment. It serves root HTML/CSS/JavaScript and `models/`,
`vendor/`, and `assets/`; it blocks Git metadata, agent/config files, directory
listings, and symlinks to private or external paths. Add any future public asset
directories to the allowlist in `scripts/serve.py`.

Check server behaviour:

```sh
python3 -m unittest discover -s tests -v
```

These Python tests cover the server. Browser regression checks cover nonsequential
seeking, motion continuity, ambient clocks, speech-bubble bounds, sound controls,
pause/replay, the ending hold, and reduced motion:

```sh
playwright-cli -s=garden-check open http://localhost:8098
playwright-cli -s=garden-check run-code --filename=tests/cinematic.cjs
playwright-cli -s=garden-check close
```

Use an available browser/configuration for your host. `film-direction.js` owns
editorial shot tracks and light palettes; `soundscape.js` provides optional local
Web Audio ambience and short foley cues. Sound starts only after pressing **Sound
off**, and pauses with the story. Controls fade during playback and return on
pointer interaction or keyboard focus. Dialogue remains available in the transcript.

## Publishing and source modules

GitHub Pages deploys `main` through `.github/workflows/pages.yml`. Only root
HTML/CSS/JavaScript files and `models/`, `vendor/`, and optional `assets/` enter
the site artifact; tests, agent configuration and local evidence are excluded.
The workflow checks the story modules and Python server tests before deployment.

- `screenplay.js`: chapter data and dialogue timing.
- `story-cues.js`: shared action/audio cues.
- `actor-performance.js`: grounded movement, reach and acting accents.
- `presentation.js`: speech bubble, transcript and controls.
- `film-direction.js` and `soundscape.js`: shots, lighting and optional audio.

Run the pure-module checks with `node tests/story-modules.mjs`. Third-party
notices for Three.js r160 and three-blockbench 0.1.0 are included in
[`vendor/THIRD_PARTY_LICENSES.txt`](vendor/THIRD_PARTY_LICENSES.txt).
Publishing progress is tracked in [`docs/publishing-checklist.md`](docs/publishing-checklist.md).

Local browser captures and reports are ignored by Git; authored models and vendor
files are tracked.
