import { describe, expect, it, vi } from "vitest";
import {
  STORAGE_QUOTA_EXCEEDED_EVENT,
  saveToStorage,
  saveEntriesToStorage,
} from "../utils/idbStorage";

describe("idbStorage quota notification", () => {
  it("dispatches STORAGE_QUOTA_EXCEEDED_EVENT instead of calling window.alert on QuotaExceededError", async () => {
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    const setItemSpy = vi.spyOn(Object.getPrototypeOf(localStorage), "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    const received: CustomEvent<{ message?: string }>[] = [];
    const listener = (event: Event) => {
      received.push(event as CustomEvent<{ message?: string }>);
    };
    window.addEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, listener);

    try {
      const ok = await saveToStorage("test-key", { hello: "world" });
      expect(ok).toBe(false);
      expect(alertMock).not.toHaveBeenCalled();
      expect(received).toHaveLength(1);
      expect(received[0].detail.message).toMatch(/storage full/i);

      // saveEntriesToStorage also triggers rollback & returns false without blocking alert
      const batchOk = await saveEntriesToStorage([{ key: "k1", value: "v1" }]);
      expect(batchOk).toBe(false);
      expect(alertMock).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, listener);
      setItemSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
