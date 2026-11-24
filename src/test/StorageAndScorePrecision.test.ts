import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassScoreComponentConfig, SchoolSettings, StudentRecord } from "../types";

const idbHarness = vi.hoisted(() => ({
  appData: new Map<string, unknown>(),
  mediaBlobs: new Map<string, string>(),
  openCount: 0,
  putDelayResolver: null as (() => void) | null,
  throwInvalidStateOnce: false,
  throwWriteErrorOnce: false,
  channels: new Map<string, Set<FakeChannel>>(),
}));

class FakeChannel {
  private listeners = new Set<(event: MessageEvent) => void>();
  name: string;

  constructor(name: string) {
    this.name = name;
    const set = idbHarness.channels.get(name) ?? new Set();
    set.add(this);
    idbHarness.channels.set(name, set);
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.add(listener);
  }

  removeEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listeners.delete(listener);
  }

  postMessage(data: unknown) {
    const peers = idbHarness.channels.get(this.name);
    if (!peers) return;
    for (const peer of peers) {
      for (const listener of peer.listeners) {
        listener({ data } as MessageEvent);
      }
    }
  }

  close() {
    idbHarness.channels.get(this.name)?.delete(this);
    this.listeners.clear();
  }
}

vi.mock("idb", () => {
  const createFakeDb = () => ({
    objectStoreNames: {
      contains: (name: string) => name === "app-data" || name === "media-blobs",
    },
    put: async (store: string, value: unknown, key: string) => {
      if (store === "app-data") idbHarness.appData.set(key, value);
      if (store === "media-blobs") idbHarness.mediaBlobs.set(key, value as string);
      return key;
    },
    get: async (store: string, key: string) => {
      if (store === "app-data") return idbHarness.appData.get(key);
      if (store === "media-blobs") return idbHarness.mediaBlobs.get(key);
      return undefined;
    },
    delete: async (store: string, key: string) => {
      if (store === "app-data") idbHarness.appData.delete(key);
      if (store === "media-blobs") idbHarness.mediaBlobs.delete(key);
    },
    clear: async (store: string) => {
      if (store === "app-data") idbHarness.appData.clear();
      if (store === "media-blobs") idbHarness.mediaBlobs.clear();
    },
    close: vi.fn(),
    transaction: (storeNames: string | string[]) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const makeStoreProxy = (name: string) => ({
        put: async (value: unknown, key: string) => {
          if (idbHarness.throwInvalidStateOnce) {
            idbHarness.throwInvalidStateOnce = false;
            throw new DOMException("Database connection is closing", "InvalidStateError");
          }
          if (idbHarness.throwWriteErrorOnce) {
            idbHarness.throwWriteErrorOnce = false;
            throw new Error("Simulated transient write error");
          }
          if (name === "app-data" && idbHarness.putDelayResolver) {
            const release = new Promise<void>((resolve) => {
              const old = idbHarness.putDelayResolver;
              idbHarness.putDelayResolver = () => {
                old?.();
                resolve();
              };
            });
            await release;
          }
          if (name === "app-data") idbHarness.appData.set(key, value);
          if (name === "media-blobs") idbHarness.mediaBlobs.set(key, value as string);
          return key;
        },
        get: async (key: string) =>
          name === "app-data" ? idbHarness.appData.get(key) : idbHarness.mediaBlobs.get(key),
        delete: async (key: string) => {
          if (name === "app-data") idbHarness.appData.delete(key);
          if (name === "media-blobs") idbHarness.mediaBlobs.delete(key);
        },
        getAllKeys: async () =>
          name === "media-blobs"
            ? Array.from(idbHarness.mediaBlobs.keys())
            : Array.from(idbHarness.appData.keys()),
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
      idbHarness.openCount += 1;
      return createFakeDb();
    }),
  };
});

import { DEFAULT_FACTORY_SETTINGS } from "../constants/defaultSettings";
import {
  addToLibrary,
  removeFromLibrary,
  toggleComponentForSubject,
  updateInLibrary,
  validateMapAgainstLibrary,
} from "../utils/componentRegistry";
import { resolveSubjectSbaTasks } from "../utils/csvImport";
import {
  IDB_KEYS,
  initStorage,
  loadFromStorageResult,
  saveToStorage,
  subscribeToStorageSync,
} from "../utils/idbStorage";
import { normalizeTaskKey, rescaleStudentsForWeightChange } from "../utils/sbaReconciliation";
import { getExamRawDisplayValue, resolveExamRawScore } from "../utils/scoreConversion";

describe("Branch 3 storage serialization, BroadcastChannel sync, score precision, and task keys", () => {
  beforeEach(() => {
    idbHarness.appData.clear();
    idbHarness.mediaBlobs.clear();
    idbHarness.openCount = 0;
    idbHarness.putDelayResolver = null;
    idbHarness.throwInvalidStateOnce = false;
    idbHarness.throwWriteErrorOnce = false;
    idbHarness.channels.clear();
    vi.stubGlobal("BroadcastChannel", FakeChannel as unknown as typeof BroadcastChannel);
  });

  it("initializes IDB with a single openDB call, serializes overlapping writes, recovers from errors & InvalidStateError, and notifies BroadcastChannel peers", async () => {
    await initStorage();
    expect(idbHarness.openCount).toBe(1);

    const externalUpdates: string[][] = [];
    const unsubscribe = subscribeToStorageSync((keys) => externalUpdates.push(keys));

    // Pause first write and immediately enqueue a second write so overlap is tested deterministically
    let firstStarted = false;
    idbHarness.putDelayResolver = () => {
      firstStarted = true;
    };

    const write1 = saveToStorage(IDB_KEYS.STUDENTS, [{ id: "first" }]);
    const write2 = saveToStorage(IDB_KEYS.STUDENTS, [{ id: "second" }]);

    // Yield microtasks so write1 enters its put hook before releasing
    for (let i = 0; i < 6; i++) await Promise.resolve();
    idbHarness.putDelayResolver?.();
    idbHarness.putDelayResolver = null;

    const [ok1, ok2] = await Promise.all([write1, write2]);
    expect(firstStarted).toBe(true);
    expect(ok1).toBe(true);
    expect(ok2).toBe(true);
    expect(idbHarness.appData.get(IDB_KEYS.STUDENTS)).toEqual([{ id: "second" }]);

    // Same-tab BroadcastChannel listener must ignore self-emitted senderId notifications
    expect(externalUpdates).toHaveLength(0);

    // Simulate external tab message on another BroadcastChannel instance
    const peerChannel = new FakeChannel("repota-storage-sync");
    peerChannel.postMessage({
      type: "storage-updated",
      keys: [IDB_KEYS.SETTINGS],
      senderId: "other-tab-id",
    });
    expect(externalUpdates).toEqual([[IDB_KEYS.SETTINGS]]);
    unsubscribe();

    // Failed write must not poison the queue for later writes
    idbHarness.throwWriteErrorOnce = true;
    expect(await saveToStorage(IDB_KEYS.STUDENTS, [{ id: "fails" }])).toBe(false);
    expect(await saveToStorage(IDB_KEYS.STUDENTS, [{ id: "recovers" }])).toBe(true);

    // InvalidStateError triggers transparent reconnect and retry
    idbHarness.throwInvalidStateOnce = true;
    expect(await saveToStorage(IDB_KEYS.SETTINGS, { schoolName: "Reconnected" })).toBe(true);
    expect(idbHarness.openCount).toBe(2);
    const loaded = await loadFromStorageResult<{ schoolName: string }>(IDB_KEYS.SETTINGS);
    expect(loaded).toEqual({ status: "found", value: { schoolName: "Reconnected" } });
  });

  it("preserves exact examRawScore across display and weight changes, and stashes/restores direct classScore across Mock mode toggles", () => {
    const baseStudent: StudentRecord = {
      id: "stu-1",
      name: "Ama Mensah",
      className: "Basic 5",
      gender: "Female",
      subjects: [
        {
          id: "sub-direct",
          name: "Mathematics",
          classScore: 34,
          examScore: 45, // raw 89 at 50 exam max
          examRawScore: 89,
        },
        {
          id: "sub-legacy",
          name: "English",
          classScore: 25,
          examScore: 45, // legacy without examRawScore
        },
      ],
    };

    expect(getExamRawDisplayValue(baseStudent.subjects[0], 50)).toBe("89");
    expect(getExamRawDisplayValue(baseStudent.subjects[1], 50)).toBe("90");

    // 50/50 -> 30/70 -> 50/50 keeps exact raw 89 and exact 45/50
    const rescaledToShs = rescaleStudentsForWeightChange([baseStudent], 50, 50, 30, 70, "rescale");
    expect(rescaledToShs[0].subjects[0]).toMatchObject({
      classScore: 20, // round(34/50 * 30)
      examScore: 62, // round(89/100 * 70) = round(62.3) = 62
      examRawScore: 89,
    });

    const restored5050 = rescaleStudentsForWeightChange(rescaledToShs, 30, 70, 50, 50, "rescale");
    expect(restored5050[0].subjects[0].examScore).toBe(45);
    expect(restored5050[0].subjects[0].examRawScore).toBe(89);
    expect(resolveExamRawScore(restored5050[0].subjects[0], 50)).toBe(89);

    // TERMLY (50/50) -> MOCK (0/100) stashes direct classScore and restores it on return to TERMLY (30/70)
    const mockStudents = rescaleStudentsForWeightChange([baseStudent], 50, 50, 0, 100, "rescale");
    expect(mockStudents[0].subjects[0]).toMatchObject({
      classScore: 0,
      examScore: 89,
      examRawScore: 89,
      savedDirectClassScore: 34,
      savedDirectClassScoreMax: 50,
    });

    const resumedTermly = rescaleStudentsForWeightChange(mockStudents, 0, 100, 30, 70, "rescale");
    expect(resumedTermly[0].subjects[0].classScore).toBe(20);
    expect(resumedTermly[0].subjects[0].examScore).toBe(62);
    expect(resumedTermly[0].subjects[0].examRawScore).toBe(89);
    expect(resumedTermly[0].subjects[0].savedDirectClassScore).toBeUndefined();
    expect(resumedTermly[0].subjects[0].savedDirectClassScoreMax).toBeUndefined();

    // Clamp mode clears examRawScore if weighted examScore was clamped
    const clamped = rescaleStudentsForWeightChange([baseStudent], 50, 70, 50, 40, "clamp");
    expect(clamped[0].subjects[0].examScore).toBe(40);
    expect(clamped[0].subjects[0].examRawScore).toBeUndefined();
  });

  it("normalizes internal whitespace in normalizeTaskKey across componentRegistry and resolveSubjectSbaTasks", () => {
    expect(normalizeTaskKey("  CAT   1 ")).toBe("cat 1");

    const library: ClassScoreComponentConfig[] = [{ name: "CAT 1", maxScore: 15, category: "CAT" }];
    const dupAttempt = addToLibrary(library, { name: "  cat   1 ", maxScore: 20, category: "CAT" });
    expect(dupAttempt.error).toBeTruthy();

    const updated = updateInLibrary(
      library,
      { Mathematics: [{ name: "  cat   1 ", maxScore: 15, category: "CAT" }] },
      "CAT 1",
      { name: "Quiz 1", maxScore: 20, category: "CAT" },
    );
    expect(updated.error).toBeUndefined();
    expect(updated.subjectComponentMap.Mathematics[0].name).toBe("Quiz 1");

    const toggledOff = toggleComponentForSubject(
      updated.subjectComponentMap,
      "Mathematics",
      { name: "  quiz   1 ", maxScore: 20 },
    );
    expect(toggledOff.Mathematics).toBeUndefined();

    const orphans = validateMapAgainstLibrary(
      { Mathematics: [{ name: "  quiz   1", maxScore: 20 }] },
      updated.library,
    );
    expect(orphans).toHaveLength(0);

    const removed = removeFromLibrary(
      updated.library,
      { Mathematics: [{ name: "  QUIZ  1", maxScore: 20 }] },
      "quiz 1",
    );
    expect(removed.library).toHaveLength(0);
    expect(removed.subjectComponentMap).toEqual({});

    const settings: SchoolSettings = { ...DEFAULT_FACTORY_SETTINGS, subjectComponentMap: {} };
    const students: StudentRecord[] = [
      {
        id: "s1",
        name: "Student A",
        className: "Basic 5",
        gender: "Male",
        subjects: [
          {
            id: "m1",
            name: "Mathematics",
            classScore: 0,
            examScore: 0,
            classScoreComponents: [{ id: "c1", name: "Class  Test", score: 5, maxScore: 10 }],
          },
        ],
      },
      {
        id: "s2",
        name: "Student B",
        className: "Basic 5",
        gender: "Female",
        subjects: [
          {
            id: "m2",
            name: "Mathematics",
            classScore: 0,
            examScore: 0,
            classScoreComponents: [{ id: "c2", name: " class test ", score: 6, maxScore: 10 }],
          },
        ],
      },
    ];
    expect(resolveSubjectSbaTasks("Mathematics", students, settings)).toHaveLength(1);
  });
});
