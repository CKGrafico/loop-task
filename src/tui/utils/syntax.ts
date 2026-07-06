export type TokenType = "flag" | "string" | "operator" | "word";

export interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = new Set(["|", "&&", "||", ";", ">", ">>", "<"]);

/**
 * Tokenize a command line for syntax highlighting purposes.
 * This is a cosmetic tokenizer — the real parsing for execution
 * lives in src/loop-config.ts parseCommandLine.
 */
export function tokenizeCommand(line: string): Token[] {
  if (!line) return [];

  const tokens: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    // Skip whitespace
    if (line[i] === " " || line[i] === "\t") {
      i++;
      continue;
    }

    // Try to match multi-char operators first (&&, ||, >>)
    let opMatch: string | undefined;
    for (const op of OPERATORS) {
      if (op.length > 1 && line.slice(i, i + op.length) === op) {
        opMatch = op;
        break;
      }
    }
    if (opMatch) {
      tokens.push({ type: "operator", value: opMatch });
      i += opMatch.length;
      continue;
    }

    // Try to match single-char operators
    if (OPERATORS.has(line[i])) {
      tokens.push({ type: "operator", value: line[i] });
      i++;
      continue;
    }

    // Quoted string
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let j = i + 1;
      while (j < len && line[j] !== quote) {
        // Handle escaped quote
        if (line[j] === "\\" && j + 1 < len) {
          j += 2;
        } else {
          j++;
        }
      }
      // Include closing quote if found
      if (j < len && line[j] === quote) j++;
      tokens.push({ type: "string", value: line.slice(i, j) });
      i = j;
      continue;
    }

    // Unquoted word — consume until whitespace or operator
    let j = i;
    while (j < len) {
      if (line[j] === " " || line[j] === "\t") break;

      // Check for multi-char operator boundary
      let isOpBoundary = false;
      for (const op of OPERATORS) {
        if (op.length > 1 && line.slice(j, j + op.length) === op) {
          isOpBoundary = true;
          break;
        }
      }
      if (isOpBoundary) break;

      // Check for single-char operator boundary
      if (OPERATORS.has(line[j])) {
        break;
      }

      // Check for quoted string start
      if (line[j] === '"' || line[j] === "'") break;

      j++;
    }

    const raw = line.slice(i, j);
    tokens.push(classifyWord(raw));
    i = j;
  }

  return tokens;
}

function classifyWord(value: string): Token {
  // Flag: --something (long flag)
  if (value.startsWith("--") && value.length > 2) {
    return { type: "flag", value };
  }
  // Flag: -f (single letter flag, not negative number like -1)
  if (
    value.startsWith("-") &&
    value.length === 2 &&
    /[a-zA-Z]/.test(value[1])
  ) {
    return { type: "flag", value };
  }
  // Flag: -abc (combined short flags like -xyz)
  if (value.startsWith("-") && value.length > 1 && /^[a-zA-Z]+$/.test(value.slice(1))) {
    return { type: "flag", value };
  }
  return { type: "word", value };
}
