import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const EXTENSIONLESS_PATTERNS = [
  /node_modules\/react-reconciler\/constants$/,
  /node_modules\/react-reconciler\/reflection$/,
];

export function resolve(specifier, context, nextResolve) {
  for (const pattern of EXTENSIONLESS_PATTERNS) {
    if (pattern.test(specifier)) {
      return nextResolve(specifier + ".js", context);
    }
  }

  if (
    (specifier.includes("react-reconciler/constants") || specifier.includes("react-reconciler/reflection")) &&
    !specifier.endsWith(".js")
  ) {
    return nextResolve(specifier + ".js", context);
  }

  if (
    context.parentURL &&
    specifier.startsWith(".") &&
    !specifier.endsWith(".js") &&
    !specifier.endsWith(".json") &&
    !specifier.endsWith(".node")
  ) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const candidate = pathResolve(parentDir, specifier + ".js");
    if (fs.existsSync(candidate)) {
      return nextResolve(specifier + ".js", context);
    }
  }

  return nextResolve(specifier, context);
}
