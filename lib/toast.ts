// Implements: REQ-TOAST-01, REQ-TOAST-02, REQ-TOAST-03
import { toast as sonnerToast, type ExternalToast } from "sonner";

export interface ToastOptions extends ExternalToast {
  tone?: "ok" | "bad" | "info";
}

/**
 * Helper institucional de notificaciones de CEOUBB.
 * Encapsula Sonner con tipado estricto, configuración centralizada
 * y compatibilidad con el formato legacy de notas (text, tone).
 */
export const toast = {
  success(message: string, options?: ExternalToast) {
    return sonnerToast.success(message, options);
  },

  error(message: string, options?: ExternalToast) {
    return sonnerToast.error(message, options);
  },

  info(message: string, options?: ExternalToast) {
    return sonnerToast.info(message, options);
  },

  message(message: string, options?: ExternalToast) {
    return sonnerToast(message, options);
  },

  promise<T>(
    promise: Promise<T> | (() => Promise<T>),
    data: {
      loading?: string | React.ReactNode;
      success?: string | React.ReactNode | ((data: T) => string | React.ReactNode);
      error?: string | React.ReactNode | ((error: unknown) => string | React.ReactNode);
      description?: string | React.ReactNode | ((data: T) => string | React.ReactNode);
      finally?: () => void | Promise<void>;
    }
  ) {
    return sonnerToast.promise(promise, data);
  },

  /**
   * Adaptador de compatibilidad para el patrón legacy `note(text, tone)`.
   */
  note(text: string, tone: "info" | "ok" | "bad" = "info", options?: ExternalToast) {
    if (!text) return;
    if (tone === "ok") return sonnerToast.success(text, options);
    if (tone === "bad") return sonnerToast.error(text, options);
    return sonnerToast.info(text, options);
  },

  dismiss(id?: string | number) {
    return sonnerToast.dismiss(id);
  },
};
