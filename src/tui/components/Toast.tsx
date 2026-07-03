import React, { useState, useCallback } from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";

export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

const TOAST_TIMEOUT_MS = 3500;
const TOAST_MAX = 4;

function toastColor(kind: Toast["kind"]): string {
  switch (kind) {
    case "success": return theme.semantic.success;
    case "error": return theme.semantic.danger;
    case "info": return theme.accent.loop;
  }
}

function toastIcon(kind: Toast["kind"]): string {
  switch (kind) {
    case "success": return "\u2713";
    case "error": return "\u2717";
    case "info": return "\u2139";
  }
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useState(() => ({ value: 0 }))[0];

  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++nextId.value;
    setToasts((prev) => [...prev, { id, kind, message }].slice(-TOAST_MAX));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TIMEOUT_MS);
  }, [nextId]);

  return { toasts, push };
}

export function ToastStack(props: { toasts: Toast[] }): React.ReactNode {
  if (props.toasts.length === 0) return null;

  return (
    <Box position="absolute" bottom={0} right={0} flexDirection="column" alignItems="flex-end">
      {props.toasts.map((toast) => (
        <Box key={toast.id} backgroundColor={theme.bg.elevated} paddingLeft={1} paddingRight={1}>
          <Text color={toastColor(toast.kind)} bold>{toastIcon(toast.kind)} </Text>
          <Text color={theme.text.primary}>{toast.message}</Text>
        </Box>
      ))}
    </Box>
  );
}
