import { useMemo, useRef, useState } from "react";
import type { LoopMeta, RunRecord } from "../types.js";
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
import { LogModal } from "./components/LogModal.js";
import { fetchRunLog, deleteLoop, pauseLoop, resumeLoop, stopLoop, playLoop, triggerLoop } from "./daemon.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";

const BOARD_REFRESH_DELAY_MS = 150;

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
  const [selectedRunIndex, setSelectedRunIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState(0);
  const [focusedPanel, setFocusedPanel] = useState<PanelFocus>("loops");
  const [logModalRun, setLogModalRun] = useState<RunRecord | null>(null);
  const [logModalLines, setLogModalLines] = useState<string[]>([]);
  const [logModalLoading, setLogModalLoading] = useState(false);
  const { toasts, push } = useToasts();
  const breakpoint = useBreakpoint();

  const visible = useMemo(
    () => applyLoopFilters(loops, filters, sort),
    [loops, filters, sort]
  );

  const clampedIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  const selected = visible[clampedIndex] ?? null;
  const selectedId = selected?.id ?? null;

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

  function runAction(
    label: string,
    action: () => Promise<void>
  ): () => Promise<void> {
    return async () => {
      try {
        await action();
        setTimeout(() => {
          void refresh();
        }, BOARD_REFRESH_DELAY_MS);
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
    if (!selected || !selectedId) return;
    switch (action) {
      case "pause-resume": {
        const actionLabel = selected.status === "paused" ? t("board.actionResume") : t("board.actionPause");
        const actionVerb = selected.status === "paused" ? t("board.actionResumed") : t("board.actionPaused");
        const actionFn = selected.status === "paused"
          ? () => resumeLoop(selectedId)
          : () => pauseLoop(selectedId);
        setConfirmChoice(0);
        setConfirm({
          message: t("board.confirmPauseResume", { action: actionLabel, id: selectedId }),
          action: runAction(t("board.toastActionId", { verb: actionVerb, id: selectedId }), actionFn),
        });
        break;
      }
      case "stop-play": {
        if (selected.status === "idle") {
          const actionFn = () => playLoop(selectedId);
          setConfirmChoice(0);
          setConfirm({
            message: t("board.confirmPlay", { id: selectedId }),
            action: runAction(t("board.toastPlayed", { id: selectedId }), actionFn),
          });
        } else {
          const actionFn = () => stopLoop(selectedId);
          setConfirmChoice(0);
          setConfirm({
            message: t("board.confirmStop", { id: selectedId }),
            action: runAction(t("board.toastStopped", { id: selectedId }), actionFn),
          });
        }
        break;
      }
      case "run": {
        setConfirmChoice(0);
        setConfirm({
          message: t("board.confirmForceRun", { id: selectedId }),
          action: runAction(t("board.toastTriggered", { id: selectedId }), () => triggerLoop(selectedId)),
        });
        break;
      }
      case "edit": {
        setEditTarget(selected);
        setView("create");
        break;
      }
      case "delete": {
        setConfirmChoice(0);
        setConfirm({
          message: t("board.confirmDelete", { id: selectedId }),
          action: runAction(t("board.toastDeleted", { id: selectedId }), () => deleteLoop(selectedId)),
        });
        break;
      }
    }
  }

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
  });

  const counts = {
    total: loops.length,
    running: loops.filter((l) => l.status === "running").length,
    waiting: loops.filter((l) => l.status === "waiting").length,
    paused: loops.filter((l) => l.status === "paused").length,
    idle: loops.filter((l) => l.status === "idle").length,
  };

  const mode: Mode = confirm
    ? "confirm"
    : searchActive
      ? "search"
      : helpOpen
        ? "help"
        : view === "create"
          ? "create"
          : "normal";

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#0b0b0b" }}>
      <Header daemonStatus={daemonStatus} counts={counts} />

      {view === "board" ? (
        <FilterBar
          filters={filters}
          sort={sort}
          searchActive={searchActive}
          focusedPanel={focusedPanel}
          onSearch={(q) => {
            setFilters((prev) => ({ ...prev, query: q }));
            setSelectedIndex(0);
          }}
          onStatusCycle={() => setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }))}
          onSortCycle={() => setSort(cycleSortMode(sort))}
          onNewLoop={() => {
            setEditTarget(null);
            setView("create");
          }}
        />
      ) : null}

      <box
        key={view === "create" ? `${view}:${editTarget?.id ?? "new"}` : view}
        style={{ flexGrow: 1, backgroundColor: "#0b0b0b" }}
      >
        {view === "create" ? (
          <CreateView
            mode={editTarget ? "edit" : "create"}
            editId={editTarget?.id ?? null}
            initial={createInitialValues(editTarget)}
            onCancel={() => {
              setEditTarget(null);
              setView("board");
            }}
            onDone={(updated, id) => {
              setEditTarget(null);
              setView("board");
              push("success", updated ? t("board.toastUpdated", { id }) : t("board.toastStarted", { id }));
              setTimeout(() => {
                void refresh();
              }, BOARD_REFRESH_DELAY_MS);
            }}
          />
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
              onSelect={(index) => {
                setSelectedIndex(index);
                setFocusedPanel("loops");
              }}
              onActivate={(index) => {
                setSelectedIndex(index);
                const loop = visible[index];
                if (loop) {
                  setEditTarget(loop);
                  setView("create");
                }
              }}
            />
            <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b", overflow: "hidden" }}>
              <Inspector key={`insp-${selected?.id}-${selected?.status}`} loop={selected} />
              <RunHistory
                key={`rh-${selected?.id}-${selected?.runHistory?.length ?? 0}`}
                loop={selected}
                selectedRunIndex={selectedRunIndex}
                focused={focusedPanel === "runs"}
                onSelectRun={(index) => {
                  setSelectedRunIndex(index);
                  setFocusedPanel("runs");
                }}
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
          onYes={() => {
            const action = confirm.action;
            setConfirm(null);
            void action();
          }}
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
