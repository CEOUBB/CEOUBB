# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Estudiantes y docentes de la Universidad del Bío-Bío. Los estudiantes necesitan acceder a sus aulas, materiales, evaluaciones, calificaciones y progreso; los docentes necesitan organizar y operar sus secciones, contenidos, comunicaciones y evaluaciones.

## Product Purpose

Centro de Estudio UBB (CEOUBB) es un LMS independiente para la UBB. Su objetivo es reemplazar los LMS que hoy utiliza la universidad —Moodle UBB y Adecca UBB— con una plataforma académica adecuada para operar a escala institucional.

## Positioning

CEOUBB reúne aula, biblioteca de estudio y operación académica en un producto pensado para la realidad UBB. Los docentes esperan una experiencia de uso más cercana a Canvas que a las alternativas actuales.

## Operating Context

El producto se usa durante la actividad académica para consultar recursos, publicar y seguir actividades, y administrar evaluaciones y calificaciones. La identidad académica es una sección: asignatura × período × sección. La plataforma parte con acceso mediante cuentas institucionales UBB y contempla estudiantes, docentes y administración.

## Capabilities and Constraints

- Web App Router con Next.js, React y TypeScript; Turso/libSQL guarda la estructura académica y Firestore opera la actividad de aula.
- Incluye portal, aula, calendario, recursos, biblioteca de estudio, administración y privacidad.
- Debe escalar a miles de estudiantes y secciones; las consultas deben ser acotadas y paginadas cuando corresponda.
- La plataforma no es un servicio oficial ni cuenta aún con un acuerdo institucional. Ese descargo debe preservarse hasta que exista uno.
- Los datos académicos y las calificaciones requieren protección acorde a la normativa chilena aplicable.

## Brand Commitments

El nombre del producto es Centro de Estudio UBB / CEOUBB. Su voz debe ser académica, clara y confiable. La expectativa de una operación inspirada en Canvas es un compromiso de experiencia y flujo de trabajo, no una autorización para copiar su identidad visual o contenido.

## Evidence on Hand

- Comparación institucional y dossier de adopción: `ceoubb_moodle_adecca_comparison.md`.
- Estado, riesgos y hoja de ruta: `PLAN.md` y `docs/specs/`.
- Sistema visual existente: `design-ceoubb.md`, `app/globals.css` y componentes de `app/`.
- No hay autorización escrita para un piloto institucional ni evidencia de una adopción oficial; no se deben inventar respaldos, testimonios ni cifras de impacto.

## Product Principles

1. Resolver flujos académicos reales de estudiantes y docentes antes que añadir funciones genéricas.
2. Diseñar para secciones y operación universitaria a escala, no para un catálogo de demostración.
3. Mantener la experiencia clara, predecible y eficiente para la actividad docente cotidiana.
4. Proteger la condición independiente del producto y los datos académicos de sus usuarios.
5. Convertir la comparación con los LMS actuales en mejoras verificables de uso, no en promesas sin evidencia.

## Accessibility & Inclusion

La plataforma debe avanzar hacia WCAG 2.2 AA y una declaración pública de conformidad; la auditoría completa sigue pendiente.
