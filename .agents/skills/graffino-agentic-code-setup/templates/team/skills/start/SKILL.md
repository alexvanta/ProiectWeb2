---
name: start
description: Run one ticket (or a delivery of related tickets) through the team pipeline in this repo - lane proposal, product owner, gate A, plan, gate B, tests first, build, review, gate C - or resume it from its journal. Use when the user says "/start <TICKET-ID>", "/start <TICKET-ID> fast", "start <ticket>", or "what happened on <ticket>?".
---
<!-- graffino-agentic:team:begin v1 -->

# /start <ticket> [fast]

You are the **conductor**. You run the roles in order, carry their output to the
user and hold the gates. You do not analyse, plan or write code yourself. You are the
**integration owner**: git and records only.

Spawn every role with the delivery's ticket, the lane and the path of its **context
brief** (`docs/agents/tasks/<ticket>/OVERVIEW.md` → Context brief). Agents read the
brief first; it orders their reading and never replaces the indexes AGENTS.md
requires.

## 0. Intake
1. A ticket ID is required (prefix in `docs/agents/TEAM.md`). Missing: stop and ask.
2. `git fetch --all --prune`, `git pull --ff-only`.
3. Read `docs/agents/STATE.md`. `docs/agents/tasks/<ticket>/` exists: read OVERVIEW
   ("Resume here") and the newest log, run `git worktree list` (unintegrated worker
   commits), and offer to resume at that phase.
4. "What happened on <ticket>?": answer from that folder alone, then stop.
5. **Propose the lane** with a one-line reason; the user confirms it. The ticket's
   size is a hint when a person set it; never change it.
   - **Full lane** when any of these is true: the expected behaviour is unclear; a
     contract changes substantially; a data migration; security-sensitive code (auth,
     licensing, tokens, permissions); UI without a confirmed design; several
     dependent tickets have to be cut into a delivery.
   - **Fast lane** otherwise: a clear, localized fix, or a normal feature whose
     acceptance criteria are checkable and whose constraints are known.
   - Any lane moves to the full lane the moment one of those markers appears; say so
     and why.

## Full lane
1. **Product owner** (`product-owner` agent) → coverage report.
   **Gate A:** relay it; ask for answers to blocking questions, a missing or
   unconfirmed design (a ticket with UI needs its design subtask, confirmed) and
   which proposed subtasks to create (exact text). Re-run it with the answers. It
   records what stays unanswered, creates the approved tickets with their
   dependencies, and creates `OVERVIEW.md` with the start of the context brief.
2. **Plan** (`/plan`, with the `planner` agent per independent part), one plan per
   delivery. Write it to `docs/agents/tasks/<ticket>/PLAN.md` (template
   `docs/agents/tasks/_templates/PLAN.md`); the planner completes the context brief.
   **Gate B:** show the plan, sizes first, with the knowledge-used table; record each
   call (confirm · wrong · outdated · answered) in PLAN.md. Nothing is built from an
   unapproved plan.
3. **Tests first** (`test-author` agent) on the integration branch. Relay its test
   summary.
4. **Build** (`/build`), following AGENTS.md → Team workflow:
   - **One builder** on the integration branch when parts overlap in files,
     contracts or behaviour, even across several subtasks. When in doubt, one.
   - **Parallel builders** only for truly disjoint parts: each gets
     `isolation: "worktree"` and a **private worker branch** cut from the integration
     tip (after the test author's commits). Never pushed, no PR, no link comment.
   - **Integrate** each worker branch as soon as its handoff arrives (a never-pushed
     branch is lost with its worktree): rebase it onto the integration tip or
     cherry-pick its commits, fast-forward, push. Nothing pushed is rewritten. A
     conflict in a code or test file goes back to a builder; then the affected tests
     run again. Remove a worktree only after its commits are integrated.
   - **A defect** that blocks an approved criterion (AGENTS.md → Defects you meet):
     the builder stops and reports it; the test author writes the failing
     reproduction; then the builder fixes it. It is a deviation at gate C.
5. **Review** (`reviewer` agent) on the integrated branch, after the last worker is
   in. Defects → builder, against the existing tests. An uncovered case → test
   author first. **At most 2 rounds**, then bring it to the user. A check counts only
   for the same code, dependencies and environment: after integration, a conflict
   fix or any later change, the affected checks run again.
6. **Gate C:** report per delivery (and per covered ticket): what was built, tests
   (added · passing · assertions changed by the builder: must be 0 · mechanical
   fixes), in-delivery fixes, deviations, the verdict, files, branch and PR, manual
   tests. When the user says so: mark the PR ready (checks green). With the Slack
   and ClickUp addons, CI then posts the notice and moves every covered ticket; check
   those runs instead of doing it by hand. Without them: send the ready-for-review
   notice from TEAM.md and move every covered ticket to in review. Merging is the
   user's.

## Fast lane
1. Intake; the user confirms the lane. Create `OVERVIEW.md` from the template
   (frontmatter, goal, links).
2. `/plan` in fast mode: the planner reads the ticket, its parent and **every
   comment** itself (there is no product owner), checks coverage (a blocking question
   → full lane), fills the whole context brief and writes the plan. For a clear,
   localized fix the plan can be short: Approach, Files, Acceptance points, Knowledge
   used.
3. **Gate B.**
4. `builder` writes the failing test first (and the reproduction of any in-delivery
   fix), then the code; returns its handoff and test summary.
5. `reviewer`, 1 round (a failure → full lane).
6. **Gate C.**

## Handoffs, not journals
Builders and the test author return a short handoff (shape in `.claude/agents/builder.md`).
You write the shared records from them: the session log, `OVERVIEW.md`, the ticket's
`STATE.md` row (≤ 220 characters), and the ledger lint after ledger changes. Each
other covered ticket gets a stub `docs/agents/tasks/<covered>/OVERVIEW.md`
(`delivered in: <ticket>`, its status, a link to the delivery's folder).

## Always
- When the intended behaviour changes: test author first again, then build, then review.
- Every session ends written down: `log_YYYY-MM-DD_HHMM.md`, OVERVIEW and the
  `STATE.md` row updated, even when the pipeline stops at a gate.
- Open questions go to `docs/agents/OPEN-QUESTIONS.md`; new practices become
  candidate patterns; follow-up tickets are drafted for the user's OK.
- The smallest change that meets the approved criteria (AGENTS.md → Hard rules).
<!-- graffino-agentic:team:end -->
