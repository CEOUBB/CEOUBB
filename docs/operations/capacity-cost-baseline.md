# Línea base de capacidad, costo y continuidad

Estado: decisión de diseño propuesta en CEO-9. Se vuelve vigente al fusionar la PR. Fecha de precios y fuentes: 2026-08-21.

## Decisión ejecutiva

CEOUBB se diseña y se prueba para la siguiente envolvente institucional:

| Dimensión                                                                    |             Meta |
| :--------------------------------------------------------------------------- | ---------------: |
| Estudiantes activos por período                                              |           12.000 |
| Identidades totales, incluidos docentes y personal                           |           15.000 |
| Secciones activas por semestre                                               |            3.000 |
| Matrículas estudiante-sección por semestre                                   |           72.000 |
| Estudiantes concurrentes en semana de certámenes                             |            3.000 |
| Lecturas Firestore al abrir el portal de un estudiante con hasta 8 secciones | ≤ 200 documentos |
| Almacenamiento de archivos promedio                                          |        1.000 GiB |
| Descarga de archivos por mes académico                                       |        2.000 GiB |
| Costo base de infraestructura por estudiante-año                             |      **CLP 450** |
| Techo de infraestructura por estudiante-año                                  |    **CLP 1.000** |
| Disponibilidad mensual del producto                                          |            99,9% |
| RPO de datos académicos                                                      |           1 hora |
| RTO de un incidente crítico                                                  |          4 horas |

Estos son objetivos de arquitectura, presupuesto y prueba, no evidencia de que producción ya los cumpla. La capacidad requiere una prueba de carga en staging y RPO/RTO requieren una restauración ensayada antes de presentar estas cifras como garantías.

## De dónde salen los números

