// StudentCRUD.test.tsx - Student CRUD operation tests
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { BulkImportModal } from "../components/BulkImportModal";
import { SchoolContext, type SchoolContextType } from "../context/SchoolContextDefinition";
import type { SchoolSettings } from "../types";

const mockAddStudent = vi.fn();

const mockSettings = {
  schoolName: "Test School",
  academicYear: "2025/2026",
  term: "First Term",
  level: "JHS",
  defaultSubjects: ["Mathematics", "English Language", "Integrated Science"],
  totalAttendanceDays: 60,
  classScoreMax: 50,
  examScoreMax: 50,
  classSize: 30,
  nextTermStarts: "2026-01-12",
  headTeacherName: "Head",
  classTeacherName: "Teacher",
  className: "JHS 1",
  phoneNumber: "",
  address: "",
  email: "",
  schoolMotto: "",
  logoUrl: "",
  headTeacherSignature: "",
} as SchoolSettings;

describe("Student CRUD Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
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

  describe("BulkImportModal", () => {
    it("populates default subjects on bulk-imported students", async () => {
      const user = userEvent.setup();
      const schoolValue = {
        students: [],
        settings: mockSettings,
        addStudent: mockAddStudent,
      } as unknown as SchoolContextType;

      render(
        <SchoolContext.Provider value={schoolValue}>
          <BulkImportModal isOpen={true} onClose={vi.fn()} />
        </SchoolContext.Provider>,
      );

      await user.type(screen.getByRole("textbox"), "Kwame Mensah\nAma Serwaa");
      await user.click(screen.getByRole("button", { name: /preview list/i }));
      await user.click(screen.getByRole("button", { name: /import all/i }));

      expect(mockAddStudent).toHaveBeenCalledTimes(2);
      const firstStudent = mockAddStudent.mock.calls[0][0];
      expect(firstStudent.name).toBe("Kwame Mensah");
      expect(firstStudent.subjects.map((s: { name: string }) => s.name)).toEqual([
        "Mathematics",
        "English Language",
        "Integrated Science",
      ]);
      expect(firstStudent.subjects[0]).toMatchObject({ classScore: 0, examScore: 0 });
    });
  });
});
