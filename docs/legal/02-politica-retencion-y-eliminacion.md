# Política propuesta de retención y eliminación

**Estado:** borrador para revisión jurídica; plazos no vigentes · **Versión:** 0.1 · **Fecha:** 23 de agosto de 2026

## 1. Alcance y criterio

Esta política convierte la regla “guardar sólo mientras sea necesario” en plazos y acciones verificables. Se aplicará al encargo institucional cuando la UBB la apruebe. Hasta entonces describe un objetivo de cumplimiento y no debe confundirse con el comportamiento íntegramente automatizado de producción.

Los plazos son **máximos propuestos**. Jurídica debe contrastarlos con las normas académicas, archivísticas y de defensa jurídica aplicables a la UBB. Una obligación de conservar se documentará como excepción, con responsable, fundamento, alcance y fecha de revisión; no autoriza nuevos usos.

### Hitos

- **Cierre de sección:** fecha en que la UBB declara concluido el período y finalizadas las correcciones ordinarias.
- **Cierre de cuenta:** baja autorizada de la identidad en CEOUBB, distinta de la pérdida de acceso temporal.
- **Cierre de caso:** fecha de resolución firme de una solicitud, reclamo, auditoría o disputa.
- **Supresión primaria:** eliminación o anonimización irreversible en los sistemas activos.
- **Expiración de respaldo:** desaparición por rotación de copias no operativas; nunca se usa el respaldo como archivo paralelo.

## 2. Tabla de conservación propuesta

| Categoría y almacén principal                                                    | Plazo máximo propuesto                               | Hito y excepción                                                                                           | Método al vencer                                                              | Estado técnico al 23-08-2026                                                              |
| :------------------------------------------------------------------------------- | :--------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| Cuenta, nombre, correo, rol y perfil (`users`, Firebase Auth, Firestore `users`) | Cuenta activa + 90 días                              | Supresión válida: dentro del plazo del caso; conservación excepcional sólo por instrucción UBB             | Revocar acceso; borrar o anonimizar identificadores en los tres almacenes     | Dos rutas de borrado parciales; no existe una orquestación integral                       |
| Sesiones web (`sessions`)                                                        | 30 días desde emisión                                | Cierre de sesión o cuenta: inmediato                                                                       | Borrar fila y expirar cookie                                                  | Plazo y poda de sesiones vencidas implementados                                           |
| Matrículas, roles por sección y proyección Firestore                             | 24 meses desde cierre de sección                     | Disputa o deber UBB vigente: hasta cierre + 6 meses                                                        | Exportar si corresponde; borrar matrícula y proyección                        | Sin job de vencimiento por período                                                        |
| Evaluaciones, calificaciones de trabajo, promedios y progreso                    | 24 meses desde cierre de sección                     | Sólo después de que UBB confirme la custodia del acta o registro oficial; disputa activa: cierre + 6 meses | Exportar; borrar documentos de calificación/progreso y referencias personales | Sin job general; la política pública actual no fija un plazo cerrado                      |
| Bitácora de cambios de calificación, sin IP                                      | Igual plazo que las calificaciones                   | Puede bloquearse por auditoría o litigio documentado                                                       | Borrar la fila o anonimizar actor/estudiante si UBB conserva estadística      | Existe esquema y consulta; falta expiración del registro completo                         |
| Dirección IP dentro de la bitácora                                               | 12 meses desde cada cambio                           | Sin extensión ordinaria                                                                                    | Sustituir por `NULL`, conservando el acto académico                           | Purga diaria implementada en código; despliegue depende de `CRON_SECRET`                  |
| Entregas y comprobantes del estudiante                                           | 12 meses desde publicación final de resultados       | Reclamo vigente: cierre + 6 meses                                                                          | Borrar objeto de Storage y comprobante Firestore                              | El borrado de cuenta actual no cubre todas las entregas                                   |
| Publicaciones, avisos, materiales y archivos de la sección                       | 24 meses desde cierre de sección                     | Material reutilizado debe copiarse sin datos de estudiantes y bajo instrucción UBB                         | Borrar documento y objeto; verificar referencias huérfanas                    | Borrado manual por publicación; sin expiración de sección                                 |
| Calendario personal                                                              | Cuenta activa + 30 días                              | El usuario puede borrar cada evento inmediatamente                                                         | Borrar subcolección y referencias                                             | Borrado por evento disponible; cierre de cuenta no lo cubre de extremo a extremo          |
| Token FCM de notificaciones                                                      | Hasta cierre de sesión, revocación o 90 días sin uso | Nueva autorización reemplaza el token anterior                                                             | Borrar campo y desuscribir tópicos                                            | Persistencia implementada; falta purga por inactividad y cierre coordinado                |
| Replay de interfaz Sentry                                                        | 30 días                                              | Incidente abierto: preservar sólo el evento mínimo, con autorización                                       | Eliminar replay por proyecto/usuario o dejar expirar según configuración      | Texto, inputs y medios están enmascarados; región y retención de cuenta deben verificarse |
| Eventos de error Sentry y logs de aplicación/Vercel                              | 90 días para errores; 30 días para logs              | Incidente abierto: cierre + 6 meses en expediente separado y minimizado                                    | Expiración del proveedor o borrado por API                                    | Retención real depende del plan; falta evidencia contractual                              |
| Solicitudes de derechos, soporte de privacidad y certificado de respuesta        | 3 años desde cierre de caso                          | Jurídica debe validar el plazo de defensa y archivo público                                                | Borrar adjuntos; anonimizar métricas; eliminar expediente al vencer           | No existe registro formal de casos                                                        |
| Copias de seguridad cifradas, una vez habilitadas                                | Ventana rodante máxima de 35 días                    | Retención legal específica: copia segregada, cifrada y con fecha de revisión                               | Expiración criptográfica o eliminación del backup                             | No hay respaldo ni restauración probada; es bloqueo de piloto                             |

