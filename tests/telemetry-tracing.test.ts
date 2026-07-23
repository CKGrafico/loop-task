import { describe, it, expect } from "vitest";
import { NoopTelemetryAdapter } from "../src/daemon/telemetry/noop-telemetry-adapter.js";
import type { LoopTelemetryInput } from "../src/daemon/telemetry/telemetry-types.js";
import { SPAN_NAMES, CORRELATION_KEYS, METRIC_NAMES } from "../src/daemon/telemetry/telemetry-types.js";

describe("Telemetry span names", () => {
  it("uses stable span names without dynamic identifiers", () => {
    expect(SPAN_NAMES.LOOP_RUN).toBe("loop_task.loop.run");
    expect(SPAN_NAMES.LOOP_RESOLVE).toBe("loop_task.loop.resolve");
    expect(SPAN_NAMES.TASK_EXECUTE).toBe("loop_task.task.execute");
    expect(SPAN_NAMES.COMMAND_EXECUTE).toBe("loop_task.command.execute");
    expect(SPAN_NAMES.AGENT_EXECUTE).toBe("loop_task.agent.execute");
    expect(SPAN_NAMES.GIT_COMMIT).toBe("loop_task.git.commit");
    expect(SPAN_NAMES.GITHUB_ISSUE_UPDATE).toBe("loop_task.github.issue.update");
    expect(SPAN_NAMES.GITHUB_PR_CREATE).toBe("loop_task.github.pull_request.create");
  });

  it("span names do not contain dynamic identifiers", () => {
    const names = Object.values(SPAN_NAMES);
    for (const name of names) {
      // UUID-like patterns
      expect(name).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
      // Numeric IDs
      expect(name).not.toMatch(/\.\d+/);
    }
  });
});

describe("Telemetry correlation keys", () => {
  it("defines all required correlation keys", () => {
    expect(CORRELATION_KEYS.RUN_ID).toBe("loop_task.run.id");
    expect(CORRELATION_KEYS.LOOP_ID).toBe("loop_task.loop.id");
    expect(CORRELATION_KEYS.LOOP_NAME).toBe("loop_task.loop.name");
    expect(CORRELATION_KEYS.TASK_ID).toBe("loop_task.task.id");
    expect(CORRELATION_KEYS.TASK_NAME).toBe("loop_task.task.name");
    expect(CORRELATION_KEYS.PROJECT_ID).toBe("loop_task.project.id");
    expect(CORRELATION_KEYS.PROJECT_NAME).toBe("loop_task.project.name");
    expect(CORRELATION_KEYS.AGENT_INTEGRATION).toBe("loop_task.agent.integration");
  });
});

describe("Telemetry metric names", () => {
  it("defines all required metric names", () => {
    expect(METRIC_NAMES.RUNS).toBe("loop_task.runs");
    expect(METRIC_NAMES.RUN_DURATION).toBe("loop_task.run.duration");
    expect(METRIC_NAMES.TASKS).toBe("loop_task.tasks");
    expect(METRIC_NAMES.TASK_DURATION).toBe("loop_task.task.duration");
    expect(METRIC_NAMES.TASK_RETRIES).toBe("loop_task.task.retries");
    expect(METRIC_NAMES.COMMANDS).toBe("loop_task.commands");
    expect(METRIC_NAMES.COMMAND_DURATION).toBe("loop_task.command.duration");
    expect(METRIC_NAMES.AGENT_EXECUTIONS).toBe("loop_task.agent.executions");
    expect(METRIC_NAMES.AGENT_DURATION).toBe("loop_task.agent.duration");
    expect(METRIC_NAMES.AGENT_INPUT_TOKENS).toBe("loop_task.agent.input_tokens");
    expect(METRIC_NAMES.AGENT_OUTPUT_TOKENS).toBe("loop_task.agent.output_tokens");
    expect(METRIC_NAMES.AGENT_CACHE_READ_TOKENS).toBe("loop_task.agent.cache_read_tokens");
    expect(METRIC_NAMES.AGENT_CACHE_WRITE_TOKENS).toBe("loop_task.agent.cache_write_tokens");
    expect(METRIC_NAMES.AGENT_COST).toBe("loop_task.agent.cost");
    expect(METRIC_NAMES.FAILURES).toBe("loop_task.failures");
  });
});

