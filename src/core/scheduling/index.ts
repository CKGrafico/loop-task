export function computePhase(loopId: string, intervalMs: number): number {
  if (intervalMs <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < loopId.length; i++) {
    hash = ((hash << 5) - hash + loopId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % intervalMs;
}

export function alignToPhase(now: number, intervalMs: number, phaseMs: number): number {
  if (intervalMs <= 0) return 0;
  const elapsed = now % intervalMs;
  const delay = (phaseMs - elapsed + intervalMs) % intervalMs;
  return delay;
}
