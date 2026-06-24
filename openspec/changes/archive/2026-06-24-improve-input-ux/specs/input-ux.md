# Input UX Behavior Spec

## Form navigation (CreateForm, TaskForm)

### Tab navigation
- Tab moves focus forward: field 0 -> field 1 -> ... -> last field -> Save -> Cancel -> field 0 (wrap).
- Shift+Tab moves focus backward: field 0 -> Cancel -> Save -> last field -> ... -> field 0 (wrap).
- No clamping; wraps around at both ends.

### Arrow keys inside inputs
- Left/right arrows move the text cursor within the current input field (native OpenTUI behavior).
- Left/right arrows do NOT navigate between fields.
- Up/down arrows are not intercepted by the form-level handler (passed to native input; single-line inputs ignore them).
- Exception: the `project` field (a select dropdown in CreateForm) still uses up/down to cycle options.

### Enter behavior
- Enter on an input field advances to the next field (existing behavior, preserved).
- Enter on the last input field submits the form.
- Enter on Save button submits.
- Enter on Cancel button cancels.
