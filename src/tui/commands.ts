import { Command, CommandContext } from './types.js';
import {
  COMMAND_TIER_ACTION,
  COMMAND_TIER_CONFIRM,
  COMMAND_TIER_GLOBAL,
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
  commands.push(
    { label: t('cmd.newLoop'), value: 'new-loop', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.newTask'), value: 'new-task', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.newProject'), value: 'new-project', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.help'), value: 'help', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.api'), value: 'api', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.status'), value: 'status', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.export'), value: 'export', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.import'), value: 'import', hint: '', tier: COMMAND_TIER_GLOBAL },
    { label: t('cmd.quit'), value: 'quit', hint: '', tier: COMMAND_TIER_GLOBAL },
  );

  // ── Loop commands ────────────────────────────────────────────────
  if (context.selectedLoop !== null && context.activeTab === 'loops') {
    const loop = context.selectedLoop;
    const desc = loop.description || loop.id;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION },
      { label: t('cmd.pause'), value: 'pause', hint: '', tier: COMMAND_TIER_ACTION },
      { label: t('cmd.play'), value: 'play', hint: '', tier: COMMAND_TIER_ACTION },
      { label: t('cmd.clone'), value: 'clone', hint: '', tier: COMMAND_TIER_ACTION },
      { label: t('cmd.trigger'), value: 'trigger', hint: '', tier: COMMAND_TIER_ACTION },
      { label: t('cmd.logs'), value: 'logs', hint: '', tier: COMMAND_TIER_ACTION },
      {
        label: t('cmd.delete'),
        value: 'delete',
        hint: t('confirm.deleteLoop', { name: desc }),
        tier: COMMAND_TIER_CONFIRM,
      },
      {
        label: t('cmd.stop'),
        value: 'stop',
        hint: t('confirm.stopLoop', { name: desc }),
        tier: COMMAND_TIER_CONFIRM,
      },
    );
  }

  // ── Task commands ────────────────────────────────────────────────
  if (context.selectedTask !== null && context.activeTab === 'tasks') {
    const task = context.selectedTask;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION },
      {
        label: t('cmd.delete'),
        value: 'delete',
        hint: t('confirm.deleteTask', { id: task.id }),
        tier: COMMAND_TIER_CONFIRM,
      },
      {
        label: t('board.taskActionSelect'),
        value: 'select',
        hint: '',
        tier: COMMAND_TIER_ACTION,
      },
    );
  }

  // ── Project commands ─────────────────────────────────────────────
  if (context.selectedProject !== null && context.activeTab === 'projects') {
    const project = context.selectedProject;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION },
      {
        label: t('cmd.delete'),
        value: 'delete',
        hint: t('confirm.deleteProject', { name: project.name }),
        tier: COMMAND_TIER_CONFIRM,
      },
      // TODO: add cmd.setDefault i18n key
      { label: 'Set as default', value: 'set-default', hint: '', tier: COMMAND_TIER_ACTION },
    );
  }

  return commands;
}
