import { useTerminalDimensions } from "@opentui/react";
import { t } from "../../i18n/index.js";

export function ContextHelpModal(props: { onClose: () => void }): React.ReactNode {
  const { onClose } = props;
  const { width } = useTerminalDimensions();

  return (
    <box
      onMouseDown={onClose}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 90,
      }}
    >
      <box
        title={t("context.helpTitle")}
        border
        style={{
          flexDirection: "column",
          padding: 1,
          minWidth: Math.min(72, width - 4),
          backgroundColor: "#111827",
        }}
      >
        <text wrap fg="#e5e7eb">{t("context.helpRules")}</text>
        <text> </text>
        <text wrap fg="#38bdf8">{"{{key}} Templates"}</text>
        <text wrap fg="#e5e7eb">{t("context.helpTemplates")}</text>
        <text> </text>
        <text wrap fg="#f59e0b">{"Caveat"}</text>
        <text wrap fg="#e5e7eb">{t("context.helpCaveat")}</text>
        <text> </text>
        <text wrap fg="#34d399">{"jq Tip"}</text>
        <text wrap fg="#e5e7eb">{t("context.helpJqTip")}</text>
        <text> </text>
        <text fg="#9ca3af">{"Press any key or click to close"}</text>
      </box>
    </box>
  );
}
