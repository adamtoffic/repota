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
    const outside = document.createElement("span");
    expect(maskTextFn("Sensitive text", outside)).toBe("*".repeat(14));

    const permitted = document.createElement("span");
    permitted.dataset.record = "true";
    const permittedText = document.createTextNode("Visible text");
    permitted.append(permittedText);
    expect(maskTextFn("Visible text", permittedText.parentElement)).toBe("Visible text");

    const nested = document.createElement("span");
    permitted.append(nested);
    expect(maskTextFn("Nested text", nested)).toBe("Nested text");

    const student = document.createElement("span");
    student.textContent = "Ama Student";
    outside.append(student);
    expect(maskTextFn("Ama Student", student)).toBe("*".repeat(11));
  });

  it("marks primitive labels and supports opting out", async () => {
    const { Input } = await import("../components/ui/Input");
    const { Select } = await import("../components/ui/Select");
    const { Textarea } = await import("../components/ui/Textarea");
    const { FormLabel } = await import("../components/ui/FormLabel");
    const { render } = await import("@testing-library/react");

    const { container } = render(
      <>
        <Input label="Readable input" />
        <Select label="Readable select">
          <option>One</option>
        </Select>
        <Textarea label="Readable textarea" />
        <Input label="Masked input" recordLabel={false} />
        <FormLabel>Readable form label</FormLabel>
      </>,
    );

    expect(container.querySelector('label[data-record="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('label[data-record="true"]')).toHaveLength(4);
    expect(container.querySelectorAll("label")).toHaveLength(5);
  });
});
