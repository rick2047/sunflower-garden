# Project instructions

This is a Three.js garden experience delivered through static HTML/JavaScript.
Three.js is the default workspace for modeling, rigging, animation and rendering.

## Ground truths

- During story playback, every dialogue line appears in a speaker-attributed
  speech bubble anchored to the speaking character. The playback presentation is
  not a fixed subtitle or visual-novel dialogue panel. The transcript remains an
  optional reading aid, separate from the cinematic presentation.

## Development cycle

For every technical change, use these skills in order:

1. **Design:** use `codebase-design` to choose the module, interface and seam.
2. **Implement:** use `implement` to make the change, agree on test seams, and
   follow TDD where practical.
3. **Review:** use `code-review` for separate standards and spec reviews; resolve
   findings before finishing or report any that remain open.

The primary agent owns design, implementation, tests and browser validation.
The `code-review` skill may use read-only review subagents; they do not implement
changes or own the task.

## Modeling and animation

- Create and edit geometry, materials, textures, groups, pivots, rigs, variants
  and animation directly in code. Procedural models, runtime asset modifications,
  IK/contact constraints and code-authored animation tracks are supported.
- Reuse existing assets where useful and preserve the characters' visual identity.
  Existing `.bbmodel` files and their loader remain supported; direct asset-file
  edits are allowed. Verify modified assets with the actual runtime loader and
  include required textures. Blockbench is optional, never a prerequisite.
- Keep model construction and reusable rig/animation logic in focused modules.
  Evaluate story animation deterministically so seeking and replay agree. Check
  contact, planted feet, transitions, and resource disposal for affected objects.
- The primary agent owns source, asset, and editor changes for the task. Inspect
  the baseline and preserve unrelated user edits before making changes.

Preserve the local runtime stack. Model files belong in Git; browser captures
and run reports do not.

## Progress and commits

- Commit completed work regularly: after each coherent, validated milestone and
  before finishing a task. This is standing authorization for local commits;
  follow any explicit request to defer commits. Push only when requested.
- Stage explicit task files or hunks, preserve unrelated user changes, and report
  commit hashes and any changes left uncommitted.
- For cinematic improvement work, read `docs/cinematic-improvements.md`. Update
  its checklist in the same milestone as the implementation. Mark completed work
  with validation evidence; keep partial work unchecked with remaining scope.

## Resource ownership

The primary agent handles implementation, validation, and browser review directly.
Check host memory/CPU before heavy work. Use one QA browser at a time and freeze
idle WebGL playback. The primary agent owns cleanup of temporary processes and
browser sessions it starts, including after failures. Close them when no longer
needed. Preserve unrelated processes, shared tool/MCP services, and the intentionally
running preview server. Confirm ownership before stopping inherited processes;
never blanket-kill Chromium or other process names.

Treat narrative details as undecided unless the user supplies an approved brief
for the current task. Infrastructure work does not authorize story changes.
