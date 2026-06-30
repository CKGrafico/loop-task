import { Command, CommandContext } from './types.js';
import {
  COMMAND_TIER_ACTION,
  COMMAND_TIER_CONFIRM,
  COMMAND_TIER_GLOBAL,
  COMMAND_CATEGORY_GLOBAL,
  COMMAND_CATEGORY_LOOP,
  COMMAND_CATEGORY_TASK,
  COMMAND_CATEGORY_PROJECT,
} from '../config/constants.js';
import { t } from '../i18n/index.js';

/**
 * Build the list of context-aware commands for the command palette.
 *
 * Global commands are always present. Loop/task/project commands are
 * included only when the corresponding entity is selected and its tab is active.
 */
export function buildCommands(context: CommandContext): Command[] {
  const commands: Command[] = [];

  // ── Global commands (always present) ──────────────────────────────
  // "new" is context-aware: becomes new-loop / new-task / new-project based on tab
  const newLabel = context.activeTab === 'loops' ? t('cmd.newLoop')
    : context.activeTab === 'tasks' ? t('cmd.newTask')
    : t('cmd.newProject');
  const newValue = context.activeTab === 'loops' ? 'new-loop'
    : context.activeTab === 'tasks' ? 'new-task'
    : 'new-project';

  commands.push(
    { label: newLabel, value: newValue, hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+n' },
    { label: t('cmd.search'), value: 'search', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+f' },
    { label: t('cmd.debug'), value: 'debug', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
    { label: t('cmd.api'), value: 'api', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
    { label: t('cmd.export'), value: 'export', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
    { label: t('cmd.import'), value: 'import', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
  );

  // ── Loop-specific filter/sort commands ───────────────────────────
  if (context.activeTab === 'loops') {
    commands.push(
      { label: t('cmd.filterStatus'), value: 'filter-status', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.sort'), value: 'sort', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.project'), value: 'filter-project', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
    );
  }

  // ── Loop commands ────────────────────────────────────────────────
  if (context.selectedLoop !== null && context.activeTab === 'loops') {
    const loop = context.selectedLoop;
    const desc = loop.description || loop.id;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+e' },
      { label: t('cmd.pause'), value: 'pause', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.play'), value: 'play', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.clone'), value: 'clone', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.trigger'), value: 'trigger', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.logs'), value: 'logs', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      {
        label: t('cmd.delete'),
        value: 'delete',
        hint: t('confirm.deleteLoop', { name: desc }),
        tier: COMMAND_TIER_CONFIRM,
        category: COMMAND_CATEGORY_LOOP,
        shortcut: 'ctrl+d',
      },
      {
        label: t('cmd.stop'),
        value: 'stop',
        hint: t('confirm.stopLoop', { name: desc }),
        tier: COMMAND_TIER_CONFIRM,
        category: COMMAND_CATEGORY_LOOP,
      },
    );
  }

  // ── Task commands ────────────────────────────────────────────────
  if (context.selectedTask !== null && context.activeTab === 'tasks') {
    const task = context.selectedTask;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_TASK },
      {
        label: t('cmd.delete'),
        value: 'delete',
        hint: t('confirm.deleteTask', { id: task.id }),
        tier: COMMAND_TIER_CONFIRM,
        category: COMMAND_CATEGORY_TASK,
      },
      {
        label: t('board.taskActionSelect'),
        value: 'select',
        hint: '',
        tier: COMMAND_TIER_ACTION,
        category: COMMAND_CATEGORY_TASK,
      },
    );
  }

  // ── Project commands ─────────────────────────────────────────────
  if (context.selectedProject !== null && context.activeTab === 'projects') {
    const project = context.selectedProject;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_PROJECT },
      {
        label: t('cmd.delete'),
        value: 'delete',
        hint: t('confirm.deleteProject', { name: project.name }),
        tier: COMMAND_TIER_CONFIRM,
        category: COMMAND_CATEGORY_PROJECT,
      },
      { label: 'Set as default', value: 'set-default', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_PROJECT },
    );
  }

  return commands;
}

/**
 * Build commands for the current tab context, grouped by category.
 * Used by the Ctrl+P commands browser modal.
 *
 * Unlike buildCommands(), this does NOT require a selected item -
 * it shows the "new" command for the current tab, plus all relevant
 * actions. The "new" command always maps to ctrl+n regardless of tab.
 */
export function buildTabCommands(context: CommandContext): Command[] {
  const commands: Command[] = [];
  const cat = context.activeTab === 'loops' ? COMMAND_CATEGORY_LOOP
    : context.activeTab === 'tasks' ? COMMAND_CATEGORY_TASK
    : COMMAND_CATEGORY_PROJECT;

  // Tab-specific "new" command (ctrl+n = new loop / task / project)
  const newLabel = context.activeTab === 'loops' ? t('cmd.newLoop')
    : context.activeTab === 'tasks' ? t('cmd.newTask')
    : t('cmd.newProject');
  const newValue = context.activeTab === 'loops' ? 'new-loop'
    : context.activeTab === 'tasks' ? 'new-task'
    : 'new-project';
  commands.push(
    { label: newLabel, value: newValue, hint: '', tier: COMMAND_TIER_GLOBAL, category: cat, shortcut: 'ctrl+n' },
  );

  // Always-available global commands (NOT including the per-tab "new" above)
  commands.push(
    { label: t('cmd.search'), value: 'search', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+f' },
    { label: t('cmd.debug'), value: 'debug', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
    { label: t('cmd.api'), value: 'api', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
    { label: t('cmd.status'), value: 'status', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
    { label: t('cmd.export'), value: 'export', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
    { label: t('cmd.import'), value: 'import', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL },
  );

  // Tab-specific actions (shown regardless of selection)
  if (context.activeTab === 'loops') {
    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+e' },
      { label: t('cmd.filterStatus'), value: 'filter-status', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.sort'), value: 'sort', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.project'), value: 'filter-project', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.pause'), value: 'pause', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.play'), value: 'play', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.clone'), value: 'clone', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.trigger'), value: 'trigger', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.logs'), value: 'logs', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP },
      { label: t('cmd.delete'), value: 'delete', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+d' },
      { label: t('cmd.stop'), value: 'stop', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_LOOP },
    );
  }

  if (context.activeTab === 'tasks') {
    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_TASK, shortcut: 'ctrl+e' },
      { label: t('cmd.delete'), value: 'delete', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_TASK, shortcut: 'ctrl+d' },
    );
  }

  if (context.activeTab === 'projects') {
    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_PROJECT, shortcut: 'ctrl+e' },
      { label: t('cmd.delete'), value: 'delete', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_PROJECT, shortcut: 'ctrl+d' },
    );
  }

  return commands;
}
