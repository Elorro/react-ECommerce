import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminProductsTable } from "@/components/admin/admin-products-table";
import { ToastProvider } from "@/components/ui/toast-provider";

describe("AdminProductsTable", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows inline success feedback after bulk update", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ updatedCount: 1 }),
    });

    render(
      <ToastProvider>
        <AdminProductsTable
          products={[
            {
              id: "prod_1",
              name: "Chaqueta",
              categoryName: "Outerwear",
              stock: 4,
              featured: false,
              status: "DRAFT",
              price: 100,
              slug: "chaqueta",
            },
          ]}
          categories={[{ id: "cat_1", name: "Outerwear" }]}
          filters={{ totalItems: 1 }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByLabelText("Seleccionar todos los productos visibles"));
    fireEvent.click(screen.getByText("Activar"));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Se actualizaron 1 productos.");
    });
  });
});
