import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./LoginPage";
import { renderWithProviders, mockFetchResponse } from "../test/test-utils";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = mockFetchResponse(
      { code: "UNAUTHORIZED", message: "Unauthorized", correlationId: "c1" },
      401,
    );
  });

  it("renders email and password fields with labels", async () => {
    await act(async () => {
      renderWithProviders(<LoginPage />);
    });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation errors for empty submission", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInvalid();
    });
  });

  it("submits credentials to login API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: () =>
          Promise.resolve({ code: "UNAUTHORIZED", message: "Unauthorized", correlationId: "c1" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () =>
          Promise.resolve({
            user: {
              id: "user-1",
              email: "sales@demo.orderflow.local",
              name: "Alex Rivera",
              role: "SALES",
            },
          }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "sales@demo.orderflow.local");
    await user.type(screen.getByLabelText(/password/i), "Demo@12345");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          body: JSON.stringify({
            email: "sales@demo.orderflow.local",
            password: "Demo@12345",
          }),
        }),
      );
    });
  });

  it("displays error message on failed login", async () => {
    const user = userEvent.setup();
    global.fetch = mockFetchResponse(
      { code: "INVALID_CREDENTIALS", message: "Invalid credentials", correlationId: "abc-123" },
      401,
    );

    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), "wrong@demo.orderflow.local");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid credentials/i);
    });
  });
});
