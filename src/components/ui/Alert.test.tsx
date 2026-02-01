// Alert.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("should render children correctly", () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByText("Alert message")).toBeInTheDocument();
  });

  it("should render title when provided", () => {
    render(<Alert title="Alert Title">Message</Alert>);
    expect(screen.getByText("Alert Title")).toBeInTheDocument();
  });

  it("should apply info variant styles by default", () => {
    const { container } = render(<Alert>Info</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveClass("bg-blue-50");
    expect(alert).toHaveClass("border-blue-200");
  });

  it("should apply success variant styles", () => {
    const { container } = render(<Alert variant="success">Success</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveClass("bg-green-50");
    expect(alert).toHaveClass("border-green-200");
  });

  it("should apply warning variant styles", () => {
    const { container } = render(<Alert variant="warning">Warning</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveClass("bg-yellow-50");
    expect(alert).toHaveClass("border-yellow-200");
  });

  it("should apply error variant styles", () => {
    const { container } = render(<Alert variant="error">Error</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveClass("bg-red-50");
    expect(alert).toHaveClass("border-red-200");
  });

  it("should render Info icon for info variant", () => {
    render(<Alert variant="info">Info</Alert>);
    // The icon is rendered, check if it exists via class or test-id
    const { container } = render(<Alert variant="info">Info</Alert>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render CheckCircle icon for success variant", () => {
    const { container } = render(<Alert variant="success">Success</Alert>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render AlertTriangle icon for warning variant", () => {
    const { container } = render(<Alert variant="warning">Warning</Alert>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render XCircle icon for error variant", () => {
    const { container } = render(<Alert variant="error">Error</Alert>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should show dismiss button when onDismiss is provided", () => {
    const handleDismiss = vi.fn();
    render(<Alert onDismiss={handleDismiss}>Dismissible</Alert>);
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("should call onDismiss when dismiss button is clicked", async () => {
    const handleDismiss = vi.fn();
    const user = userEvent.setup();

    render(<Alert onDismiss={handleDismiss}>Dismissible</Alert>);

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it("should not show dismiss button when onDismiss is not provided", () => {
    render(<Alert>Not dismissible</Alert>);
    expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<Alert className="custom-alert">Custom</Alert>);
    const alert = container.firstChild as HTMLElement;
    expect(alert).toHaveClass("custom-alert");
  });

  it("should render title as ReactNode", () => {
    render(<Alert title={<strong>Strong Title</strong>}>Message</Alert>);
    expect(screen.getByText("Strong Title")).toBeInTheDocument();
    expect(screen.getByText("Strong Title").tagName).toBe("STRONG");
  });

  it("should have accessible structure", () => {
    render(<Alert title="Title">Message</Alert>);
    // Alert should be a div with proper content
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
  });
});
