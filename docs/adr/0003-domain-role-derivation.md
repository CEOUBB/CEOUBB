# ADR 0003: Invariante de Derivación de Roles por Dominio de Correo Institucional

- **Estado:** Aceptado
- **Fecha:** 2026-08-14
- **Decisores:** Mantenedores del Proyecto CEOUBB
- **Consulta / Specs:** `lib/access-policy.ts`, `tests/access-policy.test.ts`, `AGENTS.md`

---

## Contexto y Planteamiento del Problema

En un entorno universitario con miles de alumnos y cientos de profesores, la gestión manual de asignación de roles es ineficiente, propensa a errores humanos y susceptible a brechas de seguridad si un usuario puede auto-declarar su rol.

Asimismo, era imperativo garantizar que:

1. Ninguna cuenta externa a la Universidad del Bío-Bío (e.g. `@gmail.com`, `@outlook.com`, `@yahoo.com`) pueda autenticarse o interactuar con los datos del LMS.
2. Un estudiante no pueda reclamar privilegios docentes para alterar calificaciones o publicar evaluaciones.
3. La lógica de discriminación de dominios no se encuentre duplicada en múltiples capas de la aplicación, evitando divergencias que abran vectores de escalamiento de privilegios.

---

## Decisión de Arquitectura

Se establece una **invariante de seguridad estricta basada en el dominio de correo institucional federado**, implementada bajo el patrón de **Fuente Única de Verdad (Single Source of Truth)**:

1. **Matriz Canónica de Derivación de Roles:**
   - `@alumnos.ubiobio.cl` $\rightarrow$ Rol **`student`** (Estudiante).
   - `@ubiobio.cl` $\rightarrow$ Rol **`teacher`** (Docente).
   - `elpapijuaco325@gmail.com` $\rightarrow$ Rol **`owner`** (Propietario / Superusuario).
   - `felipearce.2004@gmail.com` $\rightarrow$ Rol **`collaborator`** (Colaborador / Superusuario).
   - _Cualquier otro dominio de correo electrónico es rechazado inmediatamente con error de acceso no autorizado (`UNAUTHORIZED_DOMAIN`)._

2. **Centralización en `lib/access-policy.ts`:**
   - La función pura `roleForEmail(email: string | null | undefined): UserRole` es el único punto de derivación de rol en todo el código TypeScript.
   - Ningún otro archivo o vista puede implementar expresiones regulares o parsing de sufijos de correo.

3. **Sincronización Obligatoria con Reglas de Seguridad:**
   - La lógica de derivación se replica de forma idéntica en las reglas declarativas de backend:
     - `firebase/firestore.rules`: Funciones `isStudent()`, `isTeacher()`, `isOwner()`.
     - `firebase/storage.rules`: Validaciones de subida y lectura de archivos por rol.
   - La suite de pruebas automatizada `tests/access-policy.test.ts` valida en cada commit que las reglas de Firebase y el código TypeScript permanezcan 100% sincronizados contra una matriz exhaustiva de casos de prueba.

---

## Consecuencias

### Positivas:

- **Zero-Trust Onboarding:** Tanto estudiantes como profesores acceden con su cuenta institucional de Google Workspace UBB y obtienen instantáneamente sus permisos legítimos sin requerir aprobación administrativa previa.
- **Aislamiento Criptográfico y Operativo:** Se bloquea de raíz el acceso a cualquier usuario externo a la comunidad universitaria.
- **Auditoría Automatizada Continua:** `tests/access-policy.test.ts` falla de forma bloqueante en CI si alguien intenta modificar un dominio o relajar una regla en Firestore sin actualizar la política canónica.

### Negativas / Mitigaciones:

- **Excepciones de Cuentas de Desarrollo:** La existencia de correos personales para los creadores del proyecto representa una deuda transitoria mientras se tramita el convenio institucional oficial.
  - _Mitigación:_ Documentado formalmente en el backlog de `PLAN.md`; estas excepciones serán sustituidas por identidades SAML 2.0 / OIDC del directorio activo UBB cuando se concrete la adopción oficial.
