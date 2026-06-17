import { useMemo, useRef, useState } from "react";
import type { LoopMeta, RunRecord, TaskDefinition } from "../types.js";
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
import { TaskNavigator, TaskInspector, TaskActionButtons, TASK_ACTION_COUNT, TASK_ACTION_KEYS, nextTaskPanel, type TaskPanelFocus } from "./components/TaskBrowser.js";
import { TaskFilterBar } from "./components/TaskFilterBar.js";
import { LogModal } from "./components/LogModal.js";
import { fetchRunLog, deleteLoop, pauseLoop, resumeLoop, stopLoop, playLoop, triggerLoop, listTasks, deleteTask } from "./daemon.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";
import { commandLine } from "./format.js";

const BOARD_REFRESH_DELAY_MS = 150;

const VIEW_TO_MODE: Partial<Record<View, Mode>> = {
  create: "create",
  "task-create": "task",
  "task-edit": "task",
  "task-list": "task",
};

const PAUSE_RESOLVE: Record<string, { label: string; verb: string; fn: (id: string) => Promise<void> }> = {
  paused: { label: t("board.actionResume"), verb: t("board.actionResumed"), fn: (id) => resumeLoop(id) },
  default: { label: t("board.actionPause"), verb: t("board.actionPaused"), fn: (id) => pauseLoop(id) },
};

