import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, useInput, useApp } from "ink";
import type { LoopMeta, RunRecord, TaskDefinition, Project } from "../types.js";
import type { ConfirmState, View, TabName, PanelFocus, CommandContext } from "./types.js";
import { useLoopPolling } from "./hooks/useLoopPolling.js";
import { useLogStream } from "./hooks/useLogStream.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { ToastStack, useToasts } from "./components/Toast.js";
import { Header } from "./components/Header.js";
import { LeftPanel } from "./components/LeftPanel.js";
import { RightPanel } from "./components/RightPanel.js";
import { CommandInput } from "./components/CommandInput.js";
import { TaskForm } from "./components/TaskForm.js";
import { CreateView } from "./components/CreateForm.js";
import { LogModal } from "./components/LogModal.js";
import { HelpModal } from "./components/HelpModal.js";
import { ContextHelpModal } from "./components/ContextHelpModal.js";
import { fetchRunLog, deleteLoop, pauseLoop, resumeLoop, stopLoop, triggerLoop, listTasks, deleteTask, listProjects } from "./daemon.js";
import { applyLoopFilters, cycleSortMode, cycleStatusFilter, defaultFilters, type Filters, type SortMode } from "./state.js";
import { t } from "../i18n/index.js";
import { POLL_MS } from "../config/constants.js";
import { darkTheme as theme } from "./theme.js";
import { useRouter } from "./router.js";

const TASK_FORM_VIEWS = new Set<View>(["task-create", "task-edit"]);
const FORM_VIEWS: View[] = ["create", "task-create", "task-edit"];

function viewKey(view: View, editTarget: LoopMeta | null, editTask: TaskDefinition | null): string {
  if (view === "create") return `${view}:${editTarget?.id ?? "new"}`;
  if (view === "task-edit") return `${view}:${editTask?.id ?? "new"}`;
  return view;
}

function isBoardView(view: View): boolean {
  return view === "board";
}

