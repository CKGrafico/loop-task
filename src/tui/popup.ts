import blessed from "blessed";
import type { BoardApp } from "./app.js";

export async function chooseOption(
  app: BoardApp,
  title: string,
  message: string,
  options: string[]
): Promise<string | null> {
  return new Promise((resolve) => {
    const box = blessed.box({
      top: "center",
      left: "center",
      width: 60,
      height: 10,
      border: { type: "line" },
      label: ` ${title} `,
      tags: true,
      style: {
        bg: "black",
        border: { fg: "cyan" },
      },
    });

    const text = blessed.box({
      parent: box,
      top: 1,
      left: 1,
      width: "100%-2",
      height: 2,
      content: message,
      tags: true,
    });

    void text;

    const list = blessed.list({
      parent: box,
      top: 4,
      left: 1,
      width: "100%-2",
      height: options.length + 1,
      items: options,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: { bg: "blue", fg: "white" },
        item: { fg: "white" },
      },
    });

    list.select(0);
    app.widgets.screen.append(box);
    list.focus();
    app.widgets.screen.render();

    const close = (value: string | null) => {
      box.destroy();
      app.widgets.screen.render();
      resolve(value);
    };

    list.on("select", (_, index) => {
      close(options[index]);
    });

    box.key(["escape", "q"], () => close(null));
    box.key(["enter"], () => close(options[list.selected] ?? null));
  });
}
