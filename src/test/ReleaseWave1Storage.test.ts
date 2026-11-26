import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  appData: new Map<string, unknown>(),
  mediaBlobs: new Map<string, string>(),
  appPutCalls: [] as Array<{ key: string }>,
  failNextOpen: false,
  channels: new Map<string, Set<FakeBroadcastChannel>>(),
}));

class FakeBroadcastChannel {
  private listeners = new Set<(event: MessageEvent) => void>();
  name: string;

  constructor(name: string) {
    this.name = name;
    const peers = harness.channels.get(name) ?? new Set();
    peers.add(this);
    harness.channels.set(name, peers);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.delete(listener);
  }

  postMessage(data: unknown) {
    const peers = harness.channels.get(this.name);
    if (!peers) return;
    for (const peer of peers) {
      for (const listener of peer.listeners) {
        listener({ data } as MessageEvent);
      }
    }
  }

  close() {
    harness.channels.get(this.name)?.delete(this);
    this.listeners.clear();
  }
}

vi.mock("idb", () => {
  const createFakeDb = () => ({
    objectStoreNames: {
      contains: (name: string) => name === "app-data" || name === "media-blobs",
    },
    put: async (store: string, value: unknown, key: string) => {
      if (store === "app-data") {
        harness.appPutCalls.push({ key });
        harness.appData.set(key, value);
      }
      if (store === "media-blobs") harness.mediaBlobs.set(key, value as string);
      return key;
    },
    get: async (store: string, key: string) =>
      store === "app-data" ? harness.appData.get(key) : harness.mediaBlobs.get(key),
    delete: async (store: string, key: string) => {
      if (store === "app-data") harness.appData.delete(key);
      if (store === "media-blobs") harness.mediaBlobs.delete(key);
    },
    clear: async (store: string) => {
      if (store === "app-data") harness.appData.clear();
      if (store === "media-blobs") harness.mediaBlobs.clear();
    },
    close: vi.fn(),
    transaction: (storeNames: string | string[]) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const makeStoreProxy = (name: string) => ({
        put: async (value: unknown, key: string) => {
          if (name === "app-data") {
            harness.appPutCalls.push({ key });
            harness.appData.set(key, value);
          }
          if (name === "media-blobs") harness.mediaBlobs.set(key, value as string);
          return key;
        },
        get: async (key: string) =>
          name === "app-data" ? harness.appData.get(key) : harness.mediaBlobs.get(key),
        delete: async (key: string) => {
          if (name === "app-data") harness.appData.delete(key);
          if (name === "media-blobs") harness.mediaBlobs.delete(key);
        },
        getAllKeys: async () =>
          name === "media-blobs"
            ? Array.from(harness.mediaBlobs.keys())
            : Array.from(harness.appData.keys()),
      });
      return {
        store: makeStoreProxy(names[0]),
        objectStore: (name: string) => makeStoreProxy(name),
        abort: vi.fn(),
        done: Promise.resolve(),
      };
    },
  });

  return {
    openDB: vi.fn(async () => {
      if (harness.failNextOpen) {
        harness.failNextOpen = false;
        throw new Error("Transient IDB open error");
      }
      return createFakeDb();
    }),
  };
});

import {
  flushStorageWriteQueue,
  getStorageType,
  IDB_KEYS,
  initStorage,
  loadFromStorageResult,
  saveToStorage,
  subscribeToStorageSync,
} from "../utils/idbStorage";

describe("Release Wave 1 — IDB Media Cache & Migrated-Device Guards", () => {
  beforeEach(async () => {
    localStorage.clear();
    harness.appData.clear();
    harness.mediaBlobs.clear();
    harness.appPutCalls.length = 0;
    harness.failNextOpen = false;
    harness.channels.clear();
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
    await initStorage();
  });

  it("uses a read-only probe in initStorage and refuses silent localStorage fallback when repota_idb_migrated is v2", async () => {
    expect(harness.appPutCalls.some((c) => c.key === "idb_test")).toBe(false);
    expect(getStorageType()).toBe("indexeddb");

    // Migrated device must throw instead of silently flipping to empty localStorage
    localStorage.setItem("repota_idb_migrated", "v2");
    harness.failNextOpen = true;
    await expect(initStorage()).rejects.toThrow("Transient IDB open error");
    expect(getStorageType()).toBe("indexeddb");
  });

  it("evicts blobMemoryCache on remote BroadcastChannel storage-updated so re-saving photos never leaves dangling refs", async () => {
    const unsubscribe = subscribeToStorageSync(() => {});
    const photo = `data:image/jpeg;base64,${"Z".repeat(700)}`;

    expect(
      await saveToStorage(IDB_KEYS.STUDENTS, [
        { id: "stu-1", name: "Ama", className: "Basic 5", gender: "Female", subjects: [], pictureUrl: photo },
      ]),
    ).toBe(true);
    expect(harness.mediaBlobs.get("student-photo:stu-1")).toBe(photo);

    // Simulate another tab deleting stu-1's photo from media-blobs and broadcasting storage-updated
    harness.mediaBlobs.delete("student-photo:stu-1");
    const remotePeer = new FakeBroadcastChannel("repota-storage-sync");
    remotePeer.postMessage({
      type: "storage-updated",
      keys: [IDB_KEYS.STUDENTS],
      senderId: "remote-tab-id",
    });

    // Re-saving photo from this tab must re-write the blob to media-blobs instead of skipping via stale cache
    expect(
      await saveToStorage(IDB_KEYS.STUDENTS, [
        { id: "stu-1", name: "Ama", className: "Basic 5", gender: "Female", subjects: [], pictureUrl: photo },
      ]),
    ).toBe(true);
    await flushStorageWriteQueue();

    expect(harness.mediaBlobs.get("student-photo:stu-1")).toBe(photo);
    const loaded = await loadFromStorageResult<Array<{ pictureUrl?: string }>>(IDB_KEYS.STUDENTS);
    expect(loaded.status).toBe("found");
    if (loaded.status === "found") {
      expect(loaded.value[0].pictureUrl).toBe(photo);
    }

    remotePeer.close();
    unsubscribe();
  });
});
