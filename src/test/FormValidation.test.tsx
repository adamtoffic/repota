// FormValidation.test.tsx - Tests for form validation patterns
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../components/ui/Input";

describe("Form Validation Patterns", () => {
  describe("Required Fields", () => {
    it("should mark input as required", () => {
      render(<Input label="School Name" required />);

      const input = screen.getByRole("textbox");
      expect(input).toBeRequired();
    });

    it("should render required indicator in label", () => {
      render(<Input label="Email Address" required />);

      expect(screen.getByText(/email address/i)).toBeInTheDocument();
    });

    it("should mark multiple required fields", () => {
      render(
        <form>
          <Input label="First Name" required />
          <Input label="Last Name" required />
          <Input label="Email" required />
        </form>,
      );

      const inputs = screen.getAllByRole("textbox");
      inputs.forEach((input) => {
        expect(input).toBeRequired();
      });
    });
  });

  describe("Min/Max Validation", () => {
    it("should set minimum value for number input", () => {
      render(<Input label="Age" type="number" min="0" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "0");
    });

    it("should set maximum value for number input", () => {
      render(<Input label="Score" type="number" max="100" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("max", "100");
    });

    it("should set both min and max", () => {
      render(<Input label="Percentage" type="number" min="0" max="100" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
    });

    it("should handle negative minimum values", () => {
      render(<Input label="Temperature" type="number" min="-10" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "-10");
    });
  });

  describe("Email Validation", () => {
    it("should use email input type", () => {
      const { container } = render(<Input label="Email" type="email" />);

      const input = container.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });

    it("should support required email", () => {
      const { container } = render(<Input label="Email" type="email" required />);

      const input = container.querySelector('input[type="email"]');
      expect(input).toBeRequired();
    });
  });

  describe("Text Length Validation", () => {
    it("should set minimum length", () => {
      const { container } = render(<Input label="Password" type="password" minLength={8} />);

      const input = container.querySelector('input[type="password"]');
      expect(input).toHaveAttribute("minLength", "8");
    });

    it("should set maximum length", () => {
      render(<Input label="Username" maxLength={20} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("maxLength", "20");
    });

    it("should set both min and max length", () => {
      render(<Input label="Code" minLength={4} maxLength={6} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("minLength", "4");
      expect(input).toHaveAttribute("maxLength", "6");
    });
  });

  describe("Number Step Validation", () => {
    it("should set step value", () => {
      render(<Input label="Price" type="number" step="0.01" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("step", "0.01");
    });

    it("should handle integer step", () => {
      render(<Input label="Quantity" type="number" step="1" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("step", "1");
    });
  });

  describe("Pattern Validation", () => {
    it("should set pattern attribute", () => {
      render(<Input label="Phone" pattern="[0-9]{10}" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("pattern", "[0-9]{10}");
    });

    it("should combine pattern with required", () => {
      render(<Input label="Postal Code" pattern="[0-9]{5}" required />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("pattern", "[0-9]{5}");
      expect(input).toBeRequired();
    });
  });

  describe("Disabled State", () => {
    it("should disable input", () => {
      render(<Input label="Locked Field" disabled />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("should not allow interaction when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input label="Disabled" disabled onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "test");

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe("Readonly State", () => {
    it("should set readonly attribute", () => {
      render(<Input label="Read Only" readOnly value="Cannot edit" />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("readonly");
    });

    it("should display readonly value", () => {
      render(<Input label="System ID" readOnly value="12345" />);

      expect(screen.getByDisplayValue("12345")).toBeInTheDocument();
    });
  });

  describe("Controlled Input Validation", () => {
    it("should validate controlled input value", () => {
      render(<Input label="Name" value="John Doe" onChange={() => {}} />);

      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    it("should handle empty controlled value", () => {
      render(<Input label="Name" value="" onChange={() => {}} />);

      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("");
    });

    it("should update on change", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input label="Input" value="" onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "test");

      expect(handleChange).toHaveBeenCalled();
    });
  });
});
