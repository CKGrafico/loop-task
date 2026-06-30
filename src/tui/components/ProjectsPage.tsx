import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Project, LoopMeta } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { createProject, updateProject, deleteProject } from "../daemon.js";
import { PROJECT_COLORS, PROJECT_COLOR_KEYS } from "../../config/constants.js";

interface ProjectsPageProps {
  projects: Project[];
  loops: LoopMeta[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onOpenCreate: (trigger: (() => void) | null) => void;
  onToast: (msg: string) => void;
}

type SubModal = "none" | "create" | "edit" | "delete";

function loopCountFor(loops: LoopMeta[], projectId: string): number {
  return loops.filter((l) => l.projectId === projectId).length;
}

function ColorPicker(props: {
  selected: string;
  onSelect: (color: string) => void;
  focused: boolean;
}): React.ReactNode {
  const idx = Math.max(0, PROJECT_COLOR_KEYS.indexOf(props.selected as typeof PROJECT_COLOR_KEYS[number]));

  return (
    <Box>
      {PROJECT_COLOR_KEYS.map((key, i) => {
        const color = PROJECT_COLORS[key];
        const isActive = props.selected === color;
        const bg = isActive ? color : undefined;
        const fg = isActive ? theme.text.inverse : theme.text.secondary;

        return (
          <Box key={key} marginRight={i < PROJECT_COLOR_KEYS.length - 1 ? 1 : 0}>
            <Box
              borderStyle="single"
              borderColor={isActive ? theme.accent.focus : theme.border.dim}
              backgroundColor={bg}
              paddingX={1}
              >
              <Text color={fg} bold>
                {key}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function CreateProjectModal(props: {
  name: string;
  color: string;
  onNameChange: (val: string) => void;
  onColorChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}): React.ReactNode {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent.focus}
      backgroundColor={theme.bg.elevated}
      padding={1}
      width={48}
    >
      <Box marginBottom={1}>
        <Text color={theme.accent.focus} bold>
          {t("project.createTitle")}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Box width={6}>
          <Text color={theme.text.secondary}>{t("project.labelName")}</Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor={theme.border.focus}
          backgroundColor={theme.bg.input}
          paddingX={1}
        >
          <TextInput value={props.name} onChange={props.onNameChange} placeholder={t("project.hintName")} />
        </Box>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color={theme.text.secondary}>{t("project.labelColor")}</Text>
        <Box marginTop={1}>
          <ColorPicker selected={props.color} onSelect={props.onColorChange} focused={false} />
        </Box>
      </Box>

      <Box justifyContent="flex-end">
        <Box
          borderStyle="single"
          borderColor={props.saving ? theme.semantic.warning : theme.accent.focus}
          backgroundColor={theme.bg.active}
          paddingX={2}
          >
          <Text color={theme.text.inverse} bold>
            {props.saving ? t("board.saving") : t("board.create")}
          </Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor={theme.border.dim}
          backgroundColor={theme.bg.surface}
          paddingX={2}
          marginLeft={1}
          >
          <Text color={theme.text.primary}>{t("board.cancel")}</Text>
        </Box>
      </Box>
    </Box>
  );
}

function EditProjectModal(props: {
  project: Project;
  name: string;
  color: string;
  onNameChange: (val: string) => void;
  onColorChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}): React.ReactNode {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent.focus}
      backgroundColor={theme.bg.elevated}
      padding={1}
      width={48}
    >
      <Box marginBottom={1}>
        <Text color={theme.accent.focus} bold>
          {t("project.editTitle")}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Box width={6}>
          <Text color={theme.text.secondary}>{t("project.labelName")}</Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor={theme.border.focus}
          backgroundColor={theme.bg.input}
          paddingX={1}
        >
          <TextInput value={props.name} onChange={props.onNameChange} placeholder={t("project.hintName")} />
        </Box>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text color={theme.text.secondary}>{t("project.labelColor")}</Text>
        <Box marginTop={1}>
          <ColorPicker selected={props.color} onSelect={props.onColorChange} focused={false} />
        </Box>
      </Box>

      <Box justifyContent="flex-end">
        <Box
          borderStyle="single"
          borderColor={props.saving ? theme.semantic.warning : theme.accent.focus}
          backgroundColor={theme.bg.active}
          paddingX={2}
          >
          <Text color={theme.text.inverse} bold>
            {props.saving ? t("board.saving") : t("board.save")}
          </Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor={theme.border.dim}
          backgroundColor={theme.bg.surface}
          paddingX={2}
          marginLeft={1}
          >
          <Text color={theme.text.primary}>{t("board.cancel")}</Text>
        </Box>
      </Box>
    </Box>
  );
}

function DeleteConfirm(props: {
  project: Project;
  loopCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactNode {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.semantic.danger}
      backgroundColor={theme.bg.elevated}
      padding={1}
      width={48}
    >
      <Box marginBottom={1}>
        <Text color={theme.semantic.danger} bold>
          {t("project.deleteTitle")}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={theme.text.primary}>
          {t("project.deleteConfirm", { name: props.project.name })}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={theme.semantic.warning}>
          {t("project.deleteWarning", { count: props.loopCount })}
        </Text>
      </Box>

      <Box>
        <Box
          borderStyle="single"
          borderColor={theme.semantic.danger}
          backgroundColor={theme.semantic.danger}
          paddingX={2}
          >
          <Text color={theme.text.inverse} bold>
            {t("board.yes")}
          </Text>
        </Box>
        <Box
          borderStyle="single"
          borderColor={theme.border.dim}
          backgroundColor={theme.bg.surface}
          paddingX={2}
          marginLeft={1}
          >
          <Text color={theme.text.primary}>{t("board.no")}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export function ProjectsPage(props: ProjectsPageProps): React.ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subModal, setSubModal] = useState<SubModal>("none");
  const [projectName, setProjectName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS.white);
  const [saving, setSaving] = useState(false);
  const [focusMode, setFocusMode] = useState<"list" | "actions">("list");

  const selected = props.projects[selectedIndex];
  const loopCount = selected ? loopCountFor(props.loops, selected.id) : 0;

  useInput((input, key) => {
    if (subModal !== "none") {
      if (key.escape) {
        setSubModal("none");
        setSaving(false);
      }
      return;
    }

    if (key.escape) {
      if (focusMode === "actions") {
        setFocusMode("list");
      } else {
        props.onClose();
      }
      return;
    }

    if (focusMode === "list") {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev <= 0 ? Math.max(0, props.projects.length - 1) : prev - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((prev) => (prev >= props.projects.length - 1 ? 0 : prev + 1));
        return;
      }

      if (key.return && selected) {
        setFocusMode("actions");
        return;
      }
    }

    if (focusMode === "actions" && selected) {
      if (key.return) {
        setSubModal("edit");
        setProjectName(selected.name);
        setSelectedColor(selected.color);
        return;
      }

      if (input === "e") {
        setSubModal("edit");
        setProjectName(selected.name);
        setSelectedColor(selected.color);
        return;
      }

      if (input === "d") {
        setSubModal("delete");
        return;
      }
    }

    if (input === "n") {
      setSubModal("create");
      setProjectName("");
      setSelectedColor(PROJECT_COLORS.white);
      return;
    }

    if (input === "e" && selected) {
      setSubModal("edit");
      setProjectName(selected.name);
      setSelectedColor(selected.color);
      return;
    }

    if (input === "d" && selected) {
      setSubModal("delete");
      return;
    }
  });

  async function handleCreate(): Promise<void> {
    if (!projectName.trim()) {
      props.onToast(t("project.error.nameEmpty"));
      return;
    }
    setSaving(true);
    try {
      await createProject(projectName.trim(), selectedColor);
      props.onToast(t("project.toastCreated", { name: projectName.trim() }));
      await props.onRefresh();
      setSubModal("none");
      setProjectName("");
      setSelectedColor(PROJECT_COLORS.white);
    } catch (e) {
      props.onToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(): Promise<void> {
    if (!selected) return;
    if (!projectName.trim()) {
      props.onToast(t("project.error.nameEmpty"));
      return;
    }
    setSaving(true);
    try {
      await updateProject(selected.id, projectName.trim(), selectedColor);
      props.onToast(t("project.toastUpdated", { name: projectName.trim() }));
      await props.onRefresh();
      setSubModal("none");
    } catch (e) {
      props.onToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!selected) return;
    try {
      await deleteProject(selected.id);
      props.onToast(t("project.toastDeleted", { name: selected.name }));
      await props.onRefresh();
      setSubModal("none");
      setSelectedIndex(0);
    } catch (e) {
      props.onToast((e as Error).message);
    }
  }

  if (subModal === "create") {
    return (
      <CreateProjectModal
        name={projectName}
        color={selectedColor}
        onNameChange={setProjectName}
        onColorChange={setSelectedColor}
        onSave={handleCreate}
        onCancel={() => setSubModal("none")}
        saving={saving}
      />
    );
  }

  if (subModal === "edit" && selected) {
    return (
      <EditProjectModal
        project={selected}
        name={projectName}
        color={selectedColor}
        onNameChange={setProjectName}
        onColorChange={setSelectedColor}
        onSave={handleEdit}
        onCancel={() => setSubModal("none")}
        saving={saving}
      />
    );
  }

  if (subModal === "delete" && selected) {
    return (
      <DeleteConfirm
        project={selected}
        loopCount={loopCount}
        onConfirm={handleDelete}
        onCancel={() => setSubModal("none")}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Box width="40%" flexDirection="column">
          <Box borderStyle="single" borderColor={theme.accent.project} paddingX={1}>
            <Text color={theme.accent.project} bold>
              {t("project.projectsTitle")}
            </Text>
          </Box>

          {props.projects.length === 0 ? (
            <Box paddingX={1}>
              <Text color={theme.text.muted}>{t("project.noLoops")}</Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {props.projects.map((project, i) => {
                const isSelected = i === selectedIndex && focusMode === "list";
                const count = loopCountFor(props.loops, project.id);
                const bg = isSelected ? theme.bg.active : undefined;
                const fg = isSelected ? theme.text.inverse : theme.text.primary;

                return (
                  <Box key={project.id} backgroundColor={bg} paddingLeft={1}>
                    <Text color={project.color}>{"\u25CF"}</Text>
                    <Text color={fg}> {project.name.padEnd(20)}</Text>
                    <Text color={isSelected ? theme.text.inverse : theme.text.muted}>
                      {t("project.loopCount", { count })}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <Box flexGrow={1} flexDirection="column" marginLeft={1}>
          {selected ? (
            <React.Fragment>
              <Box borderStyle="single" borderColor={theme.border.focus} padding={1} flexDirection="column">
                <Box marginBottom={1}>
                  <Text color={selected.color} bold>
                    {"\u25CF"}
                  </Text>
                  <Text color={theme.text.primary} bold>
                    {" " + selected.name}
                  </Text>
                </Box>

                <Box>
                  <Text color={theme.text.muted}>ID:       </Text>
                  <Text color={theme.text.secondary}>{selected.id}</Text>
                </Box>

                <Box>
                  <Text color={theme.text.muted}>Created:  </Text>
                  <Text color={theme.text.secondary}>{selected.createdAt}</Text>
                </Box>

                <Box>
                  <Text color={theme.text.muted}>Loops:    </Text>
                  <Text color={theme.text.secondary}>
                    {t("project.loopCount", { count: loopCount })}
                  </Text>
                </Box>

                {selected.isSystem && (
                  <Box marginTop={1}>
                    <Text color={theme.semantic.warning}>{t("project.systemLabel")}</Text>
                  </Box>
                )}
              </Box>

              <Box marginTop={1} flexDirection="column">
                {focusMode === "actions" ? (
                  <Box>
                    <Box
                      borderStyle="single"
                      borderColor={theme.accent.focus}
                      backgroundColor={theme.bg.active}
                      paddingX={2}
                    >
                      <Text color={theme.text.inverse} bold>
                        {`${t("project.editProjectLabel")} (${t("project.keyEditHint")})`}
                      </Text>
                    </Box>
                    <Box
                      borderStyle="single"
                      borderColor={theme.semantic.danger}
                      backgroundColor={theme.bg.surface}
                      paddingX={2}
                      marginLeft={1}
                    >
                      <Text color={theme.semantic.danger} bold>
                        {`${t("project.deleteProjectLabel")} (${t("project.keyDeleteHint")})`}
                      </Text>
                    </Box>
                  </Box>
                ) : (
                  <Box flexDirection="column">
                    <Text color={theme.text.muted}>
                      {`${t("project.keyNewHint")} | ${t("project.keyEditHint")} | ${t("project.keyDeleteHint")}`}
                    </Text>
                    <Text color={theme.text.muted}>
                      {`${t("board.hintKeyEnter")} ${t("project.editProjectLabel")}`}
                    </Text>
                  </Box>
                )}
              </Box>
            </React.Fragment>
          ) : (
            <Box paddingX={1}>
              <Text color={theme.text.muted}>{t("project.noLoops")}</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
