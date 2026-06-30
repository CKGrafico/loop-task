import React, { useState } from "react";
import { Box, Text, useInput, useFocus } from "ink";
import type { Project, LoopMeta } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { FocusableInput } from "./FocusableInput.js";
import { FocusableList } from "./FocusableList.js";
import { FocusableButton } from "./FocusableButton.js";
import { Modal } from "./Modal.js";
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

function ColorCyclerButton(props: {
  direction: "left" | "right";
  selected: string;
  onSelect: (color: string) => void;
}): React.ReactNode {
  const { isFocused } = useFocus();

  useInput(
    (input, key) => {
      if (key.return || input === " ") {
        const idx = Math.max(0, PROJECT_COLOR_KEYS.indexOf(props.selected as typeof PROJECT_COLOR_KEYS[number]));
        const len = PROJECT_COLOR_KEYS.length;
        const nextIdx = props.direction === "left"
          ? (idx - 1 + len) % len
          : (idx + 1) % len;
        const nextKey = PROJECT_COLOR_KEYS[nextIdx];
        props.onSelect(PROJECT_COLORS[nextKey]);
      }
    },
    { isActive: isFocused },
  );

  const label = props.direction === "left" ? "\u2039" : "\u203a";
  const borderColor = isFocused ? theme.accent.brand : theme.border.dim;
  const backgroundColor = isFocused ? theme.bg.active : theme.bg.surface;

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      paddingX={1}
      marginRight={1}
    >
      <Text color={isFocused ? theme.text.inverse : theme.text.primary} bold>
        {label}
      </Text>
    </Box>
  );
}

function ColorPickerRow(props: {
  selected: string;
  onSelect: (color: string) => void;
}): React.ReactNode {
  const selectedKey = (() => {
    const idx = PROJECT_COLOR_KEYS.findIndex(
      (k) => PROJECT_COLORS[k] === props.selected,
    );
    return idx >= 0 ? PROJECT_COLOR_KEYS[idx] : "white";
  })();

  const color = PROJECT_COLORS[selectedKey as typeof PROJECT_COLOR_KEYS[number]];

  return (
    <Box flexDirection="row" alignItems="center">
      <ColorCyclerButton
        direction="left"
        selected={props.selected}
        onSelect={props.onSelect}
      />
      <Box marginRight={1}>
        <Box
          borderStyle="single"
          borderColor={theme.accent.brand}
          backgroundColor={color}
          paddingX={1}
        >
          <Text color={theme.text.inverse} bold>{selectedKey}</Text>
        </Box>
      </Box>
      <ColorCyclerButton
        direction="right"
        selected={props.selected}
        onSelect={props.onSelect}
      />
    </Box>
  );
}

function LabeledField(props: {
  label: string;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <Box marginBottom={1} flexDirection="column">
      <Text color={theme.text.secondary}>{props.label}</Text>
      <Box marginTop={1}>{props.children}</Box>
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
    <Modal title={t("project.createTitle")} onClose={props.onCancel} width={50}>
      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.text.secondary}>{t("project.labelName")}</Text>
        <Box marginTop={1}>
          <FocusableInput
            value={props.name}
            onChange={props.onNameChange}
            placeholder={t("project.hintName")}
          />
        </Box>
      </Box>

      <LabeledField label={t("project.labelColor")}>
        <ColorPickerRow selected={props.color} onSelect={props.onColorChange} />
      </LabeledField>

      <Box marginTop={1}>
        <FocusableButton
          label={props.saving ? t("board.saving") : t("board.create")}
          color={theme.accent.project}
          onPress={props.onSave}
        />
        <FocusableButton
          label={t("board.cancel")}
          color={theme.text.secondary}
          onPress={props.onCancel}
        />
      </Box>
    </Modal>
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
    <Modal title={t("project.editTitle")} onClose={props.onCancel} width={50}>
      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.text.secondary}>{t("project.labelName")}</Text>
        <Box marginTop={1}>
          <FocusableInput
            value={props.name}
            onChange={props.onNameChange}
            placeholder={t("project.hintName")}
          />
        </Box>
      </Box>

      <LabeledField label={t("project.labelColor")}>
        <ColorPickerRow selected={props.color} onSelect={props.onColorChange} />
      </LabeledField>

      <Box marginTop={1}>
        <FocusableButton
          label={props.saving ? t("board.saving") : t("board.save")}
          color={theme.accent.project}
          onPress={props.onSave}
        />
        <FocusableButton
          label={t("board.cancel")}
          color={theme.text.secondary}
          onPress={props.onCancel}
        />
      </Box>
    </Modal>
  );
}

