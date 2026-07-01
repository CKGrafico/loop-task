import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta, RunRecord, Project } from "../../types.js";
import { darkTheme as theme, tabAccentColor } from "../theme.js";
import type { TabName } from "../types.js";
import { t } from "../../i18n/index.js";
import { Inspector } from "./Inspector.js";
import { RunHistory } from "./RunHistory.js";
import { FocusableButton } from "./FocusableButton.js";

export function RightPanel(props: {
  isFocused: boolean;
  activeTab: TabName;
  loop: LoopMeta | null;
  selectedRunIndex: number;
  onSelectRun: (index: number) => void;
  onOpenRun: (run: RunRecord) => void;
  // Project props
  selectedProject?: Project | null;
  projectLoopCount?: number;
  onProjectEdit?: () => void;
  onProjectDelete?: () => void;
}): React.ReactNode {
  const {
    isFocused,
    activeTab,
    loop,
    selectedRunIndex,
    onSelectRun,
    onOpenRun,
    selectedProject,
    projectLoopCount,
    onProjectEdit,
    onProjectDelete,
  } = props;
  const borderColor = isFocused ? tabAccentColor(activeTab) : theme.border.default;

  return (
    <Box
      flexDirection="column"
      width="40%"
      borderStyle="single"
      borderColor={borderColor}
    >
      {activeTab === "projects" ? (
        <ProjectInspector
          project={selectedProject ?? null}
          loopCount={projectLoopCount ?? 0}
          onEdit={onProjectEdit}
          onDelete={onProjectDelete}
        />
      ) : (
        <>
          <Inspector loop={loop} />
          <RunHistory
            loop={loop}
            selectedRunIndex={selectedRunIndex}
            onSelectRun={onSelectRun}
            onOpenRun={onOpenRun}
            isFocused={isFocused}
          />
        </>
      )}
    </Box>
  );
}

function ProjectInspector(props: {
  project: Project | null;
  loopCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
}): React.ReactNode {
  const { project, loopCount, onEdit, onDelete } = props;

  if (!project) {
    return (
      <Box padding={1} flexGrow={1}>
        <Text color={theme.text.muted}>{t("project.inspectorEmpty")}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1} padding={1}>
      <Box marginBottom={1}>
        <Text color={project.color} bold>
          {"\u25CF"}
        </Text>
        <Text color={theme.text.primary} bold>
          {" " + project.name}
        </Text>
      </Box>

      <Box>
        <Text color={theme.text.muted}>{t("project.fieldId")}</Text>
        <Text color={theme.text.secondary}>{project.id}</Text>
      </Box>

      <Box>
        <Text color={theme.text.muted}>{t("project.fieldLoops")}</Text>
        <Text color={theme.text.secondary}>
          {t("project.loopCount", { count: String(loopCount) })}
        </Text>
      </Box>

      <Box>
        <Text color={theme.text.muted}>{t("project.fieldCreated")}</Text>
        <Text color={theme.text.secondary}>{project.createdAt.slice(0, 10)}</Text>
      </Box>

      {project.isSystem && (
        <Box marginTop={1}>
          <Text color={theme.semantic.warning}>{t("project.systemLabel")}</Text>
        </Box>
      )}

      {!project.isSystem && (
        <Box marginTop={1} flexDirection="row">
          {onEdit && (
            <FocusableButton
              label={`${t("project.editProjectLabel")} (${t("project.keyEditHint")})`}
              color={theme.accent.project}
              onPress={onEdit}
            />
          )}
          {onDelete && (
            <FocusableButton
              label={`${t("project.deleteProjectLabel")} (${t("project.keyDeleteHint")})`}
              color={theme.semantic.danger}
              variant="danger"
              onPress={onDelete}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
