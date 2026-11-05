# Backfill review — {{repo}}

<!-- graffino-agentic:begin v1 -->
> Only the items where the sources disagree. Everything the code consistently
> follows is already recorded as `approved` in the ledger and needs no review.
> **How to answer:** in the review UI Claude opens (keys 1–9, R = recommendation,
> E = own answer, X = reject), or write your choice after `Answer:` here and tell
> Claude "apply the backfill review". Answered items become ledger entries; rejected
> ones move to Rejected. "review the backfill" reopens the UI for open items.
<!-- graffino-agentic:end -->

Backfill run: {{YYYY-MM-DD}} · clashes: {{n}} · entries recorded without review: {{n}}

## Open

### R-001 · {{short title}}
- **Kind:** {{docs vs code | two ways | contradiction | contract mismatch | deliberate exception}}
- **Side A:** {{what it says}} — {{evidence}}
- **Side B:** {{what it says}} — {{evidence}}
- **Options:**
  1. {{…}}
  2. {{…}}
- **Recommendation:** {{option, and why}}
- **Affects:** {{the entries waiting on this, e.g. "PATTERN-0NN not written yet"}}
- **Answer:**

## Decided
<!-- R-ID · answer · date · resulting entry (D-/PATTERN-/C-) or code-fix suggestion -->

## Rejected
<!-- R-ID · finding · why it was rejected · date — also added to docs/agents/REJECTED.md -->
