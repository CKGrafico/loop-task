import type { AgentTelemetryIntegration } from "./agent-integration.js";
import { OpenCodeTelemetryIntegration } from "./opencode-integration.js";
import { ClaudeCodeTelemetryIntegration } from "./claude-code-integration.js";

/** Built-in agent integrations in priority order */
const INTEGRATIONS: AgentTelemetryIntegration[] = [
  new OpenCodeTelemetryIntegration(),
  new ClaudeCodeTelemetryIntegration(),
];

/**
 * Detect which agent integration matches the given command.
 * Returns the first matching integration, or undefined if none match.
 */
export function detectAgentIntegration(
  command: string,
  args: string[],
): AgentTelemetryIntegration | undefined {
  return INTEGRATIONS.find((integration) => integration.matches(command, args));
}

/**
 * Get all registered integrations.
 */
export function getAgentIntegrations(): ReadonlyArray<AgentTelemetryIntegration> {
  return INTEGRATIONS;
}
