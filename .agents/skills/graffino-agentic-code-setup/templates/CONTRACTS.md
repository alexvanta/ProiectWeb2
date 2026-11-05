# Contracts — {{repo}}

<!-- graffino-agentic:begin v1 -->
> Promises across a boundary. **Provided:** this repo owns the contract; the text
> lives here only. **Consumed:** a link to the provider's entry plus the fields this
> repo relies on. **External:** what we rely on from a third-party service.
> Changing a provided contract is a PROPOSAL (AGENTS.md → The gate) and the plan
> lists the consumers' files too. Status: `approved` · `proposed` · `superseded-by`.
<!-- graffino-agentic:end -->

## Index
- C-001 · {{one line}} · provided

---

## Provided

### C-001 · {{title}}
- **Status:** approved
- **Interface:** {{HTTP route / file + path / CLI / event / env / URL scheme / package id}}
- **Consumers:** {{repos or systems that use it}}
- **Shape:** {{fields, types, required/optional, status or exit codes}}
- **Rules:** {{versioning, compatibility, auth, limits}}
- **Evidence:** {{path:line of the producer; consumer path:line if on disk}}
- **Source:** {{code | docs | user}} · confidence {{high | medium | low}}

## Consumed

### {{provider-repo}}:C-0NN · {{title}}
- **Link:** `{{provider-repo}}:docs/agents/CONTRACTS.md#C-0NN` {{or "(provider not set up yet)" + the full shape}}
- **Fields we rely on:** {{…}}
- **Evidence:** {{path:line where this repo reads it}}

## External

### {{service}} · {{what we use}}
- **Interface:** {{API / endpoint / SDK, version}}
- **We rely on:** {{fields, behaviour, limits}}
- **Known quirks:** {{…, with the D- that handles them}}
- **Evidence:** {{path:line}}
