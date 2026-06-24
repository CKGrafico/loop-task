import { useKeyboard } from "@opentui/react";
import { copyToClipboard, readFromClipboard } from "../../shared/clipboard.js";

type EditBufferRenderableLike = {
  getSelectedText(): string;
  deleteSelection(): boolean;
  insertText(text: string): void;
  selectAll(): boolean;
  hasSelection(): boolean;
};

export function useInputShortcuts(getActiveInput: () => EditBufferRenderableLike | null): void {
  useKeyboard((key) => {
    if (!key.ctrl) return;
    const input = getActiveInput();
    if (!input) return;

    const name = key.name;

    if (name === "c") {
      try {
        const text = input.getSelectedText();
        if (text) {
          copyToClipboard(text);
        }
      } catch (e) {
        console.error(`[loop-task] copy failed: ${e}`);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "x") {
      try {
        const text = input.getSelectedText();
        if (text) {
          copyToClipboard(text);
          input.deleteSelection();
        }
      } catch (e) {
        console.error(`[loop-task] cut failed: ${e}`);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "v") {
      try {
        const text = readFromClipboard();
        if (text) {
          input.insertText(text);
        }
      } catch (e) {
        console.error(`[loop-task] paste failed: ${e}`);
      }
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (name === "a") {
      input.selectAll();
      key.preventDefault();
      key.stopPropagation();
      return;
    }
  });
}
