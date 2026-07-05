import React from "react";
import { Box } from "ink";
import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";

const delay = (ms = 60): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

import { WizardForm, type WizardStepConfig } from "../src/tui/components/WizardForm.js";

// Regression test for "Existing task" wizard freeze:
//
// After the user picked "Existing task" in the taskMode SelectModal, the form
// advanced to the WRONG next field (command) and froze up — taskId was
// skipped and command was shown even though it should be hidden when an
// existing task is selected. Tab then jumped to runNow, so the user could
// never actually pick a task.
//
// Root cause: in the SelectModal's onSelect handler, onChange("Existing
// task") + onAdvance() fire synchronously. onChange queues a setValues
// update, but onAdvance -> moveField -> findNextField reads the stale
// resolvedValues (memoized on state that hasn't re-rendered yet). With
// stale taskMode="", taskId's skip returns true and command's skip returns
// false, so findNextField jumps to command.
//
// Fix: WizardForm now maintains a synchronous resolvedValuesRef that is
// updated inside setValue BEFORE setValues is dispatched. findNextField
// reads from the ref, so skip conditions see the new taskMode value
// immediately and taskId is NOT skipped.

describe("WizardForm skip-after-onChange regression", () => {
  it("selecting 'Existing task' then onAdvance lands on taskId, not command", async () => {
    // Callbacks captured from taskMode's renderCustom (only meaningful while
    // taskMode is the active field — renderCustom re-runs each render with
    // fresh onChange/onAdvance closures).
    const captured: {
      onChange: (v: string) => void;
      onAdvance: () => void;
    } = {
      onChange: () => {},
      onAdvance: () => {},
    };

    // Tracks whether taskId's renderCustom was ever called with isActive=true
    // across any render. With the fix, taskId becomes the active field after
    // onChange + onAdvance and this flips to true. Without the fix, command
    // becomes active instead and taskId never becomes active, so this stays false.
    let taskIdWasActive = false;

    const steps: WizardStepConfig[] = [
      {
        key: "interval",
        prompt: "Interval?",
        hint: "type",
        required: true,
        inputType: "text",
        defaultValue: "30m",
      },
      {
        key: "taskMode",
        prompt: "Inline or existing task?",
        hint: "choose",
        required: true,
        // A real select field opens a modal on Enter — we just need onActivate to
        // be present so the step's interaction shape matches the real one.
        onActivate: () => {},
        renderCustom: ({ isActive, onChange, onAdvance }) => {
          if (isActive) {
            captured.onChange = onChange;
            captured.onAdvance = onAdvance;
          }
          return null as unknown as React.ReactNode;
        },
      },
      {
        key: "taskId",
        prompt: "Choose task",
        hint: "pick",
        required: true,
        // Mirrors CreateForm.tsx: skipped when taskMode is NOT "Existing".
        skip: (values) => !values.taskMode?.includes("Existing"),
        renderCustom: ({ isActive }) => {
          if (isActive) taskIdWasActive = true;
          return null as unknown as React.ReactNode;
        },
      },
      {
        key: "command",
        prompt: "Command?",
        hint: "type",
        required: true,
        inputType: "text",
        // Mirrors CreateForm.tsx: skipped when taskMode IS "Existing".
        skip: (values) => !!values.taskMode?.includes("Existing"),
      },
    ];

    const onComplete = () => {
      // Should not fire — we never saved (no Ctrl+S in this test).
    };

    const { stdin, lastFrame } = render(
      <Box height={30} width={80}>
        <WizardForm
          title="Test"
          steps={steps}
          onComplete={onComplete}
          onCancel={() => {}}
        />
      </Box>,
    );

    // Field 0 (interval) is active initially. Tab to advance to taskMode.
    stdin.write("\t");
    await delay();

    // taskMode should now be active — renderCustom populated the callbacks.
    // Simulate the SelectModal onSelect handler: onChange + onAdvance in the
    // same synchronous tick (exactly what CreateForm does).
    captured.onChange("Existing task");
    captured.onAdvance();
    await delay();

    // Bug regression: with the stale-state bug, findNextField used the old
    // resolvedValues (taskMode="") → taskId was skipped (skip returned
    // !"".includes("Existing") = true) → focus landed on command (index 3).
    // taskId never became active → taskIdWasActive stayed false.
    //
    // Fix: findNextField reads resolvedValuesRef which is updated
    // synchronously in setValue, so the new taskMode="Existing task" is
    // visible immediately → taskId is NOT skipped → focus lands on taskId
    // (index 2) → taskId becomes active → taskIdWasActive flips to true.
    expect(taskIdWasActive).toBe(true);

    // Belt-and-suspenders: the rendered frame should show the taskId prompt
    // (the active step's prompt is always rendered).
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Choose task");
    // command should be skipped (taskMode="Existing task"), so its prompt
    // should NOT be rendered. This holds regardless of the fix because the
    // render loop uses state-based resolvedValues which ARE updated by now.
    expect(frame).not.toContain("Command?");
  });
});