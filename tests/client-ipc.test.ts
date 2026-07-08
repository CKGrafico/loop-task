import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IpcRequest, IpcResponse } from "../src/types.js";

vi.mock("../src/daemon/spawner/index.js", () => ({
  ensureDaemon: vi.fn(),
  getSocket: vi.fn().mockReturnValue("/tmp/test-loop-cli.sock"),
}));

const { mockCreateConnection } = vi.hoisted(() => ({
  mockCreateConnection: vi.fn(),
}));

vi.mock("node:net", () => {
  return {
    default: {
      createConnection: mockCreateConnection,
    },
    createConnection: mockCreateConnection,
  };
});

import { ensureDaemon, getSocket } from "../src/daemon/spawner/index.js";
import { sendRequest, streamRequest } from "../src/client/ipc.js";

function createMockSocket() {
  const listeners: Record<string, Function[]> = {};
  return {
    on: vi.fn((event: string, cb: Function) => {
      (listeners[event] ??= []).push(cb);
    }),
    write: vi.fn(),
    destroy: vi.fn(),
    setTimeout: vi.fn(),
    emit: (event: string, ...args: unknown[]) => {
      (listeners[event] ?? []).forEach((cb) => cb(...args));
    },
  };
}

let mockSocket: ReturnType<typeof createMockSocket>;

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket = createMockSocket();
  mockCreateConnection.mockImplementation(
    ((_path: string, cb?: () => void) => {
      if (cb) {
        setImmediate(() => cb());
      }
      return mockSocket as unknown as import("node:net").Socket;
    }) as never
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendRequest", () => {
  const sampleRequest: IpcRequest = { type: "list" };

  it("calls ensureDaemon and getSocket", async () => {
    const promise = sendRequest(sampleRequest);
    const okResponse: IpcResponse = { type: "ok", data: [] };
    await new Promise((r) => setImmediate(r));
    mockSocket.emit("data", Buffer.from(JSON.stringify(okResponse) + "\n"));
    await promise;

    expect(ensureDaemon).toHaveBeenCalledOnce();
    expect(getSocket).toHaveBeenCalledOnce();
  });

  it("writes JSON + newline to socket on connect", async () => {
    const promise = sendRequest(sampleRequest);
    const okResponse: IpcResponse = { type: "ok", data: [] };
    await new Promise((r) => setImmediate(r));
    mockSocket.emit("data", Buffer.from(JSON.stringify(okResponse) + "\n"));
    await promise;

    expect(mockSocket.write).toHaveBeenCalledWith(
      JSON.stringify(sampleRequest) + "\n"
    );
  });

  it("resolves with parsed response from data event", async () => {
    const expected: IpcResponse = { type: "ok", data: { id: "abc123" } };
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));
    mockSocket.emit("data", Buffer.from(JSON.stringify(expected) + "\n"));
    const result = await promise;

    expect(result).toEqual(expected);
  });

  it("handles response split across multiple data chunks", async () => {
    const expected: IpcResponse = { type: "ok", data: [] };
    const json = JSON.stringify(expected);
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));

    mockSocket.emit("data", Buffer.from(json.slice(0, 10)));
    mockSocket.emit("data", Buffer.from(json.slice(10) + "\n"));

    const result = await promise;
    expect(result).toEqual(expected);
  });

  it("rejects on invalid JSON response", async () => {
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));
    mockSocket.emit("data", Buffer.from("not-json\n"));

    await expect(promise).rejects.toThrow();
  });

  it("calls socket.destroy on invalid JSON response", async () => {
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));
    mockSocket.emit("data", Buffer.from("not-json\n"));

    try {
      await promise;
    } catch {
      // expected
    }
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("rejects on socket close without response", async () => {
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));
    mockSocket.emit("close");

    await expect(promise).rejects.toThrow();
  });

  it("rejects on socket error", async () => {
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));
    const err = new Error("ECONNREFUSED");
    mockSocket.emit("error", err);

    await expect(promise).rejects.toThrow();
  });

  it("rejects on timeout", async () => {
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));

    const setTimeoutCb = mockSocket.setTimeout.mock.calls[0]?.[1] as
      | (() => void)
      | undefined;
    expect(setTimeoutCb).toBeDefined();
    setTimeoutCb!();

    await expect(promise).rejects.toThrow();
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("only resolves once even if multiple responses arrive", async () => {
    const first: IpcResponse = { type: "ok", data: "first" };
    const second: IpcResponse = { type: "ok", data: "second" };
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));

    mockSocket.emit(
      "data",
      Buffer.from(JSON.stringify(first) + "\n" + JSON.stringify(second) + "\n")
    );

    const result = await promise;
    expect(result).toEqual(first);
  });

  it("does not reject on close if already resolved", async () => {
    const okResponse: IpcResponse = { type: "ok", data: [] };
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));

    mockSocket.emit("data", Buffer.from(JSON.stringify(okResponse) + "\n"));
    mockSocket.emit("close");

    const result = await promise;
    expect(result).toEqual(okResponse);
  });

  it("does not reject on error if already resolved", async () => {
    const okResponse: IpcResponse = { type: "ok", data: [] };
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));

    mockSocket.emit("data", Buffer.from(JSON.stringify(okResponse) + "\n"));
    mockSocket.emit("error", new Error("late error"));

    const result = await promise;
    expect(result).toEqual(okResponse);
  });

  it("does not reject on close if error already rejected", async () => {
    const promise = sendRequest(sampleRequest);
    await new Promise((r) => setImmediate(r));
    mockSocket.emit("error", new Error("ECONNREFUSED"));
    mockSocket.emit("close");

    await expect(promise).rejects.toThrow();
  });
});

