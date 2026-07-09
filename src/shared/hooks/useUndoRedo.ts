import { useState, useRef, useCallback } from "react";

export interface UseUndoRedoResult {
  value: string;
  setValue: (next: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Pure undo/redo stack logic  exported for direct unit testing
 * without needing React DOM or renderHook.
 */
export class UndoRedoStack {
  private history: string[] = [];
  private future: string[] = [];

  constructor(
    public value: string,
    private limit: number = 50,
  ) { }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  setValue(next: string): boolean {
    if (next === this.value) return false;
    this.history.push(this.value);
    if (this.history.length > this.limit) {
      this.history.shift();
    }
    this.future = [];
    this.value = next;
    return true;
  }

  undo(): boolean {
    if (this.history.length === 0) return false;
    this.future.push(this.value);
    this.value = this.history.pop()!;
    return true;
  }

  redo(): boolean {
    if (this.future.length === 0) return false;
    this.history.push(this.value);
    this.value = this.future.pop()!;
    return true;
  }
}

export function useUndoRedo(initial: string, limit = 50): UseUndoRedoResult {
  const [value, setValueState] = useState(initial);
  const stackRef = useRef<UndoRedoStack>(new UndoRedoStack(initial, limit));

  const setValue = useCallback(
    (next: string) => {
      setValueState((prev) => {
        if (stackRef.current.setValue(next)) return next;
        return prev;
      });
    },
    [limit],
  );

  const undo = useCallback(() => {
    setValueState((prev) => {
      if (stackRef.current.undo()) return stackRef.current.value;
      return prev;
    });
  }, []);

  const redo = useCallback(() => {
    setValueState((prev) => {
      if (stackRef.current.redo()) return stackRef.current.value;
      return prev;
    });
  }, []);

  return {
    value,
    setValue,
    undo,
    redo,
    canUndo: stackRef.current.canUndo,
    canRedo: stackRef.current.canRedo,
  };
}
