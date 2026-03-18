import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOrdersTable } from "@/components/admin/admin-orders-table";
import { ToastProvider } from "@/components/ui/toast-provider";

describe("AdminOrdersTable", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows inline error feedback when running bulk action without selection", async () => {
    render(
      <ToastProvider>
        <AdminOrdersTable
          orders={[
            {
              id: "ord_1",
              customerName: "Luis",
              customerEmail: "luis@example.com",
              status: "PENDING",
              paymentStatus: "UNPAID",
              paymentExpiresAt: null,
              totalAmount: 50,
              itemCount: 1,
              createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            },
          ]}
          filters={{ totalItems: 1 }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Marcar pagadas"));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Selecciona al menos una orden.",
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
