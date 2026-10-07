"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ClassroomErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ClassroomErrorBoundary] Error capturado en el aula:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <section
          aria-live="assertive"
          className="classroom-error-card"
          role="alert"
          style={{
            margin: "24px",
            padding: "24px",
            borderRadius: "16px",
            border: "1px solid var(--border-subtle, rgba(0, 0, 0, 0.08))",
            background: "var(--surface-raised, #ffffff)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <WarningCircle
            aria-hidden="true"
            color="var(--accent-ruby, #e31b23)"
            size={36}
            weight="duotone"
          />
          <h2
            style={{
              fontSize: "1.15rem",
              fontWeight: 600,
              color: "var(--ink, #0f172a)",
              margin: 0,
            }}
          >
            {this.props.fallbackTitle ?? "Ocurrió un problema al cargar esta sección"}
          </h2>
          <p
            style={{
              fontSize: "0.9rem",
              color: "var(--muted, #475569)",
              maxWidth: "480px",
              margin: 0,
            }}
          >
            {this.state.error?.message || "Ocurrió un error inesperado al renderizar el contenido."}
          </p>
          <button
            className="secondary-button"
            onClick={this.handleReset}
            style={{ marginTop: "8px" }}
            type="button"
          >
            <ArrowClockwise aria-hidden="true" size={16} />
            Reintentar vista
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
