/**
 * End-to-end telemetry test: verifies that loop > task > command > agent-usage
 * spans form a single trace with correct hierarchy, attributes, and GenAI metrics.
 *
 * Strategy: register a global TracerProvider backed by InMemorySpanExporter
 * BEFORE creating the adapter. The adapter uses trace.getTracer() which picks up
 * the global provider, so all spans it creates flow into our in-memory exporter.
 * Uses NodeTracerProvider which includes AsyncLocalStorage context manager
 * for correct parent-child span propagation.
 *
 * Note: In OTel SDK v2, parent info moved from `span.parentSpanId` to
 * `span.parentSpanContext.spanId`. The global tracer provider can only be set
 * once per process, so we share one provider across all tests and reset the
 * exporter between tests.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { trace } from "@opentelemetry/api";

import { OpenTelemetryAdapter } from "../src/daemon/telemetry/open-telemetry-adapter.js";
import type { DaemonSettings } from "../src/types.js";
import { SPAN_NAMES, CORRELATION_KEYS } from "../src/daemon/telemetry/telemetry-types.js";

function makeSettings(overrides: Partial<DaemonSettings> = {}): DaemonSettings {
  return {
    httpApiEnabled: true,
    mcpApiEnabled: true,
    httpApiHost: "0.0.0.0",
    telemetryEnabled: true,
    // Do NOT set a real endpoint — we intercept the global tracer provider
    // with an InMemorySpanExporter so we can inspect spans.
    // Without endpoint, initializeSdk() is skipped; the adapter uses our
    // pre-registered global tracer.
    telemetryEndpoint: undefined,
    telemetryProtocol: "http/protobuf",
    telemetryAutoInstrumentAgents: true,
    telemetryCaptureContent: true,
    telemetryCaptureCommandOutput: true,
    telemetryServiceName: "loop-task-test",
    ...overrides,
  };
}

let memoryExporter: InMemorySpanExporter;
let provider: NodeTracerProvider;

/** In OTel SDK v2, parent is stored in parentSpanContext.spanId, not parentSpanId */
function getParentSpanId(span: { parentSpanContext?: { spanId?: string } }): string | undefined {
  return span.parentSpanContext?.spanId;
}

// Set up the global tracer provider once for the entire test suite.
// trace.setGlobalTracerProvider() can only succeed once per process.
beforeAll(() => {
  memoryExporter = new InMemorySpanExporter();
  provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(memoryExporter)],
  });
  trace.setGlobalTracerProvider(provider);
  provider.register();
});

afterAll(async () => {
  await provider.shutdown();
});

// Reset the exporter before each test so we get a clean slate
beforeEach(() => {
  memoryExporter.reset();
});

