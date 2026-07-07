import { t } from "../../../i18n/index.js";
import { cycleSortMode, cycleStatusFilter, cycleProjectSortMode, cycleProjectHasLoopsFilter, cycleProjectIsSystemFilter } from "../../state.js";
import type { CommandHandlerContext } from "../../types.js";

export function useCommandHandlers(context: CommandHandlerContext) {
  const {
    activeTab, selected, selectedTask, selectedProjectEntity,
    tasks, projects, currentProjectId,
    setCloneMode, setEditTarget, setPendingTaskSelection,
    setEditTask, setEditProject, setActiveTab,
    setConfirmState, setCommandsBrowserOpen,
    setSearchValue, setSearchState,
    setFilters, setSort, setCurrentProjectId,
    setProjectFilters, setProjectSelectedIndex,
    setDebugMode, setExportModal,
    push, pop, refresh, refreshTasks, refreshProjects, pushToast,
    loopService, taskService, projectService, exportService,
    runAction, handleOpenRunLog,
  } = context;

  const commandHandlers: Record<string, () => void> = {
    edit: () => {
      if (activeTab === "loops" && selected) {
        setCloneMode(false);
        setEditTarget(selected);
        if (selected.taskId) {
          const task = tasks.find((t) => t.id === selected.taskId);
          setPendingTaskSelection(task ? { id: task.id, name: task.name } : null);
        } else {
          setPendingTaskSelection(null);
        }
        push("create");
      } else if (activeTab === "tasks" && selectedTask) {
        setEditTask(selectedTask);
        push("task-edit");
      } else if (activeTab === "projects" && selectedProjectEntity && !selectedProjectEntity.isSystem) {
        setEditProject(selectedProjectEntity);
        push("project-edit");
      }
    },
    clone: () => {
      if (activeTab === "loops" && selected) {
        setCloneMode(true);
        setEditTarget(selected);
        push("create");
      }
    },
    delete: () => {
      if (activeTab === "loops" && selected) {
        setConfirmState({
          prompt: t("confirm.deleteLoop", { name: selected.description || selected.id }),
          onConfirm: () => { void loopService.delete(selected.id).then(() => { void refresh(); }); },
        });
      } else if (activeTab === "tasks" && selectedTask) {
        setConfirmState({
          prompt: t("confirm.deleteTask", { id: selectedTask.id }),
          onConfirm: () => { void taskService.delete(selectedTask.id).then(() => { void refreshTasks(); }); },
        });
      } else if (activeTab === "projects" && selectedProjectEntity && !selectedProjectEntity.isSystem) {
        setConfirmState({
          prompt: t("confirm.deleteProject", { name: selectedProjectEntity.name }),
          onConfirm: async () => {
            try {
              await projectService.delete(selectedProjectEntity.id);
              pushToast("success", t("project.toastDeleted", { name: selectedProjectEntity.name }));
              setProjectSelectedIndex(0);
              void refreshProjects();
            } catch (e) {
              pushToast("error", (e as Error).message);
            }
          },
        });
      }
    },
    pause: () => {
      if (activeTab === "loops" && selected) {
        void runAction(t("board.toastPaused", { desc: selected.description }), () => loopService.pause(selected.id))();
      }
    },
    play: () => {
      if (activeTab === "loops" && selected) {
        const isPaused = selected.status === "paused";
        const toastKey = isPaused ? "board.toastResumed" : "board.toastPlayed";
        const fn = isPaused ? () => loopService.resume(selected.id) : () => loopService.play(selected.id);
        void runAction(t(toastKey, { desc: selected.description }), fn)();
      }
    },
    stop: () => {
      if (activeTab === "loops" && selected) {
        setConfirmState({
          prompt: t("confirm.stopLoop", { name: selected.description || selected.id }),
          onConfirm: () => { void loopService.stop(selected.id).then(() => { void refresh(); }); },
        });
      }
    },
    trigger: () => {
      if (activeTab === "loops" && selected) {
        void runAction(t("board.toastTriggered", { desc: selected.description }), () => loopService.trigger(selected.id))();
      }
    },
    "new-loop": () => { setEditTarget(null); push("create"); },
    "new-task": () => { setEditTask(null); push("task-create"); },
    "new-project": () => { setEditProject(null); setActiveTab("projects"); push("project-create"); },
    "project-filter-loops": () => { setProjectFilters((prev) => ({ ...prev, hasLoops: cycleProjectHasLoopsFilter(prev.hasLoops) })); },
    "project-filter-type": () => { setProjectFilters((prev) => ({ ...prev, isSystem: cycleProjectIsSystemFilter(prev.isSystem) })); },
    "project-sort": () => { setProjectFilters((prev) => ({ ...prev, sort: cycleProjectSortMode(prev.sort) })); },
    "all-commands": () => { setCommandsBrowserOpen(true); },
    help: () => { setCommandsBrowserOpen(true); },
    search: () => { setSearchValue(""); setSearchState({ active: true }); },
    "filter-status": () => { setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) })); },
    sort: () => { setSort((prev) => cycleSortMode(prev)); },
    "filter-project": () => {
      const ids = ["all", ...projects.map((p) => p.id)];
      const idx = ids.indexOf(currentProjectId);
      const nextId = ids[(idx + 1) % ids.length] ?? "all";
      setCurrentProjectId(nextId);
    },
    debug: () => { setDebugMode((prev) => !prev); },
    logs: () => {
      if (activeTab === "loops" && selected) {
        const runs = selected.runHistory;
        if (runs && runs.length > 0) {
          handleOpenRunLog(runs[runs.length - 1]!);
        }
      }
    },
    select: () => {
      if (selectedTask) {
        setPendingTaskSelection({ id: selectedTask.id, name: selectedTask.name });
        pop();
      }
    },
    api: () => {
      const port = process.env.LOOP_CLI_HTTP_PORT ?? "8845";
      const baseUrl = `http://127.0.0.1:${port}`;
      pushToast("info", `API: ${baseUrl} | Swagger: ${baseUrl}/api/docs | OpenAPI: ${baseUrl}/api/openapi.json`);
    },
    status: () => { pushToast("info", `Command "status" coming soon`); },
    export: () => {
      exportService.exportConfig()
        .then(({ json, filePath }) => setExportModal({ json, filePath, error: null }))
        .catch((e) => setExportModal({ json: "", filePath: null, error: e instanceof Error ? e.message : String(e) }));
    },
    import: () => { pushToast("info", `Command "import" coming soon`); },
  };

  function handleCommand(value: string): void {
    const handler = commandHandlers[value];
    if (handler) {
      handler();
    } else {
      pushToast("error", `Unknown command: ${value}`);
    }
  }

  return { handlers: commandHandlers, handleCommand };
}
