import http from "node:http";

// --- Response helpers ---

export function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function sendOk(res: http.ServerResponse, data?: unknown, status = 200): void {
  sendJson(res, status, { ok: true, data: data ?? null });
}

export function sendError(res: http.ServerResponse, status: number, message: string): void {
  sendJson(res, status, { ok: false, error: { message } });
}

export function sendNotFound(res: http.ServerResponse, id: string): void {
  sendError(res, 404, `Not found: ${id}`);
}

// --- Route matching ---

export interface RouteMatch {
  params: Record<string, string>;
  handler: (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => void | Promise<void>;
}

export type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => void | Promise<void>;

export interface RouteEntry {
  method: string;
  segments: string[];
  handler: RouteHandler;
}

export function matchRoute(routes: RouteEntry[], method: string, pathSegments: string[]): RouteMatch | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.segments.length !== pathSegments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < route.segments.length; i++) {
      const routeSeg = route.segments[i];
      const pathSeg = pathSegments[i];

      if (routeSeg.startsWith(":")) {
        params[routeSeg.slice(1)] = decodeURIComponent(pathSeg);
      } else if (routeSeg !== pathSeg) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return { params, handler: route.handler };
    }
  }
  return null;
}

// --- Request parsing ---

export function parsePath(url: string | undefined): string[] {
  if (!url) return [];
  const pathname = url.split("?")[0] ?? "";
  return pathname.split("/").filter((s) => s.length > 0);
}

export function parseQuery(url: string | undefined): URLSearchParams {
  if (!url) return new URLSearchParams();
  const qs = url.split("?")[1] ?? "";
  return new URLSearchParams(qs);
}

export async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 1024 * 1024) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}