const STOP_PLAY_RESOLVE: Record<string, { msg: string; toast: string; fn: (id: string) => Promise<void> }> = {
  idle: { msg: t("board.confirmPlay"), toast: t("board.toastPlayed"), fn: (id) => playLoop(id) },
  default: { msg: t("board.confirmStop"), toast: t("board.toastStopped"), fn: (id) => stopLoop(id) },
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
  const [view, setView] = useState<View>("board");
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
  const [taskListReturnView, setTaskListReturnView] = useState<View>("board");
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

  const { toasts, push } = useToasts();
  const breakpoint = useBreakpoint();

  const visible = useMemo(
    () => applyLoopFilters(loops, filters, sort),
    [loops, filters, sort]
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

  const { destroy: destroyLogSocket } = useLogStream(
    selectedId,
    view,
    (error) => push("error", t("board.logStreamError", { message: error.message }))
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

  function runAction(label: string, action: () => Promise<void>): () => Promise<void> {
    return async () => {
      try {
        await action();
        setTimeout(() => { void refresh(); }, BOARD_REFRESH_DELAY_MS);
        push("success", label);
      } catch (error) {
        push("error", error instanceof Error ? error.message : String(error));
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
    const runsToFetch = run.chainGroupId
      ? (selected?.runHistory ?? []).filter((r) => r.chainGroupId === run.chainGroupId)
      : [run];
    Promise.all(runsToFetch.map((r) => fetchRunLog(selectedId, r.runNumber)))
      .then((logs) => {
        setLogModalLines(logs.flatMap((log) => (log ? log.split("\n") : [])));
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

    if (action === "pause-resume") {
      const r = PAUSE_RESOLVE[selected.status] ?? PAUSE_RESOLVE.default;
      confirmAction(
        t("board.confirmPauseResume", { action: r.label, desc: selectedDesc }),
        t("board.toastActionId", { verb: r.verb, desc: selectedDesc }),
        () => r.fn(selectedId),
      );
      return;
    }

    if (action === "stop-play") {
      const r = STOP_PLAY_RESOLVE[selected.status] ?? STOP_PLAY_RESOLVE.default;
      confirmAction(r.msg.replace("{desc}", selectedDesc), r.toast.replace("{desc}", selectedDesc), () => r.fn(selectedId));
      return;
    }

    if (action === "run") {
      confirmAction(
        t("board.confirmForceRun", { desc: selectedDesc }),
        t("board.toastTriggered", { desc: selectedDesc }),
        () => triggerLoop(selectedId),
      );
      return;
    }

    if (action === "edit") {
      setEditTarget(selected);
      setView("create");
      return;
    }

    if (action === "delete") {
      confirmAction(
        t("board.confirmDelete", { desc: selectedDesc }),
        t("board.toastDeleted", { desc: selectedDesc }),
        () => deleteLoop(selectedId),
      );
    }
  }

  function handleTaskAction(action: string): void {
    if (!selectedTask) return;

    if (action === "select") {
      if (taskListReturnView === "board") return;
      setPendingTaskSelection({ id: selectedTask.id, name: selectedTask.name });
      setView(taskListReturnView);
      push("success", t("board.toastTaskSelected", { desc: selectedTask.name }));
      return;
    }

    if (action === "edit") {
      setEditTask(selectedTask);
      setView("task-edit");
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
          push("success", t("board.toastTaskDeleted", { desc: selectedTask.name }));
        },
      });
    }
  }

  const cancelCreate = () => { setEditTarget(null); setPendingTaskSelection(null); setView("board"); };
  const cancelTask = () => { setEditTask(null); setView(taskListReturnView === "task-list" ? "task-list" : "board"); };
  const cancelTaskList = () => setView(taskListReturnView);

  function openTaskList(returnTo: View): void {
    setTaskListReturnView(returnTo);
    void refreshTasks();
    setView("task-list");
  }

  function handleChooseTask(): void {
    openTaskList("create");
  }

  function handleCreateTask(): void {
    setTaskListReturnView("task-list");
    setEditTask(null);
    setView("task-create");
  }

  const onCreateDone = (updated: boolean, id: string) => {
    setEditTarget(null);
    setPendingTaskSelection(null);
    setView("board");
    push("success", updated ? t("board.toastUpdated", { id }) : t("board.toastStarted", { id }));
    setTimeout(() => { void refresh(); }, BOARD_REFRESH_DELAY_MS);
  };

  const onTaskDone = (updated: boolean, id: string) => {
    setEditTask(null);
    void refreshTasks();
    setView(taskListReturnView === "task-list" ? "task-list" : "board");
    push("success", updated ? t("board.toastTaskUpdated", { id }) : t("board.toastTaskCreated", { id }));
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
    setView,
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
    selectedRunIndex,
    setSelectedRunIndex,
    selectedRunCount: selected?.runHistory?.length ?? 0,
    focusedPanel,
    setFocusedPanel,
    selectedAction,
    setSelectedAction,
    onAction: handleAction,
    onOpenRunLog: handleOpenRunLog,
    returnView: view === "task-list" ? taskListReturnView : undefined,
    setTaskListReturnView,
    refreshTasks,
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
    selectable: taskListReturnView !== "board",
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
      <Header daemonStatus={daemonStatus} counts={counts} />

      {view === "board" ? (
        <FilterBar
          filters={filters}
          sort={sort}
          searchActive={searchActive}
          focusedPanel={focusedPanel}
          onStatusCycle={() => setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }))}
          onSortCycle={() => setSort(cycleSortMode(sort))}
          onViewTasks={() => { setTaskListReturnView("board"); void refreshTasks(); setView("task-list"); }}
          onNewLoop={() => { setEditTarget(null); setView("create"); }}
        />
      ) : view === "task-list" ? (
        <TaskFilterBar
          query={taskQuery}
          searchActive={taskSearchActive}
          focusedPanel={taskFocusedPanel}
          onNewTask={handleCreateTask}
          showViewLoops={taskListReturnView === "board"}
          onViewLoops={() => setView("board")}
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
            initial={createInitialValues(editTarget)}
            selectedTaskId={pendingTaskSelection?.id ?? null}
            selectedTaskName={pendingTaskSelection?.name ?? null}
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
              onActivate={(index) => { setTaskSelectedIndex(index); setEditTask(filteredTasks[index] ?? null); setView("task-edit"); }}
            />
            <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b", overflow: "hidden" }}>
              <TaskInspector key={`ti-${selectedTask?.id}`} task={selectedTask} />
              <TaskActionButtons
                key={`tab-${selectedTask?.id}`}
                task={selectedTask}
                focused={taskFocusedPanel === "actions"}
                selectedAction={taskSelectedAction}
                selectable={taskListReturnView !== "board"}
                onAction={handleTaskAction}
              />
            </box>
          </box>
        ) : (
          <box style={{ flexDirection: breakpoint === "narrow" ? "column" : "row", flexGrow: 1, backgroundColor: "#0b0b0b" }}>
            <Navigator
              key={`nav-${visible.length}-${visible[0]?.id ?? ""}`}
              visible={visible}
              total={loops.length}
              selectedIndex={clampedIndex}
              filters={filters}
              sort={sort}
              breakpoint={breakpoint}
              focused={focusedPanel === "loops"}
              onSelect={(index) => { setSelectedIndex(index); setFocusedPanel("loops"); }}
              onActivate={(index) => { setSelectedIndex(index); const loop = visible[index]; if (loop) { setEditTarget(loop); setView("create"); } }}
            />
            <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b", overflow: "hidden" }}>
              <Inspector key={`insp-${selected?.id}-${selected?.status}`} loop={selected} />
              <RunHistory
                key={`rh-${selected?.id}-${selected?.runHistory?.length ?? 0}`}
                loop={selected}
                selectedRunIndex={selectedRunIndex}
                focused={focusedPanel === "runs"}
                onSelectRun={(index) => { setSelectedRunIndex(index); setFocusedPanel("runs"); }}
                onOpenRun={handleOpenRunLog}
              />
              <ActionButtons
                key={`ab-${selected?.id}`}
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

      <ToastStack toasts={toasts} />
    </box>
  );
}

const TASK_FORM_VIEWS = new Set<View>(["task-create", "task-edit"]);
