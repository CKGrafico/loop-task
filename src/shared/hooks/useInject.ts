import { useContext } from "react";
import { InversifyContext } from "../providers/InversifyProvider.js";

export function useInject<T>(identifier: symbol): T {
  const { container } = useContext(InversifyContext);
  return container.get<T>(identifier);
}
