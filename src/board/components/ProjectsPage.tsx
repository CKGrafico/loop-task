import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { LoopMeta, Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { CreateProjectModal } from "./CreateProjectModal.js";
import { EditProjectModal } from "./EditProjectModal.js";
import { DeleteProjectConfirm } from "./DeleteProjectConfirm.js";

type SubModal = "none" | "create" | "edit" | "delete";

export function ProjectsPage(props: {
  projects: Project[];
  loops: LoopMeta[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
}): React.ReactNode {
  const { projects, loops, onClose, onRefresh } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subModal, setSubModal] = useState<SubModal>("none");

  const clampedIndex = Math.min(selectedIndex, Math.max(0, projects.length - 1));
  const selectedProject = projects[clampedIndex] ?? null;

  useKeyboard((key) => {
    if (subModal !== "none") return;
    if (key.name === "up") {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.name === "down") {
      setSelectedIndex((i) => Math.min(projects.length - 1, i + 1));
      return;
    }
    if (key.name === "n") {
      setSubModal("create");
      return;
    }
    if (key.name === "e" && selectedProject && !selectedProject.isSystem) {
      setSubModal("edit");
      return;
    }
    if (key.name === "d" && selectedProject && !selectedProject.isSystem) {
      setSubModal("delete");
      return;
    }
    if (key.name === "escape") {
      onClose();
    }
  });

  const loopCount = (projectId: string) =>
    loops.filter((l) => (l.projectId ?? "default") === projectId).length;

  return (
    <box
      title={t("project.projectsTitle")}
      border
      style={{ flexDirection: "row", flexGrow: 1, backgroundColor: "#0b0b0b" }}
    >
      <box
        border
        style={{ width: "40%", flexDirection: "column", backgroundColor: "#0b0b0b", flexShrink: 0 }}
      >
        <text fg="#9ca3af">{t("project.keyNewHint")} | {t("project.keyEditHint")} | {t("project.keyDeleteHint")}</text>
        {projects.map((project, index) => {
          const isSelected = index === clampedIndex;
          const bg = isSelected ? "#1e3a8a" : undefined;
          const count = loopCount(project.id);
          return (
            <box
              key={project.id}
              backgroundColor={bg}
              onMouseDown={() => setSelectedIndex(index)}
              style={{ height: 1 }}
            >
              <text>
                {isSelected ? "› " : "  "}
                <span fg={project.color}>●</span>
                {` ${project.name} `}
                <span fg="#6b7280">{`(${count})`}</span>
              </text>
            </box>
          );
        })}
      </box>

      <box
        border
        style={{ flexGrow: 1, flexDirection: "column", backgroundColor: "#0b0b0b", padding: 1 }}
      >
        {selectedProject ? (
          <>
            <text>
              <span fg={selectedProject.color}>●</span>
              {` `}
              <strong>{selectedProject.name}</strong>
            </text>
            <text fg="#6b7280">{t("project.loopCount", { count: String(loopCount(selectedProject.id)) })}</text>
            {selectedProject.isSystem ? (
              <text fg="#9ca3af">{t("project.systemLabel")}</text>
            ) : (
              <box style={{ flexDirection: "row", marginTop: 1 }}>
                <box
                  border
                  onMouseDown={() => setSubModal("edit")}
                  style={{ paddingLeft: 1, paddingRight: 1, marginRight: 1, backgroundColor: "#1e2a4a" }}
                >
                  <text fg="#e5e7eb"><strong>Edit</strong></text>
                </box>
                <box
                  border
                  onMouseDown={() => setSubModal("delete")}
                  style={{ paddingLeft: 1, paddingRight: 1, backgroundColor: "#3b0f0f" }}
                >
                  <text fg="#f87171"><strong>Delete</strong></text>
                </box>
              </box>
            )}
          </>
        ) : (
          <text fg="#9ca3af">No project selected</text>
        )}
      </box>

      {subModal === "create" ? (
        <CreateProjectModal
          onDone={async (project) => {
            setSubModal("none");
            await onRefresh();
            const newIndex = projects.findIndex((p) => p.id === project.id);
            if (newIndex >= 0) setSelectedIndex(newIndex);
          }}
          onCancel={() => setSubModal("none")}
        />
      ) : null}

      {subModal === "edit" && selectedProject ? (
        <EditProjectModal
          project={selectedProject}
          onDone={async () => {
            setSubModal("none");
            await onRefresh();
          }}
          onCancel={() => setSubModal("none")}
        />
      ) : null}

      {subModal === "delete" && selectedProject ? (
        <DeleteProjectConfirm
          project={selectedProject}
          loopCount={loopCount(selectedProject.id)}
          onDone={async () => {
            setSubModal("none");
            setSelectedIndex((i) => Math.max(0, i - 1));
            await onRefresh();
          }}
          onCancel={() => setSubModal("none")}
        />
      ) : null}
    </box>
  );
}
