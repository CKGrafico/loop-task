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
      const text = input.getSelectedText();
      if (text) {
        copyToClipboard(text);
      }
      key.preventDefault();
      return;
    }

    if (name === "x") {
      const text = input.getSelectedText();
      if (text) {
        copyToClipboard(text);
        input.deleteSelection();
      }
      key.preventDefault();
      return;
    }

    if (name === "v") {
      const text = readFromClipboard();
      if (text) {
        input.insertText(text);
      }
      key.preventDefault();
      return;
    }

    if (name === "a") {
      input.selectAll();
      key.preventDefault();
      return;
    }
  });
}
