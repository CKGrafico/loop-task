import { useEffect, useMemo, useRef, useState } from "react";
import type { LoopMeta, RunRecord, TaskDefinition } from "../types.js";
import type { Project } from "../types.js";
import {
  applyLoopFilters,
  cycleSortMode,
  cycleStatusFilter,
  defaultFilters,
  type Filters,
  type SortMode,
} from "./state.js";
import { ToastStack, useToasts } from "./toast.js";
import { t } from "../i18n/index.js";
import type { ConfirmState, Mode, PanelFocus, View } from "./types.js";
import { useLoopPolling } from "./hooks/useLoopPolling.js";
import { useLogStream } from "./hooks/useLogStream.js";
import { useBoardKeybindings } from "./hooks/useBoardKeybindings.js";
import { useTaskKeybindings } from "./hooks/useTaskKeybindings.js";
import { Header } from "./components/Header.js";
import { FilterBar } from "./components/FilterBar.js";
import { Navigator } from "./components/Navigator.js";
import { Inspector } from "./components/Inspector.js";
import { RunHistory } from "./components/RunHistory.js";
import { ActionButtons } from "./components/ActionButtons.js";
import { HelpModal } from "./components/HelpModal.js";
import { Footer } from "./components/Footer.js";
import { ConfirmModal } from "./components/ConfirmModal.js";
import { CreateView, createInitialValues } from "./components/CreateForm.js";
import { TaskForm } from "./components/TaskForm.js";
import { TaskNavigator, TaskInspector, TaskActionButtons, type TaskPanelFocus } from "./components/TaskBrowser.js";
import { TaskFilterBar } from "./components/TaskFilterBar.js";
import { LogModal } from "./components/LogModal.js";
import { ProjectsModal } from "./components/ProjectsModal.js";
import { ProjectsPage } from "./components/ProjectsPage.js";
import { fetchRunLog, deleteLoop, pauseLoop, resumeLoop, stopLoop, playLoop, triggerLoop, listTasks, deleteTask, listProjects } from "./daemon.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { useRouter } from "./router.js";

const BOARD_REFRESH_DELAY_MS = 150;

const VIEW_TO_MODE: Partial<Record<View, Mode>> = {
  create: "create",
  "task-create": "task",
  "task-edit": "task",
  "task-list": "task",
  projects: "projects",
};

function resolveMode(confirm: ConfirmState | null, searchActive: boolean, helpOpen: boolean, view: View): Mode {
  if (confirm) return "confirm";
  if (searchActive) return "search";
  if (helpOpen) return "help";
  return VIEW_TO_MODE[view] ?? "normal";
}

function viewKey(view: View, editTarget: LoopMeta | null, editTask: TaskDefinition | null): string {
  if (view === "create") return `${view}:${editTarget?.id ?? "new"}`;
  if (view === "task-edit") return `${view}:${editTask?.id ?? "new"}`;
  return view;
}

