import type { LoopMeta, RunRecord, TaskDefinition, Project } from "../types.js";
import type { Filters, SortMode } from "../entities/loops/filters.js";
import type { ProjectFilters } from "../entities/projects/filters.js";
import type { InputOwner } from "../shared/ui/state.js";
import type { DebugEntry } from "../shared/ui/DebugPanel.js";
import type { Toast } from "../shared/ui/Toast.js";
import type { LoopService, TaskService, ProjectService, LogService, ExportService } from "../shared/services/types.js";

export type { InputOwner } from "../shared/ui/state.js";
export type { DebugEntry } from "../shared/ui/DebugPanel.js";
export type { Toast } from "../shared/ui/Toast.js";

export type View = "board" | "create" | "task-create" | "task-edit" | "project-create" | "project-edit";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "confirm" | "task" | "projects" | "confirm-input";

export type TabName = "loops" | "tasks" | "projects";

export type PanelFocus = "left" | "right";

export type CommandTier = "action" | "confirm" | "global";

export type CommandCategory = "global" | "filters" | "loop" | "task" | "project";

export interface Command {
  label: string;
  value: string;
  hint: string;
  tier: CommandTier;
  category: CommandCategory;
  shortcut?: string;
}

export interface CommandContext {
  activeTab: TabName;
  selectedLoop: LoopMeta | null;
  selectedTask: TaskDefinition | null;
  selectedProject: Project | null;
}

export type CommandInputMode = "command" | "confirm";

export interface ConfirmState {
  prompt: string;
  onConfirm: () => void;
}

export interface SearchState {
  active: boolean;
}

export interface CommandHandlerContext {
  activeTab: TabName;
  selected: LoopMeta | null;
  selectedRunIndex: number;
  selectedTask: TaskDefinition | null;
  selectedProjectEntity: Project | null;
  tasks: TaskDefinition[];
  projects: Project[];
  currentProjectId: string;
  filters: Filters;
  projectFilters: ProjectFilters;
  setCloneMode: (v: boolean) => void;
  setEditTarget: (v: LoopMeta | null) => void;
  setPendingTaskSelection: (v: { id: string; name: string } | null) => void;
  setEditTask: (v: TaskDefinition | null) => void;
  setEditProject: (v: Project | null) => void;
  setActiveTab: (v: TabName) => void;
  setConfirmState: (v: ConfirmState | null) => void;
  setCommandsBrowserOpen: (v: boolean) => void;
  setSearchValue: (v: string) => void;
  setSearchState: (v: SearchState | null) => void;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setSort: React.Dispatch<React.SetStateAction<SortMode>>;
  setCurrentProjectId: (v: string) => void;
  setProjectFilters: React.Dispatch<React.SetStateAction<ProjectFilters>>;
  setProjectSelectedIndex: (v: number) => void;
  setDebugMode: React.Dispatch<React.SetStateAction<boolean>>;
  setExportModal: (v: { json: string; filePath: string | null; error: string | null } | null) => void;
  setDiagramModal: (v: string | null) => void;
  push: (view: View) => void;
  refresh: () => void;
  refreshTasks: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  pushToast: (type: "success" | "error" | "info", message: string) => void;
  loopService: LoopService;
  taskService: TaskService;
  projectService: ProjectService;
  exportService: ExportService;
  logService: LogService;
  pop: () => void;
  runAction: (label: string, action: () => Promise<void>) => () => Promise<void>;
  handleOpenRunLog: (run: RunRecord) => void;
}

export interface ActionContext {
  activeTab: TabName;
  focusedPanel: PanelFocus;
  selected: LoopMeta | null;
  selectedRunIndex: number;
  selectedTask: TaskDefinition | null;
  selectedProjectEntity: Project | null;
  tasks: TaskDefinition[];
  push: (view: View) => void;
  setCloneMode: (v: boolean) => void;
  setEditTarget: (v: LoopMeta | null) => void;
  setPendingTaskSelection: (v: { id: string; name: string } | null) => void;
  handleCommand: (value: string) => void;
  handleOpenRunLog: (run: RunRecord) => void;
  pushToast: (type: "success" | "error" | "info", message: string) => void;
  isBoardView: (view: View) => boolean;
  view: View;
  logModalRun: RunRecord | null;
  commandsBrowserOpen: boolean;
  confirmState: ConfirmState | null;
  searchState: SearchState | null;
  setChordState: (v: "ctrl+f" | "ctrl+a" | null) => void;
  chordState: "ctrl+f" | "ctrl+a" | null;
}

