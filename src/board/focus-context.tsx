import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useKeyboard } from "@opentui/react";

interface FocusEntry {
  order: number;
  id: string;
  onEnter?: () => void;
  onExit?: () => void;
}

interface FocusContextValue {
  registerItem: (order: number, id: string) => void;
  unregisterItem: (id: string) => void;
  focusedOrder: number | null;
  setFocusedOrder: (order: number) => void;
  isFocused: (order: number) => boolean;
  focusNext: () => void;
  focusPrev: () => void;
  active: boolean;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function useFocusContext(): FocusContextValue | null {
  return useContext(FocusContext);
}

export function FocusProvider(props: { children: React.ReactNode }): React.ReactNode {
  const itemsRef = useRef<Map<number, FocusEntry>>(new Map());
  const [focusedOrder, setFocusedOrderState] = useState<number | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (focusedOrder === null && itemsRef.current.size > 0) {
      const minOrder = Math.min(...itemsRef.current.keys());
      setFocusedOrderState(minOrder);
    }
  }, [itemsRef.current.size]);

  const registerItem = useCallback((order: number, id: string) => {
    itemsRef.current.set(order, { order, id });
    if (focusedOrder === null) {
      setFocusedOrderState(order);
    }
  }, [focusedOrder]);

  const unregisterItem = useCallback((id: string) => {
    for (const [order, entry] of itemsRef.current) {
      if (entry.id === id) {
        itemsRef.current.delete(order);
        break;
      }
    }
  }, []);

  const setFocusedOrder = useCallback((order: number) => {
    setFocusedOrderState(order);
  }, []);

  const isFocused = useCallback((order: number) => {
    return focusedOrder === order;
  }, [focusedOrder]);

  const focusNext = useCallback(() => {
    const orders = Array.from(itemsRef.current.keys()).sort((a, b) => a - b);
    if (orders.length === 0) return;
    const currentIdx = orders.indexOf(focusedOrder ?? orders[0]);
    const nextIdx = (currentIdx + 1) % orders.length;
    setFocusedOrderState(orders[nextIdx]);
  }, [focusedOrder]);

  const focusPrev = useCallback(() => {
    const orders = Array.from(itemsRef.current.keys()).sort((a, b) => a - b);
    if (orders.length === 0) return;
    const currentIdx = orders.indexOf(focusedOrder ?? orders[0]);
    const prevIdx = (currentIdx - 1 + orders.length) % orders.length;
    setFocusedOrderState(orders[prevIdx]);
  }, [focusedOrder]);

  useKeyboard((key) => {
    if (!active) return;
    if (key.name === "tab") {
      if (key.shift) {
        focusPrev();
      } else {
        focusNext();
      }
      key.preventDefault();
    }
  });

  const value: FocusContextValue = {
    registerItem,
    unregisterItem,
    focusedOrder,
    setFocusedOrder,
    isFocused,
    focusNext,
    focusPrev,
    active,
  };

  return <FocusContext.Provider value={value}>{props.children}</FocusContext.Provider>;
}

export function useFocusable(order: number, id: string): {
  isFocused: boolean;
  setFocused: () => void;
} {
  const ctx = useContext(FocusContext);
  const registered = useRef(false);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerItem(order, id);
    registered.current = true;
    return () => {
      ctx.unregisterItem(id);
    };
  }, [ctx, order, id]);

  if (!ctx) {
    return { isFocused: false, setFocused: () => {} };
  }

  return {
    isFocused: ctx.isFocused(order),
    setFocused: () => ctx.setFocusedOrder(order),
  };
}
