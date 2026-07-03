import { PASTE_MAX_CHARS } from "../../config/constants.js";

// Turn a raw paste (possibly bracketed, multi-line, with stray control chars)
// into a single-line insertable string. Exported for tests.
export function sanitizePaste(raw: string): string {
  return raw
    .replace(/\x1b\[20[01]~/g, "") // strip bracketed-paste markers ESC[200~/ESC[201~
    .replace(/[\r\n]+/g, " ") // command bar is single-line: newlines -> space
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "") // drop remaining control chars
    .slice(0, PASTE_MAX_CHARS);
}