describe("E2E telemetry: full span hierarchy with GenAI usage", () => {
  it("forms a single trace with loop > task > command spans and GenAI attributes", async () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());

    // Create span hierarchy: loop > task > command
    const loopSpan = adapter.startLoop({
      loopId: "loop-e2e",
      loopName: "test-loop",
      runId: "run-e2e-1",
      projectId: "proj-1",
    });

    const taskSpan = adapter.startTask(
      {
        taskId: "task-e2e",
        taskName: "implement-feature",
        runId: "run-e2e-1",
        loopId: "loop-e2e",
        loopName: "test-loop",
        projectId: "proj-1",
      },
      loopSpan,
    );

    const commandSpan = adapter.startCommand(
      {
        command: "opencode",
        commandLine: "opencode run 'implement the feature'",
        argumentCount: 2,
        cwd: "/home/user/project",
        runId: "run-e2e-1",
        loopId: "loop-e2e",
        taskId: "task-e2e",
        taskName: "implement-feature",
        integrationId: "opencode",
      },
      taskSpan,
    );

    // Simulate command result: exit code + stdout
    commandSpan.setAttribute("process.exit.code", 0);

    // Simulate recording agent usage (as if parsed from stdout)
    adapter.recordAgentUsage(
      {
        inputTokens: 1500,
        outputTokens: 800,
        cacheReadTokens: 200,
        cacheWriteTokens: 100,
        costUsd: 0.042,
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        integration: "opencode",
      },
      commandSpan,
    );

    // End spans in correct order
    commandSpan.ok();
    taskSpan.ok();
    loopSpan.ok();

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toBeGreaterThanOrEqual(3);

    // Map span names for easier assertions
    const spanMap = new Map(spans.map((s) => [s.name, s]));
    const loopSp = spanMap.get(SPAN_NAMES.LOOP_RUN);
    const taskSp = spanMap.get(SPAN_NAMES.TASK_EXECUTE);
    const cmdSp = spanMap.get(SPAN_NAMES.COMMAND_EXECUTE);

    // All three spans exist
    expect(loopSp).toBeDefined();
    expect(taskSp).toBeDefined();
    expect(cmdSp).toBeDefined();

    // Same trace ID — all spans belong to one trace
    const traceId = loopSp!.spanContext().traceId;
    expect(taskSp!.spanContext().traceId).toBe(traceId);
    expect(cmdSp!.spanContext().traceId).toBe(traceId);

    // Parent-child: task is child of loop, command is child of task
    expect(getParentSpanId(taskSp!)).toBe(loopSp!.spanContext().spanId);
    expect(getParentSpanId(cmdSp!)).toBe(taskSp!.spanContext().spanId);

    // --- Loop span attributes ---
    const loopAttrs = loopSp!.attributes;
    expect(loopAttrs[CORRELATION_KEYS.RUN_ID]).toBe("run-e2e-1");
    expect(loopAttrs[CORRELATION_KEYS.LOOP_ID]).toBe("loop-e2e");
    expect(loopAttrs[CORRELATION_KEYS.LOOP_NAME]).toBe("test-loop");
    expect(loopAttrs[CORRELATION_KEYS.PROJECT_ID]).toBe("proj-1");

    // --- Task span attributes ---
    const taskAttrs = taskSp!.attributes;
    expect(taskAttrs[CORRELATION_KEYS.RUN_ID]).toBe("run-e2e-1");
    expect(taskAttrs[CORRELATION_KEYS.LOOP_ID]).toBe("loop-e2e");
    expect(taskAttrs[CORRELATION_KEYS.TASK_ID]).toBe("task-e2e");
    expect(taskAttrs[CORRELATION_KEYS.TASK_NAME]).toBe("implement-feature");
    expect(taskAttrs[CORRELATION_KEYS.PROJECT_ID]).toBe("proj-1");

    // --- Command span attributes ---
    const cmdAttrs = cmdSp!.attributes;
    expect(cmdAttrs["process.executable.name"]).toBe("opencode");
    expect(cmdAttrs["loop_task.command.argument_count"]).toBe(2);
    expect(cmdAttrs["loop_task.command.cwd"]).toBe("/home/user/project");
    expect(cmdAttrs["loop_task.command.full"]).toBe("opencode run 'implement the feature'");
    expect(cmdAttrs[CORRELATION_KEYS.RUN_ID]).toBe("run-e2e-1");
    expect(cmdAttrs[CORRELATION_KEYS.LOOP_ID]).toBe("loop-e2e");
    expect(cmdAttrs[CORRELATION_KEYS.TASK_ID]).toBe("task-e2e");
    expect(cmdAttrs[CORRELATION_KEYS.TASK_NAME]).toBe("implement-feature");
    expect(cmdAttrs[CORRELATION_KEYS.AGENT_INTEGRATION]).toBe("opencode");
    expect(cmdAttrs["process.exit.code"]).toBe(0);

    // --- GenAI semantic convention attributes on command span ---
    expect(cmdAttrs["gen_ai.usage.input_tokens"]).toBe(1500);
    expect(cmdAttrs["gen_ai.usage.output_tokens"]).toBe(800);
    expect(cmdAttrs["loop_task.agent.cache_read_tokens"]).toBe(200);
    expect(cmdAttrs["loop_task.agent.cache_write_tokens"]).toBe(100);
    expect(cmdAttrs["loop_task.agent.cost_usd"]).toBe(0.042);
    expect(cmdAttrs["gen_ai.provider.name"]).toBe("anthropic");
    expect(cmdAttrs["gen_ai.request.model"]).toBe("claude-sonnet-4-20250514");
  });

  it("captures stdout on command span when captureCommandOutput is enabled", async () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({ telemetryCaptureCommandOutput: true }));

    const loopSpan = adapter.startLoop({
      loopId: "loop-stdout",
      loopName: "stdout-test",
      runId: "run-stdout-1",
    });

    const commandSpan = adapter.startCommand(
      {
        command: "opencode",
        commandLine: "opencode run 'do something'",
        argumentCount: 2,
        cwd: "/tmp",
        runId: "run-stdout-1",
        loopId: "loop-stdout",
      },
      loopSpan,
    );

    // Simulate stdout attachment (as command-runner does)
    commandSpan.setAttribute("loop_task.command.stdout", "result output here");
    commandSpan.setAttribute("process.exit.code", 0);

    commandSpan.ok();
    loopSpan.ok();

    const spans = memoryExporter.getFinishedSpans();
    const cmdSp = spans.find((s) => s.name === SPAN_NAMES.COMMAND_EXECUTE);
    expect(cmdSp).toBeDefined();
    expect(cmdSp!.attributes["loop_task.command.stdout"]).toBe("result output here");
  });

  it("omits command details when captureContent is disabled", async () => {
    const adapter = new OpenTelemetryAdapter(makeSettings({
      telemetryCaptureContent: false,
      telemetryCaptureCommandOutput: false,
    }));

    const loopSpan = adapter.startLoop({
      loopId: "loop-no-content",
      loopName: "no-content-test",
      runId: "run-no-content-1",
    });

    const commandSpan = adapter.startCommand(
      {
        command: "opencode",
        commandLine: "opencode run 'secret task'",
        argumentCount: 2,
        cwd: "/tmp",
        runId: "run-no-content-1",
        loopId: "loop-no-content",
      },
      loopSpan,
    );

    commandSpan.ok();
    loopSpan.ok();

    const spans = memoryExporter.getFinishedSpans();
    const cmdSp = spans.find((s) => s.name === SPAN_NAMES.COMMAND_EXECUTE);
    expect(cmdSp).toBeDefined();
    // command line should NOT be captured when captureContent is off
    expect(cmdSp!.attributes["loop_task.command.full"]).toBeUndefined();
  });

  it("records Claude Code usage with correct integration attribute", async () => {
    const adapter = new OpenTelemetryAdapter(makeSettings());

    const loopSpan = adapter.startLoop({
      loopId: "loop-claude",
      loopName: "claude-test",
      runId: "run-claude-1",
    });

    const commandSpan = adapter.startCommand(
      {
        command: "claude",
        commandLine: "claude -p 'implement feature'",
        argumentCount: 2,
        cwd: "/home/user/repo",
        runId: "run-claude-1",
        loopId: "loop-claude",
        integrationId: "claude-code",
      },
      loopSpan,
    );

    adapter.recordAgentUsage(
      {
        inputTokens: 2000,
        outputTokens: 1200,
        costUsd: 0.065,
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        integration: "claude-code",
      },
      commandSpan,
    );

    commandSpan.ok();
    loopSpan.ok();

    const spans = memoryExporter.getFinishedSpans();
    const cmdSp = spans.find((s) => s.name === SPAN_NAMES.COMMAND_EXECUTE);
    expect(cmdSp).toBeDefined();
    expect(cmdSp!.attributes["gen_ai.usage.input_tokens"]).toBe(2000);
    expect(cmdSp!.attributes["gen_ai.usage.output_tokens"]).toBe(1200);
    expect(cmdSp!.attributes["loop_task.agent.cost_usd"]).toBe(0.065);
    expect(cmdSp!.attributes[CORRELATION_KEYS.AGENT_INTEGRATION]).toBe("claude-code");
    expect(cmdSp!.attributes["gen_ai.request.model"]).toBe("claude-3-5-sonnet-20241022");
  });
});
