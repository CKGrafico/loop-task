import { CODE_EDITOR_MAX_VISIBLE } from "../../config/constants.js";
import { t } from "../../i18n/index.js";

interface CodeEditorPreviewProps {
  value: string;
  hint: string;
  focused: boolean;
  onActivate: () => void;
}

export function CodeEditorPreview(props: CodeEditorPreviewProps): React.ReactNode {
  const { value, hint, focused, onActivate } = props;

  const lines = value.split("\n");
  const truncated = lines.length > CODE_EDITOR_MAX_VISIBLE;
  const visibleLines = lines.slice(0, CODE_EDITOR_MAX_VISIBLE);
  const empty = value.length === 0;

  const contentLines = empty ? 1 : visibleLines.length + (truncated ? 1 : 0);
  const boxHeight = contentLines + 2;

  return (
    <box
      border
      borderColor={focused ? "#38bdf8" : undefined}
      style={{
        height: boxHeight,
        flexGrow: 1,
        backgroundColor: "#0b0b0b",
        flexDirection: "column",
        paddingLeft: 1,
      }}
      onMouseDown={onActivate}
    >
      {empty ? (
        <text fg="#6b7280">{hint || t("codeEditor.emptyPlaceholder")}</text>
      ) : (
        <>
          {visibleLines.map((line, i) => (
            <text key={i} fg="#e5e7eb">{line}</text>
          ))}
          {truncated ? (
            <text fg="#9ca3af">{t("codeEditor.previewTruncated")}</text>
          ) : null}
        </>
      )}
    </box>
  );
}