describe("streamRequest", () => {
  const sampleRequest: IpcRequest = { type: "subscribe" };

  it("calls ensureDaemon and getSocket", async () => {
    streamRequest(sampleRequest, () => {}, () => {}, () => {});
    await new Promise((r) => setImmediate(r));

    expect(ensureDaemon).toHaveBeenCalledOnce();
    expect(getSocket).toHaveBeenCalledOnce();
  });

  it("writes JSON + newline to socket on connect", async () => {
    streamRequest(sampleRequest, () => {}, () => {}, () => {});
    await new Promise((r) => setImmediate(r));

    expect(mockSocket.write).toHaveBeenCalledWith(
      JSON.stringify(sampleRequest) + "\n"
    );
  });

  it("returns the socket", async () => {
    const socket = streamRequest(sampleRequest, () => {}, () => {}, () => {});
    await new Promise((r) => setImmediate(r));

    expect(socket).toBe(mockSocket);
  });

  it("calls onLine for data type responses", async () => {
    const onLine = vi.fn();
    streamRequest(sampleRequest, onLine, () => {}, () => {});
    await new Promise((r) => setImmediate(r));

    const dataResponse: IpcResponse = { type: "data", line: "hello world" };
    mockSocket.emit("data", Buffer.from(JSON.stringify(dataResponse) + "\n"));

    expect(onLine).toHaveBeenCalledWith("hello world");
  });

  it("calls onLine for multiple data responses", async () => {
    const onLine = vi.fn();
    streamRequest(sampleRequest, onLine, () => {}, () => {});
    await new Promise((r) => setImmediate(r));

    const line1: IpcResponse = { type: "data", line: "line1" };
    const line2: IpcResponse = { type: "data", line: "line2" };
    mockSocket.emit(
      "data",
      Buffer.from(JSON.stringify(line1) + "\n" + JSON.stringify(line2) + "\n")
    );

    expect(onLine).toHaveBeenCalledTimes(2);
  });

  it("calls onError for error type responses and destroys socket", async () => {
    const onError = vi.fn();
    streamRequest(sampleRequest, () => {}, () => {}, onError);
    await new Promise((r) => setImmediate(r));

    const errorResponse: IpcResponse = { type: "error", message: "something broke" };
    mockSocket.emit("data", Buffer.from(JSON.stringify(errorResponse) + "\n"));

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("calls onEnd for end type responses and destroys socket", async () => {
    const onEnd = vi.fn();
    streamRequest(sampleRequest, () => {}, onEnd, () => {});
    await new Promise((r) => setImmediate(r));

    const endResponse: IpcResponse = { type: "end" };
    mockSocket.emit("data", Buffer.from(JSON.stringify(endResponse) + "\n"));

    expect(onEnd).toHaveBeenCalledOnce();
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("calls onError for invalid JSON and destroys socket", async () => {
    const onError = vi.fn();
    streamRequest(sampleRequest, () => {}, () => {}, onError);
    await new Promise((r) => setImmediate(r));

    mockSocket.emit("data", Buffer.from("bad-json\n"));

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockSocket.destroy).toHaveBeenCalled();
  });

  it("calls onError on socket error", async () => {
    const onError = vi.fn();
    streamRequest(sampleRequest, () => {}, () => {}, onError);
    await new Promise((r) => setImmediate(r));

    mockSocket.emit("error", new Error("ECONNREFUSED"));

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("calls onEnd on socket close", async () => {
    const onEnd = vi.fn();
    streamRequest(sampleRequest, () => {}, onEnd, () => {});
    await new Promise((r) => setImmediate(r));

    mockSocket.emit("close");

    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("handles data split across multiple chunks", async () => {
    const onLine = vi.fn();
    streamRequest(sampleRequest, onLine, () => {}, () => {});
    await new Promise((r) => setImmediate(r));

    const dataResponse: IpcResponse = { type: "data", line: "partial" };
    const json = JSON.stringify(dataResponse);

    mockSocket.emit("data", Buffer.from(json.slice(0, 5)));
    mockSocket.emit("data", Buffer.from(json.slice(5) + "\n"));

    expect(onLine).toHaveBeenCalledWith("partial");
  });

  it("ignores empty/whitespace-only lines", async () => {
    const onLine = vi.fn();
    streamRequest(sampleRequest, onLine, () => {}, () => {});
    await new Promise((r) => setImmediate(r));

    mockSocket.emit("data", Buffer.from("   \n\n  \n"));

    expect(onLine).not.toHaveBeenCalled();
  });

  it("processes mixed response types in sequence", async () => {
    const onLine = vi.fn();
    const onEnd = vi.fn();
    const onError = vi.fn();
    streamRequest(sampleRequest, onLine, onEnd, onError);
    await new Promise((r) => setImmediate(r));

    const dataLine: IpcResponse = { type: "data", line: "output" };
    const endLine: IpcResponse = { type: "end" };

    mockSocket.emit(
      "data",
      Buffer.from(JSON.stringify(dataLine) + "\n" + JSON.stringify(endLine) + "\n")
    );

    expect(onLine).toHaveBeenCalledWith("output");
    expect(onEnd).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });
});
