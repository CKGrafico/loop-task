import { t } from "../../i18n/index.js";

export function Timeline(props: { logLines: string[] }): React.ReactNode {
  return (
    <scrollbox title={t("board.timelineTitle")} border style={{ flexGrow: 1, backgroundColor: "#0b0b0b" }} stickyScroll stickyStart="bottom">
      {props.logLines.length === 0 ? (
        <text fg="#9ca3af">{t("board.timelineEmpty")}</text>
      ) : (
        props.logLines.map((line, index) => <text key={index}>{line}</text>)
      )}
    </scrollbox>
  );
}
