import React from "react";
import { Box } from "ink";
import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";

const delay = (ms = 60): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function typeChars(
  stdin: { write: (data: string) => void },
  text: string,
): Promise<void> {
  for (const ch of text) {
    stdin.write(ch);
    await delay(20);
  }
}

import { TabBar, tabColor } from "../src/tui/components/TabBar.js";
import { Button } from "../src/tui/components/Button.js";
import { DebugPanel, type DebugEntry } from "../src/tui/components/DebugPanel.js";
import { ToastStack, type Toast } from "../src/tui/components/Toast.js";
import { Modal } from "../src/tui/components/Modal.js";
import { Header } from "../src/tui/components/Header.js";
import { WizardForm, type WizardStepConfig } from "../src/tui/components/WizardForm.js";
import { CommandInput, sanitizePaste } from "../src/tui/components/CommandInput.js";
import type { CommandContext, ConfirmState } from "../src/tui/types.js";
import { darkTheme as theme } from "../src/tui/theme.js";

describe("TabBar", () => {
  it("renders all three tab labels", () => {
    const { lastFrame } = render(
      <TabBar activeTab="loops" onTabChange={() => {}} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Loops");
    expect(frame).toContain("Tasks");
    expect(frame).toContain("Projects");
  });

  it("tabColor maps each tab to its accent color", () => {
    expect(tabColor("loops")).toBe(theme.accent.loop);
    expect(tabColor("tasks")).toBe(theme.accent.task);
    expect(tabColor("projects")).toBe(theme.accent.project);
  });
});

describe("Button", () => {
  it("renders its label", () => {
    const { lastFrame } = render(<Button label="Save" focused={false} />);
    expect(lastFrame()).toContain("Save");
  });

  it("renders focused state without throwing", () => {
    const { lastFrame } = render(
      <Button label="Delete" focused variant="danger" />,
    );
    expect(lastFrame()).toContain("Delete");
  });
});

describe("DebugPanel", () => {
  it("shows placeholder when there are no entries", () => {
    const { lastFrame } = render(<DebugPanel entries={[]} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("DEBUG");
    expect(frame).toContain("press keys...");
  });

  it("renders codes and flags for an entry", () => {
    const entry: DebugEntry = {
      id: 1,
      input: "\r",
      len: 1,
      ctrl: false,
      return: true,
      shift: false,
      meta: false,
      tab: false,
      upArrow: false,
      downArrow: false,
      leftArrow: false,
      rightArrow: false,
      escape: false,
      codes: "13",
    };
    const { lastFrame } = render(<DebugPanel entries={[entry]} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("codes=[13]");
    expect(frame).toContain("r=1");
  });
});

describe("ToastStack", () => {
  it("renders nothing when there are no toasts", () => {
    const { lastFrame } = render(<ToastStack toasts={[]} />);
    expect(lastFrame()).toBe("");
  });

  it("renders toast messages", () => {
    const toasts: Toast[] = [
      { id: 1, kind: "success", message: "Saved loop" },
      { id: 2, kind: "error", message: "Failed run" },
    ];
    const { lastFrame } = render(
      <Box height={6} width={40}>
        <ToastStack toasts={toasts} />
      </Box>,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Saved loop");
    expect(frame).toContain("Failed run");
  });
});

describe("Modal", () => {
  it("renders title and children", () => {
    const { lastFrame } = render(
      <Box height={10} width={40}>
        <Modal title="Help" onClose={() => {}}>
          <></>
        </Modal>
      </Box>,
    );
    expect(lastFrame()).toContain("Help");
  });

  it("calls onClose when escape is pressed", async () => {
    const onClose = vi.fn();
    const { stdin } = render(
      <Box height={10} width={40}>
        <Modal title="Help" onClose={onClose}>
          <></>
        </Modal>
      </Box>,
    );
    stdin.write("\u001B");
    await delay();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Header", () => {
  it("renders daemon status and counts", () => {
    const { lastFrame } = render(
      <Header
        daemonStatus="connected"
        counts={{ total: 5, running: 1, waiting: 2, paused: 1, idle: 1 }}
        activeTab="loops"
        onTabChange={() => {}}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("connected");
    expect(frame).toContain("Loops");
  });

  it("renders offline label for error status", () => {
    const { lastFrame } = render(
      <Header
        daemonStatus="error"
        counts={{ total: 0, running: 0, waiting: 0, paused: 0, idle: 0 }}
        activeTab="tasks"
        onTabChange={() => {}}
      />,
    );
    expect(lastFrame()).toContain("offline");
  });
});

describe("WizardForm", () => {
  const steps: WizardStepConfig[] = [
    {
      key: "interval",
      prompt: "How often?",
      hint: "e.g. 30s",
      required: true,
      inputType: "text",
    },
    {
      key: "mode",
      prompt: "Mode?",
      hint: "",
      required: false,
      inputType: "select",
      suggestions: ["inline", "existing"],
      defaultValue: "inline",
    },
  ];

  it("renders title and prompts", () => {
    const { lastFrame } = render(
      <WizardForm
        title="New loop"
        steps={steps}
        onComplete={() => {}}
        onCancel={() => {}}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("New loop");
    expect(frame).toContain("How often?");
    expect(frame).toContain("Mode?");
  });

  it("types into the active text field", async () => {
    const { stdin, lastFrame } = render(
      <WizardForm
        title="New loop"
        steps={steps}
        onComplete={() => {}}
        onCancel={() => {}}
      />,
    );
    await typeChars(stdin, "45m");
    expect(lastFrame()).toContain("45m");
  });

  it("calls onCancel when escape is pressed", async () => {
    const onCancel = vi.fn();
    const { stdin } = render(
      <WizardForm
        title="New loop"
        steps={steps}
        onComplete={() => {}}
        onCancel={onCancel}
      />,
    );
    stdin.write("\u001B");
    await delay();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("blocks submit while a required field is empty", async () => {
    const onComplete = vi.fn();
    const { stdin } = render(
      <WizardForm
        title="New loop"
        steps={steps}
        onComplete={onComplete}
        onCancel={() => {}}
      />,
    );
    stdin.write("\u0013"); // ctrl+s
    await delay();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("submits collected values once required fields are filled", async () => {
    const onComplete = vi.fn();
    const { stdin } = render(
      <WizardForm
        title="New loop"
        steps={steps}
        onComplete={onComplete}
        onCancel={() => {}}
      />,
    );
    await typeChars(stdin, "30s");
    stdin.write("\u0013"); // ctrl+s
    await delay();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ interval: "30s", mode: "inline" });
  });
});

describe("CommandInput", () => {
  const baseContext: CommandContext = {
    activeTab: "loops",
    selectedLoop: null,
    selectedTask: null,
    selectedProject: null,
  };

  it("renders command placeholder when not in confirm or search mode", () => {
    const { lastFrame } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={null}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={() => {}}
        />
      </Box>,
    );
    expect(lastFrame()).toContain("Start typing");
  });

  it("renders confirm prompt and yes/cancel options", () => {
    const confirm: ConfirmState = {
      prompt: 'Delete "test"?',
      onConfirm: () => {},
    };
    const { lastFrame } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={confirm}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={() => {}}
        />
      </Box>,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain('Delete "test"?');
    expect(frame).toContain("yes");
    expect(frame).toContain("cancel");
  });

  it("calls onConfirmYes when Enter is pressed in confirm mode", async () => {
    const confirm: ConfirmState = {
      prompt: "Are you sure?",
      onConfirm: () => {},
    };
    const onConfirmYes = vi.fn();
    const { stdin } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={confirm}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={onConfirmYes}
          onConfirmCancel={() => {}}
        />
      </Box>,
    );
    stdin.write("\r");
    await delay();
    expect(onConfirmYes).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirmCancel when Escape is pressed in confirm mode", async () => {
    const confirm: ConfirmState = {
      prompt: "Are you sure?",
      onConfirm: () => {},
    };
    const onConfirmCancel = vi.fn();
    const { stdin } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={confirm}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={onConfirmCancel}
        />
      </Box>,
    );
    stdin.write("\u001B");
    await delay();
    expect(onConfirmCancel).toHaveBeenCalledTimes(1);
  });

  it("does not respond to keys when disabled=true (regression: confirm must not be disabled by other modals)", async () => {
    const confirm: ConfirmState = {
      prompt: "Stop loop?",
      onConfirm: () => {},
    };
    const onConfirmCancel = vi.fn();
    const { stdin } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={confirm}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={onConfirmCancel}
          disabled
        />
      </Box>,
    );
    // When disabled=true, the confirm input is inactive (isActive:false).
    // This documents the regression we fixed: App.tsx no longer passes disabled=true
    // while confirmState is set, so this path should never trigger in production.
    stdin.write("\u001B");
    await delay();
    expect(onConfirmCancel).not.toHaveBeenCalled();
  });

  it("Enter on an empty command bar triggers onPanelAction", async () => {
    const onPanelAction = vi.fn();
    const { stdin } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={null}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={() => {}}
          onPanelAction={onPanelAction}
        />
      </Box>,
    );
    stdin.write("\r");
    await delay();
    expect(onPanelAction).toHaveBeenCalledTimes(1);
  });

  it("Enter does NOT trigger onPanelAction once text has been typed", async () => {
    const onPanelAction = vi.fn();
    const { stdin } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={null}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={() => {}}
          onPanelAction={onPanelAction}
        />
      </Box>,
    );
    await typeChars(stdin, "zzzz"); // no command matches; dropdown not actionable
    stdin.write("\r");
    await delay();
    expect(onPanelAction).not.toHaveBeenCalled();
  });

  it("inserts a multi-character paste into the command bar", async () => {
    const { stdin, lastFrame } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={null}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={() => {}}
        />
      </Box>,
    );
    stdin.write("npm test"); // arrives as one multi-char chunk (a paste)
    await delay();
    expect(lastFrame()).toContain("npm test");
  });

  it("Ctrl+U clears the command bar", async () => {
    const { stdin, lastFrame } = render(
      <Box height={10} width={60}>
        <CommandInput
          context={baseContext}
          onCommand={() => {}}
          confirmState={null}
          searchState={null}
          searchValue=""
          onSearchChange={() => {}}
          onSearchSubmit={() => {}}
          onSearchCancel={() => {}}
          onConfirmYes={() => {}}
          onConfirmCancel={() => {}}
        />
      </Box>,
    );
    stdin.write("hello world");
    await delay();
    expect(lastFrame()).toContain("hello world");
    stdin.write("\x15"); // Ctrl+U (NAK)
    await delay();
    expect(lastFrame()).not.toContain("hello world");
  });
});

describe("sanitizePaste", () => {
  it("strips bracketed-paste markers", () => {
    expect(sanitizePaste("\x1b[200~npm test\x1b[201~")).toBe("npm test");
  });

  it("collapses newlines to single spaces", () => {
    expect(sanitizePaste("line1\r\nline2\nline3")).toBe("line1 line2 line3");
  });

  it("drops control characters", () => {
    expect(sanitizePaste("a\x00b\x07c")).toBe("abc");
  });

  it("caps very long pastes", () => {
    const huge = "x".repeat(10000);
    expect(sanitizePaste(huge).length).toBe(4096);
  });
});
