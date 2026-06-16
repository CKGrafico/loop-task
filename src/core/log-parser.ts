interface ParsedRun {
  runNumber: number;
  lines: string[];
}

const RUN_HEADER_RE = /^╔═+$/;
const RUN_TITLE_RE = /^║ Run (.+)$/;
const RUN_FOOTER_RE = /^╚═+$/;
const OLD_HEADER_RE = /^--- Run at (.+) ---$/;
const EXIT_MARKER_RE = /^───────── exit|^(\[exit )/;

export function splitLogByRuns(content: string): ParsedRun[] {
  const lines = content.split("\n");
  const runs: ParsedRun[] = [];
  let currentRun: ParsedRun | null = null;
  let inBoxHeader = false;

  for (const line of lines) {
    if (RUN_HEADER_RE.test(line)) {
      inBoxHeader = true;
      if (currentRun) {
        runs.push(currentRun);
      }
      currentRun = { runNumber: runs.length + 1, lines: [] };
      continue;
    }

    if (inBoxHeader && RUN_TITLE_RE.test(line)) {
      continue;
    }

    if (inBoxHeader && RUN_FOOTER_RE.test(line)) {
      inBoxHeader = false;
      continue;
    }

    if (OLD_HEADER_RE.test(line)) {
      if (currentRun) {
        runs.push(currentRun);
      }
      currentRun = { runNumber: runs.length + 1, lines: [] };
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
