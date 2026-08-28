# Política de Seguridad: Centro de Estudio UBB (CEOUBB)

El proyecto **Centro de Estudio UBB (CEOUBB)** mantiene un compromiso riguroso con la seguridad, integridad y privacidad de la información de la comunidad universitaria.

---

## Versiones con Soporte Activo

Únicamente la versión desplegada en el entorno de producción y sincronizada con la rama `main` recibe parches de seguridad activos:

| Versión / Componente                               | Soporte | Estado                                   |
| :------------------------------------------------- | :-----: | :--------------------------------------- |
| **Web Portal (`main` / `ceoubb.com`)**             |   Sí    | Parches continuos y despliegue inmediato |
| **Android App (`cl.ubb.centroestudio`)**           |   Sí    | Versión más reciente publicada           |
| **Cloud Functions & Rules (`southamerica-west1`)** |   Sí    | Monitoreo activo y despliegue directo    |
| Versiones anteriores / forks no oficiales          |   No    | Sin soporte                              |

---

## Reporte de Vulnerabilidades

Ante el hallazgo de una vulnerabilidad de seguridad o potencial fallo de autorización en CEOUBB, se solicita **no divulgar la incidencia a través de issues públicos**. En su lugar, se debe canalizar el reporte a través de medios confidenciales:

1. **GitHub Security Advisory**: Abrir un reporte confidencial en la sección [Security Advisories](https://github.com/CEOUBB/CEOUBB/security/advisories/new) (Canal preferente y cifrado).
2. **Contacto Directo de Seguridad**:
   - Correo electrónico: `contacto@ceoubb.com` (Mantenedor: `felipearce.2004@gmail.com`)

### Estructura Recomendada del Reporte:

- Descripción detallada de la vulnerabilidad y vector de explotación.
- Pasos ordenados y reproducibles de la prueba de concepto (PoC).
- Endpoints de API, componentes, reglas de Firestore/Storage o dependencias afectadas.
- Estimación del impacto sobre estudiantes, docentes o infraestructura.

### Protocolo de Respuesta:

- Confirmación de recepción del reporte en un plazo máximo de **48 horas**.
- Evaluación técnica y determinación del plan de mitigación.
- Notificación de despliegue del parche correctivo antes de cualquier publicación o divulgación coordinada.

---

## Marco Normativo y Privacidad de Datos

El tratamiento de información académica y personal en CEOUBB se adecúa a la legislación chilena vigente:

- **Ley N° 19.628**: Sobre Protección de la Vida Privada.
- **Ley N° 21.719**: Que regula el tratamiento y protección de datos personales y crea la Agencia de Protección de Datos Personales.

### Principios de Seguridad Aplicados:

- **Aislamiento de Calificaciones**: Los registros académicos y calificaciones son estrictamente privados, accesibles únicamente por el estudiante titular y los docentes formalmente asignados a la sección.
- **Soberanía y Ubicación de Datos**: Los servicios de base de datos y autenticación operan en la región `southamerica-west1` (Santiago de Chile) para minimizar latencia y dar cumplimiento normativo.
- **Principio de Mínimo Privilegio (Default Deny)**: Toda consulta y mutación requiere autorización explícita evaluada a nivel de servidor y reglas declarativas de Firestore.
