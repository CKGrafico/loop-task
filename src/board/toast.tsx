import { useCallback, useRef, useState } from "react";
import { TOAST_MAX, TOAST_TIMEOUT_MS } from "../config/constants.js";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

export function useToasts(): {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = (idRef.current += 1);
      setToasts((prev) => [...prev, { id, kind, message }].slice(-TOAST_MAX));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_TIMEOUT_MS)
      );
    },
    [dismiss]
  );

  return { toasts, push, dismiss };
}

function toastColor(kind: ToastKind): string {
  switch (kind) {
    case "success":
      return "#4ade80";
    case "error":
      return "#f87171";
    default:
      return "#38bdf8";
  }
}

function toastIcon(kind: ToastKind): string {
  switch (kind) {
    case "success":
      return "✓";
    case "error":
      return "✗";
    default:
      return "ℹ";
  }
}

export function ToastStack(props: { toasts: Toast[] }): React.ReactNode {
  if (props.toasts.length === 0) {
    return null;
  }

  return (
    <box
      style={{
        position: "absolute",
        bottom: 3,
        right: 2,
        flexDirection: "column",
        alignItems: "flex-end",
        zIndex: 50,
      }}
    >
      {props.toasts.map((toast) => {
        const color = toastColor(toast.kind);
        return (
          <box
            key={toast.id}
            border
            style={{
              borderColor: color,
              backgroundColor: "#0b1220",
              paddingLeft: 1,
              paddingRight: 1,
              marginTop: 1,
              minWidth: 24,
            }}
          >
            <text>
              <span fg={color}>{toastIcon(toast.kind)} </span>
              <span fg="#e5e7eb">{toast.message}</span>
            </text>
          </box>
        );
      })}
    </box>
  );
}
