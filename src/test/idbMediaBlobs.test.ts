import { beforeEach, describe, expect, it, vi } from "vitest";

const stores = vi.hoisted(() => ({
  appData: new Map<string, unknown>(),
  mediaBlobs: new Map<string, string>(),
  mediaPutCalls: [] as Array<{ key: string; value: string }>,
  mediaDeleteCalls: [] as string[],
}));

vi.mock("idb", () => {
  const createFakeDb = () => ({
    objectStoreNames: {
      contains: (name: string) => name === "app-data" || name === "media-blobs",
    },
    put: async (store: string, value: unknown, key: string) => {
      if (store === "app-data") stores.appData.set(key, value);
      if (store === "media-blobs") {
        stores.mediaPutCalls.push({ key, value: value as string });
        stores.mediaBlobs.set(key, value as string);
      }
      return key;
    },
    get: async (store: string, key: string) => {
      if (store === "app-data") return stores.appData.get(key);
      if (store === "media-blobs") return stores.mediaBlobs.get(key);
      return undefined;
    },
    delete: async (store: string, key: string) => {
      if (store === "app-data") stores.appData.delete(key);
      if (store === "media-blobs") {
        stores.mediaDeleteCalls.push(key);
        stores.mediaBlobs.delete(key);
      }
    },
    clear: async (store: string) => {
      if (store === "app-data") stores.appData.clear();
      if (store === "media-blobs") stores.mediaBlobs.clear();
    },
    close: vi.fn(),
    transaction: (storeNames: string | string[]) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const makeStoreProxy = (name: string) => ({
        put: async (value: unknown, key: string) => {
          if (name === "app-data") stores.appData.set(key, value);
          if (name === "media-blobs") {
            stores.mediaPutCalls.push({ key, value: value as string });
            stores.mediaBlobs.set(key, value as string);
          }
          return key;
        },
        get: async (key: string) => {
          if (name === "app-data") return stores.appData.get(key);
          if (name === "media-blobs") return stores.mediaBlobs.get(key);
          return undefined;
        },
        delete: async (key: string) => {
          if (name === "app-data") stores.appData.delete(key);
          if (name === "media-blobs") {
            stores.mediaDeleteCalls.push(key);
            stores.mediaBlobs.delete(key);
          }
        },
        getAllKeys: async () =>
          name === "media-blobs" ? Array.from(stores.mediaBlobs.keys()) : Array.from(stores.appData.keys()),
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
    openDB: vi.fn(async () => createFakeDb()),
  };
});

import {
  IDB_KEYS,
  initStorage,
  loadFromStorageResult,
  saveToStorage,
} from "../utils/idbStorage";

describe("idbStorage media blob separation", () => {
  beforeEach(async () => {
    stores.appData.clear();
    stores.mediaBlobs.clear();
    stores.mediaPutCalls.length = 0;
    stores.mediaDeleteCalls.length = 0;
    await initStorage();
  });

  it("extracts student photos and settings media into media-blobs, skips unchanged rewrites, and hydrates on load", async () => {
    const photo1 = `data:image/jpeg;base64,${"A".repeat(700)}`;
    const logo = `data:image/png;base64,${"B".repeat(700)}`;

    const students = [
      { id: "stu-1", name: "Ama", className: "Basic 4", subjects: [], pictureUrl: photo1 },
      { id: "stu-2", name: "Kofi", className: "Basic 4", subjects: [] },
    ];
    const settings = {
      schoolName: "Accra Primary",
      logoUrl: logo,
      headTeacherSignature: "",
    };

    expect(await saveToStorage(IDB_KEYS.STUDENTS, students)).toBe(true);
    expect(await saveToStorage(IDB_KEYS.SETTINGS, settings)).toBe(true);

    // Stripped refs stored in main app-data store; binary base64 stored in media-blobs
    const storedStudents = stores.appData.get(IDB_KEYS.STUDENTS) as Array<{ pictureUrl?: string }>;
    expect(storedStudents[0].pictureUrl).toBe("idb-blob://student-photo:stu-1");
    expect(stores.mediaBlobs.get("student-photo:stu-1")).toBe(photo1);

    const storedSettings = stores.appData.get(IDB_KEYS.SETTINGS) as Record<string, string>;
    expect(storedSettings.logoUrl).toBe("idb-blob://settings-media:logoUrl");
    expect(stores.mediaBlobs.get("settings-media:logoUrl")).toBe(logo);
    expect(stores.mediaPutCalls).toHaveLength(2);

    // Editing a score on stu-1 without changing photo1 should NOT rewrite media-blobs
    stores.mediaPutCalls.length = 0;
    const updatedStudents = [
      { ...students[0], name: "Ama Updated", pictureUrl: photo1 },
      students[1],
    ];
    expect(await saveToStorage(IDB_KEYS.STUDENTS, updatedStudents)).toBe(true);
    expect(stores.mediaPutCalls).toHaveLength(0);

    // Loading restores full Base64 strings transparently
    const loadedStudents = await loadFromStorageResult<typeof students>(IDB_KEYS.STUDENTS);
    expect(loadedStudents.status).toBe("found");
    if (loadedStudents.status === "found") {
      expect(loadedStudents.value[0].pictureUrl).toBe(photo1);
      expect(loadedStudents.value[0].name).toBe("Ama Updated");
    }

    const loadedSettings = await loadFromStorageResult<typeof settings>(IDB_KEYS.SETTINGS);
    expect(loadedSettings.status).toBe("found");
    if (loadedSettings.status === "found") {
      expect(loadedSettings.value.logoUrl).toBe(logo);
    }

    // Clearing student photo removes the orphaned blob from media-blobs
    expect(
      await saveToStorage(IDB_KEYS.STUDENTS, [
        { id: "stu-1", name: "Ama Updated", className: "Basic 4", subjects: [], pictureUrl: "" },
        students[1],
      ]),
    ).toBe(true);
    expect(stores.mediaBlobs.has("student-photo:stu-1")).toBe(false);
    expect(stores.mediaDeleteCalls).toContain("student-photo:stu-1");
  });
});
