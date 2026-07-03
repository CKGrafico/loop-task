import React, { useState } from "react";
import { Box, Text, useInput, useFocus } from "ink";
import type { Project, LoopMeta } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { FocusableList } from "./FocusableList.js";
import { FocusableButton } from "./FocusableButton.js";
import { Modal } from "./Modal.js";
import { t } from "../../i18n/index.js";
import { deleteProject } from "../daemon.js";

interface ProjectsPageProps {
  projects: Project[];
  loops: LoopMeta[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onOpenCreate: (trigger: (() => void) | null) => void;
  onToast: (msg: string) => void;
  onNavigateCreate?: () => void;
  onNavigateEdit?: (project: Project) => void;
}

type SubModal = "none" | "delete";

function loopCountFor(
  loops: LoopMeta[],
  projectId: string,
  defaultProjectId: string | null,
  knownProjectIds: Set<string>,
): number {
  const direct = loops.filter((l) => l.projectId === projectId).length;
  if (projectId === defaultProjectId) {
    const orphans = loops.filter((l) => !knownProjectIds.has(l.projectId)).length;
    return direct + orphans;
  }
  return direct;
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
  defaultProjectId: string | null;
  knownProjectIds: Set<string>;
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

  const nameWidth = 20;
  const loopsWidth = 12;
  const headerSeparator = " \u00B7 ";

  return (
    <React.Fragment>
      <Box paddingX={1} marginBottom={0}>
        <Text color={theme.text.muted}>
          {" ".concat(t("project.headerName").padEnd(nameWidth))}
        </Text>
        <Text color={theme.text.muted}>
          {headerSeparator}
          {String(t("project.headerLoops")).padEnd(loopsWidth)}
        </Text>
        <Text color={theme.text.muted}>
          {headerSeparator}
          {t("project.headerCreated")}
        </Text>
      </Box>
      <FocusableList
        items={props.projects}
        selectedIndex={props.selectedIndex}
        isFocused={isFocused}
        limit={10}
        onSelect={props.onSelect}
        onActivate={props.onActivate}
        renderItem={(project, isSelected) => {
          const count = loopCountFor(
            props.loops,
            project.id,
            props.defaultProjectId,
            props.knownProjectIds,
          );
          const fg = isSelected ? theme.text.inverse : theme.text.primary;
          const countFg = isSelected ? theme.text.inverse : theme.text.muted;
          return (
            <React.Fragment>
              <Text color={project.color}>{"\u25CF"}</Text>
              <Text color={fg}> {project.name.padEnd(nameWidth - 1)}</Text>
              <Text color={countFg}>
                {headerSeparator}
                {String(count).padEnd(loopsWidth)}
              </Text>
              <Text color={countFg}>
                {headerSeparator}
                {project.createdAt}
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

  const defaultProject = props.projects.find((p) => p.isDefault) ?? null;
  const defaultProjectId = defaultProject?.id ?? null;
  const knownProjectIds = new Set(props.projects.map((p) => p.id));

  const selected = props.projects[selectedIndex];
  const loopCount = selected
    ? loopCountFor(props.loops, selected.id, defaultProjectId, knownProjectIds)
    : 0;

  useInput((input, key) => {
    if (subModal !== "none") return;

    if (key.escape) {
      props.onClose();
      return;
    }

    if (input === "n") {
      if (props.onNavigateCreate) {
        props.onNavigateCreate();
      }
      return;
    }

    if (input === "e" && selected) {
      if (props.onNavigateEdit) {
        props.onNavigateEdit(selected);
      }
      return;
    }

    if (input === "d" && selected) {
      setSubModal("delete");
      return;
    }
  });

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
              defaultProjectId={defaultProjectId}
              knownProjectIds={knownProjectIds}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onActivate={(idx) => {
                setSelectedIndex(idx);
                if (props.onNavigateEdit) {
                  const p = props.projects[idx];
                  if (p) props.onNavigateEdit(p);
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
                      if (props.onNavigateEdit && selected) {
                        props.onNavigateEdit(selected);
                      }
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
