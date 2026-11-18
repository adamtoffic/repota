import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSafariMajorVersion,
  isIOSPWA,
  shouldUseIOSPdfPrintFallback,
} from "../utils/iosInteraction";
import { buildAnalyticsPdfFilename, buildPdfFilename, sharePdfFile } from "../utils/pdfPrint";

describe("iosInteraction print detection", () => {
  const originalUserAgent = navigator.userAgent;
  const originalStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  const originalMatchMedia = window.matchMedia;

  const mockEnv = (opts: { ua: string; standalone?: boolean; displayStandalone?: boolean }) => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: opts.ua,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: opts.standalone,
    });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)" ? Boolean(opts.displayStandalone) : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  };

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: originalStandalone,
    });
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it("parses Safari major version from UA strings", () => {
    expect(
      getSafariMajorVersion(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(27);
    expect(
      getSafariMajorVersion(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(26);
    expect(getSafariMajorVersion("Mozilla/5.0 Chrome/135.0.0.0 Safari/537.36")).toBeNull();
  });

  it("enables PDF fallback on iOS 27+ standalone PWA only", () => {
    const ios27UA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1";

    mockEnv({ ua: ios27UA, standalone: true, displayStandalone: true });
    expect(isIOSPWA()).toBe(true);
    expect(shouldUseIOSPdfPrintFallback()).toBe(true);

    // Same UA in regular Safari tab must still use native window.print()
    mockEnv({ ua: ios27UA, standalone: false, displayStandalone: false });
    expect(isIOSPWA()).toBe(false);
    expect(shouldUseIOSPdfPrintFallback()).toBe(false);

    // iOS 26 standalone continues using native window.print()
    mockEnv({
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      standalone: true,
      displayStandalone: true,
    });
    expect(isIOSPWA()).toBe(true);
    expect(shouldUseIOSPdfPrintFallback()).toBe(false);
  });
});

describe("pdfPrint helpers", () => {
  const originalShare = navigator.share;
  const originalCanShare = navigator.canShare;

  afterEach(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: originalShare });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: originalCanShare });
    vi.restoreAllMocks();
  });

  it("formats sanitized PDF filenames", () => {
    expect(buildPdfFilename("Basic 6 A", 12)).toBe("Basic-6-A-report-cards.pdf");
    expect(buildPdfFilename("JHS 2", 1)).toBe("JHS-2-report-card.pdf");
    expect(buildPdfFilename("", 3)).toBe("Repota-report-cards.pdf");
    expect(buildAnalyticsPdfFilename("Basic 6 A", "subjects")).toBe(
      "Basic-6-A-analytics-subjects.pdf",
    );
    expect(buildAnalyticsPdfFilename("", "")).toBe("Repota-analytics-overview.pdf");
  });

  it("returns share outcomes cleanly", async () => {
    const file = new File(["%PDF-1.4"], "reports.pdf", { type: "application/pdf" });

    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    await expect(sharePdfFile(file)).resolves.toBe("unsupported");

    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });

    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    await expect(sharePdfFile(file)).resolves.toBe("shared");

    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("User cancelled", "AbortError")),
    });
    await expect(sharePdfFile(file)).resolves.toBe("aborted");

    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException("Expired gesture", "NotAllowedError")),
    });
    await expect(sharePdfFile(file)).resolves.toBe("activation-expired");
  });
});
