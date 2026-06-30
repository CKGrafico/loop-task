import { LoopMeta, TaskDefinition, Project } from '../types.js';

export type View = "board" | "create" | "task-create" | "task-edit" | "task-list" | "projects";

export type DaemonStatus = "starting" | "connected" | "error";

export type Mode = "normal" | "search" | "create" | "help" | "confirm" | "task" | "projects";

export type TabName = "loops" | "tasks" | "projects";

export type PanelFocus = "left" | "right";

export type CommandTier = "action" | "confirm" | "global";

export interface Command {
  label: string;
  value: string;
  hint: string;
  tier: CommandTier;
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
