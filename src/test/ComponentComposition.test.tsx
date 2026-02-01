// ComponentComposition.test.tsx - Tests for component composition patterns
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

describe("Component Composition", () => {
  describe("Input with Button", () => {
    it("should render input and submit button together", () => {
      render(
        <form>
          <Input label="School Name" placeholder="Enter school name" />
          <Button variant="primary">Save</Button>
        </form>,
      );

      expect(screen.getByPlaceholderText(/enter school name/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });

    it("should handle form submission", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" />
          <Button type="submit">Submit</Button>
        </form>,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe("Input with Alert", () => {
    it("should render input with error alert", () => {
      render(
        <div>
          <Input label="Student Name" />
          <Alert variant="error">Student name is required</Alert>
        </div>,
      );

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(1);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/student name is required/i)).toBeInTheDocument();
    });

    it("should render input with success alert", () => {
      const { container } = render(
        <div>
          <Input label="Password" type="password" />
          <Alert variant="success">Password saved successfully</Alert>
        </div>,
      );

      const passwordInput = container.querySelector('input[type="password"]');
      expect(passwordInput).toBeInTheDocument();
      expect(screen.getByText(/password saved successfully/i)).toBeInTheDocument();
    });
  });

  describe("Multiple Inputs in Form", () => {
    it("should render multiple inputs with labels", () => {
      render(
        <form>
          <Input label="First Name" />
          <Input label="Last Name" />
          <Input label="Email" type="email" />
        </form>,
      );

      expect(screen.getByText(/first name/i)).toBeInTheDocument();
      expect(screen.getByText(/last name/i)).toBeInTheDocument();
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    it("should handle multiple controlled inputs", async () => {
      const user = userEvent.setup();
      const handleFirstName = vi.fn();
      const handleLastName = vi.fn();

      render(
        <div>
          <Input label="First Name" value="" onChange={handleFirstName} />
          <Input label="Last Name" value="" onChange={handleLastName} />
        </div>,
      );

      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[0], "John");
      await user.type(inputs[1], "Doe");

      expect(handleFirstName).toHaveBeenCalled();
      expect(handleLastName).toHaveBeenCalled();
    });

    it("should render different input types in same form", () => {
      const { container } = render(
        <form>
          <Input label="Name" type="text" />
          <Input label="Age" type="number" />
          <Input label="Birth Date" type="date" />
          <Input label="Email" type="email" />
        </form>,
      );

      expect(screen.getByText(/^Name$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Age$/i)).toBeInTheDocument();
      expect(container.querySelector('input[type="date"]')).toBeInTheDocument();
      expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
    });
  });

  describe("Action Buttons Group", () => {
    it("should render multiple action buttons", () => {
      render(
        <div>
          <Button variant="primary">Save</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>,
      );

      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });

    it("should handle multiple button clicks", async () => {
      const user = userEvent.setup();
      const handleSave = vi.fn();
      const handleCancel = vi.fn();

      render(
        <div>
          <Button onClick={handleSave}>Save</Button>
          <Button onClick={handleCancel}>Cancel</Button>
        </div>,
      );

      await user.click(screen.getByRole("button", { name: /save/i }));
      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });
  });
});
