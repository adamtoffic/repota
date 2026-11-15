import { describe, expect, it, vi } from "vitest";
import {
  decryptBackupFile,
  encryptAppSealedBackup,
  encryptBackupFile,
  isEncryptedFile,
  requiresPassword,
  type EncryptedFile,
} from "../utils/fileEncryption";

describe("fileEncryption", () => {
  it("encrypts and decrypts app-sealed v2 backups without requiring a user password", async () => {
    const payload = {
      students: [{ id: "1", name: "Ama Mensah", className: "Basic 5", gender: "Female", subjects: [] }],
      settings: { schoolName: "Accra Academy", academicYear: "2025/2026" },
    };

    const envelope = await encryptAppSealedBackup(payload);

    expect(envelope.version).toBe("v2");
    expect(envelope.encrypted).toBe(true);
    expect(envelope.mode).toBe("app");
    expect(isEncryptedFile(envelope)).toBe(true);
    expect(requiresPassword(envelope)).toBe(false);
    expect(JSON.stringify(envelope)).not.toContain("Ama Mensah");

    const decrypted = await decryptBackupFile<typeof payload>(envelope);
    expect(decrypted).toEqual(payload);
  });

  it("encrypts and decrypts password-protected v2 backups and rejects wrong passwords", async () => {
    const payload = { students: [{ id: "2", name: "Kwame Nkrumah" }], settings: {} };
    const envelope = await encryptBackupFile(payload, "secret-123", "founder");

    expect(envelope.version).toBe("v2");
    expect(envelope.mode).toBe("password");
    expect(envelope.hint).toBe("founder");
    expect(isEncryptedFile(envelope)).toBe(true);
    expect(requiresPassword(envelope)).toBe(true);

    const decrypted = await decryptBackupFile<typeof payload>(envelope, "secret-123");
    expect(decrypted).toEqual(payload);

    await expect(decryptBackupFile(envelope, "wrong-pass")).rejects.toThrow();
  });

  it("supports large payloads (>200KB) without call stack overflow", async () => {
    // 250KB string simulates multiple base64 student photos on WebKit/iOS Safari
    const largePhoto = "A".repeat(250_000);
    const payload = {
      students: [{ id: "big-1", name: "Photo Student", pictureUrl: largePhoto }],
      settings: { schoolName: "Big Photo School" },
    };

    const envelope = await encryptAppSealedBackup(payload);
    const decrypted = await decryptBackupFile<typeof payload>(envelope);
    expect(decrypted.students[0].pictureUrl).toBe(largePhoto);
  });

  it("decrypts legacy v1 password-encrypted files cleanly", async () => {
    // Produce a synthetic v1 file (uncompressed, no mode field)
    const payload = { students: [{ id: "v1-1", name: "Legacy Student" }], settings: {} };
    const salt = new Uint8Array(16).fill(7);
    const iv = new Uint8Array(12).fill(3);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("legacy-pass"),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"],
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(payload)),
    );

    const v1File: EncryptedFile = {
      version: "v1",
      encrypted: true,
      salt: btoa(String.fromCharCode(...salt)),
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      hint: "old hint",
    };

    expect(isEncryptedFile(v1File)).toBe(true);
    expect(requiresPassword(v1File)).toBe(true);
    const decrypted = await decryptBackupFile<typeof payload>(v1File, "legacy-pass");
    expect(decrypted).toEqual(payload);
  });

  it("falls back safely when CompressionStream is unavailable", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    try {
      const payload = { students: [], settings: { schoolName: "NoGzip" } };
      const envelope = await encryptAppSealedBackup(payload);
      expect(envelope.compressed).toBe(false);
      const decrypted = await decryptBackupFile<typeof payload>(envelope);
      expect(decrypted).toEqual(payload);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
