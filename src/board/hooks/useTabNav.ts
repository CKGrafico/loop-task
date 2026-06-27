import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";

interface UseTabNavOptions {
  initialIndex?: number;
  onCycleOut?: (direction: "left" | "right") => void;
}

interface UseTabNavReturn<T> {
  focusIndex: number;
  setFocusIndex: (i: number) => void;
  focusedItem: T | undefined;
  isFocused: (item: T) => boolean;
}

export function useTabNav<T>(items: T[], options?: UseTabNavOptions): UseTabNavReturn<T> {
  const initial = options?.initialIndex ?? 0;
  const [focusIndex, setFocusIndex] = useState(Math.min(initial, Math.max(0, items.length - 1)));

  const onCycleOut = options?.onCycleOut;

  useEffect(() => {
    setFocusIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  useKeyboard((key) => {
    if (key.name !== "tab") return;

    const direction = key.shift ? "left" : "right";
    const lastIndex = items.length - 1;

    if (direction === "right") {
      if (focusIndex >= lastIndex) {
        if (onCycleOut) {
          onCycleOut("right");
        } else {
          setFocusIndex(0);
        }
      } else {
        setFocusIndex(focusIndex + 1);
      }
    } else {
      if (focusIndex <= 0) {
        if (onCycleOut) {
          onCycleOut("left");
        } else {
          setFocusIndex(lastIndex);
        }
      } else {
        setFocusIndex(focusIndex - 1);
      }
    }

    key.preventDefault();
  });

  const focusedItem = items[focusIndex];
  const isFocused = useCallback((item: T) => item === focusedItem, [focusedItem]);

  return { focusIndex, setFocusIndex, focusedItem, isFocused };
}