function DeleteConfirm(props: {
  project: Project;
  loopCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactNode {
  return (
    <Modal title={t("project.deleteTitle")} onClose={props.onCancel} width={50}>
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

      <Box marginTop={1}>
        <FocusableButton
          label={t("board.yes")}
          color={theme.semantic.danger}
          onPress={props.onConfirm}
          variant="danger"
        />
        <FocusableButton
          label={t("board.no")}
          color={theme.text.secondary}
          onPress={props.onCancel}
        />
      </Box>
    </Modal>
  );
}

function ListFocusWrapper(props: {
  projects: Project[];
  loops: LoopMeta[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
  children: React.ReactNode;
}): React.ReactNode {
  const { isFocused } = useFocus();

  if (props.projects.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color={theme.text.muted}>{t("project.noLoops")}</Text>
      </Box>
    );
  }

  return (
    <React.Fragment>
      <FocusableList
        items={props.projects}
        selectedIndex={props.selectedIndex}
        isFocused={isFocused}
        limit={10}
        onSelect={props.onSelect}
        onActivate={props.onActivate}
        renderItem={(project, isSelected) => {
          const count = loopCountFor(props.loops, project.id);
          const fg = isSelected ? theme.text.inverse : theme.text.primary;
          const countFg = isSelected ? theme.text.inverse : theme.text.muted;
          return (
            <React.Fragment>
              <Text color={project.color}>{"\u25CF"}</Text>
              <Text color={fg}> {project.name.padEnd(20)}</Text>
              <Text color={countFg}>
                {t("project.loopCount", { count })}
              </Text>
            </React.Fragment>
          );
        }}
      />
      {props.children}
    </React.Fragment>
  );
}

export function ProjectsPage(props: ProjectsPageProps): React.ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subModal, setSubModal] = useState<SubModal>("none");
  const [projectName, setProjectName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS.white);
  const [saving, setSaving] = useState(false);

  const selected = props.projects[selectedIndex];
  const loopCount = selected ? loopCountFor(props.loops, selected.id) : 0;

  useInput((input, key) => {
    if (subModal !== "none") return;

    if (key.escape) {
      props.onClose();
      return;
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
            <ListFocusWrapper
              projects={props.projects}
              loops={props.loops}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onActivate={(idx) => {
                setSelectedIndex(idx);
                setSubModal("edit");
                const p = props.projects[idx];
                if (p) {
                  setProjectName(p.name);
                  setSelectedColor(p.color);
                }
              }}
            >
              {null}
            </ListFocusWrapper>
          )}
        </Box>

        <Box flexGrow={1} flexDirection="column" marginLeft={1}>
          {selected ? (
            <React.Fragment>
              <Box borderStyle="single" borderColor={theme.accent.brand} padding={1} flexDirection="column">
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
                <Box marginTop={1} flexDirection="row">
                  <FocusableButton
                    label={`${t("project.editProjectLabel")} (${t("project.keyEditHint")})`}
                    color={theme.accent.brand}
                    onPress={() => {
                      setSubModal("edit");
                      setProjectName(selected.name);
                      setSelectedColor(selected.color);
                    }}
                  />
                  <FocusableButton
                    label={`${t("project.deleteProjectLabel")} (${t("project.keyDeleteHint")})`}
                    color={theme.semantic.danger}
                    variant="danger"
                    onPress={() => setSubModal("delete")}
                  />
                </Box>
                <Box marginTop={1}>
                  <Text color={theme.text.muted}>
                    {`${t("project.keyNewHint")} | ${t("project.keyEditHint")} | ${t("project.keyDeleteHint")}`}
                  </Text>
                </Box>
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
