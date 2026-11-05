# Architecture — {{repo}}

<!-- graffino-agentic:begin v1 -->
> How this repo is built, generated from the code at backfill and kept current by
> whoever changes the structure. The code wins: when this page is wrong, fix it.
<!-- graffino-agentic:end -->

## Overview
{{3–6 lines: what runs where, for whom}}

```text
{{diagram: parts and the arrows between them, incl. external services}}
```

## Parts
| Part | Path | Responsibility | Talks to |
|---|---|---|---|

## Data flow
{{the main flows, one numbered list each: trigger → steps → where state ends up}}

## State and storage
| What | Where | Owner | Notes |
|---|---|---|---|

## Configuration
| Name | Where set | Used by | Notes |
|---|---|---|---|
<!-- names only, never values -->

## Build, deploy, runtime
{{how it is built, where it runs, how it ships; link AGENTS.md sections 2 and 5}}

## Boundaries
{{trust and security boundaries; links to the D- entries that guard them; contracts in CONTRACTS.md}}
