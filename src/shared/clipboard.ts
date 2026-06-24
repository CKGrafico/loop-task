import { execFileSync } from "node:child_process";
import { platform } from "node:os";

export function copyToClipboard(text: string): void {
  const os = platform();
  if (os === "win32") {
    execFileSync("clip", { input: text });
  } else if (os === "darwin") {
    execFileSync("pbcopy", { input: text });
  } else {
    try {
      execFileSync("xclip", ["-selection", "clipboard"], { input: text });
    } catch {
      execFileSync("xsel", ["--clipboard", "--input"], { input: text });
    }
  }
}

export function readFromClipboard(): string {
  const os = platform();
  try {
    if (os === "win32") {
      return execFileSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard"], { encoding: "utf-8" }).replace(/\r?\n$/, "");
    } else if (os === "darwin") {
      return execFileSync("pbpaste", { encoding: "utf-8" });
    } else {
      try {
        return execFileSync("xclip", ["-selection", "clipboard", "-o"], { encoding: "utf-8" });
      } catch {
        return execFileSync("xsel", ["--clipboard", "--output"], { encoding: "utf-8" });
      }
    }
  } catch {
    return "";
  }
}