export interface OverlayContext {
  confirmState: ConfirmState | null;
  setConfirmState: (v: ConfirmState | null) => void;
  searchState: SearchState | null;
  setSearchState: (v: SearchState | null) => void;
  setSearchValue: (v: string) => void;
  logModalRun: RunRecord | null;
  setLogModalRun: (v: RunRecord | null) => void;
  logModalLoopId: string | null;
  setLogModalLoopId: (v: string | null) => void;
  commandsBrowserOpen: boolean;
  setCommandsBrowserOpen: (v: boolean) => void;
  exportModal: { json: string; filePath: string | null; error: string | null } | null;
  setExportModal: (v: { json: string; filePath: string | null; error: string | null } | null) => void;
  diagramModal: string | null;
  setDiagramModal: (v: string | null) => void;
  contextHelpOpen: boolean;
  setContextHelpOpen: (v: boolean) => void;
  view: View;
  pop: () => void;
  onQuit: () => void;
  exit: () => void;
  commandBarHasText: boolean;
  commandBarDropdownOpen: boolean;
}

export interface ShortcutContext {
  activeTab: TabName;
  focusedPanel: PanelFocus;
  setFocusedPanel: React.Dispatch<React.SetStateAction<PanelFocus>>;
  setActiveTab: React.Dispatch<React.SetStateAction<TabName>>;
  view: View;
  handleCommand: (value: string) => void;
  triggerContextualAction: () => void;
  popLayer: () => boolean;
  anyModalOpen: boolean;
  debugMode: boolean;
  setDebugEntries: React.Dispatch<React.SetStateAction<DebugEntry[]>>;
  inputOwner: InputOwner;
  confirmState: ConfirmState | null;
  searchState: SearchState | null;
  logModalRun: RunRecord | null;
  commandsBrowserOpen: boolean;
  exportModal: { json: string; filePath: string | null; error: string | null } | null;
  diagramModal: string | null;
  contextHelpOpen: boolean;
  setContextHelpOpen: (v: boolean) => void;
  onQuit: () => void;
  exit: () => void;
  setConfirmState: (v: ConfirmState | null) => void;
  setLogModalRun: (v: RunRecord | null) => void;
  setLogModalLoopId: (v: string | null) => void;
  setCommandsBrowserOpen: (v: boolean) => void;
  chordState: "ctrl+f" | "ctrl+a" | null;
  setChordState: (v: "ctrl+f" | "ctrl+a" | null) => void;
}

export interface FormRouterProps {
  view: View;
  editTarget: LoopMeta | null;
  cloneMode: boolean;
  editTask: TaskDefinition | null;
  editProject: Project | null;
  pendingTaskSelection: { id: string; name: string } | null;
  tasks: TaskDefinition[];
  projects: Project[];
  currentProjectId: string;
  cancelCreate: () => void;
  onCreateDone: (updated: boolean, id: string, desc: string) => void;
  handleChooseTask: (task: { id: string; name: string }) => void;
  cancelTask: () => void;
  onTaskDone: (updated: boolean, id: string) => void;
  cancelProject: () => void;
  onProjectDone: (updated: boolean, name: string) => void;
}

export interface OverlayStackProps {
  commandsBrowserOpen: boolean;
  commandContext: CommandContext;
  onCommandsBrowserClose: () => void;
  onCommandsBrowserExecute: (value: string) => void;
  contextHelpOpen: boolean;
  onContextHelpClose: () => void;
  exportModal: { json: string; filePath: string | null; error: string | null } | null;
  onExportModalClose: () => void;
  onExportCopy: () => void;
  diagramModal: string | null;
  onDiagramModalClose: () => void;
  logModalRun: RunRecord | null;
  logModalLoopId: string | null;
  logModalLines: string[];
  logModalLoading: boolean;
  onLogModalClose: () => void;
  onLogCopy: () => void;
  toasts: Toast[];
}
