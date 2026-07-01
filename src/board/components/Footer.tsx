import { t } from "../../i18n/index.js";
import type { Mode } from "../types.js";
import { ENTITY_COLORS } from "../../config/constants.js";

export function Footer(props: { mode: Mode }): React.ReactNode {
  const { mode } = props;

  const badge: Record<Mode, { label: string; bg: string }> = {
    normal: { label: t("board.badgeNormal"), bg: ENTITY_COLORS.loop },
    search: { label: t("board.badgeSearch"), bg: "#38bdf8" },
    create: { label: t("board.badgeCreate"), bg: ENTITY_COLORS.loop },
    task: { label: t("board.badgeTask"), bg: ENTITY_COLORS.task },
    help: { label: t("board.badgeHelp"), bg: "#facc15" },
    confirm: { label: t("board.badgeConfirm"), bg: "#f87171" },
    projects: { label: t("project.projectsLabel"), bg: ENTITY_COLORS.project },
  };

  const hints: Record<Mode, [string, string][]> = {
    normal: [
      ["←/→", t("board.hintSwitchPanel")],
      ["/", t("board.hintSearch")],
      ["h", t("board.hintHelp")],
      ["esc", t("board.hintQuit")],
    ],
    search: [
      [t("board.hintKeyEnter"), t("board.hintApply")],
      [t("board.hintKeyEsc"), t("board.hintCancel")],
    ],
    create: [
      [t("board.hintKeyTab"), t("board.hintNextField")],
      [t("board.hintKeyEnter"), t("board.hintCreate")],
      [t("board.hintKeyEsc"), t("board.hintCancel")],
    ],
    task: [
      [t("board.hintKeyTab"), t("board.hintNextField")],
      [t("board.hintKeyEnter"), t("board.hintCreate")],
      [t("board.hintKeyEsc"), t("board.hintCancel")],
    ],
    help: [[t("board.hintKeyHelpEsc"), t("board.hintBack")]],
    confirm: [
      [t("board.hintKeyArrows"), t("board.hintChoose")],
      [t("board.hintKeyEnter"), t("board.hintConfirm")],
      [t("board.hintKeyYN"), t("board.hintYesNo")],
      [t("board.hintKeyEsc"), t("board.hintCancel")],
    ],
    projects: [
      ["n", t("project.keyNewHint")],
      ["e", t("project.keyEditHint")],
      ["d", t("project.keyDeleteHint")],
      [t("board.hintKeySlash"), t("project.hintSearch")],
      [t("board.hintKeyEsc"), t("board.hintBack")],
    ],
  };

  const current = badge[mode];

  return (
    <box style={{ flexDirection: "row", height: 1 }}>
      <box style={{ backgroundColor: current.bg, paddingLeft: 1, paddingRight: 1 }}>
        <text fg="#0b0b0b"><strong>{current.label}</strong></text>
      </box>
      <box style={{ flexGrow: 1, paddingLeft: 1, flexDirection: "row" }}>
        <text>
          {hints[mode].map(([k, a], i) => (
            <span key={k}>
              {i > 0 ? <span fg="#374151">  </span> : null}
              <span fg="#38bdf8">{k}</span>
              <span fg="#6b7280">:{a}</span>
            </span>
          ))}
        </text>
      </box>
    </box>
  );
}
