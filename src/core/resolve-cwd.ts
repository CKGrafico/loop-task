import path from "node:path";

export function resolveEffectiveCwd(
  loopCwd: string,
  projectDirectory: string | undefined,
): string {
  if (!loopCwd) return projectDirectory || process.cwd();
  if (path.isAbsolute(loopCwd)) return loopCwd;
  return path.join(projectDirectory || process.cwd(), loopCwd);
}
