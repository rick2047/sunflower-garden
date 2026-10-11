#!/usr/bin/env python3
"""Check OpenCode V2 agent discovery, model routing, and role permissions."""

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
MODEL_PINS = {
    "iteration-coordinator": ("openai", "gpt-6.1-sol", "medium"),
    "implementer": ("opencode-go", "deepseek-v4.1-flash", "high"),
    "visual-reviewer": ("opencode-go", "gpt-6-luna", "medium"),
    "narrative-reviewer": ("opencode-go", "claude-haiku-5-5", "medium"),
    "browser-qa": ("opencode-go", "deepseek-v4.1-flash", "low"),
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
        subprocess.check_output(
            ["opencode", "debug", "agents"], cwd=ROOT, text=True, timeout=30
        )
    )
    catalog_payload = json.loads(
        subprocess.check_output(
            ["opencode", "api", "get", "/api/model"],
            cwd=ROOT, text=True, timeout=30,
        )
    )
    catalog = {
        (model["providerID"], model["id"]): model
        for model in catalog_payload["data"]
    }
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
        provider, model_id, variant = MODEL_PINS[name]
        selected = agent.get("model", {})
        check(
            (selected.get("providerID"), selected.get("id"), selected.get("variant"))
            == MODEL_PINS[name],
            f"{name} does not match its model/variant pin",
        )
        check((provider, model_id) in catalog, f"{name}'s model is unavailable")
        model = catalog[(provider, model_id)]
        variants = {item["id"] for item in model.get("variants", [])}
        check(variant in variants, f"{name}'s reasoning variant is unavailable")
        check(
            model.get("capabilities", {}).get("tools"),
            f"{name}'s model needs tool support",
        )
        if name in {"visual-reviewer", "narrative-reviewer", "iteration-coordinator"}:
            check(
                "image" in model.get("capabilities", {}).get("input", []),
                f"{name}'s model needs image input for evidence review",
            )
        print(
            f"{name}: {provider}/{model_id}#{variant}; "
            f"mode={mode}; steps={agent['steps']}"
        )

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
    print("Agent discovery, model routing, capabilities, and permission checks passed.")


if __name__ == "__main__":
    main()
