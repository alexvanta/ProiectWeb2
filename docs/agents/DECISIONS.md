# Decisions — ProiectWeb2

<!-- graffino-agentic:begin v1 -->
> Constraints the code must obey. Status: `approved` (obey) · `proposed` (do not
> build on it) · `superseded-by <ID>` (kept to explain old code).
> Adding or changing an entry needs the user's OK (AGENTS.md → The gate).
<!-- graffino-agentic:end -->

## Index
- D-001 · Use Docker for project services and environment isolation

---

## D-001 · Use Docker for project services and environment isolation
- **Status:** approved
- **Date:** 2026-11-05
- **Rule:** Use Docker and Docker Compose to run and isolate project services and solve environment issues.
- **Why:** The host environment should remain clean and development setups reproducible.
- **Rejected:** Installing native services directly on host machine.
- **Evidence:** User requirement stated during project setup.
- **Source:** user · confidence high
- **Confirmed:** 2026-11-05
