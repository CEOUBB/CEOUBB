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
        success: (
          <CheckCircle size={18} weight="fill" className="text-emerald-600" aria-hidden="true" />
        ),
        info: (
          <Info size={18} weight="fill" className="text-(--color-primary)" aria-hidden="true" />
        ),
        warning: (
          <WarningCircle size={18} weight="fill" className="text-amber-600" aria-hidden="true" />
        ),
        error: (
          <WarningCircle size={18} weight="fill" className="text-rose-600" aria-hidden="true" />
        ),
        loading: (
          <CircleNotch
            size={18}
            className="animate-spin text-(--color-primary)"
            aria-hidden="true"
          />
        ),
      }}
      toastOptions={{
        className: "ceoubb-toast",
        classNames: { closeButton: "ceoubb-toast-close" },
        style: {
          fontFamily: "var(--font-core)",
          borderRadius: "var(--radius-lg)",
          borderColor: "var(--border-hairline)",
          boxShadow: "var(--shadow-2)",
          "--error-text": "var(--shield-red-deep)",
        } as React.CSSProperties,
      }}
    />
  );
}
