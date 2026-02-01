// IconButton.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./IconButton";

const TestIcon = () => <svg data-testid="test-icon" />;

describe("IconButton", () => {
  it("should render icon correctly", () => {
    render(
      <IconButton aria-label="Test button">
        <TestIcon />
      </IconButton>,
    );
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("should require aria-label prop", () => {
    render(
      <IconButton aria-label="Accessible button">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Accessible button" });
    expect(button).toBeInTheDocument();
  });

  it("should handle click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <IconButton aria-label="Click me" onClick={handleClick}>
        <TestIcon />
      </IconButton>,
    );

    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should be disabled when disabled prop is true", () => {
    render(
      <IconButton aria-label="Disabled" disabled>
        <TestIcon />
      </IconButton>,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should show loading state", () => {
    render(
      <IconButton aria-label="Loading" isLoading>
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    // Loading spinner should be visible
    expect(button.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should apply primary variant styles", () => {
    render(
      <IconButton aria-label="Primary" variant="primary">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-primary");
  });

  it("should apply secondary variant styles", () => {
    render(
      <IconButton aria-label="Secondary" variant="secondary">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-gray-100");
  });

  it("should apply danger variant styles", () => {
    render(
      <IconButton aria-label="Danger" variant="danger">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-red-600");
  });

  it("should apply ghost variant styles", () => {
    render(
      <IconButton aria-label="Ghost" variant="ghost">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("hover:bg-gray-100");
  });

  it("should apply small size styles", () => {
    render(
      <IconButton aria-label="Small" size="sm">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-8");
    expect(button).toHaveClass("w-8");
  });

  it("should apply medium size styles", () => {
    render(
      <IconButton aria-label="Medium" size="md">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-10");
    expect(button).toHaveClass("w-10");
  });

  it("should apply large size styles", () => {
    render(
      <IconButton aria-label="Large" size="lg">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-12");
    expect(button).toHaveClass("w-12");
  });

  it("should apply custom className", () => {
    render(
      <IconButton aria-label="Custom" className="custom-icon-btn">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-icon-btn");
  });

  it("should be keyboard accessible", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <IconButton aria-label="Keyboard" onClick={handleClick}>
        <TestIcon />
      </IconButton>,
    );

    const button = screen.getByRole("button");
    button.focus();

    await user.keyboard("{Enter}");
    expect(handleClick).toHaveBeenCalled();
  });

  it("should be rounded", () => {
    render(
      <IconButton aria-label="Rounded">
        <TestIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("rounded-lg");
  });
});
