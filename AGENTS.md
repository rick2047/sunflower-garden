# Project instructions

This is a Blockbench-authored garden experience delivered through static
HTML/JavaScript. Three.js is runtime glue, not the modeling workspace.

## Modeling boundary

- Use the Blockbench MCP for all model creation and edits: characters, plants,
  flowers, seeds, pots, tools, repair tape/supports, and environments/set dressing.
  Reuse existing authored assets where possible and preserve their identity.
- Most 3D work happens in Blockbench: geometry, textures/material appearance,
  groups, pivots, growth/damage/repair variants, and reusable animation rigs.
  Export native `.bbmodel` assets into `models/` and verify them with the existing
  loader. Keep exports self-contained or include their required textures.
- Three.js loads and instances these assets, plays/transforms their authored
  groups, and handles lighting, cameras, atmospheric effects, timeline and UI.
  Build visible objects and environments in Blockbench rather than constructing
  replacement geometry in JavaScript or generating `.bbmodel` JSON by hand.
  Persisting an unchanged MCP export to disk is allowed.
- Assign one implementer ownership of the shared Blockbench editor and source
  files at a time. Inspect the current project before changing it; preserve
  unrelated open projects and user edits. When MCP modeling/export is blocked,
  report the blocker rather than substitute procedural models.

Preserve the local runtime stack. Model files belong in Git; browser captures
and run reports do not.

## Resource ownership

Check host memory/CPU before heavy work. Use one QA browser at a time, freeze
idle WebGL playback, and have reviewers consume saved images. Every agent owns
cleanup of the temporary processes/browser sessions it starts, including after
failures and interrupted handoffs. Close them when no longer needed and report
cleanup before finishing. Preserve unrelated processes, shared Blockbench/MCP
services and the intentionally running preview server. Confirm ownership before
stopping inherited processes; never blanket-kill Chromium or other process names.

For delegated implementation or iterative browser review, read
`docs/iteration-workflow.md`. Use its handoff and evidence contracts. Parallelize
reviews, but give shared source files to only one implementation agent at a time.

Treat narrative details as undecided unless the user supplies an approved brief
for the current task. Infrastructure work does not authorize story changes.
