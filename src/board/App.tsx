import { useEffect, useMemo, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type net from "node:net";
import type { LoopMeta } from "../types.js";
import { buildLoopOptions } from "../loop-config.js";
import {
  createLoop,
  deleteLoop,
  listLoops,
  pauseLoop,
  resumeLoop,
  streamLogs,
} from "./daemon.js";
import {
  applyLoopFilters,
  cycleSortMode,
  cycleStatusFilter,
  defaultFilters,
  type Filters,
  type SortMode,
} from "./state.js";
import { formatCmd, statusColor, timeAgo, timingLabel } from "./format.js";

type View = "board" | "detail" | "help" | "create";
type DaemonStatus = "starting" | "connected" | "error";

interface ConfirmState {
  message: string;
  action: () => Promise<void>;
}

const POLL_MS = 2000;

export function App(): React.ReactNode {
  const [loops, setLoops] = useState<LoopMeta[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>("starting");
  const [view, setView] = useState<View>("board");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [sort, setSort] = useState<SortMode>("status");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);

  const visible = useMemo(
    () => applyLoopFilters(loops, filters, sort),
    [loops, filters, sort]
  );

  const clampedIndex = Math.min(selectedIndex, Math.max(0, visible.length - 1));
  const selected = visible[clampedIndex] ?? null;
  const selectedId = selected?.id ?? null;

  const logSocket = useRef<net.Socket | null>(null);

  async function refresh(): Promise<void> {
    try {
      const next = await listLoops();
      setLoops(next);
      setDaemonStatus("connected");
    } catch (error) {
      setDaemonStatus("error");
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    logSocket.current?.destroy();
    logSocket.current = null;
    setLogLines([]);

    if (!selectedId || (view !== "board" && view !== "detail")) {
      return;
    }

    setLogLines(["  Waiting for live output..."]);
    const socket = streamLogs(
      selectedId,
      (line) =>
        setLogLines((prev) => {
          const next = prev[0]?.startsWith("  Waiting") ? [] : prev;
          return [...next, line].slice(-500);
        }),
      (error) => setStatus(`Log stream error: ${error.message}`)
    );
    logSocket.current = socket;

    return () => {
      socket.destroy();
      if (logSocket.current === socket) {
        logSocket.current = null;
      }
    };
  }, [selectedId, view]);

  function runAction(
    label: string,
    action: () => Promise<void>
  ): () => Promise<void> {
    return async () => {
      try {
        await action();
        await refresh();
        setStatus(label);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
      }
    };
  }

  useKeyboard((key) => {
    const name = key.name;

    if (confirm) {
      if (name === "y" || name === "return" || name === "enter") {
        const action = confirm.action;
        setConfirm(null);
        void action();
      } else if (name === "n" || name === "escape") {
        setConfirm(null);
      }
      return;
    }

    if (searchActive) {
      if (name === "escape" || name === "return" || name === "enter") {
        setSearchActive(false);
      }
      return;
    }

    if (view === "create") {
      if (name === "escape") {
        setView("board");
      }
      return;
    }

    if (name === "q" || (name === "c" && key.ctrl)) {
      logSocket.current?.destroy();
      process.exit(0);
    }

    if (name === "escape") {
      if (view !== "board") setView("board");
      return;
    }

    if (name === "h") {
      setView((v) => (v === "help" ? "board" : "help"));
      return;
    }

    if (name === "n") {
      setView("create");
      return;
    }

    if (view === "board") {
      if (name === "up" || name === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (name === "down" || name === "j") {
        setSelectedIndex((i) => Math.min(visible.length - 1, i + 1));
        return;
      }
    }

    if (name === "return" || name === "enter") {
      if (selectedId) setView((v) => (v === "detail" ? "board" : "detail"));
      return;
    }

    if (name === "/") {
      setSearchActive(true);
      return;
    }

    if (name === "f") {
      setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }));
      return;
    }

    if (name === "s") {
      setSort((prev) => cycleSortMode(prev));
      return;
    }

    if (!selectedId) {
      return;
    }

    if (name === "p") {
      setConfirm({
        message: `Pause loop ${selectedId}?`,
        action: runAction(`Paused ${selectedId}`, () => pauseLoop(selectedId)),
      });
    } else if (name === "r") {
      setConfirm({
        message: `Resume loop ${selectedId}?`,
        action: runAction(`Resumed ${selectedId}`, () => resumeLoop(selectedId)),
      });
    } else if (name === "d") {
      setConfirm({
        message: `Delete loop ${selectedId}?`,
        action: runAction(`Deleted ${selectedId}`, () => deleteLoop(selectedId)),
      });
    }
  });

  const counts = {
    total: loops.length,
    running: loops.filter((l) => l.status === "running").length,
    sleeping: loops.filter((l) => l.status === "sleeping").length,
    paused: loops.filter((l) => l.status === "paused").length,
  };

  return (
    <box style={{ flexDirection: "column", width: "100%", height: "100%" }}>
      <Header daemonStatus={daemonStatus} counts={counts} />

      {view === "help" ? (
        <HelpView />
      ) : view === "create" ? (
        <CreateView
          onCancel={() => setView("board")}
          onCreated={(id) => {
            setView("board");
            setStatus(`Started ${id}`);
            void refresh();
          }}
        />
      ) : view === "detail" && selected ? (
        <DetailView loop={selected} logLines={logLines} />
      ) : (
        <box style={{ flexDirection: "row", flexGrow: 1 }}>
          <Navigator
            visible={visible}
            total={loops.length}
            selectedIndex={clampedIndex}
            filters={filters}
            sort={sort}
          />
          <box style={{ flexDirection: "column", flexGrow: 1 }}>
            <Inspector loop={selected} />
            <Timeline logLines={logLines} />
          </box>
        </box>
      )}

      <Footer
        view={view}
        searchActive={searchActive}
        query={filters.query}
        confirm={confirm}
        status={status}
        onSearch={(q) => {
          setFilters((prev) => ({ ...prev, query: q }));
          setSelectedIndex(0);
        }}
      />
    </box>
  );
}

