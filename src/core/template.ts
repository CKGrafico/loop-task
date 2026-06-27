export function interpolate(input: string, context: Record<string, unknown>): string {
  return input.replace(/{{(\w+)}}/g, (_, key: string) => String(context[key] ?? ""));
}

