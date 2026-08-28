# Guía de Contribución: Centro de Estudio UBB (CEOUBB)

Este documento establece las directrices y estándares de desarrollo para contribuir al proyecto **Centro de Estudio UBB (CEOUBB)**.

---

## Requisitos del Entorno

- **Node.js**: `>= 22.13.0`
- **Gestor de paquetes**: `pnpm >= 12.0.0` (obligatorio; no utilizar `npm` ni `bun`)
- **Java JDK**: `Java 21` (distribución Temurin recomendada, requerida para compilación de Android en Capacitor)
- **Android Studio / SDK**: Android API 34+ / Build Tools 34.0.0+ (requerido para emulación y depuración móvil en Capacitor 7)

---

## Configuración del Entorno de Desarrollo

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/CEOUBB/CEOUBB.git
   cd CEOUBB
   ```

2. **Instalar dependencias:**

   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno:**
   Copiar `.env.example` a `.env.local` y completar las credenciales de desarrollo correspondientes:

   ```bash
   cp .env.example .env.local
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   pnpm run dev
   ```
   La aplicación se servirá en `http://localhost:3000`.

---

## Estrategia de Ramas (Branching Strategy)

- La rama canónica protegida es `main`.
- Todo cambio debe integrarse mediante ramas de trabajo derivadas de `main`:
  - `feat/<identificador>`: Nuevas funcionalidades o capacidades de usuario.
  - `fix/<identificador>`: Corrección de fallos o regresiones.
  - `refactor/<identificador>`: Refactorizaciones estructurales sin alteración funcional externa.
  - `codex/<tarea>` o `claude/<tarea>`: Ramas de trabajo asistidas por modelos de lenguaje.
- Los commits directos a `main` están deshabilitados.

---

## Política de Commits Convencionales (en Español)

Todos los mensajes de commit y títulos de Pull Request deben seguir la especificación **Conventional Commits** y estar **redactados estrictamente en español**:

### Tipos Permitidos:

- `feat:` Nueva funcionalidad para el usuario final o API.
- `fix:` Corrección de errores.
- `refactor:` Modificación de código sin alteración funcional ni corrección de bug.
- `perf:` Optimización de rendimiento o reducción de tamaño de paquete.
- `test:` Inclusión o actualización de pruebas unitarias o de integración.
- `docs:` Modificaciones en documentación técnica.
- `ci:` Cambios en pipelines de integración continua o scripts de automatización.
- `chore:` Tareas de mantenimiento, dependencias o configuración interna.

### Ejemplos Válidos:

```bash
feat(portal): implementar selector de períodos académicos
fix(auth): corregir derivación de rol docente con dominio institucional
test(grades): agregar validación de ponderaciones con escala chilena
docs(readme): actualizar instrucciones de compilación local
```

---

## Compuertas de Calidad y Pruebas Locales

Previo a la apertura de un Pull Request, es obligatorio ejecutar y validar satisfactoriamente el conjunto de compuertas de calidad:

```bash
# Verificación rápida con candado criptográfico (<3s: Typecheck + Tests + Hash Guard)
pnpm run verify:fast

# Verificación de invariantes de seguridad y reglas de Firebase (<500ms)
pnpm run verify:invariants

# Verificación de formato y sintaxis
pnpm run format:check
pnpm run lint

# Suite completa de integración y compilación productiva (Pre-flight)
pnpm test
```

---

## Invariantes de Seguridad y Arquitectura

Al contribuir código al repositorio, se deben respetar los siguientes principios de diseño:

1. **Derivación de Roles (`lib/access-policy.ts`)**: La asignación de roles base (Estudiante, Docente) se deriva exclusivamente del dominio de correo institucional (`@alumnos.ubiobio.cl` -> Estudiante, `@ubiobio.cl` -> Docente). El rango de Propietario / Superusuario (`owner`) es un estado administrativo verificado en base de datos (`users.role = 'owner'`), nunca derivado del correo. No debe duplicarse la lógica de análisis de dominio en ningún otro módulo.
2. **Protección de Datos Académicos (Leyes N° 19.628 y N° 21.719)**: El acceso a calificaciones y registros de estudiantes debe estar aislado por sección académica y protegido por reglas de seguridad en Firestore (`firestore.rules`).
3. **Seam Móvil (`lib/mobile-bridge.ts`)**: Toda llamada a plugins nativos de Capacitor debe degradar a una operación silenciosa sin efecto (no-op) al ejecutarse en navegador web.
4. **Sistema de Diseño (`DESIGN.md`)**: Se deben respetar los tokens institucionales, paleta UBB y componentes documentados en `DESIGN.md`.

---

## Proceso de Pull Request (PR)

1. Abrir un PR hacia la rama `main` utilizando la plantilla oficial `.github/PULL_REQUEST_TEMPLATE.md`.
2. Verificar que los checks automatizados de GitHub Actions concluyan de forma exitosa:
   - `CI / Lint, Typecheck & Tests`
   - `Semantic PR / Validate Conventional Commits`
   - `Android CI / Capacitor Build & Lint`
   - `Bundle Analysis / Size Budget Check`
3. Asignar revisores según el archivo `.github/CODEOWNERS`.
4. Tras la aprobación formal de al menos un mantenedor, se efectuará un Squash and Merge con resumen descriptivo en español.
