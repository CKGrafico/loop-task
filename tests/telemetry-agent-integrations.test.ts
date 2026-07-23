import { describe, it, expect } from "vitest";
import { OpenCodeTelemetryIntegration } from "../src/daemon/telemetry/agent-integrations/opencode-integration.js";
import { ClaudeCodeTelemetryIntegration } from "../src/daemon/telemetry/agent-integrations/claude-code-integration.js";
import type { CommandInvocation, ChildTelemetryContext } from "../src/daemon/telemetry/telemetry-types.js";

const defaultContext: ChildTelemetryContext = {
  runId: "run-1",
  loopId: "loop-1",
  loopName: "test",
  taskId: "task-1",
  taskName: "implement",
};

describe("OpenCodeTelemetryIntegration.prepare", () => {
  const integration = new OpenCodeTelemetryIntegration();

  it("enables OpenCode experimental OpenTelemetry", () => {
    const invocation: CommandInvocation = {
      command: "opencode",
      args: ["run", "do something"],
      cwd: "/tmp",
    };
    const result = integration.prepare(invocation, defaultContext);
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBe("true");
  });

  it("preserves existing env", () => {
    const invocation: CommandInvocation = {
      command: "opencode",
      args: ["run"],
      cwd: "/tmp",
      env: { EXISTING: "value" },
    };
    const result = integration.prepare(invocation, defaultContext);
    expect(result.env.EXISTING).toBe("value");
    expect(result.env.OPENCODE_EXPERIMENTAL_OPEN_TELEMETRY).toBe("true");
  });

  it("preserves command and args", () => {
    const invocation: CommandInvocation = {
      command: "opencode",
      args: ["run", "implement feature"],
      cwd: "/tmp",
    };
    const result = integration.prepare(invocation, defaultContext);
    expect(result.command).toBe("opencode");
    expect(result.args).toEqual(["run", "implement feature"]);
  });
});

describe("OpenCodeTelemetryIntegration.parseUsage", () => {
  const integration = new OpenCodeTelemetryIntegration();

  it("parses valid JSON with token usage", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: '{"inputTokens":100,"outputTokens":50,"model":"gpt-4"}',
      duration: 5000,
    });
    expect(result).toBeDefined();
    expect(result!.inputTokens).toBe(100);
    expect(result!.outputTokens).toBe(50);
    expect(result!.model).toBe("gpt-4");
  });

  it("parses JSON with cost and cache tokens", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: '{"inputTokens":200,"outputTokens":80,"cacheReadTokens":50,"cacheWriteTokens":10,"cost":0.03,"provider":"openai","model":"gpt-4","sessionId":"s-1"}',
      duration: 5000,
    });
    expect(result).toBeDefined();
    expect(result!.cacheReadTokens).toBe(50);
    expect(result!.cacheWriteTokens).toBe(10);
    expect(result!.costUsd).toBe(0.03);
    expect(result!.provider).toBe("openai");
    expect(result!.sessionId).toBe("s-1");
  });

  it("returns undefined for non-zero exit code", () => {
    const result = integration.parseUsage({
      exitCode: 1,
      stdout: '{"inputTokens":100}',
      duration: 5000,
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty stdout", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: undefined,
      duration: 5000,
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for non-JSON output", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: "Task completed successfully",
      duration: 5000,
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for JSON without usage fields", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: '{"status":"done"}',
      duration: 5000,
    });
    expect(result).toBeUndefined();
  });
});

describe("ClaudeCodeTelemetryIntegration.prepare", () => {
  const integration = new ClaudeCodeTelemetryIntegration();

  it("enables Claude Code telemetry", () => {
    const invocation: CommandInvocation = {
      command: "claude",
      args: ["-p", "implement feature"],
      cwd: "/tmp",
    };
    const result = integration.prepare(invocation, defaultContext);
    expect(result.env.CLAUDE_CODE_ENABLE_TELEMETRY).toBe("1");
  });

  it("preserves existing env", () => {
    const invocation: CommandInvocation = {
      command: "claude",
      args: ["-p", "test"],
      cwd: "/tmp",
      env: { MY_VAR: "value" },
    };
    const result = integration.prepare(invocation, defaultContext);
    expect(result.env.MY_VAR).toBe("value");
    expect(result.env.CLAUDE_CODE_ENABLE_TELEMETRY).toBe("1");
  });
});

describe("ClaudeCodeTelemetryIntegration.parseUsage", () => {
  const integration = new ClaudeCodeTelemetryIntegration();

  it("parses Claude usage JSON with snake_case fields", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: '{"usage":{"input_tokens":150,"output_tokens":75,"cache_read_input_tokens":30,"cache_creation_input_tokens":5}}',
      duration: 3000,
    });
    expect(result).toBeDefined();
    expect(result!.inputTokens).toBe(150);
    expect(result!.outputTokens).toBe(75);
    expect(result!.cacheReadTokens).toBe(30);
    expect(result!.cacheWriteTokens).toBe(5);
  });

  it("parses usage data at root level when wrapped in usage key", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: '{"usage":{"input_tokens":200,"output_tokens":100}}',
      duration: 3000,
    });
    expect(result).toBeDefined();
    expect(result!.inputTokens).toBe(200);
    expect(result!.outputTokens).toBe(100);
  });

  it("returns undefined for empty stdout", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: undefined,
      duration: 3000,
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for non-JSON output", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: "Done.",
      duration: 3000,
    });
    expect(result).toBeUndefined();
  });

  it("returns undefined for JSON without usage fields", () => {
    const result = integration.parseUsage({
      exitCode: 0,
      stdout: '{"result":"no usage here"}',
      duration: 3000,
    });
    expect(result).toBeUndefined();
  });
});
