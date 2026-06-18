---
tokens:
  colors:
    # Status indicators — action-based semantic colors
    success:
      value: "#4ade80"
      description: "Running state; success; positive actions"
    info:
      value: "#38bdf8"
      description: "Waiting state; information; focus; primary interactive"
    warning:
      value: "#facc15"
      description: "Paused state; caution; secondary interactive"
    pending:
      value: "#fb923c"
      description: "Idle state; pending action"
    error:
      value: "#f87171"
      description: "Stopped state; error; destructive actions"
    
    # UI neutrals — surface and contrast
    neutral_900:
      value: "#0b0b0b"
      description: "Dark background; main surfaces (near-black)"
    neutral_800:
      value: "#1e1e1e"
      description: "Secondary surfaces; hover states"
    neutral_600:
      value: "#4b5563"
      description: "Dividers; muted text"
    neutral_500:
      value: "#6b7280"
      description: "Labels; secondary text"
    neutral_400:
      value: "#9ca3af"
      description: "Tertiary text; hints"
    neutral_300:
      value: "#d1d5db"
      description: "Borders; subtle separators"
    neutral_200:
      value: "#e5e7eb"
      description: "Primary text; strong contrast"
    neutral_100:
      value: "#f3f4f6"
      description: "Light text; emphasis (rarely used)"
    
    # Accent
    accent:
      value: "#a3e635"
      description: "Brand/primary accent; app title; important highlights"
    
    # Interactive states
    hover_bg:
      value: "#1e3a5f"
      description: "Hover background overlay on buttons and rows"
    focus_blue:
      value: "#1e3a8a"
      description: "Selected button background; strong focus"
  
  typography:
    # Terminal typography uses monospace (system default)
    # Font selection is delegated to terminal emulator
    # Text styling is applied via OpenTUI text properties (fg, bg, bold, dim, etc.)
    font_family: "monospace (system terminal default)"
    
    heading:
      weight: "bold"
      size: "terminal-relative"
      description: "Used for section titles, dialog titles, emphasis"
    
    body:
      weight: "normal"
      size: "terminal-relative"
      description: "Standard text content, labels"
    
    hint:
      weight: "normal"
      size: "terminal-relative"
      fg: "#9ca3af"
      description: "Dimmed helper text, hints, secondary information"
    
    label:
      weight: "normal"
      size: "terminal-relative"
      fg: "#6b7280"
      description: "Form labels, section headers"
  
  spacing:
    # Terminal grid uses character-width units
    xs:
      value: "0.5 (half char width)"
      description: "Minimal padding within compact items"
    sm:
      value: "1 (char width)"
      description: "Standard padding; default gutters between elements"
    md:
      value: "2 (2 char widths)"
      description: "Medium spacing between sections"
    lg:
      value: "3 (3 char widths)"
      description: "Large spacing between major panels"
    xl:
      value: "4+ (4+ char widths)"
      description: "Extra-large spacing in dialogs and detail views"
  
  borders:
    # Box border style for panels, dialogs, forms
    default_style: "single-line box (┌─┐│└─┘)"
    focus_color: "#38bdf8"
    default_color: "inherit (neutral)"
    width: "1 character"
  
  elevation:
    base:
      value: "terminal surface (no shadow equivalent)"
    modal:
      value: "centered overlay; full-width focus"
      description: "Modals occupy the full terminal; underlying content dims or becomes inaccessible"
  
  animation:
    transitions:
      description: "No CSS transitions in terminal UI; updates are instant"
    interactions:
      value: "synchronous"
      description: "Keyboard and mouse events trigger immediate re-renders"
  
  interaction:
    keyboard:
      - "↑ / ↓ : Navigate lists; cycle through items"
      - "← / → : Cycle between panels; navigate form fields; cancel/confirm in dialogs"
      - "Enter / Space : Activate buttons; toggle switches"
      - "q / Escape : Quit board / close modal"
      - "/ : Enter search mode"
      - "h : Toggle help modal"
      - "e : Edit selected loop"
      - "d / del : Delete selected loop"
      - "p : Pause (if waiting) or Play (if idle/stopped)"
      - "s : Stop (if waiting/paused)"
      - "f : Force run (if not running)"
      - "o : Cycle sort order"
      - "Tab : Move focus in forms (forward); Shift+Tab : backward"
    mouse:
      - "Click : Select items; activate buttons; open dropdowns"
      - "Hover : Visual feedback on clickable elements"
  
  density:
    list_items: "1–2 lines per loop row; compact header + data columns"
    modals: "Centered; ~50% terminal height/width"
    forms: "2-column layout; labels above inputs"
---

# Design System — loop-task Board

The **loop-task** board is an interactive terminal UI built with OpenTUI + React. It provides a cohesive, keyboard-first design optimized for rapid loop management on any terminal emulator.

## Visual Identity

The board uses a **dark, high-contrast palette** designed for extended terminal sessions:

- **Dark backgrounds** (`#0b0b0b` neutral-900) reduce eye strain
- **Semantic status colors** make loop state instantly recognizable at a glance
- **Bright, readable text** (`#e5e7eb` neutral-200) ensures legibility even in noisy environments
- **Focused, minimal UI** keeps distractions out and command focus in

The design draws inspiration from modern terminal tools (Vim, fzf, Tmux) and applies the same philosophy: **every keystroke counts, every pixel matters**.

### Color Semantics

Loop status is communicated through a consistent, semantic color system:

