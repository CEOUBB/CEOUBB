# Plan de término, devolución y supresión

**Estado:** borrador de continuidad; no ensayado · **Versión:** 0.1 · **Fecha:** 23 de agosto de 2026

## 1. Objetivo

Este plan evita que la detención del piloto, del servicio o del equipo mantenedor deje datos académicos en cuentas personales, sin acceso institucional o conservados indefinidamente. Aplica al término normal, término anticipado, falta de financiamiento, incidente grave, insolvencia, pérdida de un proveedor o abandono del proyecto.

La regla es simple: la UBB decide si recibe o suprime; CEOUBB bloquea nuevos usos, entrega de forma utilizable, verifica la recepción, elimina lo restante y certifica las excepciones.

## 2. Condiciones que deben existir antes del piloto

- cuentas institucionales UBB con propiedad o acceso de emergencia a Firebase/GCP, Vercel, Turso, dominio, repositorio y monitoreo;
- inventario de recursos, contratos, renovaciones, regiones y responsables;
- dos personas habilitadas por función crítica, sin secretos compartidos informalmente;
- repositorio y artefactos bajo la licencia declarada, con procedimiento de entrega;
- exportadores documentados y probados para Turso, Firestore, Storage y Firebase Auth;
- respaldo cifrado y restauración ensayada;
- manifiesto de eliminaciones que pueda reaplicarse después de restaurar;
- contactos UBB de decisión, seguridad, jurídica y recepción de datos;
- formato y canal seguro acordados para la transferencia.

Hoy varias tenencias siguen en cuentas personales, no existe restauración probada y no hay un exportador integral. El plan no puede declararse operativo hasta un simulacro.

## 3. Activación y gobierno

Puede activar el plan la autoridad UBB designada, la contraparte legal de CEOUBB o el responsable de incidentes cuando la continuidad segura no sea viable.

Al activarse se abre un acta con:

- motivo, fecha y autoridad;
- alcance, servicios y nuevas escrituras permitidas;
- equipo de salida y contactos;
- decisión inicial de devolución, migración o supresión;
- litigios, auditorías o solicitudes que impidan borrar una parte;
- calendario y riesgos para estudiantes y docentes.

## 4. Fases y plazos propuestos

| Fase                       | Plazo desde activación                           | Acción y evidencia                                                                              |
| :------------------------- | :----------------------------------------------- | :---------------------------------------------------------------------------------------------- |
| Contención                 | 0-24 horas                                       | Congelar despliegues, altas y cambios no esenciales; preservar logs y revocar accesos riesgosos |
| Aviso                      | 2 días hábiles                                   | Informar a UBB y responsables operativos; la UBB decide comunicaciones a usuarios               |
| Inventario final           | 5 días hábiles                                   | Conteos por sistema, regiones, respaldos, subencargados, excepciones y solicitudes abiertas     |
| Decisión UBB               | 10 días corridos                                 | Elegir devolución/migración/supresión y confirmar receptor y formatos                           |
| Exportación                | 15 días corridos                                 | Generar conjuntos, diccionario, esquemas, hashes y registro de errores                          |
| Transferencia y validación | 30 días corridos                                 | Entrega cifrada; UBB valida integridad, legibilidad y conteos por escrito                       |
| Supresión primaria         | 10 días corridos desde aceptación, máximo día 40 | Eliminar en sistemas activos y propagar a subencargados                                         |
| Expiración de copias       | Máximo 35 días desde supresión primaria          | Rotación de respaldos y eliminación de exportaciones temporales                                 |
| Certificado final          | 5 días hábiles después de la última expiración   | Informe de datos devueltos, eliminados, exceptuados y evidencia conservada                      |

Jurídica puede ajustar estos plazos en el convenio. Un incidente puede exigir contención inmediata, pero no autoriza destruir evidencia ni datos antes de que la UBB decida.

## 5. Paquete de devolución

