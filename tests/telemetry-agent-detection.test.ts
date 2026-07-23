import { describe, it, expect } from "vitest";
import { detectAgentIntegration, getAgentIntegrations } from "../src/daemon/telemetry/agent-integrations/detect-agent-integration.js";

describe("Agent Detection", () => {
  describe("OpenCode", () => {
    it("detects 'opencode run'", () => {
      const integration = detectAgentIntegration("opencode", ["run"]);
      expect(integration).toBeDefined();
      expect(integration?.id).toBe("opencode");
    });

    it("detects '/path/to/opencode run'", () => {
      const integration = detectAgentIntegration("/usr/local/bin/opencode", ["run"]);
      expect(integration).toBeDefined();
      expect(integration?.id).toBe("opencode");
    });

    it("detects 'opencode.exe run' on Windows", () => {
      const integration = detectAgentIntegration("opencode.exe", ["run"]);
      expect(integration).toBeDefined();
      expect(integration?.id).toBe("opencode");
    });

    it("does not match 'opencode' without 'run'", () => {
      const integration = detectAgentIntegration("opencode", ["--help"]);
      expect(integration).toBeUndefined();
    });

    it("does not match 'echo opencode run'", () => {
      const integration = detectAgentIntegration("echo", ["opencode", "run"]);
      expect(integration).toBeUndefined();
    });

    it("does not match 'my-opencode-like-command run'", () => {
      const integration = detectAgentIntegration("my-opencode-like-command", ["run"]);
      expect(integration).toBeUndefined();
    });
  });

  describe("Claude Code", () => {
    it("detects 'claude -p'", () => {
      const integration = detectAgentIntegration("claude", ["-p", "hello"]);
      expect(integration).toBeDefined();
      expect(integration?.id).toBe("claude-code");
    });

    it("detects 'claude --print'", () => {
      const integration = detectAgentIntegration("claude", ["--print", "hello"]);
      expect(integration).toBeDefined();
      expect(integration?.id).toBe("claude-code");
    });

    it("detects '/path/to/claude -p'", () => {
      const integration = detectAgentIntegration("/usr/local/bin/claude", ["-p", "test"]);
      expect(integration).toBeDefined();
      expect(integration?.id).toBe("claude-code");
    });

    it("detects 'claude.exe -p' on Windows", () => {
      const integration = detectAgentIntegration("claude.exe", ["-p", "test"]);
      expect(integration).toBeDefined();
      expect(integration?.id).toBe("claude-code");
    });

    it("does not match 'claude' without -p or --print", () => {
      const integration = detectAgentIntegration("claude", ["--help"]);
      expect(integration).toBeUndefined();
    });

    it("does not match 'claude-helper' with -p", () => {
      const integration = detectAgentIntegration("claude-helper", ["-p", "test"]);
      expect(integration).toBeUndefined();
    });
  });

  describe("Registry", () => {
    it("has both opencode and claude-code integrations", () => {
      const integrations = getAgentIntegrations();
      const ids = integrations.map((i) => i.id);
      expect(ids).toContain("opencode");
      expect(ids).toContain("claude-code");
    });
  });
});
