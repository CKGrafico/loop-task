import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sleep } from "../src/shared/sleep.js";

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after the specified duration", async () => {
    const promise = sleep(1000, new AbortController().signal);

    // Not resolved yet
    vi.advanceTimersByTime(999);
    // Now resolve
    vi.advanceTimersByTime(1);

    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects immediately if signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort("already done");

    await expect(sleep(1000, controller.signal)).rejects.toBe("already done");
  });

  it("rejects when signal is aborted during sleep", async () => {
    const controller = new AbortController();
    const promise = sleep(5000, controller.signal);

    // Abort partway through
    vi.advanceTimersByTime(2000);
    controller.abort("cancelled");

    await expect(promise).rejects.toBe("cancelled");
  });

  it("clears the timeout when aborted", async () => {
    const controller = new AbortController();
    const promise = sleep(5000, controller.signal);

    controller.abort("stop");

    // After abort, advancing timers should not cause the sleep to resolve
    vi.advanceTimersByTime(10_000);

    // Should still reject, not resolve
    await expect(promise).rejects.toBe("stop");
  });

  it("removes abort listener when completed normally", async () => {
    const controller = new AbortController();
    const removeListenerSpy = vi.spyOn(controller.signal, "removeEventListener");

    const promise = sleep(1000, controller.signal);
    vi.advanceTimersByTime(1000);
    await promise;

    expect(removeListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    removeListenerSpy.mockRestore();
  });

  it("rejects with AbortError when aborted without explicit reason", async () => {
    const controller = new AbortController();
    // Abort without passing a reason — signal.reason is a DOMException
    controller.abort();

    await expect(sleep(1000, controller.signal)).rejects.toThrow("aborted");
  });

  it("does not resolve if aborted before timer fires", async () => {
    const controller = new AbortController();
    const promise = sleep(1000, controller.signal);

    // Abort immediately (timers not advanced)
    controller.abort("early");

    // Advance past the timer now — should still reject
    vi.advanceTimersByTime(2000);

    await expect(promise).rejects.toBe("early");
  });
});
