import React from "react";
import { Box } from "ink";
import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";

const delay = (ms = 60): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

import { WizardForm, type WizardStepConfig } from "../src/widgets/loop-form/WizardForm.js";

// Regression test for "Ctrl+S refocuses taskId instead of saving":
//
// After the user picked a task in the TaskPickerModal, pressing Ctrl+S
// (submit) found taskId was "missing" (empty value) and refocused it
// instead of calling onComplete. Root cause: the taskId renderCustom
// is display-only (SelectValueField) and never calls onChange, so
// WizardForm's values.taskId stayed undefined. The submit() missing-field
// check saw an empty taskId → setActiveField(taskId) → refocus loop.
//
// Fix: CreateForm sets defaultValue for taskId to `selectedTaskId ?? initial.taskId`
// so that when a task is picked via the modal, WizardForm's valueFor(taskId)
// returns the task ID via the defaultValue fallback, and submit() no longer
// treats it as missing.

describe("WizardForm Ctrl+S with defaultValue-sourced custom field", () => {
  it("refocuses taskId (bug behavior) when defaultValue is not set and onChange is never called", async () => {
    // This is the negative case that documents the bug: when taskId has
    // NO defaultValue and renderCustom never calls onChange, submit()
    // refocuses taskId instead of calling onComplete. With the fix in
    // CreateForm (defaultValue = selectedTaskId), this never happens 
    // but WizardForm itself has no defaultValue, so the bug is at the
    // CreateForm layer. This test just documents WizardForm's behavior.
    const onComplete = vi.fn();

    const captured: { onChange: (v: string) => void; onAdvance: () => void } = {
      onChange: () => { },
      onAdvance: () => { },
    };

    const steps: WizardStepConfig[] = [
      {
        key: "interval",
        prompt: "Interval?",
        hint: "30m",
        required: true,
        inputType: "text",
        defaultValue: "30m",
      },
      {
        key: "taskMode",
        prompt: "Inline or existing?",
        hint: "choose",
        required: true,
        onActivate: () => { },
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
        skip: (values) => !values.taskMode?.includes("Existing"),
        // NO defaultValue  simulates the bug
        renderCustom: () => null as unknown as React.ReactNode,
      },
      {
        key: "command",
        prompt: "Command?",
        hint: "type",
        required: true,
        inputType: "text",
        skip: (values) => !!values.taskMode?.includes("Existing"),
      },
    ];

    const { stdin } = render(
      <Box height={30} width={80}>
        <WizardForm title="Test" steps={steps} onComplete={onComplete} onCancel={() => { }} />
      </Box>,
    );

    // Tab to taskMode
    stdin.write("\t");
    await delay();

    // Select "Existing task" (same tick onChange + onAdvance)
    captured.onChange("Existing task");
    captured.onAdvance();
    await delay();

    // Now on taskId. Press Ctrl+S.
    stdin.write("\x13"); // Ctrl+S
    await delay();

    // Bug: taskId has no value (no defaultValue, onChange never called) →
    // submit() finds it missing → refocuses taskId → onComplete NOT called.
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("calls onComplete when taskId value comes from defaultValue (the fix)", async () => {
    const onComplete = vi.fn();

    const captured: { onChange: (v: string) => void; onAdvance: () => void } = {
      onChange: () => { },
      onAdvance: () => { },
    };
    const _activeKey = "interval";

    const steps: WizardStepConfig[] = [
      {
        key: "interval",
        prompt: "Interval?",
        hint: "30m",
        required: true,
        inputType: "text",
        defaultValue: "30m",
      },
      {
        key: "taskMode",
        prompt: "Inline or existing?",
        hint: "choose",
        required: true,
        onActivate: () => { },
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
        skip: (values) => !values.taskMode?.includes("Existing"),
        // THE FIX: defaultValue carries the picked task ID
        defaultValue: "abc12345",
        // Display-only renderCustom  does NOT call onChange
        renderCustom: () => null as unknown as React.ReactNode,
      },
      {
        key: "command",
        prompt: "Command?",
        hint: "type",
        required: true,
        inputType: "text",
        skip: (values) => !!values.taskMode?.includes("Existing"),
      },
    ];

    const { stdin, lastFrame: _lastFrame } = render(
      <Box height={30} width={80}>
        <WizardForm title="Test" steps={steps} onComplete={onComplete} onCancel={() => { }} />
      </Box>,
    );

    // Tab to taskMode (field 1)
    stdin.write("\t");
    await delay();

    // Select "Existing task" synchronously (onChange + onAdvance)
    captured.onChange("Existing task");
    captured.onAdvance();
    await delay();

    // Now on taskId (field 2). Press Ctrl+S.
    stdin.write("\x13"); // Ctrl+S
    await delay();

    // Fix: valueFor(taskId) = values.taskId ?? defaultValue = "abc12345"
    // → not missing → onComplete fires.
    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.taskId).toBe("abc12345");
    expect(result.taskMode).toBe("Existing task");
    expect(result.interval).toBe("30m");
    // command is skipped (taskMode is "Existing task")
    expect(result.command).toBeUndefined();
  });
});