import { describe, it, expect } from "vitest";
import { sanitizeCommandArgs, isSafeEnvVar, redactHeaders, sanitizeCommandLine } from "../src/daemon/telemetry/telemetry-redaction.js";

describe("Telemetry Redaction", () => {
  describe("sanitizeCommandArgs", () => {
    it("redacts args when captureContent is false", () => {
      const result = sanitizeCommandArgs(["-p", "secret prompt"], false);
      expect(result.argumentCount).toBe(2);
      expect(result.sanitizedArgs).toEqual(["<redacted>", "<redacted>"]);
    });

    it("preserves args when captureContent is true", () => {
      const result = sanitizeCommandArgs(["-p", "hello"], true);
      expect(result.argumentCount).toBe(2);
      expect(result.sanitizedArgs).toEqual(["-p", "hello"]);
    });
  });

  describe("isSafeEnvVar", () => {
    it("rejects OTEL_EXPORTER_OTLP_HEADERS", () => {
      expect(isSafeEnvVar("OTEL_EXPORTER_OTLP_HEADERS")).toBe(false);
    });

    it("rejects variables containing 'token'", () => {
      expect(isSafeEnvVar("MY_TOKEN")).toBe(false);
    });

    it("rejects variables containing 'api_key'", () => {
      expect(isSafeEnvVar("API_KEY")).toBe(false);
    });

    it("rejects variables containing 'secret'", () => {
      expect(isSafeEnvVar("CLIENT_SECRET")).toBe(false);
    });

    it("allows safe variables", () => {
      expect(isSafeEnvVar("HOME")).toBe(true);
      expect(isSafeEnvVar("PATH")).toBe(true);
      expect(isSafeEnvVar("NODE_ENV")).toBe(true);
    });
  });

  describe("redactHeaders", () => {
    it("returns 'not configured' for empty headers", () => {
      expect(redactHeaders({})).toBe("not configured");
    });

    it("returns 'configured' when headers exist", () => {
      expect(redactHeaders({ Authorization: "Bearer xxx" })).toBe("configured");
    });
  });

  describe("sanitizeCommandLine", () => {
    it("preserves command when captureContent is true", () => {
      expect(sanitizeCommandLine('claude -p "secret"', true)).toBe('claude -p "secret"');
    });

    it("redacts quoted strings when captureContent is false", () => {
      expect(sanitizeCommandLine('claude -p "secret"', false)).toBe('claude -p "<redacted>"');
    });
  });
});
