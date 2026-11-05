# Changelog

## 1.4.0 — 2026-11-05

Rules brought over from FiscalLink-Docs (2026-10-18 to 10-30):

- **Deliveries (team addon):** related tickets that ship together share one
  integration branch and draft PR, with one `Fixes` / `Part of` line per ticket and
  the links on every ticket. Stacked PRs on a parent ticket's branch only when a part
  is separately reviewable or releasable. Commit titles name the ticket they
  implement; nothing pushed is amended, rebased or force-pushed.
- **Lane by risk:** `/start` proposes the full or fast lane from a list of markers
  (unclear behaviour, contract change, migration, security, UI without a confirmed
  design, several dependent tickets); the user confirms. Replaces "fast = size S".
- **Parallel builders** work on private worker branches (never pushed); the conductor
  integrates them (rebase or cherry-pick, fast-forward) and reruns the affected checks.
- **Handoffs:** builders and the test author return a fixed handoff; only the
  conductor writes the session log, OVERVIEW and STATE. A **context brief** in
  OVERVIEW is read first by every agent. Stub OVERVIEWs for covered tickets.
- **Defects met during the work:** fixed in the same PR only when they block an
  approved criterion, are clear and small, reproduction first; anything else goes to
  Observations. Also in the base `/build` (it used to fix every related defect).
- **Simplicity rule:** the smallest change that meets the criteria; a new abstraction,
  dependency or option needs a reason today. In AGENTS.md, `/plan`, `/build` and the
  reviewer.
- **Reviewer:** reviews the integrated branch, reruns the tests there, reads the
  decision indexes in full, checks linear history and covered tickets.
- **Product owner:** subtasks only for separate deliverables, Investigations only for
  questions the code can't answer; tracker dependencies (blocked by) between created
  tickets; Design ticket type (TEAM.md "Ticket types").
- **Design:** designs change only in the repo (`docs/design/mocks/`); the Claude
  Design board is published one way and is where a design is confirmed; Figma is a
  snapshot regenerated on request. "Pull the design" is gone. A ticket with UI needs a
  confirmed design subtask; tickets don't cite DS- IDs.
- **Ledger:** superseded entries move to `DECISIONS-SUPERSEDED.md` /
  `PATTERNS-SUPERSEDED.md`, out of the always-loaded files (`ledger-lint.py --fix`
  moves them and checks it). STATE.md rows ≤ 220 characters. Questions get a
  `Proposed answer` field (the question stays investigating until the user confirms).
- **AGENTS.md:** a "Load on demand" table (when → file), filled from Detect.
- **CI:** the ClickUp and Slack scripts cover every ticket in the PR's `Fixes` /
  `Part of` lines (the ClickUp workflow also runs on edited PRs); `team-checks.py`
  fails when a commit names a ticket the PR Summary doesn't. Workflows offer a
  1Password service account (`OP_SERVICE_ACCOUNT_TOKEN`) or a repository secret. The
  Graffino self-hosted runner is recommended (still asked).
- **`.gitignore`:** `.claude/worktrees/` is ignored.

## 1.3.1 — 2026-10-23

- **Non-visual builder agent:** the note now also changes "steps 2–6" to
  "steps 2–5" in `.claude/agents/builder.md`. After the build skill loses its UI
  step, step 6 is Report, which the builder agent must not run.

## 1.3.0 — 2026-10-23

Lessons from the SysOps-Fleet setup (2026-10-22):

- **`.gitignore` check:** a repo that ignores all of `.claude/` now gets
  `.claude/*` + `!.claude/skills/` + `!.claude/agents/`, so the project skills and
  agents are committed while local settings stay ignored.
- **Non-visual repos:** the UI parts are removed from all four copied files (plan
  skill, build skill, planner and builder agents), not only from the build skill.
- **IDs from other repos** are written with the repo prefix (`<repo>:D-0NN`), so the
  lint does not read them as local references.
- **Review UI:** never edit `backfill-review.json` while the server runs; it saves
  every click and overwrites manual edits.
- **Archaeologist brief:** never print process lists with arguments or environment
  dumps (they can hold enroll secrets and tokens).

## 1.2.1 — 2026-10-22

- **Ledger lint fix:** an ID inside a consumed-contract link
  (`` `<repo>:docs/agents/CONTRACTS.md#C-0NN` ``) no longer counts as a local
  reference. Before, the lint reported "refers to C-0NN, which does not exist"
  for every valid link whose ID had no local entry of the same number. Repos set
  up with 1.2.0 get the fix on a re-run (the lint is copied as is).

## 1.2.0 — 2026-10-15

