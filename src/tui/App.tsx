import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, useInput, useApp } from "ink";
import type { LoopMeta, RunRecord, TaskDefinition, Project } from "../types.js";
import type { ConfirmState, View, TabName, PanelFocus, CommandContext, SearchState } from "./types.js";
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
import { CommandsBrowserModal } from "./components/CommandsBrowserModal.js";
import { DebugPanel, MAX_ENTRIES, type DebugEntry } from "./components/DebugPanel.js";
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
  const [commandsBrowserOpen, setCommandsBrowserOpen] = useState(false);
  const [contextHelpOpen, setContextHelpOpen] = useState(false);
  // ── Confirm state (8.3) ──
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  // ── Search state (command-driven search) ──
  const [searchState, setSearchState] = useState<SearchState | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [debugMode, setDebugMode] = useState(false);
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([]);
  const [chordState, setChordState] = useState<"ctrl+f" | "ctrl+a" | null>(null);
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

  // ── Command handler — dictionary dispatch, no switch/case ──
  const commandHandlers: Record<string, () => void> = {
    edit: () => {
      if (activeTab === "loops" && selected) {
        setCloneMode(false);
        setEditTarget(selected);
        push("create");
      } else if (activeTab === "tasks" && selectedTask) {
        setEditTask(selectedTask);
        push("task-edit");
      }
    },
    clone: () => {
      if (selected) {
        setCloneMode(true);
        setEditTarget(selected);
        push("create");
      }
    },
    delete: () => {
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
    },
    pause: () => {
      if (selected) {
        void runAction(t("board.toastPaused", { desc: selected.description }), () => pauseLoop(selected.id))();
      }
    },
    play: () => {
      if (selected) {
        void runAction(t("board.toastResumed", { desc: selected.description }), () => resumeLoop(selected.id))();
      }
    },
    stop: () => {
      if (selected) {
        setConfirmState({
          prompt: t("confirm.stopLoop", { name: selected.description || selected.id }),
          onConfirm: () => { void stopLoop(selected.id).then(() => { void refresh(); }); },
        });
      }
    },
    trigger: () => {
      if (selected) {
        void runAction(t("board.toastTriggered", { desc: selected.description }), () => triggerLoop(selected.id))();
      }
    },
    "new-loop": () => { setEditTarget(null); push("create"); },
    "new-task": () => { setEditTask(null); push("task-create"); },
    "new-project": () => { setActiveTab("projects"); },
    "all-commands": () => { setCommandsBrowserOpen(true); },
    help: () => { setCommandsBrowserOpen(true); },
    search: () => { setSearchValue(""); setSearchState({ active: true }); },
    "filter-status": () => { setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) })); },
    sort: () => { setSort((prev) => cycleSortMode(prev)); },
    "filter-project": () => { setActiveTab("projects"); },
    debug: () => { setDebugMode((prev) => !prev); },
    logs: () => {
      if (selected) {
        const runs = selected.runHistory;
        if (runs && runs.length > 0) {
          handleOpenRunLog(runs[0]!);
        }
      }
    },
    select: () => {
      if (selectedTask) {
        setPendingTaskSelection({ id: selectedTask.id, name: selectedTask.name });
        pop();
      }
    },
    api: () => { pushToast("info", `Command "api" coming soon`); },
    status: () => { pushToast("info", `Command "status" coming soon`); },
    export: () => { pushToast("info", `Command "export" coming soon`); },
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

  // ── Resolve query for LeftPanel based on activeTab + search state ──
  const leftPanelQuery = searchState?.active
    ? searchValue
    : activeTab === "tasks" ? taskQuery : filters.query;

  // ── Search handlers ──
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (activeTab === "tasks") {
      setTaskQuery(value);
    } else {
      setFilters((prev) => ({ ...prev, query: value }));
    }
  }, [activeTab]);

  const handleSearchSubmit = useCallback(() => {
    setSearchState(null);
  }, []);

  const handleSearchCancel = useCallback(() => {
    setSearchValue("");
    if (activeTab === "tasks") {
      setTaskQuery("");
    } else {
      setFilters((prev) => ({ ...prev, query: "" }));
    }
    setSearchState(null);
  }, [activeTab]);

  // ── Command context (8.3) ──
  const commandContext: CommandContext = useMemo(
    () => ({ activeTab, selectedLoop: selected, selectedTask, selectedProject: null }),
    [activeTab, selected, selectedTask]
  );

  // ── Global useInput (8.2) ──
  useInput((input, key) => {
    // Ctrl+C always quits if no modal open
    if (key.ctrl && input === "c") {
      if (!logModalRun && !confirmState && !commandsBrowserOpen) {
        onQuit();
        exit();
        return;
      }
    }

    // Debug: capture key info if debug mode is on
    if (debugMode) {
      const entry: DebugEntry = {
        id: Date.now(),
        input,
        len: input.length,
        ctrl: key.ctrl,
        return: key.return,
        shift: key.shift,
        meta: key.meta,
        tab: key.tab,
        upArrow: key.upArrow,
        downArrow: key.downArrow,
        leftArrow: key.leftArrow,
        rightArrow: key.rightArrow,
        escape: key.escape,
        codes: Array.from(input).map((c: string) => c.charCodeAt(0)).join(","),
      };
      setDebugEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
    }

    // Ctrl+Enter: open log (right panel) or edit (left panel)
    // Detection across terminals:
    //   - proper terminals: key.ctrl && key.return
    //   - Linux: input === "\x0e"
    //   - VS Code: a multi-char sequence containing \r (13) or \n (10),
    //     e.g. "\\\r" (codes 92,13) - all key flags zero. Plain Enter is "\r" (len 1).
    const isMultiCharEnter = input.length > 1 && (input.includes("\r") || input.includes("\n"));
    const isCtrlEnter = (key.ctrl && key.return) || input === "\x0e" || isMultiCharEnter;
    if (isCtrlEnter && isBoardView(view) && !logModalRun && !commandsBrowserOpen && !confirmState && !searchState?.active) {
      if (chordState) setChordState(null);
      if (focusedPanel === "right" && selected) {
        const runs = selected.runHistory;
        if (runs && runs.length > 0) {
          handleOpenRunLog(runs[runs.length - 1]!);
        } else {
          setCloneMode(false);
          setEditTarget(selected);
          push("create");
        }
      } else if (focusedPanel === "left" && selected) {
        setCloneMode(false);
        setEditTarget(selected);
        push("create");
      }
      return;
    }

    // Ctrl shortcuts: dispatch to command handler (bottom input ignores all ctrl)
    const canShortcut = key.ctrl && isBoardView(view) && !logModalRun && !commandsBrowserOpen && !confirmState && !searchState?.active;
    if (canShortcut) {
      const globalShortcuts: Record<string, () => void> = {
        p: () => setCommandsBrowserOpen(true),
        b: () => handleCommand("debug"),
        g: () => handleCommand("api"),
        x: () => handleCommand("export"),
        i: () => handleCommand("import"),
        y: () => handleCommand("status"),
      };
      const filterShortcuts: Record<string, () => void> = {
        s: () => handleCommand("search"),
        t: () => handleCommand("filter-status"),
        o: () => handleCommand("sort"),
        p: () => handleCommand("filter-project"),
      };
      const actionShortcuts: Record<string, () => void> = {
        n: () => handleCommand(activeTab === "loops" ? "new-loop" : activeTab === "tasks" ? "new-task" : "new-project"),
        e: () => handleCommand("edit"),
        p: () => handleCommand("pause"),
        r: () => handleCommand("play"),
        s: () => handleCommand("stop"),
        t: () => handleCommand("trigger"),
        c: () => handleCommand("clone"),
        d: () => handleCommand("delete"),
        o: () => handleCommand("logs"),
      };

      if (chordState === "ctrl+f" && filterShortcuts[input]) {
        filterShortcuts[input]!();
        setChordState(null);
        return;
      }
      if (chordState === "ctrl+a" && actionShortcuts[input]) {
        actionShortcuts[input]!();
        setChordState(null);
        return;
      }
      if (chordState) {
        setChordState(null);
      }

      if (input === "f") { setChordState("ctrl+f"); return; }
      if (input === "a") { setChordState("ctrl+a"); return; }
      const globalHandler = globalShortcuts[input];
      if (globalHandler) { globalHandler(); return; }
    }

    // Confirm mode is handled by CommandInput component, not here
    if (confirmState) return;

    // Search mode is handled by CommandInput component, not here
    if (searchState?.active) return;

    if (logModalRun) {
      if (key.escape || input === "q") {
        setLogModalRun(null);
      }
      return;
    }

    if (commandsBrowserOpen) {
      if (key.escape) { setCommandsBrowserOpen(false); }
      return;
    }

    if (contextHelpOpen) {
      setContextHelpOpen(false);
      return;
    }

    // Any other modal open: block all input from reaching panels
    if (logModalRun) return;

    // Full-screen form views: only escape
    if (FORM_VIEWS.includes(view)) {
      if (key.escape) pop();
      return;
    }

    // Board view: Tab cycles panels (8.2), 1/2/3 switch tabs (8.1)
    if (isBoardView(view)) {
      // Ctrl+Arrow: cycle tabs in a loop (loops -> tasks -> projects -> loops)
      if (key.ctrl && key.rightArrow) {
        setActiveTab((prev) => prev === "loops" ? "tasks" : prev === "tasks" ? "projects" : "loops");
        return;
      }
      if (key.ctrl && key.leftArrow) {
        setActiveTab((prev) => prev === "loops" ? "projects" : prev === "tasks" ? "loops" : "tasks");
        return;
      }

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

  // Modals disable panel input behind them; CommandInput stays active for confirm/search
  const anyModalOpen = !!(logModalRun || commandsBrowserOpen);
  const commandInputDisabled = anyModalOpen;

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
          // Board view: left panel + right panel (+ optional debug panel)
          <Box flexDirection={breakpoint === "narrow" ? "column" : "row"} flexGrow={1}>
            <LeftPanel
              isFocused={focusedPanel === "left" && !anyModalOpen}
              activeTab={activeTab}
              query={leftPanelQuery}
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
              isFocused={focusedPanel === "right" && !anyModalOpen}
              activeTab={activeTab}
              loop={selected}
              selectedRunIndex={selectedRunIndex}
              onSelectRun={(index) => setSelectedRunIndex(index)}
              onOpenRun={handleOpenRunLog}
            />
            {debugMode ? <DebugPanel entries={debugEntries} /> : null}
          </Box>
        )}
      </Box>

      {/* Command input at bottom (8.3) - only on board views */}
      {isBoardView(view) ? (
        <CommandInput
          context={commandContext}
          onCommand={handleCommand}
          confirmState={confirmState}
          searchState={searchState}
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onSearchCancel={handleSearchCancel}
          onConfirmYes={handleConfirmYes}
          onConfirmCancel={handleConfirmCancel}
          disabled={commandInputDisabled}
        />
      ) : null}

      {commandsBrowserOpen ? (
        <CommandsBrowserModal
          context={commandContext}
          onClose={() => setCommandsBrowserOpen(false)}
          onExecute={(value) => { setCommandsBrowserOpen(false); handleCommand(value); }}
        />
      ) : null}
      {contextHelpOpen ? <ContextHelpModal onClose={() => setContextHelpOpen(false)} /> : null}

      {logModalRun ? (
        <LogModal
          loopId={selectedId}
          run={logModalRun}
          logLines={logModalLines}
          loading={logModalLoading}
          onClose={() => setLogModalRun(null)}
          onCopy={() => pushToast("success", t("board.toastCopied"))}
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
      cwd: process.cwd(),
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
