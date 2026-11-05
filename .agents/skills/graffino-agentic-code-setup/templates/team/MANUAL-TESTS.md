# Manual tests — {{repo}}

<!-- graffino-agentic:team:begin v1 -->
> What only a person on real hardware or in a real environment can prove. Manual
> tests can be postponed, never skipped silently: a postponed test stays visible here.
>
> 1. **The builder adds the entry** with the change: status 🔴 untested, steps a person
>    can follow, where it must run. The ticket's manual-test field goes to Pending.
> 2. **Only the person who ran the test reports the result:** name, date, environment
>    or device, evidence (screenshot, log, photo on the ticket). Agents never mark a
>    test passed, and an automated test is never a manual test.
> 3. **Merging untested is allowed but never silent:** the entry stays in Queue, the
>    ticket cannot close, and the release check lists it.
> 4. **Waiving** is {{WAIVER}}'s only, with a written reason.
> 5. **A passed entry is history.** A later change in the same area gets a new MT- ID.
> 6. **Regression runs** before a release use the environments below; one MT- per run.
> 7. Never create a separate ticket for one manual test; it belongs to the change's ticket.
>
> Baseline: everything released before {{BASELINE_DATE}} counts as tested.
> Statuses: 🔴 untested · ❌ failed · ✅ passed · ⚪ waived.
<!-- graffino-agentic:team:end -->

## Environments
| Name | What (device / OS / account / env) | Who holds it |
|---|---|---|

## Queue
| MT | Ticket | What to verify | PR | Merged / released in | Needs (where) | Status | Steps |
|---|---|---|---|---|---|---|---|

## History
| MT | Ticket | What | Result | Tested by · date | Where | Evidence | Notes / waiver reason |
|---|---|---|---|---|---|---|---|
