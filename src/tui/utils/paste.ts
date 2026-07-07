import { PASTE_MAX_CHARS } from "../../config/constants.js";

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