### Justificación de los plazos académicos

Los 24 meses son una propuesta para que una sección siga disponible durante el ciclo académico siguiente sin convertir CEOUBB en archivo permanente. Sólo son aceptables si la UBB conserva por sus canales el registro oficial. Si la UBB instruye que CEOUBB sea sistema oficial de registro, Jurídica deberá sustituir estos plazos por su tabla institucional antes de esa función.

## 3. Flujo de eliminación

1. **Identificar el hito.** Un cierre de sección, cuenta, caso o instrucción válida abre una orden con identificador único.
2. **Revisar excepciones.** La UBB confirma si existe disputa, obligación o investigación. La excepción debe ser específica y revisable; no basta escribir “por motivos legales”.
3. **Bloquear usos.** Se revocan sesiones, notificaciones y accesos que ya no sean necesarios.
4. **Devolver o exportar.** Cuando corresponda, se entrega a la UBB o al titular un conjunto legible con diccionario, alcance y fecha de corte.
5. **Suprimir sistemas activos.** La orden cubre, según aplique, Turso, Firebase Authentication, Firestore, Cloud Storage, Sentry, cachés y tópicos FCM.
6. **Propagar a subencargados.** Se usa el mecanismo contractual o API y se registra la confirmación.
7. **Esperar rotación controlada.** Los datos no pueden consultarse en operación mientras expiran copias cifradas. Una restauración debe reaplicar las órdenes de supresión antes de abrir el servicio.
8. **Verificar.** Se busca el identificador en cada sistema, se revisan objetos huérfanos y se emite certificado con excepciones y fecha de expiración final.

## 4. Métodos aceptables

- **Eliminación física:** remoción del registro u objeto y sus índices o referencias.
- **Anonimización irreversible:** sólo si el resultado no permite identificar razonablemente a una persona, incluso combinado con otras fuentes disponibles.
- **Disociación temporal o seudonimización:** medida de seguridad, no equivale a supresión.
- **Bloqueo:** suspensión temporal de uso mientras se resuelve una solicitud o subsiste una excepción; tampoco equivale a borrado.
- **Expiración criptográfica:** destrucción de claves exclusivas de una copia, siempre que haga irrecuperable su contenido y quede evidencia.

Marcar una cuenta como inactiva, ocultar una pantalla o retirar una matrícula no constituye por sí solo eliminación.

## 5. Control y evidencia

CEOUBB deberá producir mensualmente:

- categorías que vencieron, cantidad eliminada y cantidad exceptuada;
- jobs fallidos o colas que alcanzaron su límite;
- datos activos que superan el plazo y responsable de corrección;
- respaldos más antiguos y fecha de última restauración;
- certificados emitidos y subencargados pendientes.

La UBB revisará trimestralmente la tabla y al cambiar una norma, finalidad, proveedor o sistema oficial. Ningún cambio de plazo se aplicará retroactivamente para borrar antes sin instrucción y evaluación de impacto.

## 6. Brechas que impiden prometer esta política hoy

- `DELETE /api/auth/me` elimina la sesión y el usuario de Turso, pero no coordina Firebase Authentication, Firestore ni Storage.
- `deleteMyAccount` elimina Firebase Auth, ciertos `posts`, `progress`, el perfil y algunos archivos, pero no cubre de forma demostrada matrículas, calendario, notas, entregas y todos los objetos asociados.
- No existe manifiesto único de datos por usuario ni certificado automático de borrado.
- No hay jobs por cierre de sección para notas, entregas, materiales o matrículas.
- No hay respaldo ni restauración probada, por lo que tampoco puede demostrarse la expiración o reaplicación de supresiones en copias.
- Las retenciones de Turso, Vercel y Sentry no están documentadas con evidencia del plan contratado.

Hasta cerrar esas brechas, las respuestas a titulares deben describir exactamente qué fue eliminado, qué permanece, por qué y hasta cuándo.
