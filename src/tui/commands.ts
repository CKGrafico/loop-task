import { Command, CommandContext } from './types.js';
import {
  COMMAND_TIER_ACTION,
  COMMAND_TIER_CONFIRM,
  COMMAND_TIER_GLOBAL,
  COMMAND_CATEGORY_GLOBAL,
  COMMAND_CATEGORY_FILTERS,
  COMMAND_CATEGORY_LOOP,
  COMMAND_CATEGORY_TASK,
  COMMAND_CATEGORY_PROJECT,
} from '../config/constants.js';
import { t } from '../i18n/index.js';

export function buildCommands(context: CommandContext): Command[] {
  const commands: Command[] = [];

  const newLabel = context.activeTab === 'loops' ? t('cmd.newLoop')
    : context.activeTab === 'tasks' ? t('cmd.newTask')
    : t('cmd.newProject');
  const newValue = context.activeTab === 'loops' ? 'new-loop'
    : context.activeTab === 'tasks' ? 'new-task'
    : 'new-project';

  const cat = context.activeTab === 'loops' ? COMMAND_CATEGORY_LOOP
    : context.activeTab === 'tasks' ? COMMAND_CATEGORY_TASK
    : COMMAND_CATEGORY_PROJECT;

  commands.push(
    { label: newLabel, value: newValue, hint: '', tier: COMMAND_TIER_ACTION, category: cat, shortcut: 'ctrl+a+n' },
    { label: t('cmd.help'), value: 'help', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+p' },
    { label: t('cmd.debug'), value: 'debug', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+b' },
    { label: t('cmd.api'), value: 'api', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+g' },
    { label: t('cmd.export'), value: 'export', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+x' },
    { label: t('cmd.import'), value: 'import', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+i' },
    { label: t('cmd.status'), value: 'status', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+y' },
  );

  if (context.activeTab === 'loops') {
    commands.push(
      { label: t('cmd.search'), value: 'search', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+s' },
      { label: t('cmd.filterStatus'), value: 'filter-status', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+t' },
      { label: t('cmd.sort'), value: 'sort', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+o' },
      { label: t('cmd.project'), value: 'filter-project', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+p' },
    );
  }

  if (context.selectedLoop !== null && context.activeTab === 'loops') {
    const loop = context.selectedLoop;
    const desc = loop.description || loop.id;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+e' },
      { label: t('cmd.pause'), value: 'pause', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+p' },
      { label: t('cmd.play'), value: 'play', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+r' },
      { label: t('cmd.stop'), value: 'stop', hint: t('confirm.stopLoop', { name: desc }), tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+s' },
      { label: t('cmd.trigger'), value: 'trigger', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+t' },
      { label: t('cmd.clone'), value: 'clone', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+c' },
      { label: t('cmd.delete'), value: 'delete', hint: t('confirm.deleteLoop', { name: desc }), tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+d' },
      { label: t('cmd.logs'), value: 'logs', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+o' },
    );
  }

  if (context.selectedTask !== null && context.activeTab === 'tasks') {
    const task = context.selectedTask;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_TASK, shortcut: 'ctrl+a+e' },
      { label: t('cmd.delete'), value: 'delete', hint: t('confirm.deleteTask', { id: task.id }), tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_TASK, shortcut: 'ctrl+a+d' },
      { label: t('board.taskActionSelect'), value: 'select', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_TASK },
    );
  }

  if (context.selectedProject !== null && context.activeTab === 'projects') {
    const project = context.selectedProject;

    commands.push(
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_PROJECT, shortcut: 'ctrl+a+e' },
      { label: t('cmd.delete'), value: 'delete', hint: t('confirm.deleteProject', { name: project.name }), tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_PROJECT, shortcut: 'ctrl+a+d' },
      { label: 'Set as default', value: 'set-default', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_PROJECT },
    );
  }

  return commands;
}

export function buildTabCommands(context: CommandContext): Command[] {
  const commands: Command[] = [];

  const newLabel = context.activeTab === 'loops' ? t('cmd.newLoop')
    : context.activeTab === 'tasks' ? t('cmd.newTask')
    : t('cmd.newProject');
  const newValue = context.activeTab === 'loops' ? 'new-loop'
    : context.activeTab === 'tasks' ? 'new-task'
    : 'new-project';

  commands.push(
    { label: t('cmd.help'), value: 'help', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+p' },
    { label: t('cmd.debug'), value: 'debug', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+b' },
    { label: t('cmd.api'), value: 'api', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+g' },
    { label: t('cmd.export'), value: 'export', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+x' },
    { label: t('cmd.import'), value: 'import', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+i' },
    { label: t('cmd.status'), value: 'status', hint: '', tier: COMMAND_TIER_GLOBAL, category: COMMAND_CATEGORY_GLOBAL, shortcut: 'ctrl+y' },
  );

  if (context.activeTab === 'loops') {
    commands.push(
      { label: t('cmd.search'), value: 'search', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+s' },
      { label: t('cmd.filterStatus'), value: 'filter-status', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+t' },
      { label: t('cmd.sort'), value: 'sort', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+o' },
      { label: t('cmd.project'), value: 'filter-project', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_FILTERS, shortcut: 'ctrl+f+p' },
      { label: newLabel, value: newValue, hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+n' },
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+e' },
      { label: t('cmd.pause'), value: 'pause', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+p' },
      { label: t('cmd.play'), value: 'play', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+r' },
      { label: t('cmd.stop'), value: 'stop', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+s' },
      { label: t('cmd.trigger'), value: 'trigger', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+t' },
      { label: t('cmd.clone'), value: 'clone', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+c' },
      { label: t('cmd.delete'), value: 'delete', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+d' },
      { label: t('cmd.logs'), value: 'logs', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_LOOP, shortcut: 'ctrl+a+o' },
    );
  }

  if (context.activeTab === 'tasks') {
    commands.push(
      { label: newLabel, value: newValue, hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_TASK, shortcut: 'ctrl+a+n' },
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_TASK, shortcut: 'ctrl+a+e' },
      { label: t('cmd.delete'), value: 'delete', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_TASK, shortcut: 'ctrl+a+d' },
    );
  }

  if (context.activeTab === 'projects') {
    commands.push(
      { label: newLabel, value: newValue, hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_PROJECT, shortcut: 'ctrl+a+n' },
      { label: t('cmd.edit'), value: 'edit', hint: '', tier: COMMAND_TIER_ACTION, category: COMMAND_CATEGORY_PROJECT, shortcut: 'ctrl+a+e' },
      { label: t('cmd.delete'), value: 'delete', hint: '', tier: COMMAND_TIER_CONFIRM, category: COMMAND_CATEGORY_PROJECT, shortcut: 'ctrl+a+d' },
    );
  }

  return commands;
}
