import { LoopMeta, TaskDefinition, Project } from '../types.js';

export type View = "board" | "create" | "task-create" | "task-edit";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "confirm" | "task" | "projects" | "confirm-input";

export type TabName = "loops" | "tasks" | "projects";

export type PanelFocus = "left" | "right";

export type CommandTier = "action" | "confirm" | "global";

export type CommandCategory = "global" | "loop" | "task" | "project";

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
