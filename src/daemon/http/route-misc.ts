import { SseClientSet, initSseResponse } from "./sse.js";
import { buildOpenApiSpec, buildSwaggerHtml } from "./openapi.js";
import { sendOk, sendError, readBody } from "./helpers.js";
import type { RouteHandler } from "./helpers.js";
import type { SettingsManager } from "../settings-manager.js";

export function registerMiscRoutes(sseClients: SseClientSet, r: (method: string, path: string, handler: RouteHandler) => void): void {
  r("GET", "/api/openapi.json", (_req, res) => {
    const spec = buildOpenApiSpec();
    const body = JSON.stringify(spec, null, 2);
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  });

  r("GET", "/api/docs", (_req, res) => {
    const html = buildSwaggerHtml();
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(html),
    });
    res.end(html);
  });

  r("GET", "/", (_req, res) => {
    const html = buildSwaggerHtml();
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(html),
    });
    res.end(html);
  });

  r("GET", "/api/events", (_req, res) => {
    initSseResponse(res);
    sseClients.add(res);

    _req.on("close", () => {
      sseClients.delete(res);
    });
  });
}

export function registerSettingsRoutes(settingsManager: SettingsManager, r: (method: string, path: string, handler: RouteHandler) => void): void {
  r("GET", "/api/settings", (_req, res) => {
    sendOk(res, settingsManager.get());
  });

  r("PATCH", "/api/settings", async (req, res) => {
    try {
      const body = await readBody(req) as Record<string, unknown>;
      const updated = settingsManager.set(body);
      sendOk(res, updated);
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : String(err));
    }
  });
}