El último anuario institucional localizado con matrícula total de pregrado diurno informa 11.112 estudiantes en 2022. La UBB informó además 2.748 estudiantes nuevos en 2025. Se redondea la población activa a 12.000 estudiantes y se reserva una envolvente de 15.000 identidades para docentes, ayudantes, coordinación, administración y crecimiento. Fuentes: [Anuario Estadístico Institucional UBB 2022](https://dgai.ubiobio.cl/wp-content/uploads/2024/03/UBB_Anuario_2022.pdf) y [bienvenida UBB 2025](https://noticias.ubiobio.cl/2025/03/13/ubb-da-la-bienvenida-a-mas-de-2-700-nuevos-y-nuevas-estudiantes/).

No existe en el repositorio un extracto institucional vigente de secciones. Por eso 3.000 no se presenta como un dato observado de DARCA, sino como la envolvente que el producto debe aguantar:

```text
12.000 estudiantes × 6 secciones por estudiante = 72.000 matrículas
72.000 matrículas ÷ 30 estudiantes promedio por sección = 2.400 secciones
2.400 secciones × 1,25 de holgura = 3.000 secciones
```

La simultaneidad objetivo es 25% de la población activa. Una prueba no puede repartir esos usuarios durante todo el día: debe llevar 3.000 sesiones autenticadas al mismo tiempo, con una rampa máxima de 10 minutos, y sostenerlas durante 30 minutos.

## Modelo anual de infraestructura

### Convenciones

- El denominador es un estudiante único con al menos una matrícula activa durante el año. Docentes y cuentas de servicio no inflan el denominador.
- Se usa una tasa presupuestaria deliberadamente conservadora de **CLP 1.000 por USD**. Es una convención de presupuesto, no una proyección cambiaria.
- El cálculo no descuenta créditos de prueba, promociones ni cuotas gratuitas. Así representa el costo sostenible después de la prueba gratuita.
- El año base considera 10 meses académicos, 12.000 estudiantes, 720 millones de lecturas Firestore, 12 millones de escrituras, 20.000 GiB descargados y 1.000 GiB almacenados en promedio.

### Caso base

| Partida                                | Fórmula anual                                                   |   USD/año |
| :------------------------------------- | :-------------------------------------------------------------- | --------: |
| Vercel Pro                             | 2 asientos de desarrollo × USD 20 × 12                          |       480 |
| Turso Scaler                           | USD 29 × 12                                                     |       348 |
| Firestore: operaciones                 | 720 M lecturas, 12 M escrituras y 2 M eliminaciones en Santiago |       227 |
| Firestore: datos, PITR y respaldos     | 50 GiB de datos, 50 GiB de PITR y 100 GiB de respaldos promedio |       216 |
| Firestore: salida de red               | 1.000 GiB                                                       |       120 |
| Cloud Storage: datos                   | 1.000 GiB promedio × USD 0,02 × 12                              |       240 |
| Cloud Storage: descargas               | 20.000 GiB × USD 0,12                                           |     2.400 |
| Cloud Storage: operaciones             | 1 M clase A y 20 M clase B                                      |        13 |
| Functions, logs y trabajos programados | Reserva conservadora sobre cuotas incluidas                     |       200 |
| **Subtotal**                           |                                                                 | **4.244** |
| Contingencia                           | 25% por variación de precios, red y uso                         |     1.061 |
| **Presupuesto anual**                  | redondeado hacia arriba                                         | **5.400** |

El caso base equivale a **USD 0,45 o CLP 450 por estudiante-año**. El umbral de advertencia es CLP 750 y el límite de decisión es **CLP 1.000 por estudiante-año**, equivalente a CLP 12 millones anuales con 12.000 estudiantes.

El caso de estrés duplica lecturas, almacenamiento y descargas, agrega USD 600 de uso Vercel y eleva la reserva de Functions y logs. Su presupuesto con 25% de contingencia es aproximadamente USD 10.450, o **CLP 900 por estudiante-año**. Una proyección superior a CLP 1.000 detiene la ampliación hasta reducir descargas, aplicar caché/CDN, ajustar retención o renegociar el proveedor.

### Qué domina el costo

Cloud Storage domina el modelo: 20.000 GiB de descarga representan USD 2.400, más de la mitad del caso base. “Mi Bodega” permanece fuera del alcance; una cuota personal multiplicaría almacenamiento y descarga sin evidencia de demanda. Firestore no es el principal costo mientras cada consulta conserve límites y se mantenga la meta de 200 lecturas por apertura del portal.

### Qué queda fuera

CLP 450 y CLP 1.000 son **infraestructura recurrente**, no precio ni costo total de propiedad para la universidad. Excluyen remuneraciones, soporte de mesa de ayuda, migración desde Moodle/Adecca, capacitación, equipos, IVA/impuestos, revisión legal, pentest, desarrollo futuro y contratos Enterprise con SLA. El costo institucional completo sólo puede fijarse cuando UBB defina esos niveles de servicio y responsabilidades.

## Continuidad del servicio

| Indicador                            | Objetivo           | Interpretación                                                                                            |
| :----------------------------------- | :----------------- | :-------------------------------------------------------------------------------------------------------- |
| SLO mensual                          | 99,9%              | Máximo 43 min 12 s de caída no planificada en un mes de 30 días                                           |
| Mantenimiento planificado            | ≤ 2 h por semestre | Aviso con 72 h y nunca durante ventanas de certámenes o publicación de notas                              |
| RPO académico                        | ≤ 1 h              | Una restauración no puede perder más de una hora de matrículas, calificaciones, auditoría o publicaciones |
| RTO crítico                          | ≤ 4 h              | Portal y datos académicos críticos vuelven a servicio dentro de cuatro horas                              |
| Recuperación de archivos no críticos | ≤ 24 h             | Materiales y entregas históricas pueden reincorporarse después del servicio académico crítico             |

El SLO es interno y no un SLA contractual. Firestore regional publica 99,99% de SLA, mientras Vercel reserva el SLA 99,99% para Enterprise y Turso ofrece SLA personalizado en Enterprise; el producto compuesto necesita un objetivo inferior y medible. Fuentes: [ubicaciones y SLA de Firestore](https://firebase.google.com/docs/firestore/locations), [precios y planes de Vercel](https://vercel.com/pricing) y [precios de Turso](https://turso.tech/pricing?frequency=monthly).

La plataforma actual no ha ejecutado una restauración y no puede afirmar que cumple RPO/RTO. P0.8 debe habilitar respaldos, PITR y un simulacro en staging que mida desde la declaración del incidente hasta la verificación de integridad.

## Prueba que convierte objetivos en evidencia

La prueba institucional se ejecuta en staging, nunca contra producción, con un conjunto sintético de 15.000 identidades, 12.000 estudiantes, 3.000 secciones, 72.000 matrículas, 50 publicaciones por sección y 10 evaluaciones por sección.

### Perfil de carga

1. Crear 3.000 sesiones autenticadas en no más de 10 minutos.
2. Mantener 3.000 usuarios durante 30 minutos.
3. Mezclar apertura del portal, entrada a secciones, lectura de avisos/notas, descargas y un máximo de 10% de acciones de escritura.
4. Ejecutar una ráfaga separada de publicación de calificaciones, sin mezclarla con descargas masivas.

### Criterios de aprobación

- p95 de respuesta HTML/API ≤ 2 s y p99 ≤ 4 s.
- Tasa de HTTP 5xx < 0,1% y cero errores de autorización incorrecta.
- Apertura inicial de un estudiante con hasta 8 secciones ≤ 200 lecturas Firestore, incluidas las lecturas dependientes de reglas.
- Ninguna consulta sin límite, ningún lote sobre 400 escrituras y ninguna sección ajena leída.
- Proyección anualizada del caso medido ≤ CLP 1.000 por estudiante-año.
- Simulacro de restauración posterior ≤ 1 h de RPO y ≤ 4 h de RTO.

Un resultado fallido no se corrige reduciendo la meta: abre trabajo de rendimiento, caché, límites o arquitectura y se repite con el mismo conjunto.

## Operación financiera

- Exportar mensualmente costos por servicio y comparar uso real contra este modelo sin restar créditos promocionales.
- Recalcular costo por estudiante al cierre de cada semestre y actualizar precios oficiales al menos una vez al año.
- Alertar al llegar a CLP 750 por estudiante-año anualizado; detener expansión sobre CLP 1.000.
- El presupuesto actual de Google Cloud de CLP 10.000 mensuales corresponde al piloto y no alcanza para la escala institucional. Antes de un piloto masivo debe sustituirse por un presupuesto coherente con el caso base, aproximadamente CLP 450.000 mensuales, conservando alertas al 50%, 80% y 100%.

## Fuentes de precios

- [Firestore Standard en Santiago](https://cloud.google.com/firestore/pricing): USD 0,03/100.000 lecturas, USD 0,09/100.000 escrituras, USD 0,01/100.000 eliminaciones; almacenamiento, PITR, respaldo y red se cobran por separado.
- [Cloud Storage](https://cloud.google.com/storage/pricing?hl=es): Standard regional cercano a USD 0,02/GiB-mes, operaciones clase A USD 0,005/1.000, clase B USD 0,0004/1.000 y salida general hasta 10 TiB a USD 0,12/GiB.
- [Firebase](https://firebase.google.com/pricing): Authentication tiene 50.000 MAU sin costo bajo Identity Platform y FCM/App Check no agregan costo dentro de sus cuotas; el bucket `*.firebasestorage.app` usa precios de Cloud Storage.
- [Vercel](https://vercel.com/pricing): Pro cuesta USD 20 al mes por asiento de desarrollo e incluye USD 20 de crédito mensual de uso.
- [Turso](https://turso.tech/pricing?frequency=monthly): Scaler cuesta USD 29 al mes e incluye 24 GiB, 1.000 millones de filas leídas al mes y PITR de 30 días.
