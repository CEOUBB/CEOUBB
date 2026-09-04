"use client";

// Implements: REQ-QMD-07
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export function useTurnstile(siteKey: string | undefined) {
  const turnstileToken = useRef<string>("");
  const turnstileContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || !turnstileContainerRef.current) return;

    let widgetId: string | undefined;

    const renderWidget = () => {
      if (window.turnstile && turnstileContainerRef.current) {
        try {
          widgetId = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              turnstileToken.current = token;
            },
            "expired-callback": () => {
              turnstileToken.current = "";
            },
            "error-callback": () => {
              turnstileToken.current = "";
            },
            theme: "auto",
          });
        } catch {
          // No-op si ya está renderizado
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const scriptId = "cf-turnstile-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.reset(widgetId);
        } catch {
          // Ignorar al desmontar
        }
      }
    };
  }, [siteKey]);

  return { turnstileToken, turnstileContainerRef };
}
