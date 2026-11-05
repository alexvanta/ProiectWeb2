#!/usr/bin/env python3
"""ClickUp sync (Graffino Agentic Code Setup, ClickUp addon). Stdlib only.

Modes
  pr-link        PR opened or edited: comment the branch and PR links on the ticket
                 named in the branch and on every ticket in the description's
                 "Fixes <ticket>" / "Part of <ticket>" lines (once per ticket and PR).
  pr-ready       PR ready for review: comment on every one of those tickets, and move
                 each to the ready status (never backwards).
  release TAG    Tag pushed: comment "released in TAG" on every ticket in the release.
  publish-docs   Publish docs/agents (and docs/design/DESIGN.md) to a ClickUp Doc, one
                 page per file. Run locally; it updates docs/agents/clickup.json.

Settings: docs/agents/clickup.json
  {"workspace_id": "...", "doc_id": "...", "ready_status": "in review",
   "status_order": ["to do", "in progress", "in review", "done"], "pages": {}}

Environment
  CLICKUP_API_TOKEN   required for real writes (never printed)
  PREFIX              ticket prefix, e.g. ABC
  AUTOMATION_LIVE     "true" = write; anything else = dry run (log only)
  CLICKUP_API_BASE    API base URL (default https://api.clickup.com; tests use a fake)
  GITHUB_EVENT_PATH   set in CI; locally use --branch / --pr-url / --pr-title / --pr-body-file

Local examples
  CLICKUP_API_TOKEN="$(op read 'op://<vault>/<item>/credential')" AUTOMATION_LIVE=true \
    python3 .github/scripts/clickup-sync.py publish-docs
  PREFIX=ABC python3 .github/scripts/clickup-sync.py pr-link --branch feat/x-ABC-12 \
    --pr-url https://github.com/org/repo/pull/7 --pr-title "ABC-12 - feat: x"
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, urllib.error, urllib.request

ROOT = os.getcwd()
CFG_PATH = os.path.join(ROOT, "docs", "agents", "clickup.json")
API = os.environ.get("CLICKUP_API_BASE", "https://api.clickup.com").rstrip("/")
LIVE = os.environ.get("AUTOMATION_LIVE", "").lower() == "true"
PREFIX = os.environ.get("PREFIX", "{{PREFIX}}")
TICKET = re.compile(rf"\b{re.escape(PREFIX)}-\d+\b")


def cfg():
    with open(CFG_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_cfg(c):
    with open(CFG_PATH + ".tmp", "w", encoding="utf-8") as f:
        json.dump(c, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(CFG_PATH + ".tmp", CFG_PATH)


def log(msg):
    print(("" if LIVE else "[dry run] ") + msg, flush=True)


def call(method, path, body=None, write=False):
    """One API call. Writes are skipped in a dry run; reads always run when a token exists."""
    token = os.environ.get("CLICKUP_API_TOKEN")
    if write and not LIVE:
        log(f"{method} {path} {json.dumps(body)[:200] if body else ''}")
        return {}
    if not token:
        if write:
            sys.exit("CLICKUP_API_TOKEN is not set")
        return None
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": token, "Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                time.sleep(5 * (attempt + 1))
                continue
            sys.exit(f"ClickUp {method} {path.split('?')[0]} → HTTP {e.code}")
        except urllib.error.URLError as e:
            sys.exit(f"ClickUp unreachable: {e.reason}")


def task_path(ticket, c, suffix=""):
    return f"/api/v2/task/{ticket}{suffix}?custom_task_ids=true&team_id={c['workspace_id']}"


def comment_once(ticket, text, marker, c):
    existing = call("GET", task_path(ticket, c, "/comment")) or {}
    for cm in existing.get("comments", []):
        if marker in (cm.get("comment_text") or ""):
            print(f"{ticket}: already commented ({marker})")
            return
    call("POST", task_path(ticket, c, "/comment"), {"comment_text": text, "notify_all": False}, write=True)
    log(f"{ticket}: commented")


def pr_from_event(a):
    """The PR's tickets: the one in the branch (or title), then every ticket named on a
    "Fixes <ticket>" / "Part of <ticket>" line of the description (a delivery may cover
    several tickets)."""
    ev = {}
    if os.environ.get("GITHUB_EVENT_PATH") and os.path.exists(os.environ["GITHUB_EVENT_PATH"]):
        ev = json.load(open(os.environ["GITHUB_EVENT_PATH"])).get("pull_request") or {}
    branch = a.branch or ev.get("head", {}).get("ref", "")
    url = a.pr_url or ev.get("html_url", "")
    title = a.pr_title or ev.get("title", "")
    body = open(a.pr_body_file, encoding="utf-8").read() if a.pr_body_file else (ev.get("body") or "")
    repo = os.environ.get("GITHUB_REPOSITORY", os.path.basename(ROOT))
    tickets = []
    m = TICKET.search(branch) or TICKET.search(title)
    if m:
        tickets.append(m.group(0))
    for line in body.splitlines():
        if re.match(r"^\s*(Fixes|Part of)\b", line):
            tickets += [t for t in TICKET.findall(line) if t not in tickets]
    return tickets, branch, url, title, repo


def pr_link(a, c):
    tickets, branch, url, title, repo = pr_from_event(a)
    if not tickets:
        print("no ticket in the branch, PR title or Fixes / Part of lines — nothing to do"); return 0
    for ticket in tickets:
        text = f"AI: Branch `{branch}` in {repo}\nAI: Draft PR {url}"
        comment_once(ticket, text, url, c)
    return 0


def pr_ready(a, c):
    tickets, branch, url, title, repo = pr_from_event(a)
    if not tickets:
        print("no ticket in the branch, PR title or Fixes / Part of lines — nothing to do"); return 0
    ready = c.get("ready_status", "in review")
    order = [s.lower() for s in c.get("status_order", [])]
    for ticket in tickets:
        comment_once(ticket, f"AI: PR ready for review: {url}", f"ready for review: {url}", c)
        task = call("GET", task_path(ticket, c)) or {}
        current = ((task.get("status") or {}).get("status") or "").lower()
        if current and order and ready.lower() in order and current in order \
                and order.index(current) >= order.index(ready.lower()):
            print(f"{ticket}: status '{current}' is already at or past '{ready}' — not moved")
            continue
        call("PUT", task_path(ticket, c), {"status": ready}, write=True)
        log(f"{ticket}: status → {ready}")
    return 0


def release(tag, c):
    tags = subprocess.run(["git", "tag", "--sort=-v:refname"], capture_output=True, text=True).stdout.split()
    prev = next(iter(tags[tags.index(tag) + 1:]), None) if tag in tags else None
    rng = f"{prev}..{tag}" if prev else tag
    text = subprocess.run(["git", "log", "--format=%s%n%b", rng], capture_output=True, text=True).stdout
    repo = os.environ.get("GITHUB_REPOSITORY", os.path.basename(ROOT))
    tickets = sorted(set(TICKET.findall(text)), key=lambda t: int(t.split("-")[-1]))
    print(f"{tag}: {len(tickets)} ticket(s) in {rng}")
    for t in tickets:
        comment_once(t, f"AI: Released in {repo} {tag}", f"Released in {repo} {tag}", c)
    return 0


# ---------- docs publishing ----------

def doc_files():
    ag = os.path.join(ROOT, "docs", "agents")
    order = ["README.md", "STATE.md", "ARCHITECTURE.md", "DECISIONS.md", "PATTERNS.md", "CONTRACTS.md",
             "OPEN-QUESTIONS.md", "MANUAL-TESTS.md", "DECISIONS-SUPERSEDED.md", "PATTERNS-SUPERSEDED.md",
             "REJECTED.md", "BACKFILL-REVIEW.md"]
    out = []
    for name in order:
        p = os.path.join(ag, name)
        if os.path.exists(p):
            out.append((f"docs/agents/{name}", None))
            sub = {"DECISIONS.md": "decisions", "PATTERNS.md": "patterns", "CONTRACTS.md": "contracts",
                   "OPEN-QUESTIONS.md": "questions"}.get(name)
            if sub and os.path.isdir(os.path.join(ag, sub)):
                for f in sorted(os.listdir(os.path.join(ag, sub))):
                    if f.endswith(".md"):
                        out.append((f"docs/agents/{sub}/{f}", f"docs/agents/{name}"))
    if os.path.exists(os.path.join(ROOT, "docs", "design", "DESIGN.md")):
        out.append(("docs/design/DESIGN.md", None))
    return out


def page_body(path):
    text = open(os.path.join(ROOT, path), encoding="utf-8").read()
    text = re.sub(r"<!-- graffino-agentic[^>]*-->\n?", "", text)
    repo = os.path.basename(ROOT)
    title = next((l[2:].strip() for l in text.splitlines() if l.startswith("# ")), path)
    # No commit hash in the header: the page changes only when its file changes.
    head = (f"> Generated from `{repo}:{path}`. **Edit in the repo, comment here.** "
            f"A change made on this page is never copied back.\n\n")
    return title, head + text


def content_hash(name, content):
    return hashlib.sha256((name + "\n" + content).encode("utf-8")).hexdigest()


# ClickUp's editor rewrites a page when someone opens it (adds or drops links, drops list
# markers, escapes punctuation, changes spacing). Only a change to the words is an edit.
_LINK = re.compile(r"\[(`[^`\n]*`|[^\]\n]*)\]\([^)\s]*\)")
_BULLET = re.compile(r"^((?:\s*>)*)\s*[*+-]\s+")
_FENCE = re.compile(r"^```\w*$")
_ESCAPE = re.compile(r"\\([\\`*_{}\[\]()#+\-.!|<>])")


def remote_hash(page):
    lines = []
    for line in ((page or {}).get("content") or "").strip().splitlines():
        line = _ESCAPE.sub(r"\1", _LINK.sub(r"\1", _BULLET.sub(r"\1", line)))
        line = _FENCE.sub("```", re.sub(r"[\s*_]+", "", line))
        if line:
            lines.append(line)
    return hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()


def publish_docs(c, force=()):
    ws, doc = c.get("workspace_id"), c.get("doc_id")
    if not ws or not doc:
        sys.exit("docs/agents/clickup.json needs workspace_id and doc_id")
    pages = c.setdefault("pages", {})
    base = f"/api/v3/workspaces/{ws}/docs/{doc}/pages"
    rep = {"created": [], "updated": [], "unchanged": [], "edited": [], "parent_missing": []}
    for path, parent in doc_files():
        title, body = page_body(path)
        h = content_hash(title, body)
        entry = pages.get(path)
        if entry and entry.get("content_sha256") == h and path not in force:
            rep["unchanged"].append(path)
            continue
        if not entry or not entry.get("page_id"):
            req = {"name": title, "content": body, "content_format": "text/md"}
            if parent:
                parent_id = (pages.get(parent) or {}).get("page_id")
                if not parent_id and LIVE:
                    rep["parent_missing"].append(path)
                    continue
                if parent_id:
                    req["parent_page_id"] = parent_id
            res = call("POST", base, req, write=True) or {}
            log(f"created {path}")
            rep["created"].append(path)
            if not LIVE:
                continue
            page_id = str(res.get("id") or "")
            if not page_id:
                sys.exit(f"create page {path}: no id in the response")
            pages[path] = {"page_id": page_id}
            save_cfg(c)  # saved now, so a later failure cannot create a duplicate page
        else:
            page_id = entry["page_id"]
            remote = call("GET", f"{base}/{page_id}?content_format=text/md")
            stored = entry.get("clickup_content_sha256")
            if remote is not None and stored and remote_hash(remote) != stored and path not in force:
                rep["edited"].append(path)
                print(f"SKIP {path}: edited in ClickUp since the last publish — move that change into "
                      f"the repo, then run: publish-docs --force {path}")
                continue
            call("PUT", f"{base}/{page_id}", {"name": title, "content": body,
                 "content_edit_mode": "replace", "content_format": "text/md"}, write=True)
            log(f"updated {path}")
            rep["updated"].append(path)
            if not LIVE:
                continue
        after = call("GET", f"{base}/{page_id}?content_format=text/md") or {}
        pages[path] = {"page_id": page_id, "content_sha256": h, "clickup_content_sha256": remote_hash(after)}
        save_cfg(c)
    missing = sorted(k for k in pages if k not in {p for p, _ in doc_files()})
    print(f"{len(rep['created'])} created · {len(rep['updated'])} updated · {len(rep['unchanged'])} unchanged")
    for k, label in (("edited", "edited in ClickUp, skipped"), ("parent_missing", "parent page missing, skipped")):
        if rep[k]:
            print(f"{label}: {', '.join(rep[k])}")
    if missing:
        print(f"in clickup.json but no longer in the repo (delete those pages by hand): {', '.join(missing)}")
    if LIVE and (rep["created"] or rep["updated"]):
        print("docs/agents/clickup.json updated — commit it")
    return 1 if rep["edited"] else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["pr-link", "pr-ready", "release", "publish-docs"])
    ap.add_argument("tag", nargs="?")
    ap.add_argument("--branch"); ap.add_argument("--pr-url"); ap.add_argument("--pr-title")
    ap.add_argument("--pr-body-file", help="pr-link / pr-ready: the PR description, for its Fixes / Part of lines")
    ap.add_argument("--force", action="append", default=[], metavar="PATH",
                    help="publish-docs: overwrite this page even if it was edited in ClickUp")
    a = ap.parse_args()
    if not os.path.exists(CFG_PATH):
        print("docs/agents/clickup.json is missing — ClickUp addon not configured; skipped"); return 0
    c = cfg()
    if a.mode != "publish-docs" and not os.environ.get("CLICKUP_API_TOKEN"):
        print("CLICKUP_API_TOKEN is not set — skipped (nothing fails)"); return 0
    if a.mode == "pr-link":
        return pr_link(a, c)
    if a.mode == "pr-ready":
        return pr_ready(a, c)
    if a.mode == "release":
        if not a.tag:
            sys.exit("usage: release <tag>")
        return release(a.tag, c)
    return publish_docs(c, set(a.force))


if __name__ == "__main__":
    sys.exit(main())
