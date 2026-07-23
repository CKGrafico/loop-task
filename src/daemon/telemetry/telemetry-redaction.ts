/**
 * Redaction utilities for telemetry.
 * Ensures secrets, prompts, and sensitive content are never exported.
 */

/** Patterns that indicate a secret or authentication value */
const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /auth(orization)?/i,
  /token/i,
  /secret/i,
  /password/i,
  /credential/i,
  /otlp[_-]?header/i,
];

/** Environment variables that should never be captured in telemetry */
const SENSITIVE_ENV_VARS = new Set([
  "OTEL_EXPORTER_OTLP_HEADERS",
  "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
  "OTEL_EXPORTER_OTLP_METRICS_HEADERS",
  "OTEL_EXPORTER_OTLP_LOGS_HEADERS",
]);

/**
 * Sanitize command arguments for telemetry.
 * Removes prompt content, preserves argument count and structure.
 */
export function sanitizeCommandArgs(
  args: string[],
  captureContent: boolean,
): { argumentCount: number; sanitizedArgs: string[] } {
  if (captureContent) {
    return { argumentCount: args.length, sanitizedArgs: args };
  }
  return {
    argumentCount: args.length,
    sanitizedArgs: args.map(() => "<redacted>"),
  };
}

/**
 * Check if an environment variable name is safe to include in telemetry.
 */
export function isSafeEnvVar(name: string): boolean {
  if (SENSITIVE_ENV_VARS.has(name)) return false;
  return !SECRET_PATTERNS.some((p) => p.test(name));
}

/**
 * Sanitize environment variables for telemetry output.
 * Returns only the names of safe variables, never values.
 */
export function sanitizeEnvVarNames(names: string[]): string[] {
  return names.filter(isSafeEnvVar);
}

/**
 * Redact header values for display. Never expose actual values.
 */
export function redactHeaders(headers: Record<string, string>): string {
  if (Object.keys(headers).length === 0) return "not configured";
  return "configured";
}

/**
 * Sanitize a command line for telemetry display.
 * Replaces quoted strings (likely prompts) with a placeholder.
 */
export function sanitizeCommandLine(command: string, captureContent: boolean): string {
  if (captureContent) return command;
  // Replace content in quotes with <redacted>
  return command.replace(/"([^"\\]|\\.)*"/g, '"<redacted>"').replace(/'([^'\\]|\\.)*'/g, "'<redacted>'");
}
