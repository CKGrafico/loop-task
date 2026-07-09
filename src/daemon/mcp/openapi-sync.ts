import { buildOpenApiSpec } from "../http/openapi.js";

interface McpToolDef {
  name: string;
  description: string;
}

export function buildMcpToolDefsFromOpenApi(): McpToolDef[] {
  const spec = buildOpenApiSpec() as {
    paths?: Record<string, Record<string, { summary?: string; tags?: string[] }>>;
  };

  const defs: McpToolDef[] = [];

  if (!spec.paths) return defs;

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!operation.summary) continue;

      const toolName = httpToToolName(method, path);
      if (!toolName) continue;

      defs.push({
        name: toolName,
        description: operation.summary,
      });
    }
  }

  return defs;
}

function httpToToolName(method: string, path: string): string | null {
  const mappings: Record<string, string> = {
    "GET /api/loops": "list_loops",
    "POST /api/loops": "create_loop",
    "GET /api/loops/:id": "get_loop",
    "PATCH /api/loops/:id": "update_loop",
    "DELETE /api/loops/:id": "delete_loop",
    "POST /api/loops/:id/pause": "pause_loop",
    "POST /api/loops/:id/resume": "resume_loop",
    "POST /api/loops/:id/play": "resume_loop",
    "POST /api/loops/:id/trigger": "trigger_loop",
    "POST /api/loops/:id/stop": "stop_loop",
    "POST /api/loops/stop-all": "stop_all_loops",
    "GET /api/loops/:id/logs": "get_loop_logs",
    "GET /api/loops/:id/runs/:num": "get_run_log",
    "GET /api/tasks": "list_tasks",
    "POST /api/tasks": "create_task",
    "GET /api/tasks/:id": "get_task",
    "PATCH /api/tasks/:id": "update_task",
    "DELETE /api/tasks/:id": "delete_task",
    "GET /api/projects": "list_projects",
    "POST /api/projects": "create_project",
    "PATCH /api/projects/:id": "update_project",
    "DELETE /api/projects/:id": "delete_project",
  };

  const normalizedPath = path.replace(/\{[^}]+\}/g, (m) => ":" + m.slice(1, -1));
  const key = `${method.toUpperCase()} ${normalizedPath}`;
  return mappings[key] ?? null;
}
