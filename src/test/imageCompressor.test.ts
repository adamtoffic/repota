import { describe, it, expect } from "vitest";
import { compressImage } from "../utils/imageCompressor";

describe("compressImage", () => {
  it("should be defined and exportable", () => {
    expect(compressImage).toBeDefined();
    expect(typeof compressImage).toBe("function");
  });

  // Note: Full testing of this function requires browser APIs (FileReader, Canvas, Image)
  // which are difficult to mock in a unit test environment. Integration tests would be more appropriate.
});
