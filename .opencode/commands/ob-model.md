---
description: Set the model for a tier (plan, build, or fast) in .opencode/ensemble.json.
---

Set the concrete model for one model tier in `.opencode/ensemble.json` → `modelsByAgent`. This is the model that `/ob-apply` resolves to when a task is annotated `<!-- agent: <name>, modeltype: <tier> -->`.

Usage:

```
/ob-model <tier> <model>
```

- `<tier>` — one of `plan`, `build`, `fast`.
- `<model>` — a fully-qualified model id (e.g. `opencode/big-pickle`) OR the keyword `current` to use the model active in this session.

Arguments: `$ARGUMENTS`

**Steps**

1. **Parse `$ARGUMENTS`** by whitespace: first token = `<tier>`, second token = `<model>`.
   - If `$ARGUMENTS` is empty: read `.opencode/ensemble.json` and show the current `modelsByAgent` mapping (`plan`, `build`, `fast` → id, or `unset`), then show the usage above. Change nothing.
   - If `<tier>` is not exactly one of `plan` / `build` / `fast`, or `<model>` is missing: print the usage and stop. Change nothing.

2. **Resolve `<model>`:**
   - If it is the literal `current`: use the model id active in THIS session (the model you are running as, as shown in the opencode status line). Never substitute a guessed model.
   - Otherwise use the value verbatim. It must look like `provider/model-id`. If it contains no `/`, warn that it looks malformed and ask the user to confirm before writing.

3. **Read `.opencode/ensemble.json`.** If it does not exist, stop and tell the user onboarding has not generated it yet.

4. **Set `modelsByAgent.<tier>`** to the resolved model id. Create the `modelsByAgent` object if it is absent. Do NOT touch any other field (`dashboardPort`, `mergeOnCleanup`, `timeoutMs`, `stallThresholdMs`, `modelAssignment`, or the other two tiers). Preserve the existing 2-space JSON formatting.

5. **Write the file back** and confirm:

   ```
   ensemble.json updated
     <tier> model -> <resolved-id>
   ```

   It takes effect on your next `/ob-apply`: that command reads `ensemble.json` fresh at spawn time, so tasks annotated `modeltype: <tier>` will resolve to this model. No restart required.

**This command ONLY edits `.opencode/ensemble.json`.** It never modifies `opencode.json`, `opencode-onboard.json`, agent files, or `tasks.md`.
