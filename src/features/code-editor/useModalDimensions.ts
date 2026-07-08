import {
  CODE_EDITOR_MODAL_HEIGHT,
  CODE_EDITOR_MODAL_WIDTH,
} from "../../shared/config/constants.js";

export function useModalDimensions(): { modalWidth: number; modalHeight: number; editorVisibleLines: number } {
  const termRows = process.stdout.rows || 24;
  const termCols = process.stdout.columns || 80;
  const modalHeight = Math.min(CODE_EDITOR_MODAL_HEIGHT, termRows - 2);
  const modalWidth = Math.min(CODE_EDITOR_MODAL_WIDTH, termCols - 2);
  const editorVisibleLines = Math.max(3, modalHeight - 6);
  return { modalWidth, modalHeight, editorVisibleLines };
}
