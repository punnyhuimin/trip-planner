"use client";

import { useEffect } from "react";

export type ToastMessage = { id: number; text: string; tone: "error" | "info" };

type Props = { toast: ToastMessage | null; onDismiss: () => void };

/** One message at a time, bottom of the screen, announced to screen readers. */
export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, toast.tone === "error" ? 6000 : 3000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6"
    >
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.tone === "error" ? "bg-danger text-white" : "bg-ink text-paper"
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded px-1 opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
