import Link from "next/link";
import React from "react";

/*
  Implements: REQ-MOTION-LINK
  Componente reutilizable de animación de subrayado direccional (swipe underline).
  - Reposo / salida: transform: scaleX(0); transform-origin: right;
  - Interacción / entrada: transform: scaleX(1); transform-origin: left;
  Aceleración elástica en GPU sin repintado de layout y compatible con Server Components.
*/

export interface AnimatedUnderlineProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "strong" | "em";
}

/**
  Envuelve texto en un contenedor inline con subrayado animado direccional.
  Se activa al recibir hover/foco directo o cuando cualquier contenedor interactivo
  ancestro (como un botón o enlace con .course-action, .group o .animated-underline-link) entra en hover.
 */
export function AnimatedUnderline({
  children,
  className,
  as: Component = "span",
  ...props
}: AnimatedUnderlineProps) {
  const combinedClassName = ["animated-underline", className].filter(Boolean).join(" ");

  return (
    <Component className={combinedClassName} {...props}>
      {children}
    </Component>
  );
}

export interface AnimatedUnderlineLinkProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "prefix"
> {
  href?: string;
  external?: boolean;
  as?: "a" | "button" | "span";
  type?: "button" | "submit" | "reset";
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  underlineClassName?: string;
}

/**
  Enlace interactivo reutilizable con subrayado animado direccional.
  Soporta Next.js Link (enlaces internos), <a> nativo (enlaces externos),
  o botones/spans interactivos con iconos prefijo o sufijo aislados del subrayado.
 */
export function AnimatedUnderlineLink({
  href,
  external,
  as,
  type,
  prefix,
  suffix,
  children,
  className,
  underlineClassName,
  target,
  rel,
  ...props
}: AnimatedUnderlineLinkProps) {
  const rootClassName = ["animated-underline-link", className].filter(Boolean).join(" ");

  const innerContent = (
    <>
      {prefix && (
        <span aria-hidden="true" className="animated-underline-prefix">
          {prefix}
        </span>
      )}
      <span className={["animated-underline", underlineClassName].filter(Boolean).join(" ")}>
        {children}
      </span>
      {suffix && (
        <span aria-hidden="true" className="animated-underline-suffix">
          {suffix}
        </span>
      )}
    </>
  );

  if (as === "button") {
    const buttonProps = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
    return (
      <button className={rootClassName} type={type ?? "button"} {...buttonProps}>
        {innerContent}
      </button>
    );
  }

  if (as === "a") {
    return (
      <a className={rootClassName} href={href} rel={rel} target={target} {...props}>
        {innerContent}
      </a>
    );
  }

  if (as === "span" || !href) {
    const spanProps = props as React.HTMLAttributes<HTMLSpanElement>;
    return (
      <span className={rootClassName} {...spanProps}>
        {innerContent}
      </span>
    );
  }

  const isExternal =
    external ??
    (href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("//"));

  if (isExternal) {
    return (
      <a
        className={rootClassName}
        href={href}
        rel={rel ?? "noopener noreferrer"}
        target={target ?? "_blank"}
        {...props}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <Link className={rootClassName} href={href} rel={rel} target={target} {...props}>
      {innerContent}
    </Link>
  );
}
