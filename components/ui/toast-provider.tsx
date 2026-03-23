"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type ToastTone = "success" | "error" | "warn" | "info";

type Toast = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  pushToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      pushToast: ({ tone, message }) => {
        const id = crypto.randomUUID();
        setToasts((current) => [...current, { id, tone, message }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3500);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] grid max-w-sm gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-card ${
              toast.tone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : toast.tone === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : toast.tone === "info"
                    ? "border-sky-200 bg-sky-50 text-sky-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
