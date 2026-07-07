import { PASTE_MAX_CHARS } from "../../config/constants.js";
import { CODE_EDITOR_WRAP_LENGTH } from "../../config/constants.js";

export function sanitizePaste(raw: string): string {
  return raw
    .replace(/\x1b\[20[01]~/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .slice(0, PASTE_MAX_CHARS);
}

export function sanitizeMultilinePaste(raw: string): string {
  return raw
    .replace(/\x1b\[20[01]~/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .slice(0, PASTE_MAX_CHARS);
}

export function wrapCommand(text: string, maxLen: number = CODE_EDITOR_WRAP_LENGTH): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxLen) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.join("\n");
}
