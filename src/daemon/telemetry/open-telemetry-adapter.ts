import type { Telemetry, TelemetrySpan } from "./telemetry.js";
import type {
  TelemetryStatus,
  ExporterState,
  LoopTelemetryInput,
  TaskTelemetryInput,
  CommandTelemetryInput,
  RetryTelemetryInput,
  ChildTelemetryContext,
  PreparedChildProcessTelemetry,
  AgentUsage,
  CommandInvocation,
} from "./telemetry-types.js";
import type { DaemonSettings } from "../../types.js";
import { SPAN_NAMES, CORRELATION_KEYS } from "./telemetry-types.js";

import { NodeSDK } from "@opentelemetry/sdk-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPTraceExporter as OTLPTraceExporterGrpc } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPMetricExporter as OTLPMetricExporterGrpc } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { trace, context, propagation, SpanStatusCode, SpanKind, type Span, type Tracer } from "@opentelemetry/api";
import type { Context } from "@opentelemetry/api";

import { daemonLog } from "../daemon-log.js";

class OtelSpan implements TelemetrySpan {
  constructor(private span: Span, private ctx: Context) {}

  setAttribute(key: string, value: string | number | boolean): void {
    this.span.setAttribute(key, value);
  }

  setAttributes(attrs: Record<string, string | number | boolean>): void {
    for (const [k, v] of Object.entries(attrs)) {
      this.span.setAttribute(k, v);
    }
  }

  recordError(error: unknown): void {
    if (error instanceof Error) {
      this.span.recordException(error);
    } else {
      this.span.recordException(String(error));
    }
    this.span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
  }

  ok(): void {
    this.span.setStatus({ code: SpanStatusCode.OK });
    this.span.end();
  }

  end(status?: "ok" | "error" | "cancelled"): void {
    if (status === "error") {
      this.span.setStatus({ code: SpanStatusCode.ERROR });
    } else if (status === "cancelled") {
      this.span.setStatus({ code: SpanStatusCode.ERROR, message: "cancelled" });
    }
    this.span.end();
  }

  getTraceContext(): { traceParent?: string; traceState?: string } {
    const carrier: Record<string, string> = {};
    propagation.inject(this.ctx, carrier, {
      set: (c: Record<string, string>, k: string, v: string) => { c[k] = v; },
    });
    return {
      traceParent: carrier.traceparent,
      traceState: carrier.tracestate,
    };
  }
}

/**
 * OpenTelemetry SDK-backed adapter. Manages the full SDK lifecycle
 * including tracer, meter, and exporters.
 */
export class OpenTelemetryAdapter implements Telemetry {
  private sdk: NodeSDK | null = null;
  private tracer: Tracer;
  private settings: DaemonSettings;
  private status: TelemetryStatus;
  private lastExportError: string | undefined;
  private lastSuccessfulExport: string | undefined;

  constructor(settings: DaemonSettings) {
    this.settings = settings;
    this.tracer = trace.getTracer("loop-task");

    this.status = {
      enabled: settings.telemetryEnabled,
      exporterConfigured: !!settings.telemetryEndpoint,
      endpoint: settings.telemetryEndpoint,
      protocol: settings.telemetryProtocol,
      serviceName: settings.telemetryServiceName,
      autoInstrumentAgents: settings.telemetryAutoInstrumentAgents,
      captureContent: settings.telemetryCaptureContent,
      captureCommandOutput: settings.telemetryCaptureCommandOutput,
      exporterState: this.resolveExporterState(settings),
    };

    if (settings.telemetryEnabled && settings.telemetryEndpoint) {
      this.initializeSdk(settings);
    }
  }

  private resolveExporterState(settings: DaemonSettings): ExporterState {
    if (!settings.telemetryEnabled) return "disabled";
    if (!settings.telemetryEndpoint) return "not-configured";
    return "configured";
  }

  private initializeSdk(settings: DaemonSettings): void {
    try {
      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: settings.telemetryServiceName,
        [ATTR_SERVICE_VERSION]: "2.2.6",
      });

      const isGrpc = settings.telemetryProtocol === "grpc";

      const traceExporter = isGrpc
        ? new OTLPTraceExporterGrpc({ url: settings.telemetryEndpoint })
        : new OTLPTraceExporter({ url: settings.telemetryEndpoint });

      const metricExporter = isGrpc
        ? new OTLPMetricExporterGrpc({ url: settings.telemetryEndpoint })
        : new OTLPMetricExporter({ url: settings.telemetryEndpoint });

