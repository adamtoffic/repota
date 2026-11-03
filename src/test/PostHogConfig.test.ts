import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthog }));
vi.mock("@vercel/analytics/react", () => ({ Analytics: () => null }));
vi.mock("../App.tsx", () => ({ default: () => null }));
vi.mock("react-dom/client", () => ({
  createRoot: () => ({ render: vi.fn() }),
}));

describe("PostHog configuration", () => {
  beforeEach(() => {
    posthog.init.mockClear();
  });

  it("initializes autocapture and masks sensitive session-recording data", async () => {
    await import("../main");

    expect(posthog.init).toHaveBeenCalledOnce();
    const [, config] = posthog.init.mock.calls[0];
    expect(config).toMatchObject({
      autocapture: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        blockSelector: "img",
      },
    });

    const { maskTextFn } = config.session_recording;
    expect(maskTextFn("Sensitive text", document.createElement("span"))).toBe("*".repeat(14));

    const permitted = document.createElement("span");
    permitted.dataset.record = "true";
    expect(maskTextFn("Visible text", permitted)).toBe("Visible text");
  });
});
