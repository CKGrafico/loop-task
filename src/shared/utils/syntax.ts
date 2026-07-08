export type TokenType = "flag" | "string" | "operator" | "word" | "whitespace";

export interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = new Set(["|", "&&", "||", ";", ">", ">>", "<"]);

/**
 * Scan a command line into tokens, preserving whitespace runs as
 * "whitespace" tokens. Used by highlightSegments for rendering.
 */
function scanTokens(line: string): Token[] {
  if (!line) return [];

  const tokens: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    // Whitespace run — preserve it as a token
    if (line[i] === " " || line[i] === "\t") {
      let j = i;
      while (j < len && (line[j] === " " || line[j] === "\t")) j++;
      tokens.push({ type: "whitespace", value: line.slice(i, j) });
      i = j;
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

/**
 * Tokenize a command line for syntax highlighting purposes.
 * This is a cosmetic tokenizer — the real parsing for execution
 * lives in src/loop-config.ts parseCommandLine.
 *
 * Whitespace is not returned (use highlightSegments for rendering
 * that needs to preserve spacing).
 */
export function tokenizeCommand(line: string): Token[] {
  return scanTokens(line).filter((tok) => tok.type !== "whitespace");
}

export interface HighlightSegment {
  value: string;
  color: string;
}

/**
 * Produce colored segments for a command line, preserving whitespace
 * exactly so token-by-token rendering does not collapse spaces.
 */
export function highlightSegments(
  line: string,
  colors: Record<Exclude<TokenType, "whitespace">, string>,
  whitespaceColor: string,
): HighlightSegment[] {
  return scanTokens(line).map((tok) => ({
    value: tok.value,
    color: tok.type === "whitespace" ? whitespaceColor : colors[tok.type],
  }));
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
