import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "../src/logger.js";

describe("Logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("non-verbose mode", () => {
    it("logs info messages", () => {
      const logger = new Logger(false);
      logger.info("test info");
      expect(consoleLogSpy).toHaveBeenCalledWith("test info");
    });

    it("logs error messages", () => {
      const logger = new Logger(false);
      logger.error("test error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("test error");
    });

    it("logs success messages", () => {
      const logger = new Logger(false);
      logger.success("test success");
      expect(consoleLogSpy).toHaveBeenCalledWith("test success");
    });

    it("logs warn messages", () => {
      const logger = new Logger(false);
      logger.warn("test warn");
      expect(consoleWarnSpy).toHaveBeenCalledWith("test warn");
    });

    it("does not log debug messages", () => {
      const logger = new Logger(false);
      logger.debug("test debug");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe("verbose mode", () => {
    it("logs debug messages with prefix", () => {
      const logger = new Logger(true);
      logger.debug("test debug");
      expect(consoleLogSpy).toHaveBeenCalledWith("[verbose] test debug");
    });

    it("logs info messages", () => {
      const logger = new Logger(true);
      logger.info("test info");
      expect(consoleLogSpy).toHaveBeenCalledWith("test info");
    });
  });

  describe("timestamp", () => {
    it("returns ISO string", () => {
      const logger = new Logger(false);
      const ts = logger.timestamp();
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
