import { recordBackup } from "../../utils/dataProtection";
import { downloadBlob } from "../../utils/fileDownload";
import {
  decryptBackupFile,
  encryptAppSealedBackup,
  encryptBackupFile,
  isEncryptedFile,
  requiresPassword,
} from "../../utils/fileEncryption";
import { createBackupPayload, validateBackup } from "../../utils/backupValidation";
import { isDemoStudent } from "../../utils/reportAnalytics";

export type ValidatedBackupData = ReturnType<typeof validateBackup>;

export type ParsedBackupFileResult =
  | { requiresPassword: true; hint: string }
  | { requiresPassword: false; validated: ValidatedBackupData };

/**
 * Strips UTF-8 BOM, parses JSON, unwraps unencrypted or app-sealed `.repota` envelopes,
 * and validates the resulting backup payload.
 */
export async function parseIncomingBackupContent(
  rawText: string,
  password?: string,
): Promise<ParsedBackupFileResult> {
  const content = rawText.replace(/^\uFEFF/, "").trim();
  const data = JSON.parse(content);

  let rawBackup: unknown = data;
  if (password !== undefined) {
    rawBackup = await decryptBackupFile(data, password);
  } else if (isEncryptedFile(data)) {
    if (requiresPassword(data)) {
      return { requiresPassword: true, hint: data.hint || "" };
    }
    rawBackup = await decryptBackupFile(data);
  }

  return { requiresPassword: false, validated: validateBackup(rawBackup) };
}

/**
 * Builds, encrypts (app-sealed or password-locked), and serializes a `.repota` backup Blob
 * alongside telemetry counts derived without exposing PII.
 */
export async function buildEncryptedBackupArtifact({
  parsedStudents,
  parsedSettings,
  usePassword,
  password,
  passwordHint,
}: {
  parsedStudents: unknown[];
  parsedSettings: Record<string, unknown>;
  usePassword: boolean;
  password: string;
  passwordHint: string;
}): Promise<{
  blob: Blob;
  fileName: string;
  schoolName: string;
  className: string;
  demoCount: number;
  realCount: number;
}> {
  const backup = createBackupPayload(parsedStudents, parsedSettings);
  const finalData =
    usePassword && password
      ? await encryptBackupFile(backup, password, passwordHint || undefined)
      : await encryptAppSealedBackup(backup);

  const serialized = JSON.stringify(finalData);
  const blob = new Blob([serialized], {
    type: "application/octet-stream",
  });

  const schoolName = (parsedSettings.schoolName as string) || "School";
  const className = (parsedSettings.className as string) || "Class";
  const date = new Date().toISOString().split("T")[0];
  const fileName = `${schoolName}_${className}_${date}.repota`.replace(/\s+/g, "_");

  const demoCount = parsedStudents.filter(
    (item) => Boolean(item && typeof item === "object" && isDemoStudent(item as { id: string })),
  ).length;
  const realCount = parsedStudents.length - demoCount;

  return {
    blob,
    fileName,
    schoolName,
    className,
    demoCount,
    realCount,
  };
}

/**
 * Delivers an encrypted `.repota` backup via OS Web Share Sheet when supported, falling back
 * to direct download on unsupported hosts or non-abort share errors, then stamps `recordBackup()`.
 */
export async function deliverEncryptedBackupBlob({
  blob,
  fileName,
  schoolName,
  className,
}: {
  blob: Blob;
  fileName: string;
  schoolName: string;
  className: string;
}): Promise<"shared" | "downloaded" | "canceled"> {
  let sharedViaOs = false;
  const shareFile =
    typeof File !== "undefined" ? new File([blob], fileName, { type: "application/octet-stream" }) : null;
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (shareFile && nav && typeof nav.share === "function" && nav.canShare?.({ files: [shareFile] })) {
    try {
      await nav.share({
        files: [shareFile],
        title: `${schoolName} (${className}) Class Backup`,
      });
      sharedViaOs = true;
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") {
        return "canceled";
      }
      // Fall back to direct download if OS share fails or user activation expired after crypto
      downloadBlob(blob, fileName);
    }
  } else {
    downloadBlob(blob, fileName);
  }

  recordBackup();
  return sharedViaOs ? "shared" : "downloaded";
}