La entrega debe ser utilizable sin depender de una cuenta personal de CEOUBB:

- Turso: export SQL o SQLite consistente, migraciones, esquema y diccionario;
- Firestore: export nativo y, cuando sea necesario, JSON/CSV legible por colección;
- Storage: objetos con rutas normalizadas, metadatos, tamaño y hash;
- Firebase Auth: export permitido de identidades, sin secretos ni credenciales reutilizables;
- configuración: reglas, índices, variables requeridas sin valores secretos, versiones y procedimientos de despliegue;
- auditoría: manifiesto de calificaciones, cambios, eliminaciones pendientes y excepciones;
- documentación: arquitectura, retención, subencargados, incidentes abiertos y restauración;
- código fuente conforme a `LICENSE`, commit de corte y dependencias para construirlo.

Cada archivo tendrá hash SHA-256, fecha de corte y conteos. Las claves de cifrado se entregarán por un canal separado y se revocarán al confirmar recepción.

## 6. Orden de supresión

Después de la aceptación UBB:

1. revocar sesiones, tokens, tópicos y accesos de mantenedores;
2. eliminar datos activos en Turso, Firebase Authentication, Firestore y Storage;
3. borrar replay, logs y exportaciones temporales según alcance y disponibilidad del proveedor;
4. pedir y registrar la supresión de subencargados;
5. impedir que respaldos sean usados salvo recuperación autorizada;
6. dejar expirar respaldos dentro de la ventana aprobada y destruir claves exclusivas;
7. retirar secretos, cuentas de servicio, integraciones y DNS que ya no sean necesarios;
8. conservar sólo el certificado y las excepciones ordenadas por la UBB.

No se elimina primero la cuenta propietaria si con ello se pierde la capacidad de exportar o borrar el resto.

## 7. Excepciones y proyecto detenido sin cooperación

Toda excepción tendrá categoría, volumen, fundamento, custodio, acceso permitido y fecha de revisión. Los datos exceptuados quedan bloqueados para producto, analítica o desarrollo.

Si un mantenedor no está disponible, la UBB debe poder ejecutar el runbook con las cuentas institucionales y el inventario. Si un proveedor bloquea el acceso, se escalará contractualmente y se documentará la imposibilidad; nunca se declarará borrado sin confirmación.

Si la UBB no imparte instrucciones dentro del plazo acordado, CEOUBB mantendrá los datos bloqueados y seguros por `[30 días propuestos]`, reiterará el aviso y aplicará la regla contractual que Jurídica establezca. No podrá conservarlos indefinidamente ni decidir reutilizarlos.

## 8. Certificado final

El certificado identificará:

- convenio y evento de término;
- período y fecha de corte;
- conjuntos entregados, formatos, hashes y aceptación UBB;
- sistemas, subencargados y respaldos eliminados;
- fechas de ejecución y responsables;
- datos exceptuados, fundamento, custodio y vencimiento;
- incidentes, errores o limitaciones;
- declaración expresa de si queda o no alguna copia recuperable.

Las partes firman el certificado. Una frase genérica como “se borraron los datos” sin inventario ni evidencia no cierra el encargo.

## 9. Simulacro obligatorio

Antes del piloto se ejecutará en staging con datos sintéticos:

1. crear identidades, matrículas, notas, archivos, entregas, calendario y logs;
2. exportar todos los almacenes y verificar hashes/conteos;
3. restaurar en un entorno limpio y medir RPO/RTO;
4. ordenar la supresión de una identidad y una sección;
5. restaurar un respaldo anterior y comprobar que el manifiesto reaplica la supresión;
6. emitir un certificado como si fuera real;
7. registrar hallazgos, responsables y repetición.

El objetivo operacional del proyecto es RPO de 1 hora y RTO crítico de 4 horas, pero hoy son metas no demostradas. El simulacro debe producir evidencia antes de presentarlas como garantía contractual.
