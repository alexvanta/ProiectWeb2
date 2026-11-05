#!/usr/bin/env python3
"""Temporary review UI for backfill clashes (Graffino Agentic Code Setup).

Serves one page on 127.0.0.1 that shows each clash in
docs/agents/backfill-review.json and saves every decision back into that file at
once. Stdlib only. Stops when the reviewer clicks "Done" (or after --idle minutes).

  python3 review-server.py <repo>/docs/agents/backfill-review.json [--port 0] [--no-open]

JSON shape:
  {"repo": "...", "run_date": "YYYY-MM-DD", "recorded_without_review": 0,
   "items": [{"id": "R-001", "title": "...", "kind": "docs vs code",
              "sides": [{"label": "Docs", "says": "...", "evidence": "path:line"}],
              "options": ["...", "..."], "recommendation": 0,
              "recommendation_why": "...", "affects": "..."}],
   "answers": {"R-001": {"choice": 0 | "custom" | "reject", "text": "...", "at": "ISO"}}}
"""
import argparse, json, os, secrets, sys, threading, time, webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

HERE = os.path.dirname(os.path.abspath(__file__))


def load(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("answers", {})
    return data


def save(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("review_json")
    ap.add_argument("--port", type=int, default=0)
    ap.add_argument("--no-open", action="store_true")
    ap.add_argument("--idle", type=int, default=120, help="stop after N idle minutes")
    a = ap.parse_args()
    path = os.path.abspath(a.review_json)
    load(path)  # fail early on a bad file
    token = secrets.token_urlsafe(16)
    page = open(os.path.join(HERE, "review.html"), encoding="utf-8").read()
    lock = threading.Lock()
    state = {"last": time.time(), "done": False}

    class H(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _ok(self, body, ctype="application/json"):
            raw = body.encode() if isinstance(body, str) else body
            self.send_response(200)
            self.send_header("Content-Type", ctype + "; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def _auth(self):
            q = parse_qs(urlparse(self.path).query)
            if q.get("t", [""])[0] != token:
                self.send_error(403)
                return False
            state["last"] = time.time()
            return True

        def do_GET(self):
            if not self._auth():
                return
            route = urlparse(self.path).path
            if route == "/":
                self._ok(page, "text/html")
            elif route == "/api/review":
                with lock:
                    self._ok(json.dumps(load(path)))
            else:
                self.send_error(404)

        def do_POST(self):
            if not self._auth():
                return
            route = urlparse(self.path).path
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or "{}")
            with lock:
                data = load(path)
                ids = {i["id"] for i in data["items"]}
                now = datetime.now(timezone.utc).isoformat(timespec="seconds")
                if route == "/api/answer":
                    for ans in body.get("answers", [body]):
                        if ans.get("id") not in ids:
                            continue
                        if ans.get("clear"):
                            data["answers"].pop(ans["id"], None)
                        else:
                            data["answers"][ans["id"]] = {"choice": ans.get("choice"),
                                                          "text": ans.get("text", ""), "at": now}
                    save(path, data)
                    self._ok(json.dumps({"ok": True, "answered": len(data["answers"])}))
                elif route == "/api/done":
                    data["completed_at"] = now
                    save(path, data)
                    self._ok(json.dumps({"ok": True}))
                    state["done"] = True
                else:
                    self.send_error(404)

    srv = ThreadingHTTPServer(("127.0.0.1", a.port), H)
    url = f"http://127.0.0.1:{srv.server_address[1]}/?t={token}"
    print(f"REVIEW_URL {url}", flush=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    if not a.no_open:
        webbrowser.open(url)
    while not state["done"] and time.time() - state["last"] < a.idle * 60:
        time.sleep(0.5)
    time.sleep(0.5)
    srv.shutdown()
    data = load(path)
    print(f"REVIEW_{'DONE' if state['done'] else 'IDLE_STOP'} answered={len(data['answers'])}/{len(data['items'])}")


if __name__ == "__main__":
    sys.exit(main())
