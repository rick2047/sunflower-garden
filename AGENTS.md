# Project instructions

This is a Three.js garden experience delivered through static HTML/JavaScript.
Three.js is the default workspace for modeling, rigging, animation and rendering.

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
- Give shared source/assets to one implementation owner at a time. Inspect the
  baseline and preserve unrelated user edits before making changes.

Preserve the local runtime stack. Model files belong in Git; browser captures
and run reports do not.

## Progress and commits

- Commit completed work regularly: after each coherent, validated milestone and
  before finishing a task. This is standing authorization for local commits;
  follow any explicit request to defer commits. Push only when requested.
- Stage explicit task files or hunks, preserve unrelated user changes, and report
  commit hashes and any changes left uncommitted. In delegated runs the coordinator
  owns commits; implementation workers hand back validated changes.
- For cinematic improvement work, read `docs/cinematic-improvements.md`. Update
  its checklist in the same milestone as the implementation. Mark completed work
  with validation evidence; keep partial work unchecked with remaining scope.

## Resource ownership

Check host memory/CPU before heavy work. Use one QA browser at a time, freeze
idle WebGL playback, and have reviewers consume saved images. Every agent owns
cleanup of the temporary processes/browser sessions it starts, including after
failures and interrupted handoffs. Close them when no longer needed and report
cleanup before finishing. Preserve unrelated processes, shared tool/MCP
services and the intentionally running preview server. Confirm ownership before
stopping inherited processes; never blanket-kill Chromium or other process names.

For delegated implementation or iterative browser review, read
`docs/iteration-workflow.md`. Use its handoff and evidence contracts. Parallelize
reviews, but give shared source files to only one implementation agent at a time.

Treat narrative details as undecided unless the user supplies an approved brief
for the current task. Infrastructure work does not authorize story changes.
