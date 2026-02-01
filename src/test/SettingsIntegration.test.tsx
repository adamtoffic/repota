// SettingsIntegration.test.tsx - Integration tests for Settings page
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../components/ui/Input";

describe("Settings Page Input Integration", () => {
  describe("Input Component in Forms", () => {
    it("should handle form input changes", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input label="School Name" value="" onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "Test School");

      expect(handleChange).toHaveBeenCalled();
    });

    it("should show required indicator for required fields", () => {
      render(<Input label="School Name" required />);

      expect(screen.getByText("*")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeRequired();
    });

    it("should handle numeric inputs for settings", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input label="Class Size" type="number" value="30" onChange={handleChange} />);

      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "35");

      expect(handleChange).toHaveBeenCalled();
    });

    it("should handle multiple text inputs in a form", () => {
      render(
        <div>
          <Input label="School Name" value="Test School" onChange={() => {}} />
          <Input label="School Motto" value="Excellence" onChange={() => {}} />
          <Input label="Address" value="123 Main St" onChange={() => {}} />
        </div>,
      );

      expect(screen.getByDisplayValue("Test School")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Excellence")).toBeInTheDocument();
      expect(screen.getByDisplayValue("123 Main St")).toBeInTheDocument();
    });

    it("should handle date inputs for academic session", () => {
      const { container } = render(
        <Input label="Term Start Date" type="date" value="2024-01-15" onChange={() => {}} />,
      );

      const dateInput = container.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveValue("2024-01-15");
    });
  });

  describe("Form Validation", () => {
    it("should respect required attribute", () => {
      render(<Input label="Required Field" required />);

      const input = screen.getByRole("textbox");
      expect(input).toBeRequired();
    });

    it("should respect min/max for numeric inputs", () => {
      render(<Input label="Score" type="number" min="0" max="100" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
    });

    it("should respect maxLength for text inputs", () => {
      render(<Input label="Code" maxLength={10} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("maxLength", "10");
    });
  });

  describe("Controlled Input Behavior", () => {
    it("should update when value prop changes", () => {
      const { rerender } = render(<Input label="Name" value="John" onChange={() => {}} />);

      expect(screen.getByDisplayValue("John")).toBeInTheDocument();

      rerender(<Input label="Name" value="Jane" onChange={() => {}} />);

      expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
      expect(screen.queryByDisplayValue("John")).not.toBeInTheDocument();
    });

    it("should handle empty values", () => {
      render(<Input label="Name" value="" onChange={() => {}} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });
  });
});
