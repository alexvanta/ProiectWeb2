# AI_LOG — p19-liga-amatori

## 2026-11-19 — Specificație P19, documentație inițială și decizii D-001–D-005
- **Activitate:**
  - Interviu de specificație în română pentru proiectul **P19 („Liga de amatori: fixtures, clasament, suspendări”)** — clarificate stack-ul, rolurile/RBAC, formatul competiției, strategia de cache/notificări, cele 10 ecrane și lista explicită de Out of scope.
  - Actualizat/creat documentația de proiect și ledger-ul: `README.md`, `AGENTS.md`, `CONTEXT.md`, `docs/agents/ARCHITECTURE.md`, `docs/agents/OPEN-QUESTIONS.md` (`Q-001`–`Q-003`, `Q-006` răspunse; `Q-004`–`Q-005` deschise; adăugate `Q-007`–`Q-012` pentru liga reală, interviul cu organizatorul și `RULES.md`, fără valori inventate) și `docs/design/registry.yaml` (10 ecrane `DS-p19-*`, `status: draft`).
  - Propuse și aprobate deciziile tehnice `D-001`–`D-005`, înregistrate în `docs/agents/DECISIONS.md` (`status: approved`).
- **Verificare:** `python3 docs/agents/tools/ledger-lint.py --fix` și `python3 docs/agents/tools/ledger-lint.py` → `✓ ledger ok`.
