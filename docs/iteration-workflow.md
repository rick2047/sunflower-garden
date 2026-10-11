# Reproducible iteration workflow

These agents define a reusable process, not a finalized story. Agent definitions
are versioned in `.opencode/agents/`, with explicit model and reasoning-variant
pins in their frontmatter. Record each role's actual model and variant in each
run so later comparisons use the same setup.
Reproducibility means matching inputs, checkpoints, and review criteria, not
guaranteeing identical model responses.

## Roles

| Agent | Responsibility | Source edits |
| --- | --- | --- |
| `iteration-coordinator` | Bound the run, dispatch work, consolidate evidence, checkpoint validated changes | None; may write ignored run reports |
| `implementer` | Implement one scoped change with explicit acceptance criteria | Only assigned files |
| `visual-reviewer` | Review screenshots for composition, colour, lighting, and responsive readability | None |
| `narrative-reviewer` | Check supplied content against an explicitly approved brief | None |
| `browser-qa` | Inspect the running site, exercise controls, capture evidence, run existing tests | None; may produce browser artifacts |

The coordinator supports primary or subagent use. The other roles are subagents.
Only the coordinator delegates; only the implementer changes shared source.
Browser QA owns its named browser session. The two reviewers consume its evidence
in parallel instead of navigating the same browser concurrently.

## Model routing

| Role | Default model/variant |
| --- | --- |
| `browser-qa` | `opencode-go/deepseek-v4.1-flash#low` |
| `implementer` | `opencode-go/deepseek-v4.1-flash#high` |
| `narrative-reviewer` | `opencode-go/claude-haiku-5-5#medium` |
| `visual-reviewer` | `opencode-go/gpt-6-luna#medium` |
| `iteration-coordinator` | `openai/gpt-6.1-sol#medium` |

Browser QA is text-based and returns screenshot paths without interpreting them.
The visual and narrative reviewers use image-capable models. Image-dependent
checks belong to those reviews rather than an implicit switch inside browser QA.

Pins apply when agents are launched as subagents. Selecting the coordinator as a
primary agent does not replace an existing session's model; select its pinned
model/variant separately for that session.

For complex 3D transforms, skeletons, animation/performance bugs, or a failed
scoped implementation, propose an explicit Sol override for a fresh implementer
session. The coordinator handles reviewer disagreement and may inspect evidence
for final artistic judgment. Record any override and retain the same scope and
budget. When escalation is not authorized, report it as the next action rather
than silently changing models or starting additional rounds.

## Run request and handoff

Begin with this packet. A coordinator may fill mechanical values by inspecting
the repository; missing creative requirements remain undecided.

```text
Run ID: <unique label>
Goal: <one observable outcome>
Approved constraints/brief: <user requirements, or no narrative brief>
Scope: <explicit files/directories allowed to change>
Base commit: <git rev-parse HEAD>
Initial worktree changes: <git status --short; preserve these>
Models/variants: <actual selection for each role>
URL: http://127.0.0.1:8098
Budget: <maximum rounds and/or deadline>
Checkpoints: false | true
Viewports: 1440x900 desktop; 390x844 mobile
States: <named pages/chapters and exact capture positions>
Evidence: .artifacts/<run-id>/round-<n>/
```

Pass the relevant packet to every child session; they start without the parent's
conversation. Implementation handoffs also specify at most three changes and a
checkable acceptance criterion for each. Review handoffs include source revision,
dirty diff, screenshot paths, and capture settings.

Use three rounds when no round count is supplied. An overnight run requires an
explicit deadline or round count. Checkpointing defaults to false unless the user
authorizes commits. This workflow never starts an unattended run on its own.

## Round sequence

1. **Baseline.** Record the packet, existing changes, and available tooling in
   `.artifacts/<run-id>/round-<n>/packet.md`, creating the evidence directory before
   dispatching QA. Ask `browser-qa` for initial evidence. An unavailable server or
   browser is a blocker, not permission to install software or change unrelated
   services.
2. **Review.** Send the same evidence to `visual-reviewer` and, when there is an
   approved narrative brief, `narrative-reviewer` in parallel. Report narrative
   review as `NOT_ASSESSED` when no brief exists.
3. **Prioritize.** Consolidate duplicate findings. Select one to three changes,
   ordered by broken functionality, violated requirements, then visual polish.
   Give a single `implementer` the scoped handoff and wait for completion.
4. **Validate.** Repeat QA and the applicable reviews using the same states and
   settings. Inspect the diff for scope and preservation of initial user work.
   Unverified states and missing evidence remain explicitly unverified.
5. **Checkpoint.** If authorized, stage explicit validated files and create a
   normal new commit. Skip the commit if it would sweep in pre-existing user work;
   report that limitation. Keep evidence and run reports under `.artifacts/`.
6. **Repeat or finish.** Continue only while the goal remains unmet and the budget
   allows another round. Finish with achieved outcomes, outstanding findings,
   checkpoint hashes, evidence paths, and the next suggested change.

If a regression occurs, send a focused corrective task to the implementer.
Preserve other work; do not reset the checkout or discard changes. Stop on a
tooling blocker, exhausted budget, or the same unresolved blocker in two rounds.

## Evidence contract

- Use a browser session named `qa-<run-id>` and restrict navigation to the supplied
  application and its resources. Close only that session when finished.
- Record browser/version, viewport, device scale, source revision/dirty state,
  checkpoint, animation time, random seed where available, and screenshot path.
- Freeze/seek using an existing application test hook when available. A pause
  control may pause progression without freezing rendering. If deterministic
  rendering is unavailable, label the comparison non-deterministic and propose
  a hook as a separate scoped change rather than claiming pixel reproducibility.
- Capture desktop and mobile states. Check initial load, asset requests, console
  errors, navigation, pause/replay where present, resizing, and reduced motion.
- Snapshots describe DOM controls; screenshots are required to judge a WebGL
  canvas. When image inspection is unavailable, mark visual review blocked.
- Run existing automated checks and report exact commands and results. Test
  absence is a limitation, not a passing test result. Distinguish measured
  performance from visual impressions.

## Review result contract

Each reviewer returns:

```text
Status: PASS | NEEDS_WORK | BLOCKED | NOT_ASSESSED
Revision/checkpoints inspected: <commit/diff, states, viewports>
Evidence: <paths or exact commands/results>
Findings: <up to three, severity ordered>
  Severity: blocking | major | minor
  Observation and location: <specific visible issue or file:line>
  Reproduction: <state, viewport, and steps>
  Acceptance criterion: <observable condition for resolution>
Coverage gaps: <explicitly unverified areas>
```

A checkpoint passes when the assigned acceptance criteria and applicable review
gates pass, no blocking runtime regression exists, and the diff stays in scope.
Infrastructure-only work can use its own automated checks without pretending a
story or visual review has occurred.
