// Input.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("should render input with label", () => {
    render(<Input label="Full Name" />);
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("should render input without label", () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    expect(screen.queryByText("Full Name")).not.toBeInTheDocument();
  });

  it("should handle value changes", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input label="Name" value="" onChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "John");

    expect(handleChange).toHaveBeenCalled();
  });

  it("should render required indicator when required", () => {
    render(<Input label="Email" required />);
    expect(screen.getByText("*")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeRequired();
  });

  it("should apply custom className", () => {
    render(<Input label="Name" className="custom-class" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("custom-class");
  });

  it("should render with different input types", () => {
    const { rerender, container } = render(<Input label="Email" type="email" />);
    let input = container.querySelector('input[type="email"]');
    expect(input).toBeInTheDocument();

    rerender(<Input label="Password" type="password" />);
    input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();

    rerender(<Input label="Age" type="number" />);
    input = container.querySelector('input[type="number"]');
    expect(input).toBeInTheDocument();
  });

  it("should render with placeholder", () => {
    render(<Input label="Name" placeholder="Enter your name" />);
    expect(screen.getByPlaceholderText("Enter your name")).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("should handle autoFocus", () => {
    render(<Input label="Name" autoFocus />);
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("should render with ReactNode label", () => {
    const complexLabel = (
      <span className="flex justify-between">
        <span>Field Name</span>
        <button type="button">Action</button>
      </span>
    );
    render(<Input label={complexLabel} />);
    expect(screen.getByText("Field Name")).toBeInTheDocument();
    // Button is inside label, so it's accessible by its text content
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  it("should handle numeric inputMode", () => {
    render(<Input label="Phone" type="number" inputMode="numeric" />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  it("should apply min and max attributes for number inputs", () => {
    render(<Input label="Age" type="number" min="0" max="100" />);
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");
  });

  it("should handle maxLength attribute", () => {
    render(<Input label="Code" type="text" maxLength={4} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("maxLength", "4");
  });

  it("should render date input correctly", () => {
    const { container } = render(<Input label="Date of Birth" type="date" />);
    const input = container.querySelector('input[type="date"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "date");
  });

  it("should pass through additional props", () => {
    render(<Input label="Name" data-testid="custom-input" aria-label="Custom Input" />);
    const input = screen.getByTestId("custom-input");
    expect(input).toHaveAttribute("aria-label", "Custom Input");
  });

  it("should render controlled input correctly", () => {
    const { rerender } = render(<Input label="Name" value="John" onChange={() => {}} />);
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();

    rerender(<Input label="Name" value="Jane" onChange={() => {}} />);
    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
  });
});
