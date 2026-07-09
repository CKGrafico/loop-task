export function validateContext(value: unknown): { valid: true; context: Record<string, unknown> } | { valid: false; error: string } {
  if (value === undefined || value === null) {
    return { valid: true, context: {} };
  }

  if (typeof value !== "object" || Array.isArray(value) || value === null) {
    return { valid: false, error: "Context must be a JSON object" };
  }

  const obj = value as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (Array.isArray(v)) {
      return { valid: false, error: `Context key "${key}" has an array  only string values are allowed` };
    }
    if (typeof v === "object" && v !== null) {
      return { valid: false, error: `Context key "${key}" has a nested object  only string values are allowed` };
    }
  }

  return { valid: true, context: obj };
}
