import { execFileSync } from "node:child_process";
import { platform } from "node:os";

/**
 * Write text to the system clipboard. Never throws  returns false if no
 * clipboard tool is available (e.g. a headless SSH box without xclip/xsel).
 *
 * Linux toolchain tried in order: xclip → xsel → wl-copy (Wayland) →
 * tmux load-buffer (when $TMUX is set) → OSC 52 (works over SSH because
 * the local terminal owns the clipboard).
 */
export function copyToClipboard(text: string): boolean {
  const os = platform();
  if (os === "win32") {
    try {
      execFileSync("clip", { input: text });
      return true;
    } catch {
      return false;
    }
  }
  if (os === "darwin") {
    try {
      execFileSync("pbcopy", { input: text });
      return true;
    } catch {
      return false;
    }
  }
  // Linux / BSD: try each clipboard tool in order. All calls are guarded 
  // a missing binary must never throw, since callers invoke this from
  // synchronous keypress handlers (an uncaught throw here kills the app).
  const tries: Array<() => void> = [
    () => execFileSync("xclip", ["-selection", "clipboard"], { input: text }),
    () => execFileSync("xsel", ["--clipboard", "--input"], { input: text }),
    () => execFileSync("wl-copy", [], { input: text }),
  ];
  for (const tryFn of tries) {
    try {
      tryFn();
      return true;
    } catch {
      // try next tool
    }
  }
  if (process.env.TMUX) {
    try {
      execFileSync("tmux", ["load-buffer", "-"], { input: text });
      return true;
    } catch {
      // fall through to OSC 52
    }
  }
  // OSC 52: ask the connected terminal to copy. Works over SSH because the
  // local terminal owns the clipboard. Most modern terminals support it
  // (iTerm2, WezTerm, Windows Terminal, Kitty, Alacritty).
  try {
    process.stdout.write(
      `\x1b]52;c;${Buffer.from(text, "utf-8").toString("base64")}\x07`,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Read text from the system clipboard. Returns "" if unavailable.
 *
 * Linux toolchain: xclip → xsel → wl-paste → tmux save-buffer -. OSC 52
 * reply is not solicited synchronously (timings are unreliable across
 * terminals); callers fall back to bracketed-paste detection for input.
 */
export function readFromClipboard(): string {
  const os = platform();
  try {
    if (os === "win32") {
      return execFileSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard"], { encoding: "utf-8" }).replace(/\r?\n$/, "");
    }
    if (os === "darwin") {
      return execFileSync("pbpaste", { encoding: "utf-8" });
    }
    // Linux / BSD
    const tries: Array<() => string> = [
      () => execFileSync("xclip", ["-selection", "clipboard", "-o"], { encoding: "utf-8" }),
      () => execFileSync("xsel", ["--clipboard", "--output"], { encoding: "utf-8" }),
      () => execFileSync("wl-paste", [], { encoding: "utf-8" }),
    ];
    for (const tryFn of tries) {
      try {
        return tryFn();
      } catch {
        // try next tool
      }
    }
    if (process.env.TMUX) {
      try {
        return execFileSync("tmux", ["save-buffer", "-"], { encoding: "utf-8" });
      } catch {
        // ignore
      }
    }
    return "";
  } catch {
    return "";
  }
}