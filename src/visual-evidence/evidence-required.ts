/**
 * evidence-required.ts — Decide whether visual evidence is required for a change.
 *
 * Required when files touch user-visible CLI output or the TUI board.
 * Skipped for docs-only, internal-refactor, deps-only, test-only, or backend-only changes.
 * Mixed changes (UI + backend) → required.
 */

/** File path patterns that indicate user-visible CLI/TUI changes. */
const UI_PATTERNS: RegExp[] = [
  /src\/cli\.ts$/,
  /src\/client\/commands\.ts$/,
  /src\/app\//,
  /src\/widgets\//,
  /src\/features\//,
  /src\/entities\//,
  /src\/shared\/ui\//,
  /src\/shared\/i18n\//,
  /src\/shared\/config\/constants\.ts$/,
  /src\/core\/loop\//,
  /src\/daemon\/http\//,
  /\.tsx?$/,
];

/** Path patterns that are NOT user-visible. */
const NON_UI_PATTERNS: RegExp[] = [
  /tests\//,
  /\.test\.ts$/,
  /\.test\.tsx$/,
  /vitest\.config\.ts$/,
  /eslint\.config\./,
  /tsconfig/,
  /\.github\//,
  /openspec\//,
  /\.agents\//,
  /\.opencode\//,
  /ARCHITECTURE\.md$/,
  /DESIGN\.md$/,
  /AGENTS\.md$/,
  /README\.md$/,
  /\.md$/,
];

interface RequiredDecision {
  required: boolean;
  reason: string;
}

export function isEvidenceRequired(input: {
  changedFiles: string[];
  proposal?: string;
}): RequiredDecision {
  const { changedFiles, proposal } = input;

  const uiFiles = changedFiles.filter((f) =>
    UI_PATTERNS.some((p) => p.test(f)),
  );
  const nonUiFiles = changedFiles.filter((f) =>
    NON_UI_PATTERNS.some((p) => p.test(f)),
  );

  const hasUi = uiFiles.length > 0;
  const hasOnlyNonUi = uiFiles.length === 0 && nonUiFiles.length > 0;

  if (hasUi) {
    return {
      required: true,
      reason: `UI-touching files: ${uiFiles.join(", ")}`,
    };
  }

  if (hasOnlyNonUi) {
    return {
      required: false,
      reason: `No UI-touching files (only: ${nonUiFiles.join(", ")})`,
    };
  }

  // Proposal describes a UI/interaction change?
  const uiKeywords =
    /board|tui|terminal|cli output|command.*output|display|render|ink|color|layout|prompt|form|modal/i;
  if (proposal && uiKeywords.test(proposal)) {
    return {
      required: true,
      reason: "Proposal describes a user-visible CLI/TUI change",
    };
  }

  return {
    required: false,
    reason: "No user-visible changes detected",
  };
}
