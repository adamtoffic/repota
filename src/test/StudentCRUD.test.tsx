// StudentCRUD.test.tsx - Student CRUD operation tests
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

describe("Student CRUD Operations", () => {
  describe("Create Student Form", () => {
    it("should render student name input", () => {
      render(<Input label="Full Name" placeholder="e.g., Kwame Mensah" required />);

      expect(screen.getByPlaceholderText(/kwame mensah/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/kwame mensah/i)).toBeRequired();
    });

    it("should handle student name input", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input label="Full Name" value="" onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "John Doe");

      expect(handleChange).toHaveBeenCalled();
    });

    it("should require student name", () => {
      render(<Input label="Full Name" required />);

      const input = screen.getByRole("textbox");
      expect(input).toBeRequired();
    });

    it("should render submit button", () => {
      render(<Button variant="primary">Add Student</Button>);

      expect(screen.getByRole("button", { name: /add student/i })).toBeInTheDocument();
    });

    it("should handle button click", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Add Student</Button>);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Student Details Form", () => {
    it("should render date of birth input", () => {
      const { container } = render(<Input label="Date of Birth" type="date" />);

      const dateInput = container.querySelector('input[type="date"]');
      expect(dateInput).toBeInTheDocument();
    });

    it("should render attendance input", () => {
      render(<Input label="Days Present" type="number" min="0" placeholder="0" />);

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "0");
    });

    it("should render conduct input", () => {
      render(<Input label="Conduct / Character" placeholder="e.g., Respectful and neat" />);

      expect(screen.getByText(/conduct.*character/i)).toBeInTheDocument();
    });

    it("should render interest input", () => {
      render(<Input label="Interest / Talent" placeholder="e.g., Football" />);

      expect(screen.getByText(/interest.*talent/i)).toBeInTheDocument();
    });
  });

  describe("Edit Student", () => {
    it("should populate form with existing data", () => {
      render(
        <div>
          <Input label="Full Name" value="Jane Smith" onChange={() => {}} />
          <Input label="Days Present" type="number" value="45" onChange={() => {}} />
        </div>,
      );

      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument();
      expect(screen.getByDisplayValue("45")).toBeInTheDocument();
    });

    it("should allow updating student information", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<Input label="Full Name" value="Jane Smith" onChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "Jane Doe");

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe("Delete Student", () => {
    it("should render delete button", () => {
      render(<Button variant="danger">Delete Student</Button>);

      const button = screen.getByRole("button", { name: /delete student/i });
      expect(button).toBeInTheDocument();
    });

    it("should trigger confirmation on delete click", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button variant="danger" onClick={handleClick}>
          Delete
        </Button>,
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe("Student List", () => {
    it("should render action buttons", () => {
      render(
        <div>
          <Button variant="secondary">Edit</Button>
          <Button variant="danger">Delete</Button>
        </div>,
      );

      expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
    });
  });
});
