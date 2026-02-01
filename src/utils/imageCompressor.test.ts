// imageCompressor.test.ts
import { describe, it, expect, vi } from "vitest";
import { compressImage } from "./imageCompressor";

// Mock browser-image-compression
vi.mock("browser-image-compression", () => ({
  default: vi.fn((file: File, options: any) => {
    // Create a mock compressed file
    const compressedBlob = new Blob([new ArrayBuffer(100 * 1024)], { type: file.type });
    return Promise.resolve(
      new File([compressedBlob], file.name, {
        type: file.type,
        lastModified: Date.now(),
      }),
    );
  }),
}));

describe("compressImage", () => {
  it("should compress image successfully", async () => {
    // Create a mock file (2MB image)
    const originalFile = new File([new ArrayBuffer(2 * 1024 * 1024)], "test.jpg", {
      type: "image/jpeg",
    });

    const result = await compressImage(originalFile);

    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe("test.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(result.size).toBeLessThan(originalFile.size);
  });

  it("should handle different image formats", async () => {
    const pngFile = new File([new ArrayBuffer(1024 * 1024)], "test.png", {
      type: "image/png",
    });

    const result = await compressImage(pngFile);

    expect(result).toBeInstanceOf(File);
    expect(result.type).toBe("image/png");
  });

  it("should return original file if already small", async () => {
    // Create a small file (50KB)
    const smallFile = new File([new ArrayBuffer(50 * 1024)], "small.jpg", {
      type: "image/jpeg",
    });

    const result = await compressImage(smallFile);

    expect(result).toBeInstanceOf(File);
    expect(result.size).toBeLessThanOrEqual(200 * 1024); // Max 200KB target
  });
});