export function App(props: { onQuit: () => void }): React.ReactNode {
  const { loops, daemonStatus, refresh } = useLoopPolling();
  const { view, stack, push, replace, pop } = useRouter("board");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortMode>("description");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmChoice, setConfirmChoice] = useState(0);
  const [editTarget, setEditTarget] = useState<LoopMeta | null>(null);
  const [editTask, setEditTask] = useState<TaskDefinition | null>(null);
  const [pendingTaskSelection, setPendingTaskSelection] = useState<{ id: string; name: string } | null>(null);
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState(0);
  const [focusedPanel, setFocusedPanel] = useState<PanelFocus>("loops");
  const [logModalRun, setLogModalRun] = useState<RunRecord | null>(null);
  const [logModalLines, setLogModalLines] = useState<string[]>([]);
  const [logModalLoading, setLogModalLoading] = useState(false);

  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [taskSelectedIndex, setTaskSelectedIndex] = useState(0);
  const [taskSelectedAction, setTaskSelectedAction] = useState(0);
  const [taskFocusedPanel, setTaskFocusedPanel] = useState<TaskPanelFocus>("tasks");
  const [taskSearchActive, setTaskSearchActive] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const createProjectTriggerRef = useRef<(() => void) | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string>(() => {
    try { return localStorage.getItem("loop-current-project") ?? "all"; } catch { return "all"; }
  });
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);

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
  const selectedDesc = selected?.description ?? "";

  const prevSelectedId = useRef<string | null>(null);
  if (selectedId !== prevSelectedId.current) {
    prevSelectedId.current = selectedId;
    setSelectedRunIndex(0);
  }

  useEffect(() => {
    setSelectedAction(0);
  }, [selected?.id]);

  const { destroy: destroyLogSocket } = useLogStream(
    selectedId,
    view,
    (error) => pushToast("error", t("board.logStreamError", { message: error.message }))
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

  useState(() => { void refreshTasks(); });

  async function refreshProjects(): Promise<void> {
    try { setProjects(await listProjects()); } catch { /* ignore */ }
  }

  useState(() => { void refreshProjects(); });

  useEffect(() => {
    try { localStorage.setItem("loop-current-project", currentProjectId); } catch {}
  }, [currentProjectId]);

  function runAction(label: string, action: () => Promise<void>): () => Promise<void> {
    return async () => {
      try {
        await action();
        setTimeout(() => { void refresh(); }, BOARD_REFRESH_DELAY_MS);
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

  function confirmAction(msg: string, toast: string, fn: () => Promise<void>): void {
    setConfirmChoice(0);
    setConfirm({ message: msg, action: runAction(toast, fn) });
  }

  function handleAction(action: string): void {
    if (!selected || !selectedId) return;

    if (action === "edit") {
      setEditTarget(selected);
      push("create");
      return;
    }

    if (action === "delete") {
      confirmAction(
        t("board.confirmDelete", { desc: selectedDesc }),
        t("board.toastDeleted", { desc: selectedDesc }),
        () => deleteLoop(selectedId),
      );
      return;
    }

    if (action === "pause-or-play") {
      if (selected.status === "waiting") {
        confirmAction(
          t("board.confirmPause", { desc: selectedDesc }),
          t("board.toastPaused", { desc: selectedDesc }),
          () => pauseLoop(selectedId),
        );
      } else if (selected.status === "paused") {
        confirmAction(
          t("board.confirmResume", { desc: selectedDesc }),
          t("board.toastResumed", { desc: selectedDesc }),
          () => resumeLoop(selectedId),
        );
      } else {
        confirmAction(
          t("board.confirmPlay", { desc: selectedDesc }),
          t("board.toastPlayed", { desc: selectedDesc }),
          () => playLoop(selectedId),
        );
      }
      return;
    }

    if (action === "stop") {
      confirmAction(
        t("board.confirmStop", { desc: selectedDesc }),
        t("board.toastStopped", { desc: selectedDesc }),
        () => stopLoop(selectedId),
      );
      return;
    }

    if (action === "play") {
      const isPaused = selected.status === "paused";
      const msgKey = isPaused ? "board.confirmResume" : "board.confirmPlay";
      const toastKey = isPaused ? "board.toastResumed" : "board.toastPlayed";
      const fn = isPaused ? () => resumeLoop(selectedId) : () => playLoop(selectedId);
      confirmAction(
        t(msgKey, { desc: selectedDesc }),
        t(toastKey, { desc: selectedDesc }),
        fn,
      );
      return;
    }

    if (action === "trigger") {
      confirmAction(
        t("board.confirmTrigger", { desc: selectedDesc }),
        t("board.toastTriggered", { desc: selectedDesc }),
        () => triggerLoop(selectedId),
      );
      return;
    }
  }

  function handleTaskAction(action: string): void {
    if (!selectedTask) return;

    if (action === "select") {
      if (!stack.includes("create") && !stack.includes("task-edit")) return;
      setPendingTaskSelection({ id: selectedTask.id, name: selectedTask.name });
      pop();
      pushToast("success", t("board.toastTaskSelected", { desc: selectedTask.name }));
      return;
    }

    if (action === "edit") {
      setEditTask(selectedTask);
      push("task-edit");
      return;
    }

    if (action === "delete") {
      setConfirmChoice(0);
      setConfirm({
        message: t("board.confirmDeleteTask", { desc: selectedTask.name }),
        action: async () => {
          await deleteTask(selectedTask.id);
          await refreshTasks();
          setTaskSelectedIndex((i) => Math.max(0, i - 1));
          pushToast("success", t("board.toastTaskDeleted", { desc: selectedTask.name }));
        },
      });
    }
  }

  const cancelCreate = () => { setEditTarget(null); setPendingTaskSelection(null); pop(); };
  const cancelTask = () => { setEditTask(null); pop(); };
  const cancelTaskList = () => pop();

  function handleChooseTask(): void {
    void refreshTasks();
    push("task-list");
  }

  function handleCreateTask(): void {
    setEditTask(null);
    push("task-create");
  }

  const onCreateDone = (updated: boolean, _id: string, desc: string) => {
    setEditTarget(null);
    setPendingTaskSelection(null);
    pop();
    pushToast("success", updated ? t("board.toastUpdated", { desc }) : t("board.toastStarted", { desc }));
    setTimeout(() => { void refresh(); }, BOARD_REFRESH_DELAY_MS);
  };

  const onTaskDone = (updated: boolean, id: string) => {
    setEditTask(null);
    void refreshTasks();
    pop();
    pushToast("success", updated ? t("board.toastTaskUpdated", { id }) : t("board.toastTaskCreated", { id }));
  };

  useBoardKeybindings({
    confirm,
    confirmChoice,
    setConfirm,
    setConfirmChoice,
    helpOpen,
    setHelpOpen,
    searchActive,
    setSearchActive,
    view,
    push,
    pop,
    setEditTarget,
    setEditTask,
    selected,
    visibleCount: visible.length,
    setSelectedIndex,
    setFilters,
    setSort,
    onQuit: props.onQuit,
    destroyLogSocket,
    logModalRun,
    setLogModalRun,
    logModalLines,
    selectedRunIndex,
    setSelectedRunIndex,
    selectedRunCount: selected?.runHistory?.length ?? 0,
    focusedPanel,
    setFocusedPanel,
    selectedAction,
    setSelectedAction,
    onAction: handleAction,
    onOpenRunLog: handleOpenRunLog,
    refreshTasks,
    onViewTasks: () => { void refreshTasks(); push("task-list"); },
    onViewProjects: () => push("projects"),
    onAddLoop: () => { setEditTarget(null); push("create"); },
    onSelectProject: () => setProjectsModalOpen(true),
  });

  useTaskKeybindings({
    confirm,
    view,
    tasks: filteredTasks,
    taskSelectedIndex,
    setTaskSelectedIndex,
    taskSelectedAction,
    setTaskSelectedAction,
    taskFocusedPanel,
    setTaskFocusedPanel,
    taskSearchActive,
    setTaskSearchActive,
    taskQuery,
    setTaskQuery,
    onTaskAction: handleTaskAction,
    onCancel: cancelTaskList,
    onCreateTask: handleCreateTask,
    selectable: stack.includes("create") || stack.includes("task-edit"),
  });

  const counts = {
    total: loops.length,
    running: loops.filter((l) => l.status === "running").length,
    waiting: loops.filter((l) => l.status === "waiting").length,
    paused: loops.filter((l) => l.status === "paused").length,
    idle: loops.filter((l) => l.status === "idle").length,
  };

  const mode = resolveMode(confirm, searchActive || taskSearchActive, helpOpen, view);

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#0b0b0b" }}>
      <Header
        daemonStatus={daemonStatus}
        counts={counts}
        view={view}
        focusedPanel={focusedPanel}
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
          focusedPanel={focusedPanel}
          onStatusCycle={() => setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }))}
          onSortCycle={() => setSort(cycleSortMode(sort))}
          onSelectProject={() => setProjectsModalOpen(true)}
          currentProjectName={currentProjectId === "all" ? t("project.showAll") : (projects.find(p => p.id === currentProjectId)?.name ?? "Default")}
        />
      ) : view === "task-list" ? (
        <TaskFilterBar
          query={taskQuery}
          searchActive={taskSearchActive}
          focusedPanel={taskFocusedPanel}
        />
      ) : null}

      <box
        key={viewKey(view, editTarget, editTask)}
        style={{ flexGrow: 1, backgroundColor: "#0b0b0b" }}
      >
        {view === "create" ? (
          <CreateView
            mode={editTarget ? "edit" : "create"}
            editId={editTarget?.id ?? null}
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
          />
        ) : view === "task-list" ? (
          <box style={{ flexDirection: breakpoint === "narrow" ? "column" : "row", flexGrow: 1, backgroundColor: "#0b0b0b" }}>
            <TaskNavigator
              visible={filteredTasks}
              total={tasks.length}
              selectedIndex={taskClampedIndex}
              focused={taskFocusedPanel === "tasks"}
              query={taskQuery}
              onSelect={(index) => { setTaskSelectedIndex(index); setTaskFocusedPanel("tasks"); }}
              onActivate={(index) => { setTaskSelectedIndex(index); setEditTask(filteredTasks[index] ?? null); push("task-edit"); }}
            />
            <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b", overflow: "hidden" }}>
              <TaskInspector key={`ti-${selectedTask?.id}`} task={selectedTask} />
              <TaskActionButtons
                key={`tab-${selectedTask?.id}`}
                task={selectedTask}
                focused={taskFocusedPanel === "actions"}
                selectedAction={taskSelectedAction}
                selectable={stack.includes("create") || stack.includes("task-edit")}
                onAction={handleTaskAction}
              />
            </box>
          </box>
        ) : view === "projects" ? (
          <ProjectsPage
            projects={projects}
            loops={loops}
            onClose={() => pop()}
            onRefresh={refreshProjects}
            onOpenCreate={(trigger) => { createProjectTriggerRef.current = trigger; }}
          />
        ) : (
          <box style={{ flexDirection: breakpoint === "narrow" ? "column" : "row", flexGrow: 1, backgroundColor: "#0b0b0b" }}>
            <Navigator
              visible={visible}
              total={loops.length}
              selectedIndex={clampedIndex}
              filters={filters}
              sort={sort}
              breakpoint={breakpoint}
              focused={focusedPanel === "loops"}
              projects={projects}
              onSelect={(index) => { setSelectedIndex(index); setFocusedPanel("loops"); }}
              onActivate={(index) => { setSelectedIndex(index); const loop = visible[index]; if (loop) { setEditTarget(loop); push("create"); } }}
            />
            <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b", overflow: "hidden" }}>
              <Inspector loop={selected} />
              <RunHistory
                loop={selected}
                selectedRunIndex={selectedRunIndex}
                focused={focusedPanel === "runs"}
                onSelectRun={(index) => { setSelectedRunIndex(index); setFocusedPanel("runs"); }}
                onOpenRun={handleOpenRunLog}
              />
              <ActionButtons
                loop={selected}
                focused={focusedPanel === "actions"}
                selectedAction={selectedAction}
                onAction={handleAction}
              />
            </box>
          </box>
        )}
      </box>

      <Footer mode={mode} />

      {confirm ? (
        <ConfirmModal
          message={confirm.message}
          choice={confirmChoice}
          onYes={() => { const action = confirm.action; setConfirm(null); void action(); }}
          onNo={() => setConfirm(null)}
        />
      ) : null}

      {helpOpen ? <HelpModal /> : null}

      {logModalRun ? (
        <LogModal
          loopId={selectedId}
          run={logModalRun}
          logLines={logModalLines}
          loading={logModalLoading}
          onClose={() => setLogModalRun(null)}
        />
      ) : null}

      {projectsModalOpen ? (
        <ProjectsModal
          projects={projects}
          loops={loops}
          currentProjectId={currentProjectId}
          onSelect={(id) => { setCurrentProjectId(id); setProjectsModalOpen(false); }}
          onClose={() => setProjectsModalOpen(false)}
        />
      ) : null}

      <ToastStack toasts={toasts} />
    </box>
  );
}

const TASK_FORM_VIEWS = new Set<View>(["task-create", "task-edit"]);