- **ClickUp addon** (always asked): `.github/scripts/clickup-sync.py` (stdlib) +
  `clickup.yml`. CI comments the branch and PR links on the ticket (once), comments
  and moves the ticket to the ready status when a PR is ready (never backwards),
  and comments "released in" on every ticket of a tag. `publish-docs` publishes
  `docs/agents` (+ DESIGN.md) to a ClickUp Doc, one page per file, topic files under
  their index page; unchanged pages are not written; a page whose words were
  edited in ClickUp (a normalised text fingerprint ignores the editor's own rewrites)
  is skipped and reported (`--force` to overwrite); a new page ID is saved at once,
  so a failure cannot create a duplicate. Dry run until `AUTOMATION_LIVE=true`.
- **Slack addon** (always asked): `.github/scripts/slack-notify.py` (stdlib) +
  `slack.yml`: "<PR> Ready for review." and a release notice with the tickets and
  the manual tests still open, through an incoming webhook. Dry run until
  `AUTOMATION_LIVE=true`.

- **Ledger lint** (`docs/agents/tools/ledger-lint.py`, copied into each repo):
  unique IDs per kind, required fields incl. evidence, valid statuses,
  `superseded-by` targets exist, indexes in sync (`--fix` rebuilds them),
  consumed-contract links resolve against provider repos on disk, `--next D`.
- **Index + topic files:** ledgers above ~150 lines split into
  `docs/agents/<kind>/<topic>.md`; the main file keeps the index, grouped by topic.
- **Confirmed dates:** a user's "confirm" in a plan sets `Confirmed:` on the entry;
  `/plan` collapses unchanged confirmed entries; any edit removes the date.
- **Guide for people:** `docs/agents/README.md`, one page.
- **Design board pull:** "pull the design" copies a Claude Design board into
  `docs/design/board/` and updates the DS- registry.
- **Team addon:** `docs/agents/STATE.md` (tickets in flight, recently done, ≤ 150
  lines; lint-checked), read by `/start`, updated every session.
- **Backfill:** docs that lag behind the code are fixed, not sent to review; only a
  doc that may state the intended behaviour is a clash.
- **Ledger entries:** `Source:` + confidence, `Owner note:`; questions get
  `investigating` and `Recorded as:`.
- **`docs/agents/REJECTED.md`:** rejected proposals and backfill findings, never
  re-proposed without new evidence; PROPOSAL shape names the supersede.
- **Rule:** cite past work as "replicate" (approved patterns only) or "for awareness
  only"; history is not a template.
- **Lint:** references to IDs that do not exist, broken relative links, sibling
  repos found in `../` and `../../*/`.
- **Team addon:** `PLAN.md` ticket template with the gate B record; one ticket folder
  at a time; `git fetch` before taking an ID (base branch wins a collision); full
  manual-test rules (queue + history, statuses, waiver person, baseline, regression
  runs, environments); `.github/manual-test-paths`; onboarding block for people;
  CI runs the ledger lint, checks manual-test paths, and reports each release's
  tickets and open manual tests on a tag.

## 1.1.0 — 2026-10-15

- **Backfill** for existing repos: parallel read-only archaeologist agents
  (structure, contracts, rules, history, docs lenses) mine the code, the full git
  history and merged PRs, the docs and the local Claude memory.
- **Assume from the code:** what the code consistently follows is recorded as
  `approved` with evidence; only clashes go to review.
- **Review UI:** a temporary local page (`templates/backfill/review-server.py` +
  `review.html`, stdlib only, token-protected, 127.0.0.1) with one clash per card,
  keyboard decisions (1–9, R, E, X, U), "Accept all recommendations", instant save,
  auto-stop. `BACKFILL-REVIEW.md` keeps the record (decided, rejected).
- **Contracts** (`C-` IDs) in `docs/agents/CONTRACTS.md`: the provider owns the
  text, consumers link to it; both sides are checked when the other repo is on disk.
- **Architecture** in `docs/agents/ARCHITECTURE.md`, generated from the code.
- `/plan`, the planner and the reviewer load and check contracts.

## 1.0.0 — 2026-10-15

First release.

- Base setup: `AGENTS.md` with the gate and hard rules, `CLAUDE.md`, `CONTEXT.md`,
  decisions / patterns / open-questions ledger, `/plan` and `/build` skills,
  planner and builder agents.
- Existing knowledge: imports `CLAUDE.md`, `AGENTS.md`, `docs/` and the repo's local
  Claude memory into the ledger after a check against the code.
- Visual apps: `docs/design/DESIGN.md` (guardrails, UI procedure, real tokens),
  `registry.yaml` with DS- IDs, screenshot procedure.
- Optional team addon, always asked: tickets, ticket branches and commit titles,
  draft PRs with a five-section template, `/start` pipeline with product owner,
  test author and reviewer agents and three gates, a journal per ticket, manual
  tests, and a self-contained CI check (`team-checks.py`; asks for the runner).
- Piloted on SysOps-Fleet-AppStore.
