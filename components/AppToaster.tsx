"use client";

// Implements: REQ-TOAST-01, REQ-TOAST-03
import { Toaster as SonnerToaster } from "sonner";
import { CheckCircle, CircleNotch, Info, WarningCircle } from "@phosphor-icons/react";

export function AppToaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      richColors
      closeButton
      duration={3500}
      icons={{
        success: <CheckCircle size={18} weight="fill" className="text-emerald-600" />,
        info: <Info size={18} weight="fill" className="text-[oklch(0.48_0.18_255)]" />,
        warning: <WarningCircle size={18} weight="fill" className="text-amber-600" />,
        error: <WarningCircle size={18} weight="fill" className="text-rose-600" />,
        loading: <CircleNotch size={18} className="animate-spin text-[oklch(0.48_0.18_255)]" />,
      }}
      toastOptions={{
        className: "ceoubb-toast",
        style: {
          fontFamily: "var(--font-manrope), system-ui, sans-serif",
          borderRadius: "0.75rem",
          borderColor: "oklch(0.92 0.006 60)",
          boxShadow:
            "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
        },
      }}
    />
  );
}
