import type { AgentTelemetryIntegration } from "./agent-integration.js";
import type {
  CommandInvocation,
  PreparedCommandInvocation,
  ChildTelemetryContext,
  AgentUsage,
  CommandResult,
} from "../telemetry-types.js";

const OPENCODE_BINARIES = ["opencode"];

/**
 * Detects `opencode run ...` invocations and enables OpenCode's
 * native OpenTelemetry support, routing to loop-task's endpoint.
 */
export class OpenCodeTelemetryIntegration implements AgentTelemetryIntegration {
  readonly id = "opencode";

  matches(command: string, args: string[]): boolean {
    const basename = command.split("/").pop()?.replace(/\.exe$/, "").toLowerCase() ?? "";
    return OPENCODE_BINARIES.includes(basename) && args[0] === "run";
  }

  prepare(
    invocation: CommandInvocation,
    _context: ChildTelemetryContext,
  ): PreparedCommandInvocation {
    const env: Record<string, string> = { ...invocation.env };

    // Enable OpenCode's experimental OpenTelemetry
    env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY = "true";

    // Adapt the OTLP endpoint/proprotocol from the parent context
    // OpenCode currently reads the standard OTEL_* environment variables
    // which are already set by the adapter's prepareChildProcess
    // We just need to make sure the integration is activated.

    return { command: invocation.command, args: [...invocation.args], env };
  }

  parseUsage(result: CommandResult): AgentUsage | undefined {
    if (result.exitCode !== 0 || !result.stdout) return undefined;

    try {
      // OpenCode may output JSON with --format json
      // Try to parse structured output for usage data
      const lines = result.stdout.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      if (!lastLine) return undefined;

      const parsed = JSON.parse(lastLine);
      if (typeof parsed !== "object" || parsed === null) return undefined;

      const usage: AgentUsage = {};
      if (typeof parsed.inputTokens === "number") usage.inputTokens = parsed.inputTokens;
      if (typeof parsed.outputTokens === "number") usage.outputTokens = parsed.outputTokens;
      if (typeof parsed.cacheReadTokens === "number") usage.cacheReadTokens = parsed.cacheReadTokens;
      if (typeof parsed.cacheWriteTokens === "number") usage.cacheWriteTokens = parsed.cacheWriteTokens;
      if (typeof parsed.cost === "number") usage.costUsd = parsed.cost;
      if (typeof parsed.model === "string") usage.model = parsed.model;
      if (typeof parsed.provider === "string") usage.provider = parsed.provider;
      if (typeof parsed.sessionId === "string") usage.sessionId = parsed.sessionId;

      if (Object.keys(usage).length === 0) return undefined;
      return usage;
    } catch {
      return undefined;
    }
  }
}
