import { useState, useCallback } from "react";
import type { View } from "../types.js";

export interface RouterState {
  view: View;
  stack: View[];
  push: (view: View) => void;
  replace: (view: View) => void;
  pop: () => void;
  canGoBack: boolean;
}

export function useRouter(initial: View = "board"): RouterState {
  const [stack, setStack] = useState<View[]>([initial]);

  const view = stack[stack.length - 1] ?? initial;
  const canGoBack = stack.length > 1;

  const push = useCallback((next: View) => {
    setStack((s) => [...s, next]);
  }, []);

  const replace = useCallback((next: View) => {
    setStack((s) => [...s.slice(0, -1), next]);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  return { view, stack, push, replace, pop, canGoBack };
}