| State | Color | Use | Meaning |
|-------|-------|-----|---------|
| **Running** | `#4ade80` (green) | Status indicator; "play" buttons; active execution | Actively running; success; go |
| **Waiting** | `#38bdf8` (cyan) | Status indicator; primary buttons; focused elements | Next run scheduled; awaiting interval; ready |
| **Paused** | `#facc15` (yellow) | Status indicator; pause buttons; warnings | Paused by user; needs attention |
| **Idle** | `#fb923c` (orange) | Status indicator; secondary emphasis | Not running; empty schedule; can be started |
| **Stopped** | `#f87171` (red) | Status indicator; delete/stop buttons; errors | Stopped by user; loop removed from active schedule |

Neutral colors provide hierarchy and reduce cognitive load:

- **Primary text** (`#e5e7eb`): Content, commands, data
- **Secondary text** (`#6b7280`): Labels, structure, dividers
- **Tertiary text** (`#9ca3af`): Hints, help, disabled state
- **Accent** (`#a3e635`): Brand logo ("loop-task"); major highlights

## Interaction Model

### Keyboard-First Navigation

The board prioritizes keyboard control. Every action has a single-key binding:

- **Panel cycling**: `←` and `→` rotate through the main panels (Navigator, Inspector, Actions, Timeline). Navigation is **circular** — reaching the rightmost panel and pressing `→` wraps to the leftmost.
- **List navigation**: `↑` and `↓` move focus within the Navigator list.
- **Form navigation**: `Tab` / `Shift+Tab` step through fields; `←` and `→` cycle between buttons.
- **Quick actions**: `e` (edit), `d` (delete), `p` (pause/play), `s` (stop), `f` (force run), `o` (cycle sort order).

### Modal Dialogs

Modals (confirm, help, log viewer, create/edit) are **centered** and **full-screen**. They:

- Dim or hide the underlying board
- Capture all keyboard input
- Provide yes/no or save/cancel buttons navigable via `↑` / `↓` or `←` / `→`
- Dismiss on `Escape` or `q`

### Search

Pressing `/` enters **search mode** (a single-line text input). Type to filter loops by description/command; `Escape` or `Enter` closes search and applies the filter.

## Layout & Hierarchy

### Board Panels

The main board uses a **responsive two-column grid** (narrow: full-width stack):

1. **Navigator** (left/top) — sorted list of loops with status, timing, run count
2. **Inspector** (right/bottom) — details of the selected loop (metadata, last run, next run, exit code)
3. **Timeline** (far right/bottom) — scrollable run history for the selected loop
4. **Action buttons** (bottom) — context-sensitive actions (Edit, Delete, Pause, Play, Force Run, Stop)

Column widths adapt to terminal size; the description column is capped at 22 characters to keep navigation responsive.

### Header

The header spans the full width and shows:

- App name in accent color (`#a3e635`)
- Daemon connection status (green ✓, red ✗, yellow …)
- Loop counts by status (collapsed on narrow terminals)

### Footer

The footer shows:

- Keyboard help hints (e.g., "e: edit, d: delete, ?: search, h: help")
- Daemon diagnostics (if relevant)
- Toast notifications (temporary, auto-dismiss after 3.5s; max 4 on screen)

## Component Patterns

### Status Badge

Each loop row displays its status in a consistent **8-character-wide field**, colored by state:

```
┌─ running (green)
├─ waiting (cyan)
├─ paused (yellow)
├─ idle (orange)
└─ stopped (red)
```

### Text Truncation

Long text (descriptions, commands) is truncated with ellipsis (`…`) and fit to allocated column widths to prevent line wrapping and maintain grid alignment.

### Hover State

Interactive elements (rows, buttons) respond to mouse hover and keyboard focus with a background color change to `#1e3a5f` (subtle blue overlay). This signals clickability without overwhelming the visual hierarchy.

### Buttons

Buttons use:

- **Border**: Visible when focused; removed when unfocused (reduces visual noise)
- **Focus color**: `#38bdf8` (cyan border) when selected
- **Selected button bg**: `#1e3a8a` (dark blue) when focused
- **Text**: Bold white for emphasis
- **Width**: Computed dynamically to fit available space (6–14 chars typical)

### Input Fields

Form inputs (text, select) are:

- **Bordered** with color change on focus (`#38bdf8`)
- **Dark background** (`#0b0b0b`) consistent with surfaces
- **Labeled above** with helper text below
- **Arranged in 2-column grid** (left/right pairs) to save vertical space

## Accessibility & Usability

1. **High contrast**: All text on background meets WCAG AA standards (7:1+ ratio typical)
2. **Monospace font**: Terminal emulator default; guaranteed legibility
3. **No color-only information**: Status is indicated by color + label/icon (e.g., "running" text + green color)
4. **Keyboard equivalents for all actions**: Every UI action has a keyboard shortcut; mouse is optional
5. **Responsive to terminal size**: Panels reflow and text truncates gracefully on small screens

## Theming & Customization

Currently, **no user-facing theme customization** is available. The color palette is hard-coded in `src/board/format.ts` (STATUS_COLORS map) and component files.

Future consideration: support `LOOP_TASK_THEME` environment variable or a `.loop-cli/theme.json` file to allow custom color overrides while maintaining the design system's intent.

## Implementation Notes

- Colors are specified as **hex strings** (e.g., `#4ade80`) in JSX `fg`/`bg` props
- Text styling uses OpenTUI text properties: `fg` (foreground), `bold`, `dim`, `italic` (where supported by terminal)
- Layout uses flexbox-like properties: `flexDirection`, `justifyContent`, `alignItems`, `padding`, `margin`, `width`, `height`
- Responsive breakpoints are simple: **narrow** (<80 chars) stacks panels vertically; **wide** uses side-by-side layout
- No CSS; all styling is inline JSX object properties

---

**Last updated**: 2026-06-15  
**Maintained by**: Quique Fdez Guerra  
**Framework**: OpenTUI (`@opentui/core`, `@opentui/react` 0.4.x) + React 19
