#!/usr/bin/env python3
"""Team workflow checks for a pull request (Graffino agentic team addon).

Checks the branch name, every commit title in the PR, the five PR description
sections, the "Fixes / Part of <ticket>" lines (every ticket a commit names is one of
them, or the branch's ticket), and - when the PR changes a path in
.github/manual-test-paths - that the description names an MT- entry or says
"Manual test: not needed". Self-contained: reads only the GitHub event file and the
local git history. Exit 1 on any failure.

Release mode (on a tag; reports, never fails):
  python3 .github/scripts/team-checks.py --release v1.4.0
lists the tickets in the release and the manual tests still in the queue.

Local run:  PREFIX=ABC python3 .github/scripts/team-checks.py --branch feat/x-ABC-12 \
              --base origin/develop --body-file pr.md
"""
import argparse, fnmatch, json, os, re, subprocess, sys

PREFIX = os.environ.get("PREFIX", "{{PREFIX}}")
TICKET = rf"{re.escape(PREFIX)}-\d+"
BRANCH_RE = re.compile(rf"^(feat|fix|chore)/[a-z0-9][a-z0-9-]*-{TICKET}$")
COMMIT_RE = re.compile(rf"^{TICKET} - (feat|fix|chore|docs|test|refactor|perf|build|ci|style)(\([^)]+\))?!?: \S")
SECTIONS = ["Summary", "What to review", "Need to know's for reviewing", "Testing done", "Observations"]
LINK_RE = re.compile(rf"^(Fixes|Part of) {TICKET}\b", re.M)


def commit_titles(base, head):
    out = subprocess.run(["git", "log", "--format=%s", "--no-merges", f"{base}..{head}"],
                         capture_output=True, text=True, check=True).stdout
    return [line for line in out.splitlines() if line]


def changed_files(base, head):
    out = subprocess.run(["git", "diff", "--name-only", f"{base}...{head}"],
                         capture_output=True, text=True, check=True).stdout
    return [f for f in out.splitlines() if f]


def manual_test_globs():
    path = ".github/manual-test-paths"
    if not os.path.exists(path):
        return []
    return [l.strip() for l in open(path) if l.strip() and not l.startswith("#")]


def release(tag):
    tags = subprocess.run(["git", "tag", "--sort=-v:refname"], capture_output=True, text=True).stdout.split()
    prev = next((t for t in tags[tags.index(tag) + 1:]), None) if tag in tags else None
    rng = f"{prev}..{tag}" if prev else tag
    log = subprocess.run(["git", "log", "--format=%s%n%b", rng], capture_output=True, text=True).stdout
    tickets = sorted(set(re.findall(TICKET, log)), key=lambda t: int(t.split("-")[-1]))
    print(f"Release {tag} ({rng}): {len(tickets)} ticket(s)")
    for t in tickets:
        print(f"  - {t}")
    mt = "docs/agents/MANUAL-TESTS.md"
    if os.path.exists(mt):
        text = open(mt, encoding="utf-8").read()
        queue = text.split("## Queue", 1)[-1].split("## History", 1)[0]
        open_rows = [l for l in queue.splitlines() if l.startswith("| MT-") and ("🔴" in l or "❌" in l)]
        print(f"Manual tests still open: {len(open_rows)}")
        for l in open_rows:
            print("  " + l)
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--branch"); ap.add_argument("--base"); ap.add_argument("--head", default="HEAD")
    ap.add_argument("--body-file")
    ap.add_argument("--release", metavar="TAG")
    a = ap.parse_args()
    if a.release:
        return release(a.release)

    branch, base, body = a.branch, a.base, None
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if event_path and os.path.exists(event_path):
        pr = json.load(open(event_path)).get("pull_request") or {}
        branch = branch or pr.get("head", {}).get("ref")
        base = base or ("origin/" + pr.get("base", {}).get("ref", "develop"))
        body = pr.get("body") or ""
    if a.body_file:
        body = open(a.body_file).read()

    errors = []
    if branch and not BRANCH_RE.match(branch):
        errors.append(f"branch '{branch}' must be feat|fix|chore/<short-name>-{PREFIX}-<id>")
    titles = commit_titles(base, a.head) if base else []
    for title in titles:
        if not COMMIT_RE.match(title):
            errors.append(f"commit '{title}' must be '{PREFIX}-<id> - <type>(<scope>): <what>'")
    globs = manual_test_globs()
    if base and globs and body is not None:
        hits = [f for f in changed_files(base, a.head) if any(fnmatch.fnmatch(f, g) for g in globs)]
        if hits and not re.search(r"\bMT-\d{3,}\b|Manual test: not needed", body):
            errors.append(f"changes manual-test paths ({', '.join(hits[:3])}{'…' if len(hits) > 3 else ''}): "
                          "name the MT- entry or write 'Manual test: not needed' in the description")
    if body is not None:
        for s in SECTIONS:
            if not re.search(rf"^##\s+{re.escape(s)}\s*$", body, re.M):
                errors.append(f"PR description misses the section '## {s}'")
        if not LINK_RE.search(body):
            errors.append(f"PR Summary needs 'Fixes {PREFIX}-<id>' or 'Part of {PREFIX}-<id>'")
        covered = {m.group(0) for line in body.splitlines() if re.match(r"^(Fixes|Part of) ", line)
                   for m in re.finditer(TICKET, line)}
        covered |= set(re.findall(TICKET, branch or ""))
        for t in sorted({re.match(TICKET, x).group(0) for x in titles if re.match(TICKET, x)} - covered):
            errors.append(f"commits name {t}, but the PR Summary has no 'Fixes {t}' / 'Part of {t}' line")

    for e in errors:
        print(f"::error::{e}" if event_path else f"✗ {e}")
    if not errors:
        print("✓ team checks passed")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
