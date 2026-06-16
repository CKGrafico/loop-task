import { t } from "../../i18n/index.js";
import type { Mode } from "../types.js";

export function Footer(props: { mode: Mode }): React.ReactNode {
  const { mode } = props;

  const badge: Record<Mode, { label: string; bg: string }> = {
    normal: { label: t("board.badgeNormal"), bg: "#4ade80" },
    search: { label: t("board.badgeSearch"), bg: "#38bdf8" },
    create: { label: t("board.badgeCreate"), bg: "#a3e635" },
    help: { label: t("board.badgeHelp"), bg: "#facc15" },
    confirm: { label: t("board.badgeConfirm"), bg: "#f87171" },
  };

  const hints: Record<Mode, [string, string][]> = {
    normal: [
      ["←/→", t("board.hintSwitchPanel")],
      [t("board.hintKeyEnter"), t("board.hintOpenRun")],
      [t("board.hintKeySlash"), t("board.hintSearch")],
      [t("board.hintKeyH"), t("board.hintHelp")],
      [t("board.hintKeyEsc"), t("board.hintQuit")],
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
    help: [[t("board.hintKeyHelpEsc"), t("board.hintBack")]],
    confirm: [
      [t("board.hintKeyArrows"), t("board.hintChoose")],
      [t("board.hintKeyEnter"), t("board.hintConfirm")],
      [t("board.hintKeyYN"), t("board.hintYesNo")],
      [t("board.hintKeyEsc"), t("board.hintCancel")],
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
