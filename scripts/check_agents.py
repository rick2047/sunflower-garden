#!/usr/bin/env python3
"""Check that OpenCode V2 discovers the project's agents and role permissions."""

import fnmatch
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parent.parent
EXPECTED = {
    "iteration-coordinator": "all",
    "implementer": "subagent",
    "visual-reviewer": "subagent",
    "narrative-reviewer": "subagent",
    "browser-qa": "subagent",
}


def effect(agent, action, resource):
    result = None
    for rule in agent["permissions"]:
        resource_matches = fnmatch.fnmatchcase(resource, rule["resource"])
        if rule["resource"].endswith(" *"):
            resource_matches |= resource == rule["resource"][:-2]
        if fnmatch.fnmatchcase(action, rule["action"]) and resource_matches:
            result = rule["effect"]
    return result


def check(condition, message):
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def main():
    discovered = json.loads(
        subprocess.check_output(["opencode", "debug", "agents"], cwd=ROOT, text=True)
    )
    agents = {agent["id"]: agent for agent in discovered}
    files = {path.stem for path in (ROOT / ".opencode/agents").glob("*.md")}
    check(set(EXPECTED) <= files, "an agent definition is missing")
    for name, mode in EXPECTED.items():
        check(name in agents, f"{name} was not discovered")
        agent = agents[name]
        check(agent["mode"] == mode, f"{name} has the wrong mode")
        check(agent.get("steps", 0) > 0, f"{name} needs a step budget")
        check(
            "docs/iteration-workflow.md" in agent.get("system", ""),
            f"{name} does not reference the shared workflow",
        )
        if name != "iteration-coordinator":
            check(
                effect(agent, "subagent", "implementer") == "deny",
                f"{name} can unexpectedly delegate",
            )
        if name in {"visual-reviewer", "narrative-reviewer", "browser-qa"}:
            check(
                effect(agent, "edit", "garden.js") == "deny",
                f"{name} can unexpectedly edit source",
            )
        print(f"{name}: mode={mode}; steps={agent['steps']}; discovered")

    checks = [
        ("iteration-coordinator", "edit", "garden.js", "deny"),
        ("iteration-coordinator", "edit", ".artifacts/test/packet.md", "allow"),
        ("iteration-coordinator", "shell", "git commit --amend", "deny"),
        ("implementer", "shell", "git commit -m test", "deny"),
        ("browser-qa", "shell", "playwright-cli -s=qa-test snapshot", "allow"),
        ("visual-reviewer", "shell", "touch garden.js", "deny"),
    ]
    for name, action, resource, expected in checks:
        check(
            effect(agents[name], action, resource) == expected,
            f"{name}: unexpected permission for {action}:{resource}",
        )
    print("Agent discovery and role permission checks passed.")


if __name__ == "__main__":
    main()
