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
