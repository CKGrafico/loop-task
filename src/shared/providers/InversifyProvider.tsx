import React, { createContext } from "react";
import type { Container } from "inversify";
import { container } from "../container/index.js";

export const InversifyContext = createContext<{ container: Container }>({ container });

export function InversifyProvider(props: { children: React.ReactNode }): React.ReactNode {
  return React.createElement(
    InversifyContext.Provider,
    { value: { container } },
    props.children,
  );
}
