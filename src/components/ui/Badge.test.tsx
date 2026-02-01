// Badge.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("should render children correctly", () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText("Test Badge")).toBeInTheDocument();
  });

  it("should apply default variant styles", () => {
    render(<Badge variant="default">Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge).toHaveClass("bg-gray-100");
    expect(badge).toHaveClass("text-gray-700");
  });

  it("should apply primary variant styles", () => {
    render(<Badge variant="primary">Primary</Badge>);
    const badge = screen.getByText("Primary");
    expect(badge).toHaveClass("bg-purple-100");
    expect(badge).toHaveClass("text-purple-700");
  });

  it("should apply success variant styles", () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText("Success");
    expect(badge).toHaveClass("bg-green-100");
    expect(badge).toHaveClass("text-green-700");
  });

  it("should apply warning variant styles", () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText("Warning");
    expect(badge).toHaveClass("bg-yellow-100");
    expect(badge).toHaveClass("text-yellow-700");
  });

  it("should apply error variant styles", () => {
    render(<Badge variant="error">Error</Badge>);
    const badge = screen.getByText("Error");
    expect(badge).toHaveClass("bg-red-100");
    expect(badge).toHaveClass("text-red-700");
  });

  it("should apply info variant styles", () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText("Info");
    expect(badge).toHaveClass("bg-blue-100");
    expect(badge).toHaveClass("text-blue-700");
  });

  it("should apply small size styles", () => {
    render(<Badge size="sm">Small</Badge>);
    const badge = screen.getByText("Small");
    expect(badge).toHaveClass("text-xs");
  });

  it("should apply medium size styles", () => {
    render(<Badge size="md">Medium</Badge>);
    const badge = screen.getByText("Medium");
    expect(badge).toHaveClass("text-xs");
  });

  it("should apply large size styles", () => {
    render(<Badge size="lg">Large</Badge>);
    const badge = screen.getByText("Large");
    expect(badge).toHaveClass("text-sm");
  });

  it("should apply custom className", () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    const badge = screen.getByText("Custom");
    expect(badge).toHaveClass("custom-badge");
  });

  it("should render with icon", () => {
    const Icon = () => <svg data-testid="badge-icon" />;
    render(
      <Badge>
        <Icon /> With Icon
      </Badge>,
    );
    expect(screen.getByTestId("badge-icon")).toBeInTheDocument();
  });

  it("should render as span element", () => {
    const { container } = render(<Badge>Span Badge</Badge>);
    expect(container.querySelector("span")).toBeInTheDocument();
  });
});
