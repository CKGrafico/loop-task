import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { Container } from "inversify";
import { TYPES } from "../src/shared/services/types.js";
import type { LoopService, TaskService, ProjectService, LogService, ExportService } from "../src/shared/services/types.js";
import { InversifyContext } from "../src/shared/providers/InversifyProvider.js";
import { useInject } from "../src/shared/hooks/useInject.js";
import { Text } from "ink";

function createMockContainer(): Container {
  const container = new Container();
  container.bind<LoopService>(TYPES.LoopService).toConstantValue({
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue("mock-loop-id"),
    update: vi.fn().mockResolvedValue("mock-loop-id"),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    trigger: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  });
  container.bind<TaskService>(TYPES.TaskService).toConstantValue({
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: "task-1" }),
    update: vi.fn().mockResolvedValue({ id: "task-1" }),
    delete: vi.fn().mockResolvedValue(undefined),
  });
  container.bind<ProjectService>(TYPES.ProjectService).toConstantValue({
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: "proj-1" }),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  });
  container.bind<LogService>(TYPES.LogService).toConstantValue({
    fetchRunLog: vi.fn().mockResolvedValue("mock log content"),
    streamRunLog: vi.fn().mockReturnValue({ destroy: vi.fn() }),
    streamLogs: vi.fn().mockReturnValue({ destroy: vi.fn() }),
  });
  container.bind<ExportService>(TYPES.ExportService).toConstantValue({
    exportConfig: vi.fn().mockResolvedValue({ json: "{}", filePath: "/tmp/export.json" }),
  });
  return container;
}

function TestConsumer(): React.ReactNode {
  const loopService = useInject<LoopService>(TYPES.LoopService);
  const [result, setResult] = React.useState<string>("pending");

  React.useEffect(() => {
    loopService.list()
      .then(() => setResult("loaded"))
      .catch(() => setResult("error"));
  }, [loopService]);

  return React.createElement(Text, null, result);
}

describe("DI container with mock services", () => {
  it("useInject resolves a mock LoopService from the container", async () => {
    const mockContainer = createMockContainer();

    const { lastFrame } = render(
      React.createElement(
        InversifyContext.Provider,
        { value: { container: mockContainer } },
        React.createElement(TestConsumer),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(lastFrame()).toContain("loaded");
  });

  it("mock LoopService.list is called when component uses useInject", async () => {
    const mockContainer = createMockContainer();
    const loopService = mockContainer.get<LoopService>(TYPES.LoopService);

    render(
      React.createElement(
        InversifyContext.Provider,
        { value: { container: mockContainer } },
        React.createElement(TestConsumer),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(loopService.list).toHaveBeenCalledTimes(1);
  });

  it("mock task service create is callable via container binding", async () => {
    const mockContainer = createMockContainer();
    const taskService = mockContainer.get<TaskService>(TYPES.TaskService);

    const result = await taskService.create({
      id: "test-id",
      name: "Test Task",
      command: "echo",
      commandArgs: ["hello"],
      onSuccessTaskId: null,
      onFailureTaskId: null,
    });

    expect(taskService.create).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("task-1");
  });
});
