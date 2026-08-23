# Procedimiento para solicitudes de datos y eliminación

**Estado:** borrador para revisión jurídica y operación · **Versión:** 0.1 · **Fecha:** 23 de agosto de 2026

## 1. Canal, alcance y regla de responsabilidad

El titular podrá pedir acceso, rectificación, supresión, oposición, portabilidad o bloqueo sin costo y sin usar WhatsApp.

### Canal inicial

- Correo: [`contacto@ceoubb.com`](mailto:contacto@ceoubb.com), enviado preferentemente desde la cuenta institucional.
- Formulario web accesible: `/privacidad/solicitudes`, cuando se implemente. Debe crear el mismo tipo de caso y no exigir iniciar sesión si la persona perdió su cuenta.
- Alternativa UBB para quien no tenga acceso al correo institucional: `[unidad, domicilio o formulario UBB por completar]`.

WhatsApp, Discord y mensajes personales de los mantenedores no son canales de ejercicio de derechos. Si llega una solicitud por ellos, sólo se responderá con el enlace o correo oficial y no se pedirán datos adicionales en ese medio.

**Bloqueo operativo:** `contacto@ceoubb.com` figura en la política pública, pero debe provisionarse, probarse y tener responsables de turno antes de desplegar esa promesa. El formulario aún no existe.

Cuando el convenio esté vigente, la UBB resolverá como Responsable y CEOUBB ejecutará sus instrucciones como Encargado. Antes de ese momento, CEOUBB deberá responder respecto del tratamiento independiente que realiza hoy y no podrá simular una derivación institucional inexistente.

## 2. Contenido mínimo de la solicitud

El formulario o correo pedirá sólo:

- nombre y correo institucional o medio de contacto;
- derecho que desea ejercer;
- datos, sección o período involucrado, si los conoce;
- formato preferido para una copia o portabilidad;
- antecedentes mínimos que ayuden a ubicar los datos.

No se exigirá una copia de cédula por defecto. Primero se verificará el control de la cuenta institucional. Si no está disponible, la UBB definirá un mecanismo proporcional y evitará conservar documentación de identidad una vez verificada.

### Plantilla para el titular

```text
Asunto: Solicitud de datos personales CEOUBB — [acceso/rectificación/supresión/oposición/portabilidad/bloqueo]

Nombre:
Correo institucional o medio de contacto:
Derecho que deseo ejercer:
Datos, ramo, sección o período relacionado:
Resultado que solicito:
Formato preferido, si pido una copia:
Antecedentes adicionales mínimos:
```

## 3. Flujo y plazos

| Etapa                     | Responsable          | Plazo interno                                     | Resultado mínimo                                         |
| :------------------------ | :------------------- | :------------------------------------------------ | :------------------------------------------------------- |
| Recepción y ticket        | CEOUBB o mesa UBB    | Mismo día hábil                                   | ID de caso, fecha y canal de contacto                    |
| Acuse de recibo           | Quien recibió        | 2 días hábiles                                    | Alcance inicial, plazo legal y requerimientos faltantes  |
| Derivación al Responsable | CEOUBB               | 1 día hábil                                       | Caso y antecedentes enviados a la contraparte UBB        |
| Verificación proporcional | UBB con apoyo CEOUBB | 5 días hábiles                                    | Identidad verificada o solicitud acotada de antecedentes |
| Búsqueda y resguardo      | CEOUBB               | 10 días corridos                                  | Inventario por sistema y bloqueo si fue solicitado       |
| Decisión                  | UBB                  | Dentro de 30 días corridos desde ingreso          | Aceptación total/parcial o rechazo fundado               |
| Ejecución técnica         | CEOUBB               | Dentro del mismo plazo o el menor plazo instruido | Exportación, corrección, bloqueo o supresión verificable |
| Cierre                    | UBB                  | Al completar                                      | Respuesta clara, recursos aplicables y certificado       |

