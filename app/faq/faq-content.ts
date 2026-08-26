// Implements: REQ-HELP-06
/*
  Contenido de las preguntas frecuentes. Vive en el repositorio y se revisa como
  cualquier otro texto publicado.

  Reglas de redacción de este archivo:

  1. Ninguna pregunta ni respuesta lleva raya larga. Donde haría falta separar
     ideas se usa punto seguido, coma, dos puntos o paréntesis.
  2. Cada afirmación se contrasta contra su fuente antes de escribirse: la
     aritmética contra `lib/grades.ts`, los dominios contra `lib/access-policy.ts`,
     lo móvil contra `capacitor.config.ts` y el portal, y el descargo de
     independencia contra `/terminos` y `/privacidad`.
  3. Los `slug` son direcciones públicas: se enlazan desde respuestas de soporte
     y no cambian aunque se corrija la redacción.
*/

export type PreguntaFrecuente = {
  slug: string;
  pregunta: string;
  respuesta: string[];
  enlace?: { href: string; texto: string };
};

export type CategoriaFaq = {
  slug: string;
  titulo: string;
  preguntas: PreguntaFrecuente[];
};

export const CATEGORIAS_FAQ: CategoriaFaq[] = [
  {
    slug: "acceso",
    titulo: "Acceso y cuentas institucionales",
    preguntas: [
      {
        slug: "que-correo-sirve",
        pregunta: "¿Con qué correo puedo entrar a la plataforma?",
        respuesta: [
          "Solo con tu correo institucional de la Universidad del Bío-Bío. Si tu dirección termina en @alumnos.ubiobio.cl entras como estudiante, y si termina en @ubiobio.cl entras como docente.",
          "Cualquier otro dominio queda fuera, incluidos los correos personales de Gmail, Outlook o Hotmail. No es una preferencia de estilo: el dominio es lo único que permite saber si quien entra pertenece a la universidad, porque la plataforma no tiene acceso a los registros de matrícula oficiales.",
        ],
      },
      {
        slug: "elegir-rol",
        pregunta: "¿Puedo elegir si entro como estudiante o como docente?",
        respuesta: [
          "No, y esa es la idea. El rol se deduce del dominio de tu correo y no hay ninguna pantalla donde cambiarlo. Así nadie puede darse a sí mismo permisos de docente para ver o editar notas.",
          "Si tu correo institucional te asigna un rol que no corresponde a tu situación real, escríbenos y lo revisamos caso por caso.",
        ],
        enlace: { href: "/contacto", texto: "Escribir a soporte" },
      },
      {
        slug: "no-puedo-entrar",
        pregunta: "No puedo iniciar sesión. ¿Qué hago?",
        respuesta: [
          "Primero comprueba que estés usando el correo institucional completo y no solo la parte antes del arroba. Después prueba en una ventana privada del navegador, porque una sesión anterior a medio cerrar es la causa más común.",
          "Si sigue sin funcionar, escríbenos contando qué navegador usas y qué mensaje ves. Puedes hacerlo desde un correo personal: el formulario de contacto acepta cualquier dirección, precisamente porque quien no puede entrar suele ser quien no tiene acceso al suyo institucional.",
        ],
        enlace: { href: "/contacto", texto: "Reportar el problema" },
      },
      {
        slug: "es-oficial",
        pregunta: "¿Esta plataforma es un servicio oficial de la UBB?",
        respuesta: [
          "No. Centro de Estudio UBB es una plataforma estudiantil independiente. No representa a la Universidad del Bío-Bío, no reemplaza sus sistemas oficiales y todavía no existe un acuerdo institucional que la respalde.",
          "En la práctica eso significa que lo que ocurre aquí no modifica tu situación académica oficial. Tu matrícula, tus notas de acta y tu situación curricular siguen viviendo en los sistemas de la universidad.",
        ],
        enlace: { href: "/terminos", texto: "Leer los términos de uso" },
      },
      {
        slug: "que-datos-guardan",
        pregunta: "¿Qué datos míos guarda la plataforma?",
        respuesta: [
          "Tu nombre, tu correo institucional, el rol que se deriva de él, tus matrículas en secciones, y la actividad académica que ocurre dentro de la plataforma: publicaciones, entregas, archivos y calificaciones registradas por tus docentes.",
          "La política de privacidad lo detalla categoría por categoría, junto con cuánto tiempo se conserva cada una y cómo pedir acceso, rectificación o eliminación.",
        ],
        enlace: { href: "/privacidad", texto: "Leer la política de privacidad" },
      },
    ],
  },
  {
    slug: "cursos",
    titulo: "Cursos, secciones y asignaturas",
    preguntas: [
      {
        slug: "que-es-una-seccion",
        pregunta: "¿Por qué mis ramos aparecen como secciones y no como asignaturas?",
        respuesta: [
          "Porque una asignatura suele dictarse varias veces a la vez. Cálculo II en el primer semestre con un docente no es el mismo curso que Cálculo II en el mismo semestre con otro, aunque compartan nombre y código.",
          "La plataforma identifica cada curso por la combinación de asignatura, período académico y sección. Así dos secciones de la misma asignatura mantienen sus propios materiales, anuncios y calificaciones sin mezclarse.",
        ],
      },
      {
        slug: "no-veo-mi-ramo",
        pregunta: "No veo uno de mis ramos. ¿Por qué?",
        respuesta: [
          "Solo ves las secciones donde tienes una matrícula activa registrada en la plataforma. Como no hay conexión con los sistemas de matrícula de la universidad, esa inscripción la carga tu docente o la administración.",
          "Si un ramo tuyo no aparece, lo más probable es que la sección todavía no se haya creado o que tu correo no esté en su nómina. Habla primero con tu docente, y si el problema persiste escríbenos.",
        ],
        enlace: { href: "/contacto", texto: "Escribir a soporte" },
      },
      {
        slug: "ver-otras-secciones",
        pregunta: "¿Puedo ver los materiales de otra sección?",
        respuesta: [
          "No. El acceso a los contenidos de una sección depende de que exista una matrícula activa tuya en ella, y esa comprobación la hacen las reglas del servidor, no la interfaz.",
          "Esto vale también para las notas: nadie ve las calificaciones de una sección en la que no participa.",
        ],
      },
      {
        slug: "ramos-archivados",
        pregunta: "¿Qué pasa con los ramos de semestres anteriores?",
        respuesta: [
          "Se archivan al cerrar el período académico. Dejan de ocupar espacio en la vista principal, pero siguen disponibles en el bloque de ramos archivados del panel, con sus materiales y su historial de notas intactos.",
        ],
      },
    ],
  },
  {
    slug: "notas",
    titulo: "Calificaciones y promedio ponderado",
    preguntas: [
      {
        slug: "escala-de-notas",
        pregunta: "¿Qué escala de notas usa la plataforma?",
        respuesta: [
          "La escala chilena de 1,0 a 7,0, con 4,0 como nota mínima de aprobación. Las notas se muestran con un decimal y coma decimal, tal como se escriben en Chile.",
          "El valor por defecto para eximición es 5,0, aunque cada docente define las reglas de su propia sección.",
        ],
      },
      {
        slug: "como-se-calcula-el-promedio",
        pregunta: "¿Cómo se calcula mi promedio ponderado?",
        respuesta: [
          "Cada evaluación tiene una ponderación. El promedio multiplica cada nota por su ponderación, suma esos productos y divide por la suma de las ponderaciones de las evaluaciones que ya tienen nota.",
          "El punto importante es el divisor: se usan solo las evaluaciones calificadas, no todas las del semestre. Por eso al principio del semestre tu promedio refleja lo que llevas rendido y no se ve castigado por las pruebas que aún no ocurren.",
          "El resultado se redondea a un decimal, siguiendo la regla habitual: 5,45 se muestra como 5,5.",
        ],
      },
      {
        slug: "que-nota-necesito",
        pregunta: "¿La plataforma me dice qué nota necesito para aprobar?",
        respuesta: [
          "Sí. A partir de tus notas registradas y de la ponderación que queda por rendir, calcula la nota mínima que necesitas en lo que falta para llegar a la meta que definas.",
          "Cuando el resultado supera 7,0 te lo dice con claridad en lugar de mostrar una cifra imposible, y cuando ya tienes el objetivo asegurado también lo indica.",
        ],
      },
      {
        slug: "notas-oficiales",
        pregunta: "¿Estas notas son mi acta oficial?",
        respuesta: [
          "No. Las calificaciones que ves aquí son un registro de seguimiento que llevan tus docentes dentro de la plataforma. El acta oficial de la asignatura vive en los sistemas de la Universidad del Bío-Bío y es la única con validez académica.",
          "Si una nota registrada aquí no coincide con la oficial, habla con tu docente. Toda modificación de una calificación queda registrada con quién la hizo, el valor anterior, el nuevo y la fecha.",
        ],
      },
      {
        slug: "quien-ve-mis-notas",
        pregunta: "¿Quién puede ver mis notas?",
        respuesta: [
          "Tú, el docente de esa sección y sus ayudantes designados. Ningún estudiante ve las calificaciones de otro.",
          "La cuenta propietaria de la plataforma conserva acceso de lectura a las calificaciones con fines de auditoría institucional. Ese acceso está declarado de forma explícita en la política de privacidad en lugar de existir sin documentar.",
        ],
        enlace: { href: "/privacidad", texto: "Ver quién accede a cada dato" },
      },
    ],
  },
  {
    slug: "biblioteca",
    titulo: "Biblioteca y recursos de estudio",
    preguntas: [
      {
        slug: "que-es-la-biblioteca",
        pregunta: "¿Qué es la biblioteca de estudio?",
        respuesta: [
          "Es un conjunto de apuntes y material de repaso organizado por ramo, independiente de las secciones. No necesitas estar matriculado en un curso para consultarla.",
          "Hoy cubre Ecuaciones Diferenciales, Estadística, Estática, Inglés Comunicacional I, Termodinámica Aplicada y Programación en Ingeniería con MATLAB.",
        ],
        enlace: { href: "/biblioteca/index.html", texto: "Abrir la biblioteca" },
      },
      {
        slug: "aportar-material",
        pregunta: "¿Puedo aportar apuntes a la biblioteca?",
        respuesta: [
          "Sí, y es la mejor forma de que crezca. Escríbenos contando qué ramo cubre tu material y en qué formato lo tienes.",
          "Ten presente que solo se publica material del que puedas ceder el uso. Guías, pruebas y textos con derechos de autor de terceros no entran.",
        ],
        enlace: { href: "/contacto", texto: "Proponer material" },
      },
      {
        slug: "archivos-del-curso",
        pregunta: "¿Dónde están los archivos que sube mi docente?",
        respuesta: [
          "En la sección de materiales de cada ramo, agrupados en carpetas. Son distintos de la biblioteca: los materiales pertenecen a una sección concreta y solo los ve quien está matriculado en ella.",
        ],
      },
    ],
  },
  {
    slug: "movil",
    titulo: "Aplicación móvil y notificaciones",
    preguntas: [
      {
        slug: "hay-aplicacion",
        pregunta: "¿Hay una aplicación para el teléfono?",
        respuesta: [
          "Todavía no publicada. La aplicación existe y está en preparación, pero los distintivos de App Store y Google Play que ves en el portal son marcadores de posición, no enlaces de descarga.",
          "Mientras tanto la plataforma funciona completa desde el navegador del teléfono. Puedes agregarla a tu pantalla de inicio y se abrirá como una aplicación más.",
        ],
      },
      {
        slug: "notificaciones",
        pregunta: "¿Recibiré notificaciones de mis ramos?",
        respuesta: [
          "Las notificaciones de anuncios y actividad de tus secciones están pensadas para la aplicación móvil, que aún no se publica. En el navegador verás la actividad al entrar a cada ramo.",
        ],
      },
      {
        slug: "sin-conexion",
        pregunta: "¿Funciona sin conexión a internet?",
        respuesta: [
          "No para el trabajo del día a día. La plataforma consulta tus ramos, materiales y notas en el servidor, así que necesita conexión.",
          "La aplicación móvil incluye una pantalla de respaldo que se muestra cuando el dispositivo pierde la señal, para que quede claro que el problema es la conexión y no la plataforma.",
        ],
      },
      {
        slug: "cerrar-sesion-dispositivo",
        pregunta: "Perdí mi teléfono. ¿Cómo cierro la sesión?",
        respuesta: [
          "Escríbenos cuanto antes indicando tu correo institucional y te cerramos las sesiones activas.",
          "Las sesiones tienen fecha de expiración y se descartan al vencer, pero si perdiste el dispositivo no conviene esperar a que ocurra solo.",
        ],
        enlace: { href: "/contacto", texto: "Pedir cierre de sesiones" },
      },
    ],
  },
];

/** Total de preguntas publicadas. Alimenta el recuento del filtro. */
export const TOTAL_PREGUNTAS = CATEGORIAS_FAQ.reduce(
  (total, categoria) => total + categoria.preguntas.length,
  0
);
