import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Box, Text, useInput, useApp, useFocusManager } from "ink";
import type { LoopMeta, RunRecord, TaskDefinition, Project, LoopOptions } from "../types.js";
import type { ConfirmState, View, DaemonStatus, Mode } from "./types.js";
import { useLoopPolling } from "./hooks/useLoopPolling.js";
import { useLogStream } from "./hooks/useLogStream.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { ToastStack, useToasts } from "./components/Toast.js";
import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { FilterBar } from "./components/FilterBar.js";
import { Navigator } from "./components/Navigator.js";
import { Inspector } from "./components/Inspector.js";
import { RunHistory } from "./components/RunHistory.js";
import { ActionButtons } from "./components/ActionButtons.js";
import { TaskNavigator, TaskInspector, TaskActionButtons } from "./components/TaskBrowser.js";
import { TaskFilterBar } from "./components/TaskFilterBar.js";
import { TaskForm } from "./components/TaskForm.js";
import { CreateView } from "./components/CreateForm.js";
import { LogModal } from "./components/LogModal.js";
import { ConfirmModal } from "./components/ConfirmModal.js";
import { HelpModal } from "./components/HelpModal.js";
import { ContextHelpModal } from "./components/ContextHelpModal.js";
import { ProjectsPage } from "./components/ProjectsPage.js";
import { WelcomeScreen } from "./components/WelcomeScreen.js";
import { fetchRunLog, deleteLoop, pauseLoop, resumeLoop, stopLoop, playLoop, triggerLoop, listTasks, deleteTask, listProjects } from "./daemon.js";
import { applyLoopFilters, cycleSortMode, cycleStatusFilter, defaultFilters, type Filters, type SortMode } from "./state.js";
import { t } from "../i18n/index.js";
import { POLL_MS, ENTITY_COLORS } from "../config/constants.js";
import { darkTheme as theme } from "./theme.js";
import { copyToClipboard } from "../shared/clipboard.js";
import { useRouter } from "./router.js";
import { getActionCount, getActionKeys } from "./components/ActionButtons.js";

const TASK_FORM_VIEWS = new Set<View>(["task-create", "task-edit"]);
const FORM_VIEWS: View[] = ["create", "task-create", "task-edit"];

function resolveMode(confirm: ConfirmState | null, searchActive: boolean, helpOpen: boolean, view: View): Mode {
  if (confirm) return "confirm";
  if (searchActive) return "search";
  if (helpOpen) return "help";
  const VIEW_TO_MODE: Partial<Record<View, Mode>> = {
    create: "create",
    "task-create": "task",
    "task-edit": "task",
    "task-list": "task",
    projects: "projects",
  };
  return VIEW_TO_MODE[view] ?? "normal";
}

function viewKey(view: View, editTarget: LoopMeta | null, editTask: TaskDefinition | null): string {
  if (view === "create") return `${view}:${editTarget?.id ?? "new"}`;
  if (view === "task-edit") return `${view}:${editTask?.id ?? "new"}`;
  return view;
}

