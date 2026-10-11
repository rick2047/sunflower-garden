# Sunflower Garden

A local Three.js prototype using the existing Blockbench models. This setup adds
version control, a development server, and reusable agents. Story development is
a separate task; the prototype's existing content is unchanged.

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

These tests cover the server, not the prototype's scene or narrative.

## Reusable OpenCode agents

Requires OpenCode V2. Project-local definitions live in `.opencode/agents/`:

- `iteration-coordinator`: bounded rounds, handoffs, review consolidation, and
  optional validated Git checkpoints; usable as a primary agent or subagent.
- `implementer`: one scoped change at a time.
- `browser-qa`: Playwright CLI evidence and interaction checks.
- `visual-reviewer`: read-only desktop/mobile screenshot review.
- `narrative-reviewer`: read-only review against a supplied, approved brief;
  otherwise reports `NOT_ASSESSED`.

The shared contract is in **`docs/iteration-workflow.md`**. It defines run inputs,
fixed viewports, evidence, review results, budgets, and stop conditions. Model
selection is inherited from the calling session and recorded per run.

Inspect discovered definitions from this directory:

```sh
opencode debug agents
```

Check discovery, modes, step budgets, and key role permissions reproducibly:

```sh
python3 scripts/check_agents.py
```

If an already-open client has a stale agent list, reload configuration:

```sh
opencode reload
```

Reopen the client if its current conversation still has a cached tool catalog.
Restarting the application server on port 8098 is unrelated to agent loading.

Example request (starts a bounded run only when explicitly submitted):

> Use iteration-coordinator for at most three rounds. Goal: [observable change].
> Scope: [allowed files]. Keep story content unchanged. Use desktop 1440x900 and
> mobile 390x844. Capture evidence under .artifacts/example-run/. Do not commit.

Only one implementer edits shared files; screenshot/content reviews run in
parallel against QA's captures. Captures, run reports, and local logs are ignored
by Git. Authored models, vendor files, and reusable definitions are tracked.
