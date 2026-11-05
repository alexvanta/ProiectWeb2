<!-- graffino-agentic:slack:begin v1 -->
## Slack addon

Settings: `docs/agents/slack.json` (channel label, ticket link, which notices).
Webhook: the 1Password item {{OP_ITEM}} (API Credential); in CI the
repository secret `SLACK_WEBHOOK_URL`, or `OP_SERVICE_ACCOUNT_TOKEN` loading it from 1Password. Never print, log or commit it.

**Automatic (CI, `.github/workflows/slack.yml`):** PR ready for review → "<PR> Ready for
review." in {{SLACK_CHANNEL}} · tag pushed → the release, its tickets and the manual
tests still open. Dry run until the repository variable `AUTOMATION_LIVE` is "true".

Agents post nothing else to Slack without the user's OK on the exact text. A local
one-off: `SLACK_WEBHOOK_URL="$(op read '{{OP_REF}}')" AUTOMATION_LIVE=true python3 .github/scripts/slack-notify.py text "…"`
<!-- graffino-agentic:slack:end -->
