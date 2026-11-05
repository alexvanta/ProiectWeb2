<!-- graffino-agentic:team:begin v1 -->
## Team workflow (for people)

**First day:** connect the tracker to Claude Code (TEAM.md → "Tracker access for
agents"), then check it with "get ticket {{PREFIX}}-1". Read AGENTS.md → Team workflow
and `STATE.md`.

| You want to | Do |
|---|---|
| Run a ticket | `/start {{PREFIX}}-123`: it proposes the full or fast lane by risk and you confirm (`/start {{PREFIX}}-123 fast` asks for the fast lane) |
| Your 3 decisions | **Gate A** answer the questions · **Gate B** approve the plan and its knowledge · **Gate C** review and merge (the fast lane keeps B and C) |
| Resume a ticket | `/start {{PREFIX}}-123` again; it resumes from `tasks/{{PREFIX}}-123/OVERVIEW.md` |
| Know what happened | "What happened on {{PREFIX}}-123?" |
| See what is in flight | `STATE.md` |
| See what needs a manual test | `MANUAL-TESTS.md` → Queue |

**Traceability:** ticket `{{PREFIX}}-123` → branch `feat/<short-name>-{{PREFIX}}-123`
(links commented on every ticket it covers) → commits `{{PREFIX}}-123 - <type>(<scope>): …`,
each naming the ticket it implements → PR with one "Fixes …" / "Part of …" line per
ticket → journal `docs/agents/tasks/{{PREFIX}}-123/`. Related tickets that ship
together share one branch and PR (a delivery); parallel agents work on private
branches the conductor integrates.

Agents never merge, approve, close tickets, or mark a manual test passed.
<!-- graffino-agentic:team:end -->