describe("NoopTelemetryAdapter span lifecycle", () => {
  it("creates spans that accept all lifecycle methods", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    const loop: LoopTelemetryInput = {
      loopId: "test-loop",
      loopName: "test",
      runId: "test-run-1",
    };
    const span = adapter.startLoop(loop);
    span.setAttribute("test.key", "value");
    span.setAttributes({ "test.key2": 42, "test.key3": true });
    span.recordError(new Error("test error"));
    span.ok();
  });

  it("creates nested span hierarchy (loop > task > command)", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    const loopSpan = adapter.startLoop({
      loopId: "loop-1",
      loopName: "test-loop",
      runId: "run-1",
    });
    const taskSpan = adapter.startTask(
      {
        taskId: "task-1",
        taskName: "implement",
        runId: "run-1",
        loopId: "loop-1",
        loopName: "test-loop",
      },
      loopSpan,
    );
    const cmdSpan = adapter.startCommand(
      {
        command: "echo",
        argumentCount: 1,
        cwd: "/tmp",
        runId: "run-1",
        loopId: "loop-1",
        taskId: "task-1",
        taskName: "implement",
      },
      taskSpan,
    );

    // All spans should be valid and usable
    cmdSpan.ok();
    taskSpan.ok();
    loopSpan.ok();
  });

  it("returns empty trace context from noop spans", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    const span = adapter.startLoop({
      loopId: "loop-1",
      loopName: "test",
      runId: "run-1",
    });
    const ctx = span.getTraceContext();
    expect(ctx.traceParent).toBeUndefined();
    expect(ctx.traceState).toBeUndefined();
  });

  it("end with error status does not throw", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    const span = adapter.startLoop({
      loopId: "loop-1",
      loopName: "test",
      runId: "run-1",
    });
    expect(() => span.end("error")).not.toThrow();
  });

  it("end with cancelled status does not throw", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    const span = adapter.startLoop({
      loopId: "loop-1",
      loopName: "test",
      runId: "run-1",
    });
    expect(() => span.end("cancelled")).not.toThrow();
  });
});

describe("NoopTelemetryAdapter failure isolation", () => {
  it("recordRetry does not throw", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    expect(() =>
      adapter.recordRetry({
        attempt: 2,
        maxAttempts: 5,
        runId: "run-1",
        loopId: "loop-1",
      })
    ).not.toThrow();
  });

  it("recordFailure does not throw", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    expect(() => adapter.recordFailure(new Error("test"))).not.toThrow();
  });

  it("recordAgentUsage does not throw", () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    expect(() =>
      adapter.recordAgentUsage({
        inputTokens: 100,
        outputTokens: 50,
        integration: "opencode",
      })
    ).not.toThrow();
  });

  it("flush does not throw", async () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    await expect(adapter.flush()).resolves.toBeUndefined();
  });

  it("shutdown does not throw", async () => {
    const adapter = new NoopTelemetryAdapter({ enabled: true });
    await expect(adapter.shutdown()).resolves.toBeUndefined();
  });
});

describe("NoopTelemetryAdapter status model", () => {
  it("reports disabled state by default", () => {
    const adapter = new NoopTelemetryAdapter();
    const status = adapter.getStatus();
    expect(status.enabled).toBe(false);
    expect(status.exporterState).toBe("disabled");
  });

  it("reports not-configured state when enabled with no endpoint", () => {
    const adapter = new NoopTelemetryAdapter({
      enabled: true,
      exporterConfigured: false,
      exporterState: "not-configured",
    });
    const status = adapter.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.exporterState).toBe("not-configured");
  });

  it("can update status", () => {
    const adapter = new NoopTelemetryAdapter();
    adapter.updateStatus({ enabled: true, exporterState: "not-configured" });
    const status = adapter.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.exporterState).toBe("not-configured");
  });
});
