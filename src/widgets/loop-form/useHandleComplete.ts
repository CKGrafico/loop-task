import { useCallback } from "react";

import type { Project, LoopOptions } from "../../types.js";
import type { LoopService } from "../../shared/services/types.js";
import { t } from "../../shared/i18n/index.js";
import { parseDuration } from "../../duration.js";
import { parseCommandLine, joinCommandLines } from "../../loop-config.js";

interface UseHandleCompleteParams {
  selectedTaskId: string | null;
  mode: "create" | "edit";
  editId: string | null;
  currentProjectId: string;
  onDone: (updated: boolean, id: string, desc: string) => void;
  commandValue: string;
  projects: Project[];
  loopService: LoopService;
}

export function useHandleComplete(params: UseHandleCompleteParams): (values: Record<string, string>) => void {
  const {
    selectedTaskId,
    mode,
    editId,
    currentProjectId,
    onDone,
    commandValue,
    projects,
    loopService,
  } = params;

  return useCallback(
    (values: Record<string, string>) => {
      const intervalInput = values.interval ?? "";
      if (!intervalInput.trim()) return;

      let interval: number;
      try {
        interval = parseDuration(intervalInput.trim());
      } catch {
        return;
      }

      const intervalHuman = intervalInput.trim();
      const isExistingTask = !!values.taskMode?.includes("Existing");

      if (isExistingTask && !selectedTaskId && !values.taskId?.trim()) return;
      const cmdValue = values.command ?? commandValue;
      if (!isExistingTask && !cmdValue.trim()) return;

      const cmd = isExistingTask
        ? ""
        : joinCommandLines(cmdValue);
      let cmdOnly = "";
      let args: string[] = [];
      if (cmd.trim()) {
        try {
          const tokens = parseCommandLine(cmd.trim());
          cmdOnly = tokens[0] ?? "";
          args = tokens.slice(1);
        } catch {
          return;
        }
      }

      const runNowValue = values.runNow === t("wizard.runNowNow");

      const projectName = values.project ?? "";
      const project = projects.find((p) => p.name === projectName);
      const projectId = project?.id ?? currentProjectId;

      const options: LoopOptions = {
        interval,
        taskId: isExistingTask
          ? (selectedTaskId ?? values.taskId?.trim() ?? null)
          : null,
        command: cmdOnly,
        commandArgs: args,
        commandRaw: isExistingTask ? undefined : cmdValue,
        cwd: (values.cwd ?? "").trim() || process.cwd(),
        immediate: runNowValue,
        maxRuns: (values.maxRuns ?? "").trim()
          ? parseInt(values.maxRuns, 10)
          : null,
        verbose: false,
        description: (values.description ?? "").trim(),
        projectId,
        offset: null,
      };

      const desc = (values.description ?? "").trim() || [cmdOnly, ...args].join(" ").trim();

      if (mode === "edit" && editId) {
        loopService.update(editId, options, intervalHuman)
          .then((id) => onDone(true, id, desc))
          .catch(() => { /* error handled silently */ });
      } else {
        loopService.create(options, intervalHuman)
          .then((id) => onDone(false, id, desc))
          .catch(() => { /* error handled silently */ });
      }
    },
    [selectedTaskId, mode, editId, currentProjectId, onDone, commandValue, projects],
  );
}
