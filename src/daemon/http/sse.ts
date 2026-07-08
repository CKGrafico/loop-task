import http from "node:http";

export class SseClientSet {
  private clients = new Set<http.ServerResponse>();

  add(res: http.ServerResponse): void {
    this.clients.add(res);
  }

  delete(res: http.ServerResponse): void {
    this.clients.delete(res);
  }

  destroyAll(): void {
    for (const client of this.clients) {
      client.destroy();
    }
    this.clients.clear();
  }

  broadcast(event: string, data?: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}

export function initSseResponse(res: http.ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.write(": connected\n\n");
}
