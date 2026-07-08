import { SseClientSet, initSseResponse } from "./sse.js";
import { buildOpenApiSpec, buildSwaggerHtml } from "./openapi.js";
import type { RouteHandler } from "./helpers.js";

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