export function App(props: { onQuit: () => void }): React.ReactNode {
  const { onQuit } = props;
  const { exit } = useApp();
  const { loops, daemonStatus, refresh } = useLoopPolling();
  const { view, stack, push, replace, pop } = useRouter("board");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortMode>("description");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contextHelpOpen, setContextHelpOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmChoice, setConfirmChoice] = useState(0);
  const [editTarget, setEditTarget] = useState<LoopMeta | null>(null);
  const [cloneMode, setCloneMode] = useState(false);
  const [editTask, setEditTask] = useState<TaskDefinition | null>(null);
  const [pendingTaskSelection, setPendingTaskSelection] = useState<{ id: string; name: string } | null>(null);
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState(0);
  const [logModalRun, setLogModalRun] = useState<RunRecord | null>(null);
  const [logModalLines, setLogModalLines] = useState<string[]>([]);
  const [logModalLoading, setLogModalLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [taskSelectedIndex, setTaskSelectedIndex] = useState(0);
  const [taskSelectedAction, setTaskSelectedAction] = useState(0);
  const [taskSearchActive, setTaskSearchActive] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>("all");
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const { toasts, push: pushToast } = useToasts();
  const breakpoint = useBreakpoint();
  const createProjectTriggerRef = useRef<(() => void) | null>(null);

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
  useEffect(() => { setSelectedAction(0); }, [selected?.id]);

  const { destroy: destroyLogSocket } = useLogStream(
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

  function handleAction(action: string): void {
    if (!selected) return;
    switch (action) {
      case "edit":
        setCloneMode(false);
        setEditTarget(selected);
        push("create");
        break;
      case "clone":
        setCloneMode(true);
        setEditTarget(selected);
        push("create");
        break;
      case "delete":
        setConfirm({
          message: t("board.confirmDelete", { desc: selected.description }),
          action: async () => { await deleteLoop(selected.id); void refresh(); },
        });
        setConfirmChoice(0);
        break;
      case "pause":
        void runAction(t("board.toastPaused", { desc: selected.description }), () => pauseLoop(selected.id))();
        break;
      case "play":
        void runAction(t("board.toastResumed", { desc: selected.description }), () => resumeLoop(selected.id))();
        break;
      case "stop":
        setConfirm({
          message: t("board.confirmStop", { desc: selected.description }),
          action: async () => { await stopLoop(selected.id); void refresh(); },
        });
        setConfirmChoice(0);
        break;
      case "trigger":
        void runAction(t("board.toastTriggered", { desc: selected.description }), () => triggerLoop(selected.id))();
        break;
    }
  }

  function handleTaskAction(action: string): void {
    if (!selectedTask) return;
    if (action === "edit") { setEditTask(selectedTask); push("task-edit"); }
    else if (action === "delete") {
      setConfirm({
        message: t("board.confirmDeleteTask", { id: selectedTask.id }),
        action: async () => { await deleteTask(selectedTask.id); void refreshTasks(); },
      });
      setConfirmChoice(0);
    } else if (action === "select") {
      setPendingTaskSelection({ id: selectedTask.id, name: selectedTask.name });
      pop();
    }
  }

  const cancelCreate = () => { setEditTarget(null); setCloneMode(false); setPendingTaskSelection(null); pop(); };
  const cancelTask = () => { setEditTask(null); pop(); };
  const cancelTaskList = () => pop();

  const handleChooseTask = () => { void refreshTasks(); push("task-list"); };

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

  // Keyboard input
  useInput((input, key) => {
    // Ctrl+C quits (unless a modal is open)
    if (key.ctrl && input === "c") {
      if (!logModalRun && !confirm && !helpOpen) {
        onQuit();
        exit();
        return;
      }
    }

    // Handle confirm modal
    if (confirm) {
      if (key.leftArrow || key.rightArrow || input === "h" || input === "l") {
        setConfirmChoice((c) => (c === 1 ? 0 : 1));
      }
      if (key.return || input === "y") {
        const action = confirm.action;
        setConfirm(null);
        void action();
      }
      if (input === "n") { setConfirm(null); }
      if (key.escape) { setConfirm(null); }
      return;
    }

    // Handle log modal
    if (logModalRun) {
      if (key.escape || input === "q") {
        setLogModalRun(null);
      }
      return;
    }

    // Handle help modal
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

    // Don't handle global keys in form views
    if (FORM_VIEWS.includes(view)) {
      if (key.escape) pop();
      return;
    }

    // Search mode
    if (searchActive) {
      if (key.escape) {
        setSearchActive(false);
        return;
      }
      return;
    }

    // Global keys
    if (input === "h") { setHelpOpen(true); return; }
    if (input === "n" && view === "board") { setEditTarget(null); push("create"); return; }
    if (input === "t" && view === "board") { setEditTask(null); push("task-create"); return; }
    if (input === "e" && view === "board") { handleAction("edit"); return; }
    if (input === "d" && view === "board") { handleAction("delete"); return; }
    if (input === "c" && view === "board") { handleAction("clone"); return; }
    if (input === "p" && view === "board") { handleAction("pause-or-play"); return; }
    if (input === "s" && view === "board") { handleAction("stop"); return; }
    if (input === "f" && view === "board") { handleAction("trigger"); return; }
    if (input === "r" && view === "board") { setProjectsModalOpen(true); return; }
    if (input === "/" && view === "board") { setSearchActive(true); return; }

    // Escape to go back
    if (key.escape) {
      if (view === "projects") pop();
      else if (view === "task-list") pop();
      else if (view !== "board") pop();
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

  const mode = resolveMode(confirm, searchActive, helpOpen, view);

  return (
    <Box flexDirection="column" width="100%" height={process.stdout.rows || 24} backgroundColor={theme.bg.base}>
      <Header
        daemonStatus={daemonStatus}
        counts={counts}
        view={view}
        onViewLoops={() => replace("board")}
        onViewTasks={() => { void refreshTasks(); push("task-list"); }}
        onViewProjects={() => push("projects")}
        onAddLoop={() => { setEditTarget(null); push("create"); }}
        onAddTask={() => { setEditTask(null); push("task-create"); }}
        onAddProject={() => { if (view === "projects") { createProjectTriggerRef.current?.(); } else { push("projects"); } }}
      />

      {view === "board" ? (
        <FilterBar
          filters={filters}
          sort={sort}
          searchActive={searchActive}
          onStatusCycle={() => setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }))}
          onSortCycle={() => setSort(cycleSortMode(sort))}
          onSelectProject={() => setProjectsModalOpen(true)}
          currentProjectName={currentProjectId === "all" ? t("project.showAll") : (projects.find(p => p.id === currentProjectId)?.name ?? "Default")}
          onQueryChange={(value) => setFilters((prev) => ({ ...prev, query: value }))}
          onSearchActivate={() => setSearchActive(true)}
          onSearchDismiss={() => setSearchActive(false)}
        />
      ) : view === "task-list" ? (
        <TaskFilterBar
          query={taskQuery}
          searchActive={taskSearchActive}
          onQueryChange={setTaskQuery}
          onSearchActivate={() => setTaskSearchActive(true)}
          onSearchDismiss={() => setTaskSearchActive(false)}
        />
      ) : null}

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
        ) : view === "task-list" ? (
          <Box flexDirection={breakpoint === "narrow" ? "column" : "row"} flexGrow={1}>
            <TaskNavigator
              visible={filteredTasks}
              total={tasks.length}
              selectedIndex={taskClampedIndex}
              focused={taskSearchActive ? false : true}
              query={taskQuery}
              onSelect={(index) => setTaskSelectedIndex(index)}
              onActivate={(index) => { setTaskSelectedIndex(index); setEditTask(filteredTasks[index] ?? null); push("task-edit"); }}
            />
            <Box flexDirection="column" flexGrow={1}>
              <TaskInspector key={`ti-${selectedTask?.id}`} task={selectedTask} />
              <TaskActionButtons
                key={`tab-${selectedTask?.id}`}
                task={selectedTask}
                focused={!taskSearchActive}
                selectedAction={taskSelectedAction}
                selectable={stack.includes("create") || stack.includes("task-edit")}
                onAction={handleTaskAction}
              />
            </Box>
          </Box>
        ) : view === "projects" ? (
          <ProjectsPage
            projects={projects}
            loops={loops}
            onClose={() => pop()}
            onRefresh={refreshProjects}
            onOpenCreate={(trigger) => { createProjectTriggerRef.current = trigger; }}
            onToast={(msg: string) => pushToast("success", msg)}
          />
        ) : loops.length === 0 ? (
          <WelcomeScreen
            onCreateEmpty={() => { setEditTarget(null); push("create"); }}
            onCreateLoop={() => { void refresh(); }}
            onRefresh={refresh}
          />
        ) : (
          <Box flexDirection={breakpoint === "narrow" ? "column" : "row"} flexGrow={1}>
            <Navigator
              visible={visible}
              total={loops.length}
              selectedIndex={clampedIndex}
              filters={filters}
              sort={sort}
              breakpoint={breakpoint}
              focused={searchActive ? false : true}
              projects={projects}
              onSelect={(index) => setSelectedIndex(index)}
              onActivate={(index) => { setSelectedIndex(index); const loop = visible[index]; if (loop) { setEditTarget(loop); push("create"); } }}
            />
            <Box flexDirection="column" flexGrow={1}>
              <Inspector loop={selected} />
              <RunHistory
                loop={selected}
                selectedRunIndex={selectedRunIndex}
                focused={!searchActive}
                onSelectRun={(index) => setSelectedRunIndex(index)}
                onOpenRun={handleOpenRunLog}
              />
              <ActionButtons
                loop={selected}
                focused={!searchActive}
                selectedAction={selectedAction}
                onAction={handleAction}
              />
            </Box>
          </Box>
        )}
      </Box>

      <Footer mode={mode} />

      {confirm ? (
        <ConfirmModal
          message={confirm.message}
          choice={confirmChoice}
          onYes={() => { const action = confirm.action; setConfirm(null); void action(); }}
          onNo={() => setConfirm(null)}
        />
      ) : null}

      {helpOpen ? <HelpModal view={view} /> : null}
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
