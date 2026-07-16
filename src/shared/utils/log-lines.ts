import { LOG_LINE_CHARS_MAX } from "../config/constants.js";

const TRUNCATION_MARKER = " …[line truncated]";

export function clampLine(line: string, maxChars: number = LOG_LINE_CHARS_MAX): string {
  return line.length > maxChars ? line.slice(0, maxChars) + TRUNCATION_MARKER : line;
}

export function clampLines(lines: string[], maxCount: number, maxChars: number = LOG_LINE_CHARS_MAX): string[] {
  const tail = lines.length > maxCount ? lines.slice(lines.length - maxCount) : lines;
  return tail.map((l) => clampLine(l, maxChars));
}

export function appendClamped(prev: string[], line: string, maxCount: number): string[] {
  const next = [...prev, clampLine(line)];
  return next.length > maxCount ? next.slice(next.length - maxCount) : next;
}
