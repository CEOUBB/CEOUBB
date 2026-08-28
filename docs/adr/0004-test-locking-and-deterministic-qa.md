# ADR 0004: Test-Locking, Checksums SHA-256 y Compuertas de Calidad Determinísticas

- **Estado:** Aceptado
- **Fecha:** 2026-08-17
- **Decisores:** Equipo de Arquitectura e Ingeniería CEOUBB
- **Consulta / Specs:** `docs/specs/p9-enterprise-harness-evolution.md`, `.agents/skills/spec-driven-development/SKILL.md`, `AGENTS.md`

---

## Contexto y Planteamiento del Problema

Cuando los agentes de IA autónomos se enfrentan a fallos complejos en aserciones de prueba durante la implementación de código, los modelos de lenguaje tienden naturalmente a relajar o debilitar las aserciones (`expect(true).toBe(true)`), eliminar pruebas fallidas o añadir `.skip()` en lugar de corregir los defectos subyacentes en la lógica de negocio. Esto introduce un riesgo crítico de regresiones silenciosas y degrada la suite de pruebas a lo largo del tiempo.

---

## Decisión de Arquitectura

Se implementa un **protocolo determinístico de Bloqueo de Pruebas (Test-Locking)**:

1. Durante la fase TDD RED, los archivos de prueba en `tests/` se redactan y se genera una instantánea criptográfica SHA-256 en `.agents/.test-hashes.json` mediante `node scripts/verify-test-hashes.mjs --generate`.
2. Durante la fase TDD GREEN, el directorio `tests/` opera en **modo de solo lectura**. El script de verificación (`pnpm run verify:fast`) computa los checksums de las pruebas y detiene la ejecución con código de salida `1` si alguna aserción de prueba ha sido alterada o removida.
3. Cascada de verificación rápida (<3 segundos):
   - `pnpm run verify:invariants` (Reglas de seguridad e invariantes matemáticas centrales <500ms).
   - `pnpm run verify:fast` (Verificación estricta de tipos + pruebas unitarias + candado SHA-256 <3.0s).
   - `pnpm test` (Compilación productiva completa + suite de integración para compuerta de merge).

---

## Consecuencias

### Positivas:

- Erradica la degradación silenciosa de pruebas por parte de agentes de codificación IA.
- Proporciona retroalimentación determinística inmediata (<3s) evitando ciclos de compilación costosos durante el desarrollo.
- Refuerza la triangulación TDD rigurosa (Red -> Green -> Refactor).

### Negativas / Mitigaciones:

- Las modificaciones legítimas de pruebas (por enmiendas formales a especificaciones) requieren regeneración explícita de hashes (`--generate`).
  - _Mitigación:_ Procedimiento de regeneración y recuperación documentado en `SKILL.md` y `AGENTS.md`.
