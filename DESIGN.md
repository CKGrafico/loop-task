# Design System

> Maintained by Quique Fdez Guerra. Last updated: 2026-06-30.

## Color Palette

4 primary colors + 4 semantic + grays. No other colors allowed.

### Primary Colors

| Token | Hex (dark) | Hex (light) | Usage |
|-------|-----------|-------------|-------|
| `accent.brand` | `#fbbf24` | `#d97706` | App name, generic UI accents, input bar, borders for generic elements |
| `accent.loop` | `#38bdf8` | `#0284c7` | Loops tab: borders, selected row, status indicators, title |
| `accent.task` | `#a78bfa` | `#7c3aed` | Tasks tab: borders, selected row, category headers |
| `accent.project` | `#34d399` | `#059669` | Projects tab: borders, selected row, search mode accent |

### Semantic Colors

| Token | Hex (dark) | Hex (light) | Usage |
|-------|-----------|-------------|-------|
| `semantic.success` | `#4ade80` | `#16a34a` | Exit 0, running status, success toasts |
| `semantic.warning` | `#facc15` | `#ca8a04` | Paused status, warning toasts, debug panel |
| `semantic.danger` | `#f87171` | `#dc2626` | Exit != 0, stopped status, destructive actions, confirm mode |
| `semantic.idle` | `#fb923c` | `#ea580c` | Idle status |

### Grays (dark theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `bg.base` | `#0a0e14` | Root background |
| `bg.surface` | `#111827` | Panel background |
| `bg.elevated` | `#1e293b` | Modal background, toast background |
| `bg.hover` | `#1e3a5f` | Hover background |
| `bg.active` | `#1e3a8a` | Selected row background, focused button |
| `bg.input` | `#0f172a` | Input field background |
| `text.primary` | `#e5e7eb` | Normal text |
| `text.secondary` | `#9ca3af` | Labels, secondary text |
| `text.muted` | `#6b7280` | Hints, placeholders, column headers |
| `text.inverse` | `#ffffff` | Text on active/selected backgrounds |
| `border.default` | `#1e293b` | Panel borders at rest |
| `border.dim` | `#374151` | Unfocused input/button borders |

## Status Colors

Status colors map a loop's status to a semantic color:

| Status | Color | Token |
|--------|-------|-------|
| running | green | `semantic.success` |
| waiting | blue | `accent.loop` |
| paused | yellow | `semantic.warning` |
| idle | orange | `semantic.idle` |
| stopped | red | `semantic.danger` |

## Typography

- Terminal monospace (system default)
- Headings: bold
- Body: normal weight
- Hints: normal weight, `text.muted` color

## Layout

### Board Layout (Ink TUI)

```
┌─ Header (tab bar + status) ──────────────────────┐
├──────────────────────┬───────────────────────────┤
│ LeftPanel (60%)      │ RightPanel (40%)          │
│                      │                           │
│ [filter status row]  │ Inspector (detail fields) │
│ Loop/Task/Project    │ ────────                  │
│ list (ink-scroll-list)│ Run History (sparkline +  │
│                      │   run rows)               │
├──────────────────────┴───────────────────────────┤
│ > command input (always focused)                 │
│ ··· esc cancel       tab panels  ctrl+p commands  │
└──────────────────────────────────────────────────┘
```

### Command Input (Bottom Bar)

- Always focused — all keystrokes go here
- Blue accent `│` bar on the input line
- Placeholder text inline (muted) when empty
- Hint bar at bottom: `esc cancel` (left), `tab panels  ctrl+p commands` (right)
- Dropdown floats above input (`position="absolute"`) without pushing layout
- In confirm mode: red `│` bar, prompt text, `enter` to confirm
- In search mode: green `│` bar, search placeholder, `enter` to apply

### Forms

- **Create**: WizardForm — one field per screen, breadcrumb progress, `Ctrl+S` skip optional
- **Edit**: PatchEditForm — read-only table, `change <field>` targets individual fields, staged changes with pending count

### Modals

- Centered, `position="absolute"`, rounded border (`borderStyle="round"`)
- Escape to close
- CommandsBrowserModal: centered, search + grouped command list with shortcuts
- LogModal: 95% width, scrollable log viewer

### Floating Elements

- Toasts: `position="absolute" bottom={0} right={0}`, float over content
- DebugPanel: optional 22% right column (toggled via `debug` command)