El artículo 11 del [texto de la Ley N° 19.628 reformado por la Ley N° 21.719](https://www.bcn.cl/leychile/navegar?idNorma=141599&idVersion=2026-12-01) contempla un máximo de 30 días corridos y permite una prórroga única de hasta 30 días corridos cuando existan circunstancias que lo justifiquen. La prórroga debe comunicarse antes del vencimiento, con motivo y nueva fecha; no se usa como regla general.

Si el régimen vigente al recibir la solicitud establece un plazo menor o un procedimiento especial para organismos públicos, prevalecerá ese régimen.

## 4. Tratamiento por derecho

### Acceso

Entregar confirmación, origen, finalidades, categorías, destinatarios, transferencias, períodos y una copia de los datos del titular. La copia excluirá datos de otras personas y secretos de seguridad. Formatos preferidos: CSV o JSON para datos estructurados; archivos en su formato original; PDF sólo como vista legible complementaria.

### Rectificación

Corregir identidad, matrícula u otros datos inexactos en el sistema de registro y sus proyecciones. Una nota se deriva a la autoridad académica o docente competente; el cambio debe conservar la trazabilidad exigida y no se resuelve sobrescribiendo silenciosamente la auditoría.

### Supresión

Confirmar primero si los datos siguen siendo necesarios, forman parte de un registro oficial o están sujetos a una excepción documentada. Aceptada la solicitud, ejecutar la lista de la sección 5. Un rechazo o supresión parcial debe identificar datos, fundamento y fecha de revisión de cada excepción.

### Oposición

Suspender el tratamiento discutido cuando corresponda, evaluar la finalidad y responder si prevalece una obligación o interés permitido. No debe suspenderse todo acceso académico si basta limitar una operación concreta.

### Portabilidad

Entregar los datos proporcionados por el titular o generados por su actividad en formato electrónico estructurado, genérico y de uso común. La transferencia directa a otro responsable se hará sólo si es técnicamente posible, segura y autorizada.

### Bloqueo

Marcar y aislar temporalmente los datos de toda operación incompatible mientras se resuelve rectificación, supresión u oposición. Mantener únicamente accesos necesarios para custodia, decisión y evidencia.

## 5. Lista técnica para una supresión aceptada

El ejecutor debe marcar cada superficie como eliminada, anonimizada, no aplicable o exceptuada:

- Turso: sesiones, directorio, matrículas y bitácora según la decisión UBB;
- Firebase Authentication: identidad y tokens de autenticación;
- Firestore: perfil, calendario personal, proyección de matrícula, progreso, calificaciones, entregas y publicaciones atribuibles según alcance;
- Cloud Storage: entregas, archivos personales y objetos asociados a documentos borrados;
- FCM: token y suscripciones a tópicos;
- Sentry y logs: eventos localizables, replay y atributos de usuario dentro del período disponible;
- subencargados: solicitud propagada y confirmación recibida;
- respaldos: manifiesto de supresión registrado para reaplicación y fecha de expiración;
- cachés o exportaciones temporales: eliminación al cerrar el caso.

La búsqueda final debe hacerse por todos los identificadores conocidos, incluidos UID de Firebase, ID interno, correo y rutas de Storage, sin escribirlos en el certificado público.

## 6. Respuesta y certificado

La resolución incluirá:

- derecho y alcance resueltos;
- datos encontrados por categoría, no secretos de infraestructura;
- acciones y fecha de ejecución;
- datos no modificados o no eliminados, fundamento, uso permitido y vencimiento;
- fecha máxima de expiración en respaldos;
- vías de reclamación o revisión aplicables al momento de la respuesta;
- contacto de seguimiento e identificador de caso.

CEOUBB conservará sólo el expediente mínimo aprobado en la política de retención, separado del producto académico.

## 7. Plantillas operativas

### Acuse

```text
Asunto: Recibimos tu solicitud de datos — [ID]

Recibimos tu solicitud el [fecha]. La estamos tramitando como [derecho y alcance].
Te responderemos a más tardar el [fecha]. Si necesitamos un antecedente mínimo para verificar tu identidad o ubicar los datos, te lo pediremos por este mismo canal.
No necesitas enviar esta solicitud por WhatsApp ni contactar a un mantenedor en forma personal.
```

### Cierre

```text
Asunto: Resolución de tu solicitud de datos — [ID]

Solicitud:
Decisión:
Acciones ejecutadas y fecha:
Datos que permanecen, motivo y fecha de revisión:
Expiración máxima de respaldos:
Archivo o enlace seguro de entrega:
Vía de revisión o reclamación aplicable:
```

## 8. Métricas y revisión

La UBB y CEOUBB revisarán mensualmente volumen, tiempo de acuse, tiempo total, prórrogas, resultados, excepciones y fallas técnicas. Los reportes serán agregados y no contendrán nombres, correos, notas ni texto de solicitudes.
