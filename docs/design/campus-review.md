# Auditoría y rediseño del campus CEOUBB

Fecha: 4 de septiembre de 2026. Alcance: portal autenticado, navegación, panel personal, comunicaciones, calendario, recursos, gestión docente, administración, aula y contacto.

## Diagnóstico

Las diez capturas originales mostraban una plataforma comprensible, pero con poca diferenciación entre contenido, navegación y acciones. El problema principal era la jerarquía: títulos demasiado dominantes para un espacio de trabajo, bloques vacíos de gran tamaño, información repetida y estilos de cabecera distintos para tareas equivalentes. El rediseño conserva la seriedad académica y hace que los cursos y las acciones tengan más protagonismo.

La dirección aplicada combina navegación azul profundo, superficies claras, bordes discretos y títulos Merriweather. Manrope se mantiene en controles y lectura operativa. El criterio de calidad es claridad, consistencia y capacidad de uso diario, sin añadir animaciones decorativas ni nuevas dependencias.

## Hallazgos por pantalla

| Pantalla original        | Hallazgo y efecto                                                                                                                                                  | Resolución aplicada                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Área personal         | Las portadas de color vacías ocupaban una parte importante de cada tarjeta. Cursos y evaluación competían en una columna larga.                                    | Tarjetas con identificación compacta, código, sección y período. Cursos y agenda comparten la primera zona de trabajo en escritorio; en móvil se muestran primero los cursos.                                                  |
| 1. Próxima evaluación    | Una evaluación pasada podía aparecer como próxima porque el selector recurría al último elemento histórico.                                                        | El selector compartido devuelve únicamente evaluaciones desde hoy. Si no existen, aparece una explicación con acceso al calendario. Hay una prueba de regresión que cubre vacío, pasado, hoy y futuro.                         |
| 1. Información del curso | «Material disponible» se mostraba como sustituto de una evaluación ausente, sin demostrar que existiera material.                                                  | Se informa «Sin evaluaciones próximas», correspondiente al dato realmente disponible.                                                                                                                                          |
| 2. Avisos                | El selector de dos pestañas estaba dentro de un contenedor mucho más ancho que sus controles. El estado vacío parecía una zona abandonada.                         | Selector compacto, jerarquía común y superficie de estado más contenida. El texto conserva el significado del estado.                                                                                                          |
| 3. Mensajes              | Sin conversaciones se mostraban dos instrucciones vacías simultáneas, incluida «Elige una conversación», imposible de cumplir.                                     | Un único estado cuando no hay conversaciones. El panel de historial se oculta semánticamente hasta que existan destinos.                                                                                                       |
| 4. Calendario            | La grilla y sus desplazamientos ocupaban casi toda la pantalla. El error del servidor competía con la navegación.                                                  | Cabecera y controles unificados, altura de grilla ajustada al viewport y desplazamiento localizado. Se conserva la vista móvil por día. Los errores reales del servicio no se ocultan.                                         |
| 5 y 6. Recursos          | Una lista extensa requería recorrer varias pantallas para localizar una categoría.                                                                                 | Índice de categorías con enlaces internos, filas legibles y una entrada destacada a la biblioteca existente. Las insignias de tiendas continúan sin ser enlaces.                                                               |
| 7. Gestión docente       | La cabecera promocional oscura y la doble referencia al semestre rompían la consistencia con el resto del portal. Las marcas verticales competían con los nombres. | Cabecera de trabajo uniforme; período y sección se indican una sola vez bajo el título. Un punto de color identifica cada curso. Formularios conservan sus etiquetas, validaciones y acciones.                                 |
| 8. Administración        | Operaciones de períodos y edición de cuentas necesitaban separación visual y lectura numérica estable. La captura mostraba períodos de nombre repetido.            | Se mantienen agrupaciones funcionales, búsqueda y permisos; se homogeneizan filas y controles y se aplican cifras tabulares. Los registros aparentemente duplicados no se eliminan: requieren comprobar su identidad en datos. |
| 9. Aula                  | Acciones, título, navegación interna y contenido tenían límites poco claros.                                                                                       | Cabecera y pestañas con superficies y bordes completos; acción de publicación destacada y operaciones secundarias legibles. Se preservan los flujos docentes y la información de sección.                                      |
| 10. Contacto             | El formulario quedaba después de una explicación larga, sin acceso directo inicial.                                                                                | Accesos a escribir a soporte, preguntas frecuentes y canales al inicio. Ancho de lectura y tipografía ajustados, conservando los plazos y textos informativos.                                                                 |

## Navegación y componentes

La navegación de escritorio se abre de forma predeterminada desde 901 px y conserva la elección de plegado durante la sesión del componente. En móvil se mantiene la navegación inferior existente. El menú de cuenta incorpora accesos docentes y administrativos según el rol, para que esas funciones sigan disponibles en pantallas pequeñas.

Los controles principales comparten radio suave, altura cómoda y foco visible. Los títulos de página se moderan respecto a las capturas originales. Los pies de página son más discretos, sin retirar la declaración de independencia de la universidad. Las fichas indican sección y período para distinguir instancias de una misma asignatura.

