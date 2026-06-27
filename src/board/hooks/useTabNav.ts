import { useState, useEffect, useCallback, useRef } from "react";
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
  enabled: boolean;
  setEnabled: (e: boolean) => void;
}

export function useTabNav<T>(items: T[], options?: UseTabNavOptions): UseTabNavReturn<T> {
  const initial = options?.initialIndex ?? 0;
  const [focusIndex, setFocusIndex] = useState(Math.min(initial, Math.max(0, items.length - 1)));
  const [enabled, setEnabled] = useState(true);

  const focusIndexRef = useRef(focusIndex);
  focusIndexRef.current = focusIndex;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const onCycleOutRef = useRef(options?.onCycleOut);
  onCycleOutRef.current = options?.onCycleOut;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    setFocusIndex((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  useKeyboard((key) => {
    if (!enabledRef.current) return;
    if (key.name !== "tab") return;

    const currentItems = itemsRef.current;
    const currentIdx = focusIndexRef.current;
    const lastIndex = currentItems.length - 1;
    if (lastIndex < 0) return;

    const direction = key.shift ? "left" : "right";

    if (direction === "right") {
      if (currentIdx >= lastIndex) {
        if (onCycleOutRef.current) {
          onCycleOutRef.current("right");
        } else {
          setFocusIndex(0);
        }
      } else {
        setFocusIndex(currentIdx + 1);
      }
    } else {
      if (currentIdx <= 0) {
        if (onCycleOutRef.current) {
          onCycleOutRef.current("left");
        } else {
          setFocusIndex(lastIndex);
        }
      } else {
        setFocusIndex(currentIdx - 1);
      }
    }

    key.preventDefault();
  });

  const focusedItem = items[focusIndex];
  const isFocused = useCallback((item: T) => item === focusedItem, [focusedItem]);

  return { focusIndex, setFocusIndex, focusedItem, isFocused, enabled, setEnabled };
}
