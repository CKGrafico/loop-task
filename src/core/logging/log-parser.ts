interface ParsedRun {
  runNumber: number;
  lines: string[];
}

const RUN_HEADER_RE = /^\[Run #(\d+)/;
const EXIT_MARKER_RE = /^\[exit /;

export function splitLogByRuns(content: string): ParsedRun[] {
  const lines = content.split("\n");
  const runs: ParsedRun[] = [];
  let currentRun: ParsedRun | null = null;

  for (const line of lines) {
    const headerMatch = line.match(RUN_HEADER_RE);
    if (headerMatch) {
      if (currentRun) {
        runs.push(currentRun);
      }
      currentRun = { runNumber: parseInt(headerMatch[1], 10), lines: [] };
      continue;
    }

    if (currentRun && EXIT_MARKER_RE.test(line)) {
      runs.push(currentRun);
      currentRun = null;
      continue;
    }

    if (currentRun) {
      currentRun.lines.push(line);
    }
  }

  if (currentRun) {
    runs.push(currentRun);
  }

  return runs;
}