export function App(props: { onQuit: () => void }): React.ReactNode {
  const { onQuit } = props;
  const { exit } = useApp();
  const { loops, daemonStatus, refresh } = useLoopPolling();
  const { view, push, pop } = useRouter("board");
  // ── Tab and panel state (8.1, 8.2) ──
  const [activeTab, setActiveTab] = useState<TabName>("loops");
  const [focusedPanel, setFocusedPanel] = useState<PanelFocus>("left");
  // ── Filter state ──
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortMode>("description");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editTarget, setEditTarget] = useState<LoopMeta | null>(null);
  const [cloneMode, setCloneMode] = useState(false);
  const [editTask, setEditTask] = useState<TaskDefinition | null>(null);
  const [pendingTaskSelection, setPendingTaskSelection] = useState<{ id: string; name: string } | null>(null);
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);
  const [logModalRun, setLogModalRun] = useState<RunRecord | null>(null);
  const [logModalLines, setLogModalLines] = useState<string[]>([]);
  const [logModalLoading, setLogModalLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [taskSelectedIndex, setTaskSelectedIndex] = useState(0);
  const [taskQuery, setTaskQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId] = useState<string>("all");
  // ── Overlay state ──
  const [helpOpen, setHelpOpen] = useState(false);
  const [contextHelpOpen, setContextHelpOpen] = useState(false);
  // ── Confirm state (8.3) ──
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { toasts, push: pushToast } = useToasts();
  const breakpoint = useBreakpoint();
  const visible = useMemo(
    () => applyLoopFilters(
      currentProjectId === "all" ? loops : loops.filter((l) => (l.projectId ?? "default") === currentProjectId),
      filters, sort
    ),
    [loops, filters, sort, currentProjectId]
  );

  const clampedIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  const selected = visible[clampedIndex] ?? null;
  const selectedId = selected?.id ?? null;

  useEffect(() => { setSelectedRunIndex(0); }, [selected?.id]);

  useLogStream(
    selectedId,
    view,
    (error) => pushToast("error", error.message)
  );

  const filteredTasks = useMemo(() => {
    if (!taskQuery) return tasks;
    const q = taskQuery.toLowerCase();
    return tasks.filter((t) => `${t.id} ${t.name} ${t.command}`.toLowerCase().includes(q));
  }, [tasks, taskQuery]);

  const taskClampedIndex = Math.min(taskSelectedIndex, Math.max(0, filteredTasks.length - 1));
  const selectedTask = filteredTasks[taskClampedIndex] ?? null;

  async function refreshTasks(): Promise<void> {
    try { setTasks(await listTasks()); } catch { /* ignore */ }
  }

  async function refreshProjects(): Promise<void> {
    try { setProjects(await listProjects()); } catch { /* ignore */ }
  }

  useEffect(() => { void refreshTasks(); void refreshProjects(); }, []);
  useEffect(() => {
    const timer = setInterval(() => { void refreshTasks(); void refreshProjects(); }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  function runAction(label: string, action: () => Promise<void>): () => Promise<void> {
    return async () => {
      try {
        await action();
        void refresh();
        pushToast("success", label);
      } catch (error) {
        pushToast("error", error instanceof Error ? error.message : String(error));
      }
    };
  }

  function handleOpenRunLog(run: RunRecord): void {
    if (!selectedId) return;
    setLogModalRun(run);
    if (run.status === "running") {
      setLogModalLoading(false);
      setLogModalLines([]);
      return;
    }
    setLogModalLoading(true);
    setLogModalLines([]);
    fetchRunLog(selectedId, run.runNumber)
      .then((log) => {
        setLogModalLines(log ? log.split("\n") : []);
        setLogModalLoading(false);
      })
      .catch(() => {
        setLogModalLines([]);
        setLogModalLoading(false);
      });
  }

  // ── Command handler (8.3) ──
  function handleCommand(value: string): void {
    switch (value) {
      case "edit":
        if (activeTab === "loops" && selected) {
          setCloneMode(false);
          setEditTarget(selected);
          push("create");
        } else if (activeTab === "tasks" && selectedTask) {
          setEditTask(selectedTask);
          push("task-edit");
        }
        break;
      case "clone":
        if (selected) {
          setCloneMode(true);
          setEditTarget(selected);
          push("create");
        }
        break;
      case "delete":
        if (activeTab === "loops" && selected) {
          setConfirmState({
            prompt: t("confirm.deleteLoop", { name: selected.description || selected.id }),
            onConfirm: () => { void deleteLoop(selected.id).then(() => { void refresh(); }); },
          });
        } else if (activeTab === "tasks" && selectedTask) {
          setConfirmState({
            prompt: t("confirm.deleteTask", { id: selectedTask.id }),
            onConfirm: () => { void deleteTask(selectedTask.id).then(() => { void refreshTasks(); }); },
          });
        }
        break;
      case "pause":
        if (selected) {
          void runAction(t("board.toastPaused", { desc: selected.description }), () => pauseLoop(selected.id))();
        }
        break;
      case "play":
        if (selected) {
          void runAction(t("board.toastResumed", { desc: selected.description }), () => resumeLoop(selected.id))();
        }
        break;
      case "stop":
        if (selected) {
          setConfirmState({
            prompt: t("confirm.stopLoop", { name: selected.description || selected.id }),
            onConfirm: () => { void stopLoop(selected.id).then(() => { void refresh(); }); },
          });
        }
        break;
      case "trigger":
        if (selected) {
          void runAction(t("board.toastTriggered", { desc: selected.description }), () => triggerLoop(selected.id))();
        }
        break;
      case "new-loop":
        setEditTarget(null);
        push("create");
        break;
      case "new-task":
        setEditTask(null);
        push("task-create");
        break;
      case "new-project":
        setActiveTab("projects");
        break;
      case "help":
        setHelpOpen(true);
        break;
      case "quit":
        onQuit();
        exit();
        break;
      case "logs":
        if (selected) {
          const runs = selected.runHistory;
          if (runs && runs.length > 0) {
            handleOpenRunLog(runs[0]!);
          }
        }
        break;
      case "select":
        if (selectedTask) {
          setPendingTaskSelection({ id: selectedTask.id, name: selectedTask.name });
          pop();
        }
        break;
      // api, status, export, import, new-project are stubs for now
      case "api":
      case "status":
      case "export":
      case "import":
        pushToast("info", `Command "${value}" coming soon`);
        break;
    }
  }

  // ── Confirm handlers (8.3) ──
  const handleConfirmYes = useCallback(() => {
    if (confirmState) {
      confirmState.onConfirm();
      setConfirmState(null);
    }
  }, [confirmState]);

  const handleConfirmCancel = useCallback(() => {
    setConfirmState(null);
  }, []);

  const cancelCreate = () => { setEditTarget(null); setCloneMode(false); setPendingTaskSelection(null); pop(); };
  const cancelTask = () => { setEditTask(null); pop(); };

  const handleChooseTask = () => { void refreshTasks(); setActiveTab("tasks"); };

  const onCreateDone = (updated: boolean, _id: string, desc: string) => {
    setEditTarget(null);
    setCloneMode(false);
    setPendingTaskSelection(null);
    pop();
    pushToast("success", updated ? t("board.toastUpdated", { desc }) : t("board.toastStarted", { desc }));
    void refresh();
  };

  const onTaskDone = (updated: boolean, id: string) => {
    setEditTask(null);
    void refreshTasks();
    pop();
    pushToast("success", updated ? t("board.toastTaskUpdated", { id }) : t("board.toastTaskCreated", { id }));
  };

  // ── Resolve query for LeftPanel based on activeTab (8.1) ──
  const leftPanelQuery = activeTab === "tasks" ? taskQuery : filters.query;
  const handleLeftPanelQueryChange = activeTab === "tasks"
    ? setTaskQuery
    : (value: string) => setFilters((prev) => ({ ...prev, query: value }));

  // ── Command context (8.3) ──
  const commandContext: CommandContext = useMemo(
    () => ({ activeTab, selectedLoop: selected, selectedTask, selectedProject: null }),
    [activeTab, selected, selectedTask]
  );

  // ── Global useInput (8.2) ──
  useInput((input, key) => {
    // Ctrl+C always quits if no modal open
    if (key.ctrl && input === "c") {
      if (!logModalRun && !confirmState && !helpOpen) {
        onQuit();
        exit();
        return;
      }
    }

    // Confirm mode is handled by CommandInput component, not here
    if (confirmState) return;

    if (logModalRun) {
      if (key.escape || input === "q") {
        setLogModalRun(null);
      }
      return;
    }

    if (helpOpen) {
      if (input === "h" || key.escape) {
        setHelpOpen(false);
      }
      return;
    }

    if (contextHelpOpen) {
      setContextHelpOpen(false);
      return;
    }

    // Full-screen form views: only escape
    if (FORM_VIEWS.includes(view)) {
      if (key.escape) pop();
      return;
    }

    // Board view: Tab cycles panels (8.2), 1/2/3 switch tabs (8.1)
    if (isBoardView(view)) {
      if (key.tab) {
        if (key.shift) {
          setFocusedPanel((prev) => prev === "left" ? "right" : "left");
        } else {
          setFocusedPanel((prev) => prev === "left" ? "right" : "left");
        }
        return;
      }

      if (input === "1") { setActiveTab("loops"); return; }
      if (input === "2") { setActiveTab("tasks"); return; }
      if (input === "3") { setActiveTab("projects"); return; }
    }

    // Escape: pop router or quit
    if (key.escape) {
      if (view !== "board") pop();
      else { onQuit(); exit(); }
      return;
    }
  });

  const counts = {
    total: loops.length,
    running: loops.filter((l) => l.status === "running").length,
    waiting: loops.filter((l) => l.status === "waiting").length,
    paused: loops.filter((l) => l.status === "paused").length,
    idle: loops.filter((l) => l.status === "idle").length,
  };

  return (
    <Box flexDirection="column" width="100%" height={process.stdout.rows || 24} backgroundColor={theme.bg.base}>
      <Header
        daemonStatus={daemonStatus}
        counts={counts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <Box key={viewKey(view, editTarget, editTask)} flexGrow={1}>
        {view === "create" ? (
          <CreateView
            mode={editTarget && !cloneMode ? "edit" : "create"}
            editId={editTarget && !cloneMode ? editTarget.id : null}
            initial={createInitialValues(editTarget, currentProjectId)}
            selectedTaskId={pendingTaskSelection?.id ?? null}
            selectedTaskName={pendingTaskSelection?.name ?? null}
            projects={projects}
            currentProjectId={currentProjectId}
            onCancel={cancelCreate}
            onDone={onCreateDone}
            onChooseTask={handleChooseTask}
          />
        ) : TASK_FORM_VIEWS.has(view) ? (
          <TaskForm
            mode={view === "task-edit" ? "edit" : "create"}
            editTask={editTask}
            onCancel={cancelTask}
            onDone={onTaskDone}
            onCopy={() => pushToast("success", t("board.toastCopied"))}
          />
        ) : (
          // Board view: left panel + right panel (8.1, 8.2)
          <Box flexDirection={breakpoint === "narrow" ? "column" : "row"} flexGrow={1}>
            <LeftPanel
              isFocused={focusedPanel === "left"}
              activeTab={activeTab}
              query={leftPanelQuery}
              onQueryChange={handleLeftPanelQueryChange}
              loops={visible}
              selectedIndex={clampedIndex}
              filters={filters}
              sort={sort}
              breakpoint={breakpoint}
              projects={projects}
              onSelect={(index) => setSelectedIndex(index)}
              onActivate={(index) => { setSelectedIndex(index); const loop = visible[index]; if (loop) { setEditTarget(loop); push("create"); } }}
              tasks={filteredTasks}
              taskSelectedIndex={taskClampedIndex}
              onTaskSelect={(index) => setTaskSelectedIndex(index)}
              onTaskActivate={(index) => { setTaskSelectedIndex(index); setEditTask(filteredTasks[index] ?? null); push("task-edit"); }}
              onStatusCycle={() => setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }))}
              onSortCycle={() => setSort(cycleSortMode(sort))}
              onSelectProject={() => setActiveTab("projects")}
              currentProjectName={currentProjectId === "all" ? t("project.showAll") : (projects.find(p => p.id === currentProjectId)?.name ?? "Default")}
            />
            <RightPanel
              isFocused={focusedPanel === "right"}
              loop={selected}
              selectedRunIndex={selectedRunIndex}
              onSelectRun={(index) => setSelectedRunIndex(index)}
              onOpenRun={handleOpenRunLog}
            />
          </Box>
        )}
      </Box>

      {/* Command input at bottom (8.3) - only on board views */}
      {isBoardView(view) ? (
        <CommandInput
          context={commandContext}
          onCommand={handleCommand}
          confirmState={confirmState}
          onConfirmYes={handleConfirmYes}
          onConfirmCancel={handleConfirmCancel}
        />
      ) : null}

      {helpOpen ? <HelpModal view={isBoardView(view) ? activeTab : view} onClose={() => setHelpOpen(false)} /> : null}
      {contextHelpOpen ? <ContextHelpModal onClose={() => setContextHelpOpen(false)} /> : null}

      {logModalRun ? (
        <LogModal
          loopId={selectedId}
          run={logModalRun}
          logLines={logModalLines}
          loading={logModalLoading}
          onClose={() => setLogModalRun(null)}
        />
      ) : null}

      <ToastStack toasts={toasts} />
    </Box>
  );
}

function createInitialValues(editTarget: LoopMeta | null, currentProjectId: string): Record<string, string> {
  if (!editTarget) {
    return {
      interval: "30m",
      taskMode: "inline",
      command: "",
      cwd: "",
      taskId: "",
      description: "",
      runNow: "y",
      maxRuns: "",
      project: currentProjectId,
    };
  }
  return {
    interval: editTarget.intervalHuman ?? "30m",
    taskMode: editTarget.taskId ? "existing" : "inline",
    command: [editTarget.command, ...editTarget.commandArgs].join(" "),
    cwd: editTarget.cwd ?? "",
    taskId: editTarget.taskId ?? "",
    description: editTarget.description,
    runNow: "y",
    maxRuns: editTarget.maxRuns?.toString() ?? "",
    project: editTarget.projectId ?? "default",
  };
}
