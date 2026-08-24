# Carpeta legal CEOUBB

**Estado:** borrador para revisión jurídica · **Versión:** 0.1 · **Fecha:** 23 de agosto de 2026 · **Issue:** CEO-40

Esta carpeta reúne la propuesta contractual y operativa para un eventual piloto institucional de Centro de Estudio UBB (CEOUBB). No es un convenio firmado, no sustituye la revisión de la Dirección Jurídica de la Universidad del Bío-Bío (UBB) y no convierte a CEOUBB en un servicio oficial.

## Regla de lectura

La asignación de roles propuesta —UBB como responsable de datos y CEOUBB como tercero mandatario o encargado— opera **sólo desde la firma y entrada en vigencia del convenio**. Hasta entonces, CEOUBB sigue siendo una plataforma independiente y debe describir su tratamiento actual bajo esa calidad en su política pública.

La Ley N° 19.628 vigente rige hasta el 30 de noviembre de 2026. La [Ley N° 21.719](https://www.bcn.cl/leychile/navegar?idNorma=1209272), publicada el 13 de diciembre de 2024, entra en vigencia el 1 de diciembre de 2026 y modifica integralmente la Ley N° 19.628. Los documentos se preparan para ambos momentos y adoptan desde ahora el estándar más exigente del nuevo régimen.

## Contenido y orden de revisión

1. [`01-convenio-encargo-tratamiento.md`](01-convenio-encargo-tratamiento.md): borrador de convenio entre la UBB y la persona jurídica o natural que opere CEOUBB.
2. [`02-politica-retencion-y-eliminacion.md`](02-politica-retencion-y-eliminacion.md): plazos propuestos por categoría, método de borrado y brechas de implementación.
3. [`03-procedimiento-derechos-titulares.md`](03-procedimiento-derechos-titulares.md): canal institucional, flujo de solicitudes, verificación y borrado sin WhatsApp.
4. [`04-residencia-subencargados-y-transferencias.md`](04-residencia-subencargados-y-transferencias.md): qué está en Santiago, qué sale de Chile y qué evidencia debe aprobar la UBB.
5. [`05-plan-termino-y-devolucion.md`](05-plan-termino-y-devolucion.md): devolución, continuidad y supresión si el piloto o el proyecto terminan.

Los anexos se remiten entre sí para evitar períodos o obligaciones contradictorias. Si Jurídica cambia un plazo, deben actualizarse el convenio, la política de retención y la política pública de `/privacidad` en una misma entrega.

## Decisiones que Jurídica y la UBB deben completar

- Individualización, RUT, domicilio y representantes con poder suficiente de ambas partes.
- Unidad UBB responsable del tratamiento, contraparte técnica DTI y contacto de privacidad.
- Base jurídica institucional para cada finalidad y reglas de conservación de documentos académicos.
- Confirmación de si CEOUBB será sólo una copia de trabajo o participará en registros académicos oficiales.
- Plazos definitivos de conservación, en particular para notas, entregas, auditoría y expedientes de derechos.
- Autorización expresa de cada subencargado y de las transferencias internacionales.
- Mecanismo contractual para transferencias conforme a los artículos 27 y 28 del régimen reformado y a las [cláusulas modelo aprobadas por el Ministerio de Economía](https://www.economia.gob.cl/2025/12/10/raex202503731-aprueba-las-clausulas-contractuales-modelo-para-transferencias-internacionales-que-indica.htm).
- Responsables, niveles de servicio, procedimiento de incidentes y autoridad que acepta el certificado de borrado.

## Bloqueos antes de firma o datos reales

| Bloqueo                                                                                                    | Dueño propuesto | Evidencia de cierre                                              |
| :--------------------------------------------------------------------------------------------------------- | :-------------- | :--------------------------------------------------------------- |
| Identificar a la contraparte legal que opera CEOUBB; el nombre del proyecto por sí solo no firma contratos | CEOUBB          | Razón social o persona natural, RUT, domicilio y personería      |
| Obtener autorización escrita del piloto y convenio firmado                                                 | UBB / CEOUBB    | Resolución, convenio o acto equivalente                          |
| Provisionar y monitorear `contacto@ceoubb.com`                                                             | CEOUBB          | Prueba de recepción, ticket y escalamiento a UBB                 |
| Unificar el borrado de Turso, Firebase Authentication, Firestore, Storage y respaldos                      | CEOUBB          | Prueba integral y certificado de borrado de una cuenta sintética |
| Aprobar y automatizar la tabla de retención                                                                | UBB / CEOUBB    | Configuración, jobs y reporte mensual de vencimientos            |
| Confirmar en consola la ubicación del bucket de Storage y de la base Turso                                 | DTI / CEOUBB    | Capturas o salida de API con proyecto, recurso, región y fecha   |
| Suscribir DPA y garantías de transferencia con subencargados                                               | UBB / CEOUBB    | Contratos y registro de versiones vigentes                       |
| Habilitar respaldos y ejecutar una restauración                                                            | DTI / CEOUBB    | Informe de simulacro con RPO y RTO medidos                       |
| Transferir tenencias personales a cuentas institucionales                                                  | UBB / CEOUBB    | Inventario de propietarios y accesos de emergencia               |

## Criterio de cierre de CEO-40

CEO-40 deja preparada la carpeta para revisión. No declara firmado el convenio, no declara operativo el canal de derechos y no afirma residencia íntegra en Chile. Esos hitos requieren decisiones, contratos y evidencia externa a este repositorio.