## Referencias consultadas

- [Canvas: nuevo dashboard personalizable](https://community.instructure.com/en/discussion/665850/empowering-learners-introducing-the-new-customizable-dashboard). Inspiró la proximidad entre cursos, agenda y trabajo pendiente.
- [Brightspace: navegación y acceso a cursos](https://community.d2l.com/brightspace/kb/articles/5451-navigate-brightspace-and-find-your-course) y [página inicial del curso](https://community.d2l.com/brightspace/kb/articles/18099-course-homepage). Referencias para orientación persistente y separación entre navegación general y aula.
- [Blackboard Ultra](https://www.blackboard.com/blackboard-ultra). Referencia de consistencia entre superficies de trabajo académico.
- [Radix Themes: Tab Nav](https://www.radix-ui.com/themes/docs/components/tab-nav). Referencia de legibilidad y estado seleccionado en navegación por pestañas. No se instaló la biblioteca.

Se trasladaron principios de organización al producto existente. No se copiaron interfaces ni se incorporaron fotografías o materiales ajenos.

## Verificación y límites

Las pruebas locales usan cuentas y secciones de demostración en `local.db`. Se recorrieron panel personal, mensajes, calendario, recursos, gestión docente, aula y contacto en 1440 × 1000 y 390 × 844. Se comprobó la selección de mensajes por teclado, la desaparición de la instrucción imposible, el acceso docente móvil, los enlaces internos de soporte y la ausencia de desbordamiento horizontal del documento. Administración se comprobó mediante una sesión local de prueba, búsqueda de cuentas y adaptación móvil, sin archivar períodos ni cambiar roles.

La revisión independiente de Impeccable señaló redundancias en gestión docente y bordes incompletos entre cabecera y pestañas del aula. Se corrigieron en una tanda y se recapturaron los mismos tamaños. Las capturas locales están en `.impeccable/review/`; son evidencia de desarrollo, no contenido publicado.

El veredicto posterior fue `ship` para las correcciones puntuadas. La compilación de producción se completó; la suite completa aprobó sus 577 pruebas al ejecutarse secuencialmente. La ejecución paralela produjo un fallo de salida del proceso de interoperabilidad pese a aprobar sus subpruebas; la misma prueba aislada aprobó sus diez casos. `verify:fast` aprobó 559 pruebas y 29 especificaciones, y `verify:invariants` aprobó 35 pruebas. React Doctor informó 90/100 con tres advertencias en módulos de interoperabilidad ajenos al cambio.

La revisión visual y las comprobaciones automáticas no sustituyen pruebas con estudiantes y docentes ni una auditoría exhaustiva con tecnologías de asistencia. Las pantallas con conversaciones, entregas o calificaciones reales requieren datos representativos y los servicios externos configurados. En local, las funciones que dependen de Firebase pueden mostrar sus errores de conexión o permisos existentes.

La ejecución final de axe no detectó infracciones en las siete pantallas recorridas, tanto a 1440 px como a 390 px, usando las reglas WCAG A/AA disponibles hasta 2.2. Se corrigió el foco de teclado de la región desplazable del calendario y se comprobó explícitamente que pudiera recibirlo. Este resultado se limita a los estados y tamaños probados.

## Límites respetados

- Login preservado, sin cambios en su componente ni en los estilos de su superficie.
- Merriweather y Manrope conservadas.
- Sin cambios dentro de `public/biblioteca/` ni otras carpetas de biblioteca.
- Sin cambios en la derivación de roles, aislamiento por matrícula, cálculo de notas o reglas de Firebase.
- Sin despliegue, nuevas dependencias ni cambios de datos de producción.
- Los enlaces a biblioteca siguen apuntando a la versión existente, cuya sustitución queda fuera de este trabajo por indicación del usuario.

## Seguimiento recomendado

### Pulido tras las capturas del usuario

La navegación lateral adopta blanco con selección azul tenue. Se retiraron las franjas decorativas de cuestionarios y el movimiento de las tarjetas al pasar el cursor. La entrada al aula queda alineada con el título y responde con subrayado. Cabecera, franja y cuadrícula del calendario comparten el ancho de scrollbar para evitar el desfase entre columnas.

El dashboard ya no promociona la biblioteca ni repite el botón de calendario en la cabecera. La agenda conserva su acción contextual y elimina los iconos redundantes. Login, Merriweather y la carpeta de biblioteca permanecen intactos. Una prueba de navegador verifica estas correcciones en 1918, 1440, 900 y 390 px.

### Validación con usuarios

Antes de una presentación institucional, validar las tareas frecuentes con estudiantes y docentes: localizar la siguiente evaluación, entrar al curso correcto, encontrar una guía, enviar una consulta y publicar material. Usar secciones numerosas, nombres largos y contenido real permitirá evaluar densidad y comprensión más allá de los estados vacíos. Revisar por separado la vigencia de precios y límites de proveedores del catálogo, así como los períodos aparentemente duplicados de la captura administrativa.
