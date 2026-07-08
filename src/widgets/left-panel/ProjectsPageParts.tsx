import React from "react";
import { Box, Text, useFocus } from "ink";
import type { LoopMeta } from "../../types.js";
import { darkTheme as theme } from "../../shared/ui/theme.js";
import { FocusableList } from "../../shared/ui/FocusableList.js";
import { FocusableButton } from "../../shared/ui/FocusableButton.js";
import { Modal } from "../../shared/ui/Modal.js";
import { t } from "../../shared/i18n/index.js";
import type { Project } from "../../types.js";

export function loopCountFor(
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

export function DeleteConfirm(props: {
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

export function ListFocusWrapper(props: {
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
