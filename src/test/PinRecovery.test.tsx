import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PinRecovery } from "../components/PinRecovery";
import { saveSecurityQuestions, setupPin, verifyPin } from "../utils/pinSecurity";

describe("PinRecovery", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("resets PIN via recovery code while rejecting wrong codes, current PIN reuse, and mismatched confirms", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onCancel = vi.fn();

    await setupPin("1234", "654321");

    render(<PinRecovery onComplete={onComplete} onCancel={onCancel} />);

    // Security questions not configured -> switcher should not be shown
    expect(screen.queryByRole("tab", { name: "Security Questions" })).not.toBeInTheDocument();

    const codeInput = screen.getByPlaceholderText("000000");
    await user.type(codeInput, "111111");
    await user.click(screen.getByRole("button", { name: "Verify Code" }));

    expect(await screen.findByText(/Invalid recovery code/i)).toBeInTheDocument();

    await user.clear(codeInput);
    await user.type(codeInput, "654321");
    await user.click(screen.getByRole("button", { name: "Verify Code" }));

    expect(await screen.findByText("Create New PIN")).toBeInTheDocument();

    // Reject reusing the old PIN
    const pinInput = screen.getByPlaceholderText("••••");
    await user.type(pinInput, "1234");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("New PIN must be different from your old PIN"),
    ).toBeInTheDocument();

    // Proceed with a new PIN
    await user.clear(pinInput);
    await user.type(pinInput, "5678");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Confirm New PIN")).toBeInTheDocument();

    // Reject mismatched confirmation PIN
    const confirmInput = screen.getByPlaceholderText("••••");
    await user.type(confirmInput, "9999");
    await user.click(screen.getByRole("button", { name: "Reset PIN" }));

    expect(await screen.findByText("PINs do not match")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    // Matching confirm resets PIN cleanly
    await user.clear(confirmInput);
    await user.type(confirmInput, "5678");
    await user.click(screen.getByRole("button", { name: "Reset PIN" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(await verifyPin("5678")).toBe(true);
    expect(await verifyPin("1234")).toBe(false);
  });

  it("resets PIN via security questions only when at least 2 of 3 answers match", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    await setupPin("1234", "654321");
    await saveSecurityQuestions([
      { questionId: "hometown", answer: "Takoradi" },
      { questionId: "first_subject", answer: "Mathematics" },
      { questionId: "favorite_dish", answer: "Jollof" },
    ]);

    render(<PinRecovery onComplete={onComplete} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: "Security Questions" }));

    const answer1 = screen.getByPlaceholderText("e.g., Takoradi");
    const answer2 = screen.getByPlaceholderText("e.g., Mathematics");
    const answer3 = screen.getAllByRole("textbox")[2];

    // Only 1 correct answer -> rejected
    await user.type(answer1, "takoradi");
    await user.type(answer2, "Wrong");
    await user.type(answer3, "Wrong");
    await user.click(screen.getByRole("button", { name: "Verify Answers" }));

    expect(
      await screen.findByText("Only 1/3 correct. You need at least 2 correct answers."),
    ).toBeInTheDocument();

    // 2 of 3 correct answers (case-insensitive / trimmed) -> accepted
    await user.clear(answer2);
    await user.type(answer2, " mathematics ");
    await user.click(screen.getByRole("button", { name: "Verify Answers" }));

    expect(await screen.findByText("Create New PIN")).toBeInTheDocument();

    const newPinInput = screen.getByPlaceholderText("••••");
    await user.type(newPinInput, "4321");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Confirm New PIN")).toBeInTheDocument();
    const confirmInput = screen.getByPlaceholderText("••••");
    await user.type(confirmInput, "4321");
    await user.click(screen.getByRole("button", { name: "Reset PIN" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(await verifyPin("4321")).toBe(true);
  });
});
