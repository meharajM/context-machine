#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

EXPECTED = [
    "team-project-memory",
    "team-memory-search",
    "team-memory-capture",
    "team-memory-maintenance",
]
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def parse_frontmatter(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("missing opening YAML delimiter")

    try:
        frontmatter, body = text[4:].split("\n---\n", 1)
    except ValueError as exc:
        raise ValueError("missing closing YAML delimiter") from exc

    data: dict[str, object] = {}
    metadata: dict[str, str] | None = None

    for raw in frontmatter.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue

        if raw.startswith("  ") and metadata is not None:
            key, sep, value = raw.strip().partition(":")
            if not sep:
                raise ValueError(f"invalid metadata line: {raw}")
            metadata[key.strip()] = value.strip().strip('"')
            continue

        metadata = None
        key, sep, value = raw.partition(":")
        if not sep:
            raise ValueError(f"invalid frontmatter line: {raw}")

        key = key.strip()
        value = value.strip().strip('"')
        if key == "metadata":
            metadata = {}
            data[key] = metadata
        else:
            data[key] = value

    if not body.strip():
        raise ValueError("empty skill body")
    return data


def validate_skill(root: Path, name: str) -> list[str]:
    errors: list[str] = []
    path = root / name / "SKILL.md"

    if not path.is_file():
        return [f"{path}: missing"]

    try:
        data = parse_frontmatter(path)
    except Exception as exc:
        return [f"{path}: {exc}"]

    actual_name = data.get("name")
    description = data.get("description")
    license_name = data.get("license")
    metadata = data.get("metadata")

    if actual_name != name:
        errors.append(f"{path}: name must equal directory name {name!r}")
    if not isinstance(actual_name, str) or not NAME_RE.fullmatch(actual_name):
        errors.append(f"{path}: invalid skill name")
    if not isinstance(description, str) or not (1 <= len(description) <= 1024):
        errors.append(f"{path}: description must contain 1-1024 characters")
    if license_name != "MIT":
        errors.append(f"{path}: expected license: MIT")
    if not isinstance(metadata, dict):
        errors.append(f"{path}: metadata mapping is required by this repository")
    else:
        if metadata.get("author") != "meharajM":
            errors.append(f"{path}: metadata.author must be meharajM")
        if metadata.get("repository") != "meharajM/context-machine":
            errors.append(
                f"{path}: metadata.repository must be meharajM/context-machine"
            )

    return errors


def compare_trees(left: Path, right: Path) -> list[str]:
    errors: list[str] = []
    for name in EXPECTED:
        left_files = {
            p.relative_to(left / name): p.read_bytes()
            for p in (left / name).rglob("*")
            if p.is_file()
        }
        right_files = {
            p.relative_to(right / name): p.read_bytes()
            for p in (right / name).rglob("*")
            if p.is_file()
        }

        if left_files.keys() != right_files.keys():
            errors.append(f"{left / name} and {right / name}: file sets differ")
            continue

        for relpath, content in left_files.items():
            if right_files[relpath] != content:
                errors.append(
                    f"{left / name / relpath} differs from {right / name / relpath}"
                )
    return errors


def main() -> int:
    errors: list[str] = []
    canonical = Path("skills")
    package = Path("packages/team-project-memory-skill/skills")
    plugin = Path("plugins/team-project-memory/skills")

    for name in EXPECTED:
        errors.extend(validate_skill(canonical, name))

    errors.extend(compare_trees(canonical, package))
    errors.extend(compare_trees(canonical, plugin))

    skills_config = json.loads(Path("skills.sh.json").read_text(encoding="utf-8"))
    configured = skills_config["groupings"][0]["skills"]
    if configured != EXPECTED:
        errors.append("skills.sh.json does not list the expected skills in order")

    package_json = json.loads(
        Path("packages/team-project-memory-skill/package.json").read_text(
            encoding="utf-8"
        )
    )
    plugin_json = json.loads(
        Path("plugins/team-project-memory/.codex-plugin/plugin.json").read_text(
            encoding="utf-8"
        )
    )

    if package_json.get("license") != "MIT":
        errors.append("skill package must declare MIT")
    if plugin_json.get("license") != "MIT":
        errors.append("Codex plugin must declare MIT")
    if package_json.get("version") != plugin_json.get("version"):
        errors.append("skill package and plugin versions differ")

    if errors:
        print("Agent Skills validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Agent Skills validation passed.")
    print("Skills:")
    for name in EXPECTED:
        print(f"- {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
