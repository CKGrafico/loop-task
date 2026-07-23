import type {
  CommandInvocation,
  PreparedCommandInvocation,
  ChildTelemetryContext,
  AgentUsage,
  CommandResult,
} from "../telemetry-types.js";

/**
 * An agent telemetry integration detects a supported coding agent CLI
 * and prepares its invocation to route telemetry through loop-task's
 * unified OTLP destination.
 */
export interface AgentTelemetryIntegration {
  /** Unique identifier for this integration */
  readonly id: string;

  /**
   * Detect whether the given command matches this agent.
   * Must handle absolute paths, Windows suffixes, common shell invocation.
   */
  matches(command: string, args: string[]): boolean;

  /**
   * Prepare the command invocation for telemetry.
   * May modify env, cannot mutate global process.env.
   * May NOT modify command/args in ways that break expected output.
   */
  prepare(
    invocation: CommandInvocation,
    context: ChildTelemetryContext,
  ): PreparedCommandInvocation;

  /**
   * Optionally parse agent usage from command output.
   * Must not force --format json when it would break output contract.
   */
  parseUsage?(result: CommandResult): AgentUsage | undefined;
}
