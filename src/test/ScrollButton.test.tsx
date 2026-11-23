import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollButton } from "../components/ScrollButton";

describe("ScrollButton navigator", () => {
  const originalMatchMedia = window.matchMedia;
  const originalScrollTo = window.scrollTo;
  const originalRaf = window.requestAnimationFrame;
  const originalCancelRaf = window.cancelAnimationFrame;
  const originalScrollYDesc = Object.getOwnPropertyDescriptor(window, "scrollY");
  const originalInnerHeightDesc = Object.getOwnPropertyDescriptor(window, "innerHeight");
  const originalScrollHeightDesc = Object.getOwnPropertyDescriptor(
    document.documentElement,
    "scrollHeight",
  );

  let mockScrollY = 0;
  let mockInnerHeight = 800;
  let mockDocScrollHeight = 2400;
  const scrollToMock = vi.fn();

  beforeEach(() => {
    mockScrollY = 0;
    mockInnerHeight = 800;
    mockDocScrollHeight = 2400;
    scrollToMock.mockReset();

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      get: () => mockScrollY,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      get: () => mockInnerHeight,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => mockDocScrollHeight,
    });
    window.scrollTo = scrollToMock as unknown as typeof window.scrollTo;

    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = vi.fn();

    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.scrollTo = originalScrollTo;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancelRaf;

    if (originalScrollYDesc) {
      Object.defineProperty(window, "scrollY", originalScrollYDesc);
    }
    if (originalInnerHeightDesc) {
      Object.defineProperty(window, "innerHeight", originalInnerHeightDesc);
    }
    if (originalScrollHeightDesc) {
      Object.defineProperty(document.documentElement, "scrollHeight", originalScrollHeightDesc);
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stays hidden when near top or when document is not scrollable", () => {
    mockScrollY = 80;
    const { container } = render(<ScrollButton />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper.className).toContain("pointer-events-none");
    expect(wrapper.className).toContain("print:hidden");

    const topBtn = screen.getByRole("button", { name: "Scroll to top", hidden: true });
    const bottomBtn = screen.getByRole("button", { name: "Scroll to bottom", hidden: true });
    expect(topBtn).toHaveAttribute("tabindex", "-1");
    expect(bottomBtn).toHaveAttribute("tabindex", "-1");

    // Non-scrollable page stays hidden even if scrollY changes slightly
    mockDocScrollHeight = 900;
    mockScrollY = 180;
    act(() => {
      fireEvent.scroll(window);
    });
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("reveals dual top/bottom controls after scrolling past threshold and supports both directions + reduced motion", () => {
    mockScrollY = 500;
    const { container } = render(<ScrollButton />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper).toHaveAttribute("aria-hidden", "false");
    const topBtn = screen.getByRole("button", { name: "Scroll to top" });
    const bottomBtn = screen.getByRole("button", { name: "Scroll to bottom" });
    expect(topBtn).toBeEnabled();
    expect(bottomBtn).toBeEnabled();

    fireEvent.click(topBtn);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

    fireEvent.click(bottomBtn);
    expect(scrollToMock).toHaveBeenCalledWith({ top: 2400, behavior: "smooth" });

    // Near bottom disables Scroll to bottom while keeping Scroll to top active
    mockScrollY = 1590;
    act(() => {
      fireEvent.scroll(window);
    });
    expect(bottomBtn).toBeDisabled();
    expect(topBtn).toBeEnabled();

    // Honors prefers-reduced-motion
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    fireEvent.click(topBtn);
    expect(scrollToMock).toHaveBeenLastCalledWith({ top: 0, behavior: "auto" });
  });

  it("tracks an inner scroll container matching scrollTargetSelector via capture-phase scroll", () => {
    render(
      <div>
        <div data-testid="list-region" data-scroll-region="student-list" />
        <ScrollButton scrollTargetSelector='[data-scroll-region="student-list"]' />
      </div>,
    );

    const region = screen.getByTestId("list-region");
    Object.defineProperty(region, "clientHeight", { configurable: true, value: 400 });
    Object.defineProperty(region, "scrollHeight", { configurable: true, value: 1800 });
    let innerScrollTop = 320;
    Object.defineProperty(region, "scrollTop", {
      configurable: true,
      get: () => innerScrollTop,
      set: (val: number) => {
        innerScrollTop = val;
      },
    });
    const innerScrollTo = vi.fn();
    region.scrollTo = innerScrollTo as unknown as typeof region.scrollTo;

    act(() => {
      region.dispatchEvent(new Event("scroll", { bubbles: false }));
    });

    const topBtn = screen.getByRole("button", { name: "Scroll to top" });
    const bottomBtn = screen.getByRole("button", { name: "Scroll to bottom" });
    expect(topBtn).toBeEnabled();
    expect(bottomBtn).toBeEnabled();

    fireEvent.click(bottomBtn);
    expect(innerScrollTo).toHaveBeenCalledWith({ top: 1800, behavior: "smooth" });

    fireEvent.click(topBtn);
    expect(innerScrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("applies bottom-safe-nav only when hasBottomNav is true and renders statusLabel", () => {
    mockScrollY = 400;
    const { container, rerender } = render(<ScrollButton statusLabel="4 / 32" />);
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className).toContain("bottom-safe-nav");
    expect(screen.getByText("4 / 32")).toBeInTheDocument();

    rerender(<ScrollButton hasBottomNav={false} statusLabel="12 / 32" />);
    expect(wrapper.className).not.toContain("bottom-safe-nav");
    expect(screen.getByText("12 / 32")).toBeInTheDocument();
  });
});