function Header(props: {
  daemonStatus: DaemonStatus;
  counts: { total: number; running: number; sleeping: number; paused: number };
}): React.ReactNode {
  const { daemonStatus, counts } = props;
  const color =
    daemonStatus === "connected"
      ? "#4ade80"
      : daemonStatus === "error"
        ? "#f87171"
        : "#facc15";

  return (
    <box
      style={{
        height: 1,
        backgroundColor: "#1e3a8a",
        flexDirection: "row",
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text>
        <strong>LOOP-TASK BOARD</strong> daemon:<span fg={color}>{daemonStatus}</span>
        {"  "}loops:{counts.total} running:{counts.running} sleeping:
        {counts.sleeping} paused:{counts.paused}
      </text>
    </box>
  );
}

function Navigator(props: {
  visible: LoopMeta[];
  total: number;
  selectedIndex: number;
  filters: Filters;
  sort: SortMode;
}): React.ReactNode {
  const { visible, total, selectedIndex, filters, sort } = props;

  return (
    <box
      title={` Loops ${visible.length}/${total}  sort:${sort}  status:${filters.status} `}
      border
      style={{ width: "45%", flexDirection: "column" }}
    >
      {visible.length === 0 ? (
        <text fg="#9ca3af">  No loops match the current view</text>
      ) : (
        visible.map((loop, index) => {
          const isSelected = index === selectedIndex;
          const exit = loop.lastExitCode === null ? "-" : String(loop.lastExitCode);
          return (
            <text
              key={loop.id}
              bg={isSelected ? "#1e3a8a" : undefined}
            >
              {isSelected ? "›" : " "} <span fg={statusColor(loop.status)}>
                {loop.status.padEnd(8)}
              </span>{" "}
              {formatCmd(loop.command, loop.commandArgs).padEnd(24)}{" "}
              {timingLabel(loop).padEnd(14)} exit {exit.padEnd(3)} #
              {String(loop.runCount).padStart(3)}
            </text>
          );
        })
      )}
    </box>
  );
}

function Inspector(props: { loop: LoopMeta | null }): React.ReactNode {
  const { loop } = props;
  if (!loop) {
    return (
      <box title=" Inspector " border style={{ height: 12 }}>
        <text fg="#9ca3af">  Select a loop to view details</text>
      </box>
    );
  }

  const cmd = `${loop.command} ${loop.commandArgs.join(" ")}`.trim();
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : "unlimited";

  return (
    <box title=" Inspector " border style={{ height: 12, flexDirection: "column" }}>
      <text><strong>ID:       </strong> {loop.id}</text>
      <text><strong>Command:  </strong> {cmd}</text>
      <text><strong>Interval: </strong> {loop.intervalHuman}</text>
      <text>
        <strong>Status:   </strong>{" "}
        <span fg={statusColor(loop.status)}>{loop.status}</span>
      </text>
      <text><strong>Runs:     </strong> {loop.runCount} / {maxRuns}</text>
      <text><strong>Last run: </strong> {timeAgo(loop.lastRunAt)}</text>
      <text>
        <strong>Last exit:</strong>{" "}
        {loop.lastExitCode !== null ? String(loop.lastExitCode) : "-"}
      </text>
      <text>
        <strong>Next run: </strong> {loop.nextRunAt ? timeAgo(loop.nextRunAt) : "-"}
      </text>
      <text><strong>PID:      </strong> {loop.pid}</text>
    </box>
  );
}

function Timeline(props: { logLines: string[] }): React.ReactNode {
  return (
    <scrollbox title=" Timeline " border style={{ flexGrow: 1 }} stickyScroll stickyStart="bottom">
      {props.logLines.length === 0 ? (
        <text fg="#9ca3af">  No output yet.</text>
      ) : (
        props.logLines.map((line, index) => <text key={index}>{line}</text>)
      )}
    </scrollbox>
  );
}

function DetailView(props: {
  loop: LoopMeta;
  logLines: string[];
}): React.ReactNode {
  const { loop, logLines } = props;
  const cmd = `${loop.command} ${loop.commandArgs.join(" ")}`.trim();
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : "unlimited";

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <box title=" Loop Detail " border style={{ flexDirection: "column", height: 14 }}>
        <text><strong>ID:        </strong>{loop.id}</text>
        <text><strong>Command:   </strong>{cmd}</text>
        <text><strong>Interval:  </strong>{loop.intervalHuman}</text>
        <text>
          <strong>Status:    </strong>
          <span fg={statusColor(loop.status)}>{loop.status}</span>
        </text>
        <text><strong>Runs:      </strong>{loop.runCount} / {maxRuns}</text>
        <text><strong>Created:   </strong>{loop.createdAt}</text>
        <text><strong>Last run:  </strong>{loop.lastRunAt ?? "-"}</text>
        <text><strong>Last exit: </strong>{loop.lastExitCode ?? "-"}</text>
        <text><strong>Next run:  </strong>{loop.nextRunAt ?? "-"}</text>
        <text><strong>PID:       </strong>{loop.pid}</text>
      </box>
      <scrollbox title=" Live Output " border style={{ flexGrow: 1 }} stickyScroll stickyStart="bottom">
        {logLines.map((line, index) => (
          <text key={index}>{line}</text>
        ))}
      </scrollbox>
    </box>
  );
}

function HelpView(): React.ReactNode {
  const rows: [string, string][] = [
    ["up/down, j/k", "move selection"],
    ["enter", "toggle loop detail"],
    ["n", "create loop"],
    ["p", "pause selected loop"],
    ["r", "resume selected loop"],
    ["d", "delete selected loop"],
    ["/", "search loops"],
    ["f", "cycle status filter"],
    ["s", "cycle sort mode"],
    ["h", "toggle help"],
    ["esc", "back to board"],
    ["q", "quit"],
  ];

  return (
    <box title=" Help " border style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      {rows.map(([keys, desc]) => (
        <text key={keys}>
          <span fg="#38bdf8">{keys.padEnd(16)}</span>
          {desc}
        </text>
      ))}
    </box>
  );
}

function CreateView(props: {
  onCancel: () => void;
  onCreated: (id: string) => void;
}): React.ReactNode {
  const fields = ["interval", "command", "args", "runNow", "maxRuns"] as const;
  type Field = (typeof fields)[number];

  const labels: Record<Field, string> = {
    interval: "Interval (e.g. 30m)",
    command: "Command",
    args: "Arguments (space separated)",
    runNow: "Run immediately? (y/n)",
    maxRuns: "Max runs (blank = unlimited)",
  };

  const [values, setValues] = useState<Record<Field, string>>({
    interval: "30m",
    command: "",
    args: "",
    runNow: "n",
    maxRuns: "",
  });
  const [focusIndex, setFocusIndex] = useState(0);
  const [error, setError] = useState("");

  function submit(current: Record<Field, string>): void {
    try {
      const built = buildLoopOptions(
        current.interval.trim(),
        current.command.trim(),
        current.args.trim() ? current.args.trim().split(/\s+/) : [],
        {
          now: current.runNow.trim().toLowerCase().startsWith("y"),
          maxRuns: current.maxRuns.trim() || null,
          verbose: false,
        }
      );
      void createLoop(built.options, built.intervalHuman)
        .then((id) => props.onCreated(id))
        .catch((e: unknown) =>
          setError(e instanceof Error ? e.message : String(e))
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <box title=" New Loop " border style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      {fields.map((field, index) => (
        <box key={field} style={{ flexDirection: "column", marginBottom: 1 }}>
          <text fg={focusIndex === index ? "#38bdf8" : "#9ca3af"}>
            {labels[field]}
          </text>
          <box border style={{ height: 3 }}>
            <input
              focused={focusIndex === index}
              placeholder={values[field]}
              onInput={(value: string) =>
                setValues((prev) => ({ ...prev, [field]: value }))
              }
              onSubmit={() => {
                if (index < fields.length - 1) {
                  setFocusIndex(index + 1);
                } else {
                  submit(values);
                }
              }}
            />
          </box>
        </box>
      ))}
      <text fg="#9ca3af">
        Tab/Enter to advance · Enter on last field creates · Esc cancels
      </text>
      {error ? <text fg="#f87171">{error}</text> : null}
    </box>
  );
}

function Footer(props: {
  view: View;
  searchActive: boolean;
  query: string;
  confirm: ConfirmState | null;
  status: string;
  onSearch: (query: string) => void;
}): React.ReactNode {
  if (props.confirm) {
    return (
      <box style={{ height: 1, backgroundColor: "#7c2d12", paddingLeft: 1 }}>
        <text>
          <strong>{props.confirm.message}</strong> <span fg="#4ade80">y</span>
          es / <span fg="#f87171">n</span>o
        </text>
      </box>
    );
  }

  if (props.searchActive) {
    return (
      <box style={{ height: 1, flexDirection: "row", paddingLeft: 1 }}>
        <text fg="#38bdf8">search: </text>
        <input
          focused
          placeholder="type to filter, enter to apply"
          onInput={props.onSearch}
        />
      </box>
    );
  }

  const hints =
    props.view === "create"
      ? "esc cancel"
      : props.view === "help"
        ? "h/esc back"
        : props.view === "detail"
          ? "esc back · p pause · r resume · d delete · q quit"
          : "n new · enter detail · p/r/d act · / search · f filter · s sort · h help · q quit";

  return (
    <box style={{ height: 1, flexDirection: "row", paddingLeft: 1 }}>
      <text fg="#9ca3af">{hints}</text>
      {props.status ? <text fg="#a3e635">  {props.status}</text> : null}
    </box>
  );
}
