# Sunflower Garden

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
seeking, motion continuity, ambient clocks, subtitle bounds, sound controls,
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

## Reusable OpenCode agents

Requires OpenCode V2. Project-local definitions live in `.opencode/agents/`:

- `iteration-coordinator`: bounded rounds, handoffs, review consolidation, and
  optional validated Git checkpoints; usable as a primary agent or subagent.
- `implementer`: scoped Three.js modeling, animation and runtime integration.
- `browser-qa`: text-based Playwright CLI checks and screenshot capture.
- `visual-reviewer`: read-only desktop/mobile screenshot review; requires an
  image-capable model.
- `narrative-reviewer`: read-only review against a supplied, approved brief;
  otherwise reports `NOT_ASSESSED`.

Agent behaviour and permissions are defined directly in these Markdown files.
Use **`docs/iteration-workflow.md`** for bounded implementation rounds and shared
browser evidence. There is no separate agent-setup checker or model audit.

Normally keep Build as the main agent and ask it to launch
`iteration-coordinator` as a subagent. The project's
`experimental.subagent_depth: 2` permits Build → coordinator → worker, while
worker permissions prevent another delegation level.

Example request (starts a bounded run only when explicitly submitted):

> Use iteration-coordinator for at most three rounds. Goal: [observable change].
> Scope: [allowed files]. Keep story content unchanged. Use desktop 1440x900 and
> mobile 390x844. Capture evidence under .artifacts/example-run/. Do not commit.

Only one implementer edits shared files; screenshot/content reviews run in
parallel against QA's captures. Captures, run reports, and local logs are ignored
by Git. Authored models, vendor files, and reusable definitions are tracked.
