#!/usr/bin/env python3
"""Slack notices (Graffino Agentic Code Setup, Slack addon). Stdlib only.

Modes
  pr-ready       PR ready for review → "<PR link> Ready for review." (+ ticket link)
  release TAG    Tag pushed → the release, its tickets and the manual tests still open
  text "MSG"     Any one-line notice (for a deploy step or a local run)

Settings: docs/agents/slack.json
  {"channel_label": "#dev-myapp", "ticket_url": "https://app.clickup.com/t/<ws>/{ticket}",
   "notify": {"pr_ready": true, "release": true}}

Environment
  SLACK_WEBHOOK_URL   incoming-webhook URL (a secret: never printed, never committed)
  PREFIX              ticket prefix (optional; links tickets when ticket_url is set)
  AUTOMATION_LIVE     "true" = post; anything else = dry run (prints the message)
  GITHUB_EVENT_PATH   set in CI
"""
import argparse, json, os, re, subprocess, sys, urllib.error, urllib.request

ROOT = os.getcwd()
CFG_PATH = os.path.join(ROOT, "docs", "agents", "slack.json")
LIVE = os.environ.get("AUTOMATION_LIVE", "").lower() == "true"
PREFIX = os.environ.get("PREFIX", "")
TICKET = re.compile(rf"\b{re.escape(PREFIX)}-\d+\b") if PREFIX else None


def cfg():
    with open(CFG_PATH, encoding="utf-8") as f:
        return json.load(f)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def link(url, text):
    return f"<{url}|{esc(text)}>" if url else esc(text)


def ticket_link(t, c):
    tpl = c.get("ticket_url")
    return link(tpl.replace("{ticket}", t), t) if tpl else t


def post(text):
    hook = os.environ.get("SLACK_WEBHOOK_URL")
    if not LIVE or not hook:
        why = "dry run" if not LIVE else "SLACK_WEBHOOK_URL not set"
        print(f"[{why}] would post:\n{text}")
        return 0
    req = urllib.request.Request(hook, data=json.dumps({"text": text}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            r.read()
    except urllib.error.HTTPError as e:
        print(f"Slack webhook → HTTP {e.code}"); return 1
    except urllib.error.URLError as e:
        print(f"Slack unreachable: {e.reason}"); return 1
    print("posted")
    return 0


def pr_ready(c):
    ev = {}
    if os.environ.get("GITHUB_EVENT_PATH") and os.path.exists(os.environ["GITHUB_EVENT_PATH"]):
        ev = json.load(open(os.environ["GITHUB_EVENT_PATH"])).get("pull_request") or {}
    if not ev:
        print("no pull_request event — nothing to post"); return 0
    url, title = ev.get("html_url", ""), ev.get("title", "")
    named = " ".join(l for l in (ev.get("body") or "").splitlines() if re.match(r"^\s*(Fixes|Part of)\b", l))
    tickets = sorted(set(TICKET.findall(f"{title} {ev.get('head', {}).get('ref', '')} {named}")),
                     key=lambda t: int(t.split("-")[-1])) if TICKET else []
    extra = f" · {', '.join(ticket_link(t, c) for t in tickets)}" if tickets else ""
    return post(f"{link(url, title or url)} Ready for review.{extra}")


def release(tag, c):
    tags = subprocess.run(["git", "tag", "--sort=-v:refname"], capture_output=True, text=True).stdout.split()
    prev = next(iter(tags[tags.index(tag) + 1:]), None) if tag in tags else None
    rng = f"{prev}..{tag}" if prev else tag
    log = subprocess.run(["git", "log", "--format=%s%n%b", rng], capture_output=True, text=True).stdout
    repo = os.environ.get("GITHUB_REPOSITORY", os.path.basename(ROOT))
    lines = [f"*{esc(repo)} {esc(tag)}* released" + (f" (since {esc(prev)})" if prev else "")]
    if TICKET:
        tickets = sorted(set(TICKET.findall(log)), key=lambda t: int(t.split("-")[-1]))
        lines.append(f"Tickets ({len(tickets)}): " + (", ".join(ticket_link(t, c) for t in tickets) or "none"))
    mt = os.path.join(ROOT, "docs", "agents", "MANUAL-TESTS.md")
    if os.path.exists(mt):
        queue = open(mt, encoding="utf-8").read().split("## Queue", 1)[-1].split("## History", 1)[0]
        open_rows = [l.split("|")[1].strip() for l in queue.splitlines()
                     if l.startswith("| MT-") and ("🔴" in l or "❌" in l)]
        lines.append(f"Manual tests still open: {', '.join(open_rows) if open_rows else 'none'}")
    return post("\n".join(lines))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["pr-ready", "release", "text"])
    ap.add_argument("arg", nargs="?")
    a = ap.parse_args()
    if not os.path.exists(CFG_PATH):
        print("docs/agents/slack.json is missing — Slack addon not configured; skipped"); return 0
    c = cfg()
    notify = c.get("notify", {})
    if a.mode == "pr-ready":
        return pr_ready(c) if notify.get("pr_ready", True) else 0
    if a.mode == "release":
        if not a.arg:
            sys.exit("usage: release <tag>")
        return release(a.arg, c) if notify.get("release", True) else 0
    if not a.arg:
        sys.exit('usage: text "message"')
    return post(esc(a.arg))


if __name__ == "__main__":
    sys.exit(main())
