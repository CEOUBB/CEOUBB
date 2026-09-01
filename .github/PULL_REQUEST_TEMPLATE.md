## Resumen del Cambio

<!-- Describir de forma concisa qué problema resuelve este Pull Request o qué funcionalidad implementa. -->

- **Tipo de cambio**: `feat` | `fix` | `refactor` | `perf` | `test` | `docs` | `ci` | `chore`
- **Issue asociada**: `CEOUBB-` <!-- Ejemplo: CEOUBB-123 o #45 (dejar en blanco si no aplica) -->
- **Superficie afectada**: `Web Portal` | `Android (Capacitor)` | `Firebase / Functions` | `Base de Datos / Drizzle` | `CI/CD / Tooling` | `Documentación`
- **Autor / Agente**: <!-- Ejemplo: Pipe / Claude Code / Antigravity -->

---

## Cambios Implementados

<!-- Lista de modificaciones técnicas introducidas en este PR -->

-
-
- ***

## Checklist Técnico y Calidad de Código

<!-- Marcar con una [x] todas las verificaciones obligatorias realizadas -->

- [ ] `pnpm run lint` ejecutado sin advertencias ni errores de ESLint.
- [ ] `pnpm run typecheck` completado con 0 errores de TypeScript (`tsc --noEmit`).
- [ ] `pnpm run test:unit` ejecutado exitosamente sin regresiones en la suite de pruebas.
- [ ] `pnpm run format:check` valida el estilo de código con Prettier.
- [ ] Verificado localmente en entorno de desarrollo (`pnpm run dev`).

---

## Seguridad, Privacidad y Gobernanza de Datos

<!-- Verificaciones según Ley 19.628 / 21.719 y políticas de acceso institucional -->

- [ ] **Sin credenciales expuestas**: No se han incluido tokens, llaves API ni variables `.env` en el diff.
- [ ] **Reglas de Acceso**: La lógica de autenticación o roles preserva la derivación estricta por dominio institucional (`lib/access-policy.ts`) y sincroniza reglas de Firestore/Storage.
- [ ] **Aislamiento de Datos**: Las consultas respetan la privacidad y el aislamiento de datos entre secciones y estudiantes.

---

## Accesibilidad (WCAG 2.2 AA)

- [ ] Elementos interactivos cuentan con etiquetas accesibles (`aria-label`, `aria-expanded` o texto semántico).
- [ ] Contraste tipográfico adecuado según el sistema de diseño (`DESIGN.md`).
- [ ] Navegación completa por teclado funcional (anillos de foco visibles).

---

## Consideraciones Móviles (Capacitor Seam)

- [ ] Todo puente nativo (`lib/mobile-bridge.ts`, plugins Capacitor) degrada a un no-op silencioso en el navegador web.
- [ ] Se respetan las áreas seguras (safe-area-insets) y la ergonomía táctil en dispositivos móviles.
- [ ] El presupuesto de bundle JS se mantiene dentro de los límites admisibles.

---

## Capturas de Pantalla / Previews (Opcional)

<!-- Si el cambio incluye modificaciones visuales en la interfaz de usuario, adjuntar capturas o GIFs aquí -->
