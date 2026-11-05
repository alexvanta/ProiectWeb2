# TEAM — {{repo}}

<!-- graffino-agentic:team:begin v1 -->
> Settings for the team addon. AGENTS.md → "Team workflow" holds the rules; this
> file holds the values they use. Change a value here, not in the rules.
<!-- graffino-agentic:team:end -->

| Setting | Value |
|---|---|
| Ticket prefix | {{PREFIX}} |
| Tracker | {{TRACKER}} (e.g. ClickUp workspace / space / list) |
| Backlog for new tickets | {{BACKLOG}} |
| Ticket types | {{TICKET_TYPES}} (e.g. Task, Bug, Investigation, Design; a screen ticket's design subtask uses Design when the tracker has it) |
| Ticket URL pattern | {{TICKET_URL}} (e.g. https://app.clickup.com/t/<workspace>/{{PREFIX}}-<id>) |
| Base branch | {{BASE_BRANCH}} |
| Merge method | {{MERGE_METHOD}} (who merges: {{MERGER}}) |
| Ready-for-review notice | {{READY_NOTICE}} (e.g. Slack #channel: "<PR link> Ready for review.") |
| Team rules doc | {{RULES_DOC}} (optional; when it disagrees with this repo, it wins: report the difference) |
| Manual tests | {{MANUAL_TESTS}} (yes: `docs/agents/MANUAL-TESTS.md` + ticket field; no) |
| Manual-test paths | {{globs, one per line in `.github/manual-test-paths`; a PR that changes them must name an MT- ID or say "Manual test: not needed"}} |
| Manual-test waiver | {{WAIVER}} (the only person who may waive a manual test) |
| Manual-test baseline | {{BASELINE_DATE}} (everything released before it counts as tested) |
| Tracker access for agents | {{e.g. ClickUp MCP: `claude mcp add --transport http --scope user clickup https://mcp.clickup.com/mcp`, then /mcp to sign in}} |
| CI checks | {{CI}} (none, or `.github/workflows/team-checks.yml` on runner {{RUNNER}}) |

## Ticket template (for new tickets)
```text
Title: <what, and where>
Goal: <why>
Acceptance criteria: <checkable bullets>
Out of scope: <…>
Design: <the design subtask, or "no UI">
Open questions: <Q- IDs, or "none">
```