      const metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30_000,
      });

      this.sdk = new NodeSDK({
        resource,
        traceExporter,
        metricReader,
        instrumentations: [],
      });

      this.sdk.start();
      this.tracer = trace.getTracer(settings.telemetryServiceName);
      this.status.exporterState = "configured";
      daemonLog(`telemetry: SDK initialized, endpoint=${settings.telemetryEndpoint}`);
    } catch (err) {
      daemonLog(`telemetry: SDK initialization failed: ${String(err)}`);
      this.status.exporterState = "unavailable";
      this.lastExportError = err instanceof Error ? err.message : String(err);
    }
  }

  private resolveHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const envHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS
      ?? process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS;
    if (envHeaders) {
      for (const pair of envHeaders.split(",")) {
        const [k, v] = pair.split("=", 2);
        if (k && v) headers[k.trim()] = v.trim();
      }
    }
    return headers;
  }

  resolveEndpoint(): string | undefined {
    return this.settings.telemetryEndpoint
      ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  }

  resolveProtocol(): "grpc" | "http/protobuf" {
    const envProtocol = process.env.OTEL_EXPORTER_OTLP_PROTOCOL;
    if (envProtocol === "grpc") return "grpc";
    if (envProtocol === "http/protobuf") return "http/protobuf";
    return this.settings.telemetryProtocol;
  }

  startLoop(input: LoopTelemetryInput): TelemetrySpan {
    const span = this.tracer.startSpan(SPAN_NAMES.LOOP_RUN, { kind: SpanKind.SERVER });
    span.setAttributes({
      [CORRELATION_KEYS.RUN_ID]: input.runId,
      [CORRELATION_KEYS.LOOP_ID]: input.loopId,
      [CORRELATION_KEYS.LOOP_NAME]: input.loopName,
      ...(input.projectId ? { [CORRELATION_KEYS.PROJECT_ID]: input.projectId } : {}),
      ...(input.projectName ? { [CORRELATION_KEYS.PROJECT_NAME]: input.projectName } : {}),
    });
    const ctx = trace.setSpan(context.active(), span);
    return new OtelSpan(span, ctx);
  }

  startTask(input: TaskTelemetryInput, parent?: TelemetrySpan): TelemetrySpan {
    const parentCtx = parent instanceof OtelSpan ? parent["ctx"] : context.active();
    const span = this.tracer.startSpan(SPAN_NAMES.TASK_EXECUTE, { kind: SpanKind.CONSUMER }, parentCtx);
    span.setAttributes({
      [CORRELATION_KEYS.RUN_ID]: input.runId,
      [CORRELATION_KEYS.LOOP_ID]: input.loopId,
      [CORRELATION_KEYS.LOOP_NAME]: input.loopName,
      [CORRELATION_KEYS.TASK_ID]: input.taskId,
      [CORRELATION_KEYS.TASK_NAME]: input.taskName,
      ...(input.projectId ? { [CORRELATION_KEYS.PROJECT_ID]: input.projectId } : {}),
      ...(input.projectName ? { [CORRELATION_KEYS.PROJECT_NAME]: input.projectName } : {}),
    });
    const ctx = trace.setSpan(parentCtx, span);
    return new OtelSpan(span, ctx);
  }

  startCommand(input: CommandTelemetryInput, parent?: TelemetrySpan): TelemetrySpan {
    const parentCtx = parent instanceof OtelSpan ? parent["ctx"] : context.active();
    const span = this.tracer.startSpan(SPAN_NAMES.COMMAND_EXECUTE, { kind: SpanKind.CLIENT }, parentCtx);
    span.setAttributes({
      "process.executable.name": input.command,
      "loop_task.command.argument_count": input.argumentCount,
      [CORRELATION_KEYS.RUN_ID]: input.runId,
      [CORRELATION_KEYS.LOOP_ID]: input.loopId,
      ...(input.taskId ? { [CORRELATION_KEYS.TASK_ID]: input.taskId } : {}),
      ...(input.taskName ? { [CORRELATION_KEYS.TASK_NAME]: input.taskName } : {}),
    });
    if (this.settings.telemetryCaptureContent && input.command) {
      span.setAttribute("loop_task.command.full", input.command);
    }
    const ctx = trace.setSpan(parentCtx, span);
    return new OtelSpan(span, ctx);
  }

  recordRetry(input: RetryTelemetryInput): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      activeSpan.addEvent("retry", {
        "loop_task.retry.attempt": input.attempt,
        "loop_task.retry.max_attempts": input.maxAttempts,
        [CORRELATION_KEYS.RUN_ID]: input.runId,
        [CORRELATION_KEYS.LOOP_ID]: input.loopId,
        ...(input.taskId ? { [CORRELATION_KEYS.TASK_ID]: input.taskId } : {}),
      });
    }
  }

  recordFailure(error: unknown, attributes?: Record<string, unknown>): void {
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      if (error instanceof Error) {
        activeSpan.recordException(error);
      }
      activeSpan.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      if (attributes) {
        for (const [k, v] of Object.entries(attributes)) {
          activeSpan.setAttribute(k, v as string | number | boolean);
        }
      }
    }
  }

  recordAgentUsage(input: AgentUsage): void {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) return;

    if (input.inputTokens !== undefined) {
      activeSpan.setAttribute("gen_ai.usage.input_tokens", input.inputTokens);
    }
    if (input.outputTokens !== undefined) {
      activeSpan.setAttribute("gen_ai.usage.output_tokens", input.outputTokens);
    }
    if (input.cacheReadTokens !== undefined) {
      activeSpan.setAttribute("loop_task.agent.cache_read_tokens", input.cacheReadTokens);
    }
    if (input.cacheWriteTokens !== undefined) {
      activeSpan.setAttribute("loop_task.agent.cache_write_tokens", input.cacheWriteTokens);
    }
    if (input.costUsd !== undefined) {
      activeSpan.setAttribute("loop_task.agent.cost_usd", input.costUsd);
    }
    if (input.provider) {
      activeSpan.setAttribute("gen_ai.provider.name", input.provider);
    }
    if (input.model) {
      activeSpan.setAttribute("gen_ai.request.model", input.model);
    }
  }

  prepareChildProcess(
    invocation: CommandInvocation,
    childContext: ChildTelemetryContext,
  ): PreparedChildProcessTelemetry {
    const env: Record<string, string> = {};
    const endpoint = this.resolveEndpoint();
    const protocol = this.resolveProtocol();

    if (!this.settings.telemetryEnabled || !endpoint) {
      return { env };
    }

    if (childContext.traceParent) {
      env.TRACEPARENT = childContext.traceParent;
      if (childContext.traceState) {
        env.TRACESTATE = childContext.traceState;
      }
    }

    env.OTEL_EXPORTER_OTLP_ENDPOINT = endpoint;
    env.OTEL_EXPORTER_OTLP_PROTOCOL = protocol;

    const authHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS
      ?? process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS;
    if (authHeaders) {
      env.OTEL_EXPORTER_OTLP_HEADERS = authHeaders;
    }

    const correlationAttrs: Record<string, string> = {
      [CORRELATION_KEYS.RUN_ID]: childContext.runId,
      [CORRELATION_KEYS.LOOP_ID]: childContext.loopId,
    };
    if (childContext.taskId) correlationAttrs[CORRELATION_KEYS.TASK_ID] = childContext.taskId;
    if (childContext.projectId) correlationAttrs[CORRELATION_KEYS.PROJECT_ID] = childContext.projectId;
    const mergedResourceAttrs = this.mergeResourceAttributes(
      process.env.OTEL_RESOURCE_ATTRIBUTES,
      correlationAttrs,
    );
    env.OTEL_RESOURCE_ATTRIBUTES = mergedResourceAttrs;

    return { env };
  }

  private mergeResourceAttributes(
    existing?: string,
    additions: Record<string, string> = {},
  ): string {
    const map = new Map<string, string>();
    if (existing) {
      for (const pair of existing.split(",")) {
        const [k, v] = pair.split("=", 2);
        if (k && v) map.set(k.trim(), v.trim());
      }
    }
    for (const [k, v] of Object.entries(additions)) {
      map.set(k, v);
    }
    return [...map.entries()].map(([k, v]) => `${k}=${v}`).join(",");
  }

  getStatus(): TelemetryStatus {
    return { ...this.status, lastSuccessfulExportAt: this.lastSuccessfulExport, lastExportError: this.lastExportError };
  }

  async flush(): Promise<void> {
    if (!this.sdk) return;
    try {
      await this.sdk.shutdown();
      daemonLog("telemetry: SDK flushed and shut down via flush");
      this.lastSuccessfulExport = new Date().toISOString();
      if (this.status.exporterState !== "healthy") {
        this.status.exporterState = "healthy";
      }
    } catch (err) {
      daemonLog(`telemetry: flush failed: ${String(err)}`);
      this.lastExportError = err instanceof Error ? err.message : String(err);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.sdk) return;
    try {
      await this.sdk.shutdown();
      daemonLog("telemetry: SDK shut down");
    } catch (err) {
      daemonLog(`telemetry: shutdown error: ${String(err)}`);
    }
    this.sdk = null;
  }
}
