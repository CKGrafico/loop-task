import { useMemo, useState } from "react";
import type { LoopMeta } from "../types.js";
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
import type { ConfirmState, Mode, View } from "./types.js";
import { useLoopPolling } from "./hooks/useLoopPolling.js";
import { useLogStream } from "./hooks/useLogStream.js";
import { useBoardKeybindings } from "./hooks/useBoardKeybindings.js";
import { Header } from "./components/Header.js";
import { FilterBar } from "./components/FilterBar.js";
import { Navigator } from "./components/Navigator.js";
import { Inspector } from "./components/Inspector.js";
import { Timeline } from "./components/Timeline.js";
import { DetailView } from "./components/DetailView.js";
import { HelpModal } from "./components/HelpModal.js";
import { Footer } from "./components/Footer.js";
import { ConfirmModal } from "./components/ConfirmModal.js";
import { CreateView, createInitialValues } from "./components/CreateForm.js";
import { useBreakpoint } from "./hooks/useBreakpoint.js";

export function App(props: { onQuit: () => void }): React.ReactNode {
  const { loops, daemonStatus, refresh } = useLoopPolling();
  const [view, setView] = useState<View>("board");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortMode>("status");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchActive, setSearchActive] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmChoice, setConfirmChoice] = useState(0);
  const [editTarget, setEditTarget] = useState<LoopMeta | null>(null);
  const { toasts, push } = useToasts();
  const breakpoint = useBreakpoint();

  const visible = useMemo(
    () => applyLoopFilters(loops, filters, sort),
    [loops, filters, sort]
  );

  const clampedIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  const selected = visible[clampedIndex] ?? null;
  const selectedId = selected?.id ?? null;

  const { logLines, destroy: destroyLogSocket } = useLogStream(
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
        await refresh();
        push("success", label);
      } catch (error) {
        push("error", error instanceof Error ? error.message : String(error));
      }
    };
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
    selectedId,
    visibleCount: visible.length,
    setSelectedIndex,
    setFilters,
    setSort,
    onQuit: props.onQuit,
    destroyLogSocket,
    runAction,
  });

  const counts = {
    total: loops.length,
    running: loops.filter((l) => l.status === "running").length,
    sleeping: loops.filter((l) => l.status === "sleeping").length,
    paused: loops.filter((l) => l.status === "paused").length,
  };

  const mode: Mode = confirm
    ? "confirm"
    : searchActive
      ? "search"
      : helpOpen
        ? "help"
      : view === "create"
        ? "create"
        : view === "detail"
            ? "detail"
            : "normal";

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#0b0b0b" }}>
      <Header daemonStatus={daemonStatus} counts={counts} />

      {view === "board" ? (
        <FilterBar
          filters={filters}
          sort={sort}
          searchActive={searchActive}
          onSearch={(q) => {
            setFilters((prev) => ({ ...prev, query: q }));
            setSelectedIndex(0);
          }}
          onStatusCycle={() => setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }))}
          onSortCycle={() => setSort(cycleSortMode(sort))}
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
              void refresh();
            }}
          />
        ) : view === "detail" && selected ? (
          <DetailView loop={selected} logLines={logLines} />
        ) : (
          <box style={{ flexDirection: breakpoint === "narrow" ? "column" : "row", flexGrow: 1, backgroundColor: "#0b0b0b" }}>
            <Navigator
              visible={visible}
              total={loops.length}
              selectedIndex={clampedIndex}
              filters={filters}
              sort={sort}
              breakpoint={breakpoint}
              onSelect={(index) => {
                setSelectedIndex(index);
                setView((v) => (v === "detail" ? "board" : "detail"));
              }}
            />
            <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: "#0b0b0b" }}>
              <Inspector loop={selected} />
              <Timeline logLines={logLines} />
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

      <ToastStack toasts={toasts} />
    </box>
  );
}
