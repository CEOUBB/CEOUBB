import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";

/*
  El aula tenía cuatro estados vacíos distintos —caja rellena a la izquierda,
  caja punteada centrada con ícono, párrafo suelto y fila de tabla— y cada
  pestaña elegía uno diferente. Un solo componente los unifica: glifo, título,
  una línea de explicación y, cuando existe, la acción que resuelve el vacío.
*/
export function EmptyState({
  icon: Glyph,
  title,
  description,
  action,
}: {
  icon: Icon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span aria-hidden="true" className="empty-state-glyph">
        <Glyph size={22} weight="duotone" />
      </span>
      <div className="empty-state-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export default EmptyState;
