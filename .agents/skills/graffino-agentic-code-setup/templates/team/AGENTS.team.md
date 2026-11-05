<!-- graffino-agentic:team:begin v1 -->
## Team workflow (tickets, PRs, reviews)

This repo runs the team addon. These rules add to "How we work here" and win where
they are stricter. Team settings: `docs/agents/TEAM.md`.

### Tickets
- **No ticket, no code.** Every change needs a `{{PREFIX}}-<id>` ticket in {{TRACKER}}.
  Without one, stop and ask for it. This overrides any "keep working" default.
- Read the ticket, its parent and **every comment** before work; comments change
  requirements more often than descriptions do.
- Routine ticket updates are allowed without asking: comments that start with
  "AI:", the branch and PR link comment, and moving the ticket to in progress,
  blocked or in review.
- **Creating** a ticket needs the user's OK on the exact text. New tickets go to
  {{BACKLOG}}. Never close a ticket or change its scope fields.
- Tickets you create that depend on each other get the tracker's dependency: the one
  that waits is *blocked by* the one it needs (a screen ticket is blocked by its
  design subtask). A plain link only for related tickets that don't wait on each other.
- A ticket that adds or changes a screen has a **design subtask**. The screen is
  built only after that design is confirmed (`docs/design/DESIGN.md`).

### Deliveries
A **delivery** is one reviewable piece of work: a ticket, or a ticket with the
dependent subtasks that only make sense together. Tracking and code are separate.
- One **integration branch** and one draft PR per delivery, named after the
  delivery's ticket. The PR Summary has one `Fixes {{PREFIX}}-…` or
  `Part of {{PREFIX}}-…` line per ticket it covers. Every covered ticket gets the
  branch and PR links.
- A separate PR only when a part is independently reviewable or releasable, owned by
  someone else, or too big to review with the rest. Then the PRs **stack**: the
  parent ticket's branch has its draft PR into `{{BASE_BRANCH}}`; each subtask
  branches from it (or from the subtask it builds on) and its PR targets it.
- A subtask never needs its own agent, worktree, branch or PR just because it exists.

### Git
- Branch: `feat|fix|chore/<short-name>-{{PREFIX}}-<id>` from `{{BASE_BRANCH}}` (or
  from the parent's branch, above).
- Push the integration branch and open a **draft PR at once**, then comment both
  links on every ticket it covers before any further work.
- **Worker branches** (parallel builders, in a worktree) are private: never pushed,
  no PR, no link comment. Only the conductor updates the integration branch.
- Commits: `{{PREFIX}}-<id> - <type>(<scope>): <what>` naming the ticket the commit
  implements (a subtask's own ID inside a shared delivery), with the co-author
  trailer. History stays linear.
- **Never amend, squash, rebase or force-push anything already pushed.** Update a
  pushed branch from `{{BASE_BRANCH}}` only when a person asks.
- PR description: the five sections of `.github/pull_request_template.md`.
- **Never merge or approve a PR**, and never count your own review as the human
  review. Never touch `{{BASE_BRANCH}}`, `master`/`main`, `release/*`, `hotfix/*`.

### Defects you meet
- One your own work introduced: fix it.
- An existing one that blocks an approved acceptance criterion, with clear expected
  behaviour and a small fix: fix it in the same PR, **reproduction first** (a failing
  test). Name it in the PR's Testing done; no separate ticket.
- Anything else (unrelated, worth releasing on its own, a production problem, growing
  scope): don't fix it; write it under the PR's Observations. Unspecified behaviour or
  conflicting requirements: stop and ask.

### Pipeline
`/start {{PREFIX}}-<id>` runs: product owner → **gate A** (you answer) → `/plan`
→ **gate B** (you approve the plan and the knowledge used) → test author (tests
red) → `/build` → reviewer (at most 2 rounds) → **gate C** (you review and merge).
The conductor **proposes the lane** by risk and you confirm it; the fast lane is plan
→ gate B → build (test first) → reviewer (1 round) → gate C. `/start <ticket> fast`
asks for the fast lane directly. When the intended behaviour changes, the test author
goes first again.

### IDs
Before you take the next ledger ID: `git fetch`, then `ledger-lint.py --next D` on the
up-to-date base branch. On a collision, the ID already on the base branch wins;
renumber yours.

### Journal
Every session ends written down, finished or not, in
`docs/agents/tasks/{{PREFIX}}-<id>/` (the delivery's ticket): `OVERVIEW.md` (context
brief, "Resume here", status, manifest) and `log_YYYY-MM-DD_HHMM.md`. Templates:
`docs/agents/tasks/_templates/`. Each other covered ticket gets a stub `OVERVIEW.md`
(`delivered in:` the delivery's ticket). "What happened on {{PREFIX}}-123?" is
answered from that folder alone. Load only the one ticket folder you need, never the
whole journal. Under `/start`, workers return handoffs and only the conductor writes
the journal.
`docs/agents/STATE.md` holds one row per ticket in flight and the last 10 done (each
row ≤ 220 characters); every session that starts, pauses or finishes a ticket updates
its row.
{{MANUAL_TESTS_RULE}}
<!-- graffino-agentic:team:end -->
