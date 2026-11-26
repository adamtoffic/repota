import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LockScreen } from "../components/LockScreen";
import { PinRecovery } from "../components/PinRecovery";
import { PinSetup } from "../components/PinSetup";
import {
  clearPinLockout,
  disablePinLock,
  generateRecoveryCode,
  getPinLockoutStatus,
  isSameAsCurrentPin,
  recordFailedPinAttempt,
  saveSecurityQuestions,
  setupPin,
  verifyPin,
  verifyRecoveryCode,
  verifySecurityAnswers,
} from "../utils/pinSecurity";

async function legacySha256Hex(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("pinSecurity", () => {
  beforeEach(() => {
    localStorage.clear();
    clearPinLockout();
  });

  it("hashes PINs and recovery codes with salted PBKDF2 rather than unsalted SHA-256", async () => {
    await setupPin("1234", "654321");
    const firstHash = localStorage.getItem("app_pin_hash")!;
    const recoveryHash = localStorage.getItem("recovery_code_hash")!;

    expect(firstHash.startsWith("v2:pbkdf2$100000$")).toBe(true);
    expect(recoveryHash.startsWith("v2:pbkdf2$100000$")).toBe(true);
    expect(await verifyPin("1234")).toBe(true);
    expect(await verifyPin("9999")).toBe(false);
    expect(await isSameAsCurrentPin("1234")).toBe(true);
    expect(await isSameAsCurrentPin("4321")).toBe(false);
    expect(await verifyRecoveryCode("654321")).toBe(true);

    // Setting the same PIN produces a distinct salted digest
    await setupPin("1234", "654321");
    expect(localStorage.getItem("app_pin_hash")).not.toBe(firstHash);
  });

  it("verifies legacy unsalted SHA-256 hashes and upgrades them transparently", async () => {
    localStorage.setItem("app_pin_hash", await legacySha256Hex("4820"));
    localStorage.setItem("recovery_code_hash", await legacySha256Hex("778899"));
    localStorage.setItem(
      "security_questions",
      JSON.stringify([
        { questionId: "q1", answerHash: await legacySha256Hex("kumasi") },
        { questionId: "q2", answerHash: await legacySha256Hex("banku") },
        { questionId: "q3", answerHash: await legacySha256Hex("cat") },
      ]),
    );

    expect(await isSameAsCurrentPin("4820")).toBe(true);
    expect(await verifyPin("4820")).toBe(true);
    expect(localStorage.getItem("app_pin_hash")?.startsWith("v2:pbkdf2$")).toBe(true);

    expect(await verifyRecoveryCode("778899")).toBe(true);
    expect(localStorage.getItem("recovery_code_hash")?.startsWith("v2:pbkdf2$")).toBe(true);

    const secResult = await verifySecurityAnswers([
      { questionId: "q1", answer: " Kumasi " },
      { questionId: "q2", answer: "BANKU" },
      { questionId: "q3", answer: "wrong" },
    ]);
    expect(secResult).toEqual({ verified: true, correctCount: 2 });
    const upgraded = JSON.parse(localStorage.getItem("security_questions")!) as Array<{
      questionId: string;
      answerHash: string;
    }>;
    expect(upgraded[0].answerHash.startsWith("v2:pbkdf2$")).toBe(true);
    expect(upgraded[1].answerHash.startsWith("v2:pbkdf2$")).toBe(true);
    expect(upgraded[2].answerHash.startsWith("v2:pbkdf2$")).toBe(false);
  });

  it("saves security questions with salted hashes and cleans all keys on disablePinLock", async () => {
    await setupPin("1122", "334455");
    await saveSecurityQuestions([
      { questionId: "a", answer: "Accra" },
      { questionId: "b", answer: "Waakye" },
      { questionId: "c", answer: "Lion" },
    ]);
    recordFailedPinAttempt();

    disablePinLock();
    expect(localStorage.getItem("app_pin_hash")).toBeNull();
    expect(localStorage.getItem("recovery_code_hash")).toBeNull();
    expect(localStorage.getItem("security_questions")).toBeNull();
    expect(getPinLockoutStatus().failedAttempts).toBe(0);
  });

  it("generates unbiased 6-digit recovery codes using crypto.getRandomValues", () => {
    const spy = vi.spyOn(crypto, "getRandomValues");
    try {
      for (let i = 0; i < 10; i++) {
        const code = generateRecoveryCode();
        expect(code).toMatch(/^\d{6}$/);
        expect(Number(code)).toBeGreaterThanOrEqual(100_000);
        expect(Number(code)).toBeLessThanOrEqual(999_999);
      }
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("enforces exponential failed-attempt cooldown and resets cleanly on unlock", async () => {
    await setupPin("2468", "111222");

    for (let i = 0; i < 4; i++) {
      const s = recordFailedPinAttempt();
      expect(s.isLockedOut).toBe(false);
    }

    const fifth = recordFailedPinAttempt();
    expect(fifth.isLockedOut).toBe(true);
    expect(fifth.remainingMs).toBeGreaterThan(25_000);
    expect(fifth.remainingMs).toBeLessThanOrEqual(30_000);

    const sixth = recordFailedPinAttempt();
    expect(sixth.remainingMs).toBeGreaterThan(55_000);
    expect(sixth.remainingMs).toBeLessThanOrEqual(60_000);

    expect(await verifyPin("2468")).toBe(true);
    expect(getPinLockoutStatus()).toEqual({ isLockedOut: false, remainingMs: 0, failedAttempts: 0 });
  });

  it("disables PIN input during LockScreen cooldown while keeping Forgot PIN available", async () => {
    await setupPin("1357", "999888");
    const onUnlock = vi.fn();
    const onForgotPin = vi.fn();

    render(<LockScreen onUnlock={onUnlock} onForgotPin={onForgotPin} />);

    // Allow initial mount delay timer (500ms) to settle inside act()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
    });

    // Enter 5 wrong attempts via input change + timer advance
    const input = screen.getByPlaceholderText("••••") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "password");
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        fireEvent.change(input, { target: { value: "0000" } });
        await new Promise((resolve) => setTimeout(resolve, 150));
      });
      await waitFor(() => expect(getPinLockoutStatus().failedAttempts).toBe(i + 1));
    }

    expect(await screen.findByText(/too many incorrect attempts/i)).toBeVisible();
    expect(input).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /forgot your pin/i }));
    expect(onForgotPin).toHaveBeenCalledTimes(1);

    // Flush shake reset timer (450ms) inside act() before teardown
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    });
  });

  it("lets PinSetup complete setup when skipping optional security questions and uses bg-black/50 in PinRecovery", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(<PinSetup onComplete={onComplete} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Get Started" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("••••"), "1357");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText("••••"), "1357");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Next: Set Security Questions/i }));

    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(await verifyPin("1357")).toBe(true);

    const { container } = render(<PinRecovery onComplete={vi.fn()} onCancel={vi.fn()} />);
    const dialogBackdrop = container.querySelector('[role="dialog"]');
    expect(dialogBackdrop?.className).toContain("bg-black/50");
    expect(dialogBackdrop?.className).not.toContain("bg-opacity-50");
  });

  it("unlocks via built-in keypad digits, supports Backspace, and ignores keydown when paused", async () => {
    await setupPin("1357", "999888");
    const user = userEvent.setup();
    const onUnlock = vi.fn();

    const { rerender } = render(
      <LockScreen paused={true} onUnlock={onUnlock} onForgotPin={vi.fn()} />,
    );

    // Global keystrokes do not trigger digits while PinRecovery overlays LockScreen
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "7" });
    const pinInput = screen.getByPlaceholderText("••••") as HTMLInputElement;
    expect(pinInput.value).toBe("");

    rerender(<LockScreen paused={false} onUnlock={onUnlock} onForgotPin={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "9" }));
    await user.click(screen.getByRole("button", { name: "Delete digit" }));
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: "7" }));

    await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1));
  });
});
