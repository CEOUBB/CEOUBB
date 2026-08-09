window.COURSES = [
  {
    "id": "edo",
    "name": "Ecuaciones Diferenciales Ordinarias",
    "short": "EDO",
    "icon": "∂",
    "description": "Certámenes completos de primer orden, segundo orden, sistemas y Laplace.",
    "sourceNote": "Nivelado con el programa 2026, las guías formativas y las pautas de evaluaciones UBB disponibles en tu carpeta.",
    "topics": [
      "Certamen 1",
      "Certamen 2",
      "Certamen 3"
    ],
    "exercises": [
      {
        "id": "edo-cert-01",
        "title": "Certamen de entrenamiento 1 - EDO de primer orden",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 1",
        "time": "90 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Exactitud y PVI (30 ptos)\nConsidere $(2xy+y^2)\\,dx+(x^2+2xy)\\,dy=0$.\na) Verifique si la ecuación es exacta.\nb) Obtenga la solución implícita general.\nc) Determine la curva que satisface $y(1)=1$ y compruebe la condición inicial.\n\nPROBLEMA 2 - Circuito RC con cambio de alimentación (35 ptos)\nUn circuito en serie tiene $R=20\\ \\Omega$ y $C=0{,}05\\ \\mathrm{F}$. El capacitor está inicialmente descargado. La fuente vale 10 V para $0\\le t<3\\ \\mathrm{s}$ y cambia instantáneamente a 4 V para $t\\ge 3\\ \\mathrm{s}$.\na) Plantee la EDO para la carga $q(t)$.\nb) Resuelva $q(t)$ en ambos intervalos imponiendo continuidad en t=3.\nc) Determine la corriente $i(t)=\\dfrac{dq}{dt}$, $q(3)$ y la carga límite.\n\nPROBLEMA 3 - Modelo logístico (35 ptos)\nUna población de microorganismos satisface $\\dfrac{dP}{dt}=rP\\left(1-\\dfrac{P}{K}\\right)$. Inicialmente hay 200 individuos; a las 2 h hay 400 y la capacidad de carga es $K=2000$.\na) Determine r.\nb) Obtenga $P(t)$.\nc) Calcule cuándo se alcanzan 1500 individuos.\nd) Determine el instante de crecimiento máximo y explique por qué ocurre allí.",
        "hint": "En el problema 2 usa la constante de tiempo $RC=1\\ \\mathrm{s}$. En el problema logístico trabaja con $P(t)=\\dfrac{K}{1+A e^{-rt}}$.",
        "solution": "PAUTA PROBLEMA 1\n$M=2xy+y^2$ y $N=x^2+2xy$. $M_y=2x+2y$ y $N_x=2x+2y$, por lo que es exacta. Integrando M respecto de x: $\\Phi=x^2y+xy^2+g(y)$. Al derivar respecto de y se obtiene $x^2+2xy+g'(y)=N$, luego $g'(y)=0$. La familia es $x^2y+xy^2=C$, o $xy(x+y)=C$. Con $y(1)=1$ resulta $C=2$. La solución del PVI queda $xy(x+y)=2$ y al reemplazar (1,1) se verifica 2=2.\n\nPAUTA PROBLEMA 2\nLa ecuación es $R\\dfrac{dq}{dt}+\\dfrac{q}{C}=V(t)$: $20\\dfrac{dq}{dt}+20q=V(t)$, o $\\dfrac{dq}{dt}+q=\\dfrac{V(t)}{20}$. Para 0≤t<3: $\\dfrac{dq}{dt}+q=0{,}5$, $q(0)=0$, por lo que $q_1(t)=0{,}5\\left(1-e^{-t}\\right)\\ \\mathrm{C}$. Entonces $q(3)=0{,}5\\left(1-e^{-3}\\right)\\approx0{,}4751\\ \\mathrm{C}$. Para t≥3: $\\dfrac{dq}{dt}+q=0{,}2$. Usando el tiempo desplazado, $q_2(t)=0{,}2+\\left[q(3)-0{,}2\\right]e^{-(t-3)}=0{,}2+0{,}2751e^{-(t-3)}\\ \\mathrm{C}$. La corriente es $i_1(t)=0{,}5e^{-t}\\ \\mathrm{A}$ para t<3 e $i_2(t)=-0{,}2751e^{-(t-3)}\\ \\mathrm{A}$ para t>3; el signo negativo indica descarga después de bajar la fuente. La carga límite es 0,2 C.\n\nPAUTA PROBLEMA 3\nLa solución logística es $P(t)=\\dfrac{2000}{1+A e^{-rt}}$. De $P(0)=200$ resulta $A=9$. Con $P(2)=400$: $400=\\dfrac{2000}{1+9e^{-2r}}$, luego $1+9e^{-2r}=5$, $e^{-2r}=\\dfrac{4}{9}$ y $r=\\dfrac{1}{2}\\ln\\!\\left(\\dfrac{9}{4}\\right)\\approx0{,}4055\\ \\mathrm{h}^{-1}$. Así $P(t)=\\dfrac{2000}{1+9e^{-0{,}4055t}}$. Para $P=1500$: $1+9e^{-rt}=\\dfrac{4}{3}$, de donde $e^{-rt}=\\dfrac{1}{27}$ y $t=\\dfrac{\\ln(27)}{r}\\approx8{,}13\\ \\mathrm{h}$. El crecimiento es máximo cuando $P=\\dfrac{K}{2}=1000$. Resolviendo 1000=2000/(1+9e^{-rt}) se obtiene $t=\\dfrac{\\ln(9)}{r}\\approx5{,}42\\ \\mathrm{h}$. Allí el producto $P\\left(1-\\dfrac{P}{K}\\right)$ alcanza su máximo.",
        "problemCount": 3
      },
      {
        "id": "edo-cert-02",
        "title": "Certamen de entrenamiento 2 - Segundo orden y sistemas",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 2",
        "time": "90 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Coeficientes indeterminados con resonancia (35 ptos)\nResuelva $y''-4y'+4y=8e^{2x}+3x$.\na) Encuentre la solución homogénea.\nb) Justifique la forma de la particular para cada término del lado derecho.\nc) Obtenga la solución general y verifique por sustitución la parte particular.\n\nPROBLEMA 2 - Variación de parámetros (30 ptos)\nResuelva $y''+y=\\sec x$ en el intervalo $-\\dfrac{\\pi}{2}<x<\\dfrac{\\pi}{2}$. Debe calcular el Wronskiano, las funciones auxiliares y la solución general.\n\nPROBLEMA 3 - Sistema mecánico lineal (35 ptos)\nSea $\\mathbf{X}'=A\\mathbf{X}$ con $A=\\begin{bmatrix}2&-1\\\\5&-2\\end{bmatrix}$ y $\\mathbf{X}(0)=\\begin{bmatrix}1\\\\0\\end{bmatrix}$.\na) Determine los valores propios y clasifique su naturaleza.\nb) Demuestre que $A^2=-I$.\nc) Use $e^{At}=I\\cos t+A\\sin t$ para obtener la solución del PVI.\nd) Verifique directamente que la solución satisface el sistema y la condición inicial.",
        "hint": "En el problema 1 el operador es $(D-2)^2$. Para $e^{2x}$ existe resonancia doble.",
        "solution": "PAUTA PROBLEMA 1\nLa ecuación característica es $(r-2)^2=0$, por lo que $y_h=(C_1+C_2x)e^{2x}$. Para 8$e^{2x}$, como 2 es raíz doble, se propone $y_{p1}=Ax^2e^{2x}$. Usando $(D-2)^2\\!\\left[e^{2x}v\\right]=e^{2x}v''$, con $v=Ax^2$ se obtiene $2Ae^{2x}=8e^{2x}$, luego $A=4$. Para 3x se propone $y_{p2}=ax+b$. Al sustituir: $-4a+4ax+4b=3x$, de donde $a=\\dfrac{3}{4}$ y $b=\\dfrac{3}{4}$. La solución es $y=(C_1+C_2x)e^{2x}+4x^2e^{2x}+\\dfrac{3}{4}x+\\dfrac{3}{4}$.\n\nPAUTA PROBLEMA 2\nLa homogénea tiene $y_1=\\cos x$, $y_2=\\sin x$ y $W=y_1y_2'-y_1'y_2=\\cos^2x+\\sin^2x=1$. Para $g(x)=\\sec x$: $v_1'=-\\dfrac{y_2g}{W}=-\\tan x$, de modo que $v_1=\\ln(\\cos x)$ en el intervalo dado. Además $v_2'=\\dfrac{y_1g}{W}=1$, por lo que $v_2=x$. La particular es $y_p=v_1y_1+v_2y_2=\\cos x\\ln(\\cos x)+x\\sin x$. Entonces y=C₁cos x+C₂sin x+cos x ln(cos x)+x sin x.\n\nPAUTA PROBLEMA 3\nEl polinomio característico es $\\lambda^2+1=0$, así que $\\lambda=\\pm i$. Multiplicando A por sí misma se obtiene $A^2=\\begin{bmatrix}-1&0\\\\0&-1\\end{bmatrix}=-I$. Por la serie de la exponencial, e^{At}=Icos t+Asin t. Aplicando X(0)=(1,0): X(t)=cos t(1,0)^T+sin t A(1,0)^T=(cos t+2sin t,5sin t)^T. Derivando se obtiene X'=(-sin t+2cos t,5cos t)^T. Al calcular AX se obtiene exactamente el mismo vector. En t=0 resulta (1,0)^T.",
        "problemCount": 3
      },
      {
        "id": "edo-cert-03",
        "title": "Certamen de entrenamiento 3 - Transformada de Laplace",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 3",
        "time": "90 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Función por tramos (30 ptos)\nSea $f(t)=2$ para 0≤t<3 y $f(t)=e^{-t}$ para t≥3.\na) Calcule $\\mathcal{L}\\{f\\}$ directamente mediante integrales impropias.\nb) Reescriba f con la función escalón y confirme el resultado usando traslación.\n\nPROBLEMA 2 - Transformada inversa (30 ptos)\nDetermine $\\mathcal{L}^{-1}\\!\\left\\{\\dfrac{4s+9}{(s+2)(s^2-4s+13)}\\right\\}$. Debe mostrar la descomposición en fracciones parciales, completar cuadrados e identificar cada par transformado.\n\nPROBLEMA 3 - PVI forzado por escalón e impulso (40 ptos)\nResuelva $y''+4y=U(t-\\pi)+\\delta(t-2\\pi)$, $y(0)=0$, $y'(0)=0$.\na) Transforme la ecuación.\nb) Despeje $Y(s)$.\nc) Invierta usando el segundo teorema de traslación.\nd) Interprete el efecto del escalón y del impulso sobre la respuesta.",
        "hint": "$\\mathcal{L}^{-1}\\!\\left\\{\\dfrac{1}{s(s^2+4)}\\right\\}=\\dfrac{1}{4}(1-\\cos 2t)$ y $\\mathcal{L}^{-1}\\!\\left\\{\\dfrac{1}{s^2+4}\\right\\}=\\dfrac{1}{2}\\sin 2t$.",
        "solution": "PAUTA PROBLEMA 1\nPor definición: $$F(s)=\\int_0^3 2e^{-st}\\,dt+\\int_3^{\\infty}e^{-(s+1)t}\\,dt=\\dfrac{2(1-e^{-3s})}{s}+\\dfrac{e^{-3(s+1)}}{s+1}$$, para s>0. Una representación por escalón es $f(t)=2+U(t-3)\\left[e^{-t}-2\\right]$. Al transformar el término desplazado debe escribirse e^{-t}=e^{-3}e^{-(t-3)} para recuperar el mismo resultado.\n\nPAUTA PROBLEMA 2\nComo $s^2-4s+13=(s-2)^2+9$, se plantea $\\dfrac{A}{s+2}+\\dfrac{B(s-2)+C}{(s-2)^2+9}$. Al igualar coeficientes se obtiene $A=\\dfrac{1}{25}$, $B=-\\dfrac{1}{25}$ y $C=\\dfrac{104}{25}$. Por tanto, f(t)=(1/25)e^{-2t}-(1/25)e^{2t}cos3t+(104/75)e^{2t}sin3t.\n\nPAUTA PROBLEMA 3\nCon condiciones iniciales nulas: $(s^2+4)Y(s)=\\dfrac{e^{-\\pi s}}{s}+e^{-2\\pi s}$. Así $Y(s)=\\dfrac{e^{-\\pi s}}{s(s^2+4)}+\\dfrac{e^{-2\\pi s}}{s^2+4}$. Invirtiendo: $$y(t)=\\dfrac{1}{4}U(t-\\pi)\\left[1-\\cos\\!\\bigl(2(t-\\pi)\\bigr)\\right]+\\dfrac{1}{2}U(t-2\\pi)\\sin\\!\\bigl(2(t-2\\pi)\\bigr)$$. El primer término activa desde t=π una respuesta sostenida asociada a una entrada escalón. El segundo activa desde t=2π la respuesta impulsiva; el impulso produce un salto instantáneo de magnitud 1 en y', aunque y permanece continua.",
        "problemCount": 3
      }
    ],
    "mathNotationVersion": 1,
    "folder": "ramos/01_EDO",
    "materials": [
      {
        "name": "APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "path": "ramos/01_EDO/APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "type": "MD",
        "size": 3585
      },
      {
        "name": "Ejercicios_EDO.md",
        "path": "ramos/01_EDO/Ejercicios_EDO.md",
        "type": "MD",
        "size": 8438
      },
      {
        "name": "ecuaciones diferenciales  Dennis-Zill.pdf",
        "path": "ramos/01_EDO/Material_original/Ecuaciones diferenciales Libros/ecuaciones diferenciales  Dennis-Zill.pdf",
        "type": "PDF",
        "size": 8076579
      },
      {
        "name": "Pauta_Evaluacion3_EDO_UBB.pdf",
        "path": "ramos/01_EDO/Material_original/Ecuaciones diferenciales pautas certamen/Pauta_Evaluacion3_EDO_UBB.pdf",
        "type": "PDF",
        "size": 196269
      },
      {
        "name": "pauta_sumativo_2_EDO (1).pdf",
        "path": "ramos/01_EDO/Material_original/Ecuaciones diferenciales pautas certamen/pauta_sumativo_2_EDO (1).pdf",
        "type": "PDF",
        "size": 201785
      },
      {
        "name": "Formativo 3 + clase 26-06.pdf",
        "path": "ramos/01_EDO/Material_original/Ecuaciones difereneciales formativos/Formativo 3 + clase 26-06.pdf",
        "type": "PDF",
        "size": 97418
      },
      {
        "name": "Formativo_1_EDO (1).pdf",
        "path": "ramos/01_EDO/Material_original/Ecuaciones difereneciales formativos/Formativo_1_EDO (1).pdf",
        "type": "PDF",
        "size": 139506
      },
      {
        "name": "Guia formativo 2 EDO.pdf",
        "path": "ramos/01_EDO/Material_original/Ecuaciones difereneciales formativos/Guia formativo 2 EDO.pdf",
        "type": "PDF",
        "size": 101495
      },
      {
        "name": "EDO TransLaplace.pdf",
        "path": "ramos/01_EDO/Material_original/EDO TransLaplace.pdf",
        "type": "PDF",
        "size": 29421
      },
      {
        "name": "ejercicios transformada inversa de laplace.pdf",
        "path": "ramos/01_EDO/Material_original/ejercicios transformada inversa de laplace.pdf",
        "type": "PDF",
        "size": 638215
      },
      {
        "name": "ejercicios transformada.pdf",
        "path": "ramos/01_EDO/Material_original/ejercicios transformada.pdf",
        "type": "PDF",
        "size": 433937
      },
      {
        "name": "guia edo 1.pdf",
        "path": "ramos/01_EDO/Material_original/guia edo 1.pdf",
        "type": "PDF",
        "size": 996173
      },
      {
        "name": "programa-220299-EDO IE IEE IME.docx (1).pdf",
        "path": "ramos/01_EDO/Material_original/programa-220299-EDO IE IEE IME.docx (1).pdf",
        "type": "PDF",
        "size": 181932
      },
      {
        "name": "Repaso_basico_opcional.md",
        "path": "ramos/01_EDO/Repaso_basico_opcional.md",
        "type": "MD",
        "size": 5605
      }
    ]
  },
  {
    "id": "estadistica",
    "name": "Estadística",
    "short": "Estadística",
    "icon": "σ",
    "description": "Certámenes completos de descriptiva, probabilidad, distribuciones e inferencia.",
    "sourceNote": "Construido a partir de los listados, certámenes, ejercicios resueltos, distribuciones y tablas estadísticas de tu carpeta.",
    "topics": [
      "Certamen 1",
      "Certamen 2",
      "Certamen 3"
    ],
    "exercises": [
      {
        "id": "est-cert-01",
        "title": "Certamen de entrenamiento 1 - Estadística descriptiva",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 1",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Tamaño de hogares (40 ptos)\nSe observaron 30 hogares: 4,4,1,3,5,3,2,4,1,6,2,3,4,5,5,6,2,3,3,2,2,1,8,3,5,3,4,7,2,3.\na) Defina variable, unidad de observación, población conceptual y muestra.\nb) Construya la tabla con frecuencia absoluta, relativa y acumulada.\nc) Calcule media, mediana, moda, varianza y desviación estándar muestral.\nd) Calcule Q1 y Q3 con el método de medianas de mitades; construya límites para detectar atípicos.\ne) Determine la proporción de hogares con 3 o menos personas y la proporción de individuos que vive en esos hogares.\n\nPROBLEMA 2 - Datos agrupados de puntajes (40 ptos)\nIntervalos y frecuencias: [38,44):7; [44,50):8; [50,56):15; [56,62):25; [62,68):18; [68,74):9; [74,80):6.\na) Calcule la media agrupada y la mediana interpolada.\nb) Estime varianza y desviación estándar muestral.\nc) Calcule el porcentaje entre 56 y 68 puntos.\nd) Analice homogeneidad con el coeficiente de variación.\n\nPROBLEMA 3 - Transformación lineal (20 ptos)\nEl costo diario de operación se modela por $Y=1{,}35X+12$, donde X es el puntaje del problema 2 interpretado como índice de actividad. Obtenga media, varianza, desviación estándar y coeficiente de variación de Y; explique qué cambia y qué no frente a X.",
        "hint": "Para el problema 2 use marcas de clase 41,47,53,59,65,71 y 77. En $Y=aX+b$, $\\operatorname{Var}(Y)=a^2\\operatorname{Var}(X)$.",
        "solution": "PAUTA PROBLEMA 1\nLa variable es número de personas por hogar, cuantitativa discreta; la unidad es el hogar y $n=30$. Frecuencias para $x\\in\\{1,2,3,4,5,6,7,8\\}$: $f_i=(3,6,8,5,4,2,1,1)$; hi=0,10;0,20;0,2667;0,1667;0,1333;0,0667;0,0333;0,0333; acumuladas $F_i=(3,9,17,22,26,28,29,30)$. La suma es 106, de modo que $\\bar{x}=3{,}533$. Mediana=3 y moda=3. La varianza muestral es $s^2\\approx3{,}085$ y $s\\approx1{,}756$. Por medianas de mitades, $Q_1=2$ y $Q_3=5$; $\\mathrm{RIC}=3$. Límites: 2-1,5·3=-2,5 y 5+1,5·3=9,5, por lo que no hay atípicos bajo este criterio. Hay $\\dfrac{17}{30}=56{,}7\\%$ de hogares con 3 o menos personas. En ellos viven $39$ personas de un total de $106$, es decir 36,8% de los individuos.\n\nPAUTA PROBLEMA 2\n$N=88$. Con marcas de clase, $\\bar{x}=\\dfrac{\\sum f_i x_i}{N}=59{,}136$. Para la mediana, $N/2=44$; la clase mediana es [56,62), con acumulada previa 30, frecuencia 25 y amplitud 6: $\\mathrm{Me}=56+\\left(\\dfrac{44-30}{25}\\right)6=59{,}36$. La estimación muestral entrega $s^2\\approx90{,}188$ y $s\\approx9{,}497$. Entre 56 y 68 hay 25+18=43 observaciones: $\\dfrac{43}{88}=48{,}86\\%$. $\\mathrm{CV}=100\\left(\\dfrac{9{,}497}{59{,}136}\\right)=16{,}06\\%$, lo que indica dispersión relativa moderada y datos razonablemente homogéneos bajo el criterio usual $\\mathrm{CV}<30\\%$.\n\nPAUTA PROBLEMA 3\n$E(Y)=1{,}35E(X)+12=1{,}35(59{,}136)+12\\approx91{,}834$. $\\operatorname{Var}(Y)=1{,}35^2(90{,}188)\\approx164{,}368$. $s_Y=1{,}35(9{,}497)\\approx12{,}821$. $\\mathrm{CV}_Y=100\\left(\\dfrac{12{,}821}{91{,}834}\\right)\\approx13{,}96\\%$. La multiplicación por 1,35 escala tanto promedio como desviación; sumar 12 cambia la media pero no la varianza. Por eso el CV sí cambia al existir término aditivo.",
        "problemCount": 3
      },
      {
        "id": "est-cert-02",
        "title": "Certamen de entrenamiento 2 - Probabilidad y distribuciones",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 2",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Bayes en control de calidad (35 ptos)\nUna planta produce por igual piezas A, B y C. Las tasas de defecto son 0,015; 0,003 y 0,007. Un sistema detecta el 70%, 80% y 90% de los defectuosos de cada tipo.\na) Construya el árbol de probabilidades.\nb) Calcule la probabilidad de que una pieza tomada entre las detectadas sea A.\nc) Si se producen 90.000 piezas, estime cuántas serán detectadas y cuántas detectadas serán tipo A.\n\nPROBLEMA 2 - Fallas de columnas (35 ptos)\nCada columna falla ante cierta carga con $p=0{,}05$, independientemente. Se ensayan 16 columnas.\na) Justifique el modelo.\nb) Calcule $P(X=2)$, $P(X\\ge3)$, media, varianza y desviación estándar.\nc) Determine el menor número m tal que $P(X\\le m)>0{,}95$.\n\nPROBLEMA 3 - Poisson y tiempo de espera (30 ptos)\nSe observan en promedio 0,8 imperfecciones por minuto en un proceso.\na) Calcule P(exactamente 1 en un minuto).\nb) Calcule P(exactamente 4 en cinco minutos).\nc) Calcule P(ninguna en los próximos 2 minutos).\nd) Si T es el tiempo hasta la próxima imperfección, obtenga $P(T>3)$, $E(T)$ y explique la falta de memoria.",
        "hint": "En el problema 1 trabaje con pesos conjuntos. En el 3, Poisson y exponencial comparten $\\lambda=0{,}8\\ \\mathrm{min}^{-1}$ por minuto.",
        "solution": "PAUTA PROBLEMA 1\nLos pesos de detección son A:(1/3)(0,015)(0,70)=0,0035; B:(1/3)(0,003)(0,80)=0,0008; C:(1/3)(0,007)(0,90)=0,0021. La probabilidad total de detección es 0,0064. Por Bayes, $P(A\\mid D)=\\dfrac{0{,}0035}{0{,}0064}=0{,}546875\\approx54{,}69\\%$. En 90.000 piezas se esperan 90.000(0,0064)=576 detectadas; de ellas, 90.000(0,0035)=315 serán A.\n\nPAUTA PROBLEMA 2\n$X\\sim\\operatorname{Binomial}(16,0{,}05)$ porque hay número fijo de ensayos, dos resultados, p constante e independencia. $P(X=2)=\\binom{16}{2}(0{,}05)^2(0{,}95)^{14}\\approx0{,}14630$. $P(X\\ge3)=1-\\left[P(0)+P(1)+P(2)\\right]\\approx0{,}04294$. $E(X)=np=0{,}8$; $\\operatorname{Var}(X)=np(1-p)=0{,}76$; $\\sigma\\approx0{,}8718$. $P(X\\le1)=P(0)+P(1)\\approx0{,}8108<0{,}95$, mientras $P(X\\le2)\\approx0{,}9571>0{,}95$; por tanto $m=2$.\n\nPAUTA PROBLEMA 3\nPara un minuto $\\lambda=0{,}8\\ \\mathrm{min}^{-1}$: $P(X=1)=e^{-0{,}8}(0{,}8)\\approx0{,}35946$. Para cinco minutos λ=4: $P(X=4)=\\dfrac{e^{-4}4^4}{4!}\\approx0{,}19537$. En dos minutos λ=1,6: $P(X=0)=e^{-1{,}6}\\approx0{,}20190$. El tiempo T es exponencial con tasa 0,8 min^{-1}: $P(T>3)=e^{-2{,}4}\\approx0{,}09072$ y $E(T)=\\dfrac{1}{0{,}8}=1{,}25\\ \\mathrm{min}$. Falta de memoria significa $P(T>s+t\\mid T>s)=P(T>t)$.",
        "problemCount": 3
      },
      {
        "id": "est-cert-03",
        "title": "Certamen de entrenamiento 3 - Inferencia estadística",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 3",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Intervalo para una media (30 ptos)\nUna muestra normal de $n=25$ ejes mecanizados tiene resistencia media 82 kN y desviación estándar 10 kN.\na) Construya un IC del 95% para μ. Use $t_{0{,}975;24}=2{,}064$.\nb) Evalúe la afirmación $\\mu=87\\ \\mathrm{kN}$.\nc) Calcule el tamaño muestral aproximado necesario para estimar μ con error máximo 3 kN al 95%, usando s como estimación preliminar y $z=1{,}96$.\n\nPROBLEMA 2 - Comparación de dos grupos (40 ptos)\nNúmero de reflejos y frecuencias: valores 0,1,2,3,4. Grupo control: 3,6,3,2,1. Grupo experimental: 9,4,1,1,0.\na) Calcule medias y varianzas muestrales.\nb) Construya un IC de Welch del 95% para $\\mu_C-\\mu_E$ usando t≈2,056.\nc) Contraste $H_0:\\mu_C=\\mu_E$ frente a $H_1:\\mu_C\\ne\\mu_E$ e interprete.\n\nPROBLEMA 3 - Intervalo para la varianza (30 ptos)\nPara n=20 mediciones normales se obtiene $s^2=16$. Construya un IC del 95% para σ² usando $\\chi^2_{0{,}025;19}=8{,}907$ y $\\chi^2_{0{,}975;19}=32{,}852$. Luego obtenga el intervalo para σ y evalúe si $\\sigma^2=40$ es compatible.",
        "hint": "Para Welch use $\\mathrm{SE}=\\sqrt{\\dfrac{s_1^2}{n_1}+\\dfrac{s_2^2}{n_2}}$. Para varianza, invierta el orden de los cuantiles en los límites.",
        "solution": "PAUTA PROBLEMA 1\n$\\mathrm{SE}=\\dfrac{10}{\\sqrt{25}}=2$. El IC es $82\\pm2{,}064(2)=82\\pm4{,}128$, es decir [77,872;86,128] kN. El valor 87 queda fuera, por lo que la afirmación no es compatible al 5%. Para error E=3: $n\\approx\\left(\\dfrac{zs}{E}\\right)^2=\\left(\\dfrac{1{,}96\\cdot10}{3}\\right)^2=42{,}68$; se redondea hacia arriba a 43 ejes.\n\nPAUTA PROBLEMA 2\nControl: $\\bar{x}_C=1{,}4667$ y $s_C^2\\approx1{,}4095$. Experimental: $\\bar{x}_E=0{,}6000$ y $s_E^2\\approx0{,}8286$. La diferencia es 0,8667. $\\mathrm{SE}=\\sqrt{\\dfrac{1{,}4095}{15}+\\dfrac{0{,}8286}{15}}\\approx0{,}38627$. El margen es 2,056(0,38627)≈0,7942 y el IC≈[0,0725;1,6609]. Como cero no pertenece al intervalo, se rechaza H0 al 5%; el grupo control presenta un promedio mayor. El estadístico es $t\\approx\\dfrac{0{,}8667}{0{,}38627}=2{,}244$.\n\nPAUTA PROBLEMA 3\nCon $\\nu=19$: límite inferior=$\\dfrac{19\\cdot16}{32{,}852}\\approx9{,}25$ y superior=$\\dfrac{19\\cdot16}{8{,}907}\\approx34{,}13$. Así $\\mathrm{IC}_{95\\%}(\\sigma^2)=[9{,}25;34{,}13]$. Para σ se extrae raíz: [3,04;5,84]. Como 40 no pertenece al intervalo de varianza, no es compatible al 95%.",
        "problemCount": 3
      }
    ],
    "mathNotationVersion": 1,
    "folder": "ramos/02_Estadistica",
    "materials": [
      {
        "name": "APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "path": "ramos/02_Estadistica/APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "type": "MD",
        "size": 3347
      },
      {
        "name": "Ejercicios_Estadística.md",
        "path": "ramos/02_Estadistica/Ejercicios_Estadística.md",
        "type": "MD",
        "size": 9004
      },
      {
        "name": "ANEXO 1 T1.docx",
        "path": "ramos/02_Estadistica/Material_original/ANEXO 1 T1.docx",
        "type": "DOCX",
        "size": 13979
      },
      {
        "name": "base datos velocidad Trabajo Esta..xlsx",
        "path": "ramos/02_Estadistica/Material_original/base datos velocidad Trabajo Esta..xlsx",
        "type": "XLSX",
        "size": 32261
      },
      {
        "name": "DISTRIB UNIFORME.docx",
        "path": "ramos/02_Estadistica/Material_original/DISTRIB UNIFORME.docx",
        "type": "DOCX",
        "size": 43047
      },
      {
        "name": "DISTRIB.EXPONENCIAL.docx",
        "path": "ramos/02_Estadistica/Material_original/DISTRIB.EXPONENCIAL.docx",
        "type": "DOCX",
        "size": 57944
      },
      {
        "name": "EJEMPLO DISTRIBUCION BINOMIAL, Poisson, Hipergeometrica.docx",
        "path": "ramos/02_Estadistica/Material_original/EJEMPLO DISTRIBUCION BINOMIAL, Poisson, Hipergeometrica.docx",
        "type": "DOCX",
        "size": 17847
      },
      {
        "name": "ejerc. v.c.d.doc",
        "path": "ramos/02_Estadistica/Material_original/ejerc. v.c.d.doc",
        "type": "DOC",
        "size": 72192
      },
      {
        "name": "Ejercicio práctico E. D.070426.doc",
        "path": "ramos/02_Estadistica/Material_original/Ejercicio práctico E. D.070426.doc",
        "type": "DOC",
        "size": 115712
      },
      {
        "name": "C1_138.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Certamenes 1 y 2/C1_138.doc",
        "type": "DOC",
        "size": 63488
      },
      {
        "name": "CER 2 Estad. ING.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Certamenes 1 y 2/CER 2 Estad. ING.doc",
        "type": "DOC",
        "size": 72192
      },
      {
        "name": "Cuestionario de Estadística Descriptiva.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/Cuestionario de Estadística Descriptiva.docx",
        "type": "DOCX",
        "size": 14748
      },
      {
        "name": "DIAGRAMA DE CAJA.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/DIAGRAMA DE CAJA.docx",
        "type": "DOCX",
        "size": 115762
      },
      {
        "name": "Ejercicio EstadDescrip.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/Ejercicio EstadDescrip.docx",
        "type": "DOCX",
        "size": 193809
      },
      {
        "name": "Ejercicios Resueltos de Estadística Descriptiva univariada.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/Ejercicios Resueltos de Estadística Descriptiva univariada.docx",
        "type": "DOCX",
        "size": 16199
      },
      {
        "name": "EjerVCCnuevo.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/EjerVCCnuevo.docx",
        "type": "DOCX",
        "size": 20010
      },
      {
        "name": "Formulario Est descriptiva.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/Formulario Est descriptiva.doc",
        "type": "DOC",
        "size": 74240
      },
      {
        "name": "LISTADO 1  EJERCICIOS DE ESTADISTICA DESCRIPTIVA.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/LISTADO 1  EJERCICIOS DE ESTADISTICA DESCRIPTIVA.docx",
        "type": "DOCX",
        "size": 17854
      },
      {
        "name": "Población y muestra.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/Población y muestra.docx",
        "type": "DOCX",
        "size": 129802
      },
      {
        "name": "Variables Cuantitativas discretas y continuas y Cualitativas.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Descriptiva/Variables Cuantitativas discretas y continuas y Cualitativas.docx",
        "type": "DOCX",
        "size": 20990
      },
      {
        "name": "b)CUESTIONARIO ESTIMACION PUNTUAL.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/b)CUESTIONARIO ESTIMACION PUNTUAL.docx",
        "type": "DOCX",
        "size": 26682
      },
      {
        "name": "Cuál es la diferencia entre estadístico y parámetro.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/Cuál es la diferencia entre estadístico y parámetro.docx",
        "type": "DOCX",
        "size": 16862
      },
      {
        "name": "DISTRIBUCION NORMAL   Y DISTRIBUCION NORMAL ESTANDAR.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/DISTRIBUCION NORMAL   Y DISTRIBUCION NORMAL ESTANDAR.docx",
        "type": "DOCX",
        "size": 260765
      },
      {
        "name": "Distribución t de Student.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/Distribución t de Student.docx",
        "type": "DOCX",
        "size": 87129
      },
      {
        "name": "EJE USO TABLA F.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/EJE USO TABLA F.docx",
        "type": "DOCX",
        "size": 12279
      },
      {
        "name": "Ejemplo 1 I de C media.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/Ejemplo 1 I de C media.docx",
        "type": "DOCX",
        "size": 18276
      },
      {
        "name": "EJERCICIOS DE ESTIMACION PUNTUAL DE PARAMETROS ab.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/EJERCICIOS DE ESTIMACION PUNTUAL DE PARAMETROS ab.doc",
        "type": "DOC",
        "size": 34304
      },
      {
        "name": "EJERCICIOS DE USO TABLAS T DE STUDENT  Y TABLA CHICUADRADO.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/EJERCICIOS DE USO TABLAS T DE STUDENT  Y TABLA CHICUADRADO.docx",
        "type": "DOCX",
        "size": 14143
      },
      {
        "name": "Ejercicios E.P. y E por Int..docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/Ejercicios E.P. y E por Int..docx",
        "type": "DOCX",
        "size": 16896
      },
      {
        "name": "F.G.M.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/F.G.M.docx",
        "type": "DOCX",
        "size": 75125
      },
      {
        "name": "La estimación por intervalo.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/La estimación por intervalo.docx",
        "type": "DOCX",
        "size": 93469
      },
      {
        "name": "Resumen  intervalos de confianza.pdf",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Intervalos de Confianza/Resumen  intervalos de confianza.pdf",
        "type": "PDF",
        "size": 75578
      },
      {
        "name": "ej de PROB..docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Probabilidades/ej de PROB..docx",
        "type": "DOCX",
        "size": 13466
      },
      {
        "name": "eje T de E.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Probabilidades/eje T de E.docx",
        "type": "DOCX",
        "size": 23783
      },
      {
        "name": "Ejemplos de diagramas de árbol de probabilidad.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Probabilidades/Ejemplos de diagramas de árbol de probabilidad.docx",
        "type": "DOCX",
        "size": 84525
      },
      {
        "name": "EJER RESUELTOS  DE PROB (2r) (1).docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Probabilidades/EJER RESUELTOS  DE PROB (2r) (1).docx",
        "type": "DOCX",
        "size": 21547
      },
      {
        "name": "FORMULARIO_Prob.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Probabilidades/FORMULARIO_Prob.docx",
        "type": "DOCX",
        "size": 31827
      },
      {
        "name": "probabilidadesappte.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Probabilidades/probabilidadesappte.doc",
        "type": "DOC",
        "size": 72704
      },
      {
        "name": "220318 SYLABUS semestra l 2026.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/220318 SYLABUS semestra l 2026.doc",
        "type": "DOC",
        "size": 1191936
      },
      {
        "name": "EJEMPLO DE VARIABLE ALEATORIA CONTINUA.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/EJEMPLO DE VARIABLE ALEATORIA CONTINUA.docx",
        "type": "DOCX",
        "size": 45256
      },
      {
        "name": "Ejercicios de v.a. Discretas.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/Ejercicios de v.a. Discretas.doc",
        "type": "DOC",
        "size": 101888
      },
      {
        "name": "Qué es una Variable Aleatoria Continua.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/Qué es una Variable Aleatoria Continua.docx",
        "type": "DOCX",
        "size": 86832
      },
      {
        "name": "tabla normal.pdf",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/tabla normal.pdf",
        "type": "PDF",
        "size": 63618
      },
      {
        "name": "tablaTyChi (1).pdf",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/tablaTyChi (1).pdf",
        "type": "PDF",
        "size": 95347
      },
      {
        "name": "TRABAJO 2 Estad. 137.doc",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/TRABAJO 2 Estad. 137.doc",
        "type": "DOC",
        "size": 56832
      },
      {
        "name": "V. A. CONTINUAS.docx",
        "path": "ramos/02_Estadistica/Material_original/Estadistica Syllabus,Tabla Z y T, Trabajo 2, Variables/V. A. CONTINUAS.docx",
        "type": "DOCX",
        "size": 55820
      },
      {
        "name": "RESUMEN  DISTRIBUCIONES.pdf",
        "path": "ramos/02_Estadistica/Material_original/RESUMEN  DISTRIBUCIONES.pdf",
        "type": "PDF",
        "size": 90729
      },
      {
        "name": "Tabla F mayo2016.pdf",
        "path": "ramos/02_Estadistica/Material_original/Tabla F mayo2016.pdf",
        "type": "PDF",
        "size": 95586
      },
      {
        "name": "Repaso_basico_opcional.md",
        "path": "ramos/02_Estadistica/Repaso_basico_opcional.md",
        "type": "MD",
        "size": 6438
      }
    ]
  },
  {
    "id": "estatica",
    "name": "Estática",
    "short": "Estática",
    "icon": "Σ",
    "description": "Certámenes completos de fuerzas, cuerpos rígidos, estructuras, fricción y centroides.",
    "sourceNote": "Alineado con Estática_T1-T15, ejercicios, certámenes y los RA de fuerzas, equilibrio, fricción y propiedades de área.",
    "topics": [
      "Certamen 1",
      "Certamen 2",
      "Certamen 3"
    ],
    "exercises": [
      {
        "id": "sta-cert-01",
        "title": "Certamen de entrenamiento 1 - Sistemas de fuerzas",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 1",
        "time": "90 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Resultante en 2D (30 ptos)\nEn un anillo concurren tres fuerzas: $\\vec F_1=400\\ \\mathrm{N}$ a 0°, $\\vec F_2=250\\ \\mathrm{N}$ a 120° y $\\vec F_3=300\\ \\mathrm{N}$ a 240°, medidas desde +x en sentido antihorario.\na) Exprese cada fuerza en forma cartesiana.\nb) Calcule la resultante y su ángulo mediante atan2.\nc) Determine el equilibrante y explique su significado físico.\n\nPROBLEMA 2 - Cable en el espacio (30 ptos)\nUn cable va desde A(0,0,0) m hasta B(2,-3,6) m y ejerce 350 N desde A hacia B.\na) Obtenga AB, su módulo y el vector unitario.\nb) Exprese F en componentes cartesianas.\nc) Calcule los tres ángulos directores y verifique $\\cos^2\\alpha+\\cos^2\\beta+\\cos^2\\gamma=1$.\n\nPROBLEMA 3 - Reducción fuerza-par y apoyos (40 ptos)\nUna viga AB de 6 m está articulada en A y apoyada con rodillo en B. Actúa una carga puntual de 10 kN hacia abajo en x=4 m, una carga uniforme de 4 kN/m en toda la viga y un par horario de 12 kN·m.\na) Reemplace la carga distribuida por su fuerza equivalente.\nb) Reduzca todas las cargas a un sistema fuerza-par en A.\nc) Calcule Ax, Ay y By.\nd) Compruebe las ecuaciones de equilibrio.",
        "hint": "Conserve signos en los momentos: antihorario positivo. La carga uniforme total es $wL$ y actúa en $L/2$.",
        "solution": "PAUTA PROBLEMA 1\n$\\vec F_1=(400,0)\\ \\mathrm{N}$. $\\vec F_2=(250\\cos120^\\circ,250\\sin120^\\circ)=(-125,216{,}506)\\ \\mathrm{N}$. $\\vec F_3=(300\\cos240^\\circ,300\\sin240^\\circ)=(-150,-259{,}808)\\ \\mathrm{N}$. La suma es $\\vec R=(125,-43{,}301)\\ \\mathrm{N}$. $\\lVert\\vec R\\rVert=132{,}288\\ \\mathrm{N}$ y $\\theta=\\operatorname{atan2}(-43{,}301,125)=-19{,}107^\\circ$, equivalente a 340,893°. El equilibrante es $\\vec E=-\\vec R=(-125,43{,}301)\\ \\mathrm{N}$; aplicado junto con las tres fuerzas produce suma nula.\n\nPAUTA PROBLEMA 2\n$\\overrightarrow{AB}=(2,-3,6)\\ \\mathrm{m}$ y $\\lVert\\overrightarrow{AB}\\rVert=\\sqrt{4+9+36}=7\\ \\mathrm{m}$. $\\hat{\\mathbf u}_{AB}=\\left(\\dfrac{2}{7},-\\dfrac{3}{7},\\dfrac{6}{7}\\right)$. $\\vec F=350\\hat{\\mathbf u}_{AB}=(100,-150,300)\\ \\mathrm{N}$. $\\cos\\alpha=\\dfrac{2}{7}$, $\\cos\\beta=-\\dfrac{3}{7}$ y $\\cos\\gamma=\\dfrac{6}{7}$, por lo que α≈73,40°, β≈115,38° y γ≈31,00°. La suma de cuadrados es $\\dfrac{4+9+36}{49}=1$.\n\nPAUTA PROBLEMA 3\nLa carga uniforme equivale a 24 kN hacia abajo aplicada a x=3 m. En A, la fuerza resultante externa es 34 kN hacia abajo y el momento equivalente es $M_A=-(24\\cdot3+10\\cdot4+12)=-124\\ \\mathrm{kN\\,m}$, horario. No hay cargas horizontales, luego $A_x=0$. Momentos en A: $6B_y-124=0$, de donde $B_y=20{,}667\\ \\mathrm{kN}$. Fuerzas verticales: $A_y+B_y-24-10=0$, por lo que $A_y=13{,}333\\ \\mathrm{kN}$. La suma vertical y la suma de momentos quedan iguales a cero.",
        "problemCount": 3
      },
      {
        "id": "sta-cert-02",
        "title": "Certamen de entrenamiento 2 - Cuerpos rígidos y estructuras",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 2",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Viga con carga triangular (35 ptos)\nUna viga AB de 8 m tiene pasador en A y rodillo en B. Sobre los primeros 6 m actúa una carga triangular descendente que crece linealmente desde 0 en A hasta 9 kN/m en x=6 m. Además actúa una carga puntual de 18 kN hacia abajo en x=7 m.\na) Sustituya la carga triangular por su resultante y ubíquela.\nb) Calcule reacciones.\nc) Explique cómo verificaría el DCL.\n\nPROBLEMA 2 - Armadura triangular (35 ptos)\nUna armadura tiene A(0,0), B(4,0), C(2,3), pasador en A, rodillo en B y carga de 12 kN descendente en C.\na) Calcule reacciones externas.\nb) Use el método de nodos para hallar AC, BC y AB.\nc) Indique tracción o compresión y dibuje verbalmente el sentido de las fuerzas asumidas.\n\nPROBLEMA 3 - Bastidor simple y cable (30 ptos)\nUna barra horizontal AB de 1,2 m está articulada en A. En B se fija un cable cuya dirección desde B es proporcional a (-4i+3j). Sobre la barra actúa una carga de 900 N hacia abajo a 0,8 m de A.\na) Determine la tensión del cable.\nb) Determine Ax y Ay.\nc) Identifique si alguna reacción cambia de sentido respecto de la suposición positiva.",
        "hint": "La resultante triangular es el área del triángulo y actúa a 2/3 de la base desde el extremo de intensidad cero.",
        "solution": "PAUTA PROBLEMA 1\nLa carga triangular vale $\\dfrac{1}{2}(6)(9)=27\\ \\mathrm{kN}$ y actúa a $x=\\dfrac{2}{3}(6)=4\\ \\mathrm{m}$ desde A. $\\sum M_A=0$: $8B_y-27\\cdot4-18\\cdot7=0$, así $B_y=\\dfrac{234}{8}=29{,}25\\ \\mathrm{kN}$. $\\sum F_y=0$: $A_y+29{,}25-27-18=0$, por lo que $A_y=15{,}75\\ \\mathrm{kN}$; $A_x=0$. El DCL se verifica comprobando $\\sum F_x=0$, $\\sum F_y=0$ y $\\sum M_A=0$ con la resultante en su centroide.\n\nPAUTA PROBLEMA 2\nPor simetría $A_y=B_y=6\\ \\mathrm{kN}$ y $A_x=0$. En C se suponen AC y BC en tracción, alejándose del nodo. Sus componentes verticales son $-\\dfrac{3F}{\\sqrt{13}}$. $\\sum F_y=0$: $2\\left(-\\dfrac{3F}{\\sqrt{13}}\\right)-12=0$, luego $F=-2\\sqrt{13}=-7{,}211\\ \\mathrm{kN}$; el signo negativo indica que AC y BC están en compresión. En A, la fuerza de AC sobre el nodo tiene componentes (-4,-6) kN debido a la compresión; con Ay=6, $\\sum F_x=0$ exige $F_{AB}=4\\ \\mathrm{kN}$ hacia la derecha, es decir AB está en tracción.\n\nPAUTA PROBLEMA 3\nEl vector unitario del cable es $\\left(-\\dfrac{4}{5},\\dfrac{3}{5}\\right)$. En B la componente vertical es $\\dfrac{3T}{5}$. Momentos en A: $1{,}2\\left(\\dfrac{3T}{5}\\right)-900(0{,}8)=0$, por lo que $0{,}72T=720$ y $T=1000\\ \\mathrm{N}$. Fuerzas horizontales: $A_x-\\dfrac{4T}{5}=0$, entonces $A_x=800\\ \\mathrm{N}$. Fuerzas verticales: $A_y+\\dfrac{3T}{5}-900=0$, de donde $A_y=300\\ \\mathrm{N}$. Ambas reacciones resultan en los sentidos positivos asumidos.",
        "problemCount": 3
      },
      {
        "id": "sta-cert-03",
        "title": "Certamen de entrenamiento 3 - Fricción y propiedades de área",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 3",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Fricción en plano inclinado (30 ptos)\nUn bloque de 50 kg está sobre un plano de 25°. Los coeficientes son $\\mu_s=0{,}35$ y $\\mu_k=0{,}28$.\na) Determine si permanece en reposo sin fuerza externa.\nb) Calcule la fuerza mínima paralela al plano y hacia arriba necesaria para impedir el deslizamiento.\nc) Si se suelta y desliza, calcule su aceleración. Use $g=9{,}81\\ \\mathrm{m\\,s^{-2}}$.\n\nPROBLEMA 2 - Correa sobre tambor (25 ptos)\nUna correa abraza un tambor un ángulo de 210°. $\\mu_s=0{,}30$ y la tensión del lado flojo es 400 N.\na) Calcule la máxima tensión del lado tenso.\nb) Obtenga la diferencia de tensiones transmitida.\nc) Si el radio es 0,25 m, determine el torque máximo.\n\nPROBLEMA 3 - Área compuesta en L (45 ptos)\nUn área en L se forma sin superposición con: rectángulo 1 vertical de 40×160 mm cuyo vértice inferior izquierdo es el origen; rectángulo 2 horizontal de 80×40 mm unido a la derecha del primero en la base, ocupando $40\\le x\\le120$ y $0\\le y\\le40$.\na) Determine el centroide.\nb) Calcule $I_x$ e $I_y$ respecto de ejes centroidales paralelos a los ejes coordenados usando Steiner.\nc) Explique qué rectángulo domina cada segundo momento y por qué.",
        "hint": "En el problema 3 use $I_{x,c}=\\dfrac{bh^3}{12}$, $I_{y,c}=\\dfrac{hb^3}{12}$ y sume $Ad^2$.",
        "solution": "PAUTA PROBLEMA 1\nEl peso es 490,5 N. La componente paralela es $W\\sin25^\\circ\\approx207{,}29\\ \\mathrm{N}$ y $N=W\\cos25^\\circ\\approx444{,}62\\ \\mathrm{N}$. La fricción estática máxima es $0{,}35N\\approx155{,}62\\ \\mathrm{N}$, menor que 207,29; no permanece en reposo. Para equilibrio inminente descendente, $P_{\\min}+f_{s,\\max}=W\\sin25^\\circ$, luego $P_{\\min}\\approx51{,}67\\ \\mathrm{N}$ hacia arriba. Al deslizar, $f_k=0{,}28N\\approx124{,}49\\ \\mathrm{N}$ y $ma=W\\sin25^\\circ-f_k$; $a\\approx\\dfrac{207{,}29-124{,}49}{50}=1{,}656\\ \\mathrm{m\\,s^{-2}}$ hacia abajo.\n\nPAUTA PROBLEMA 2\n$\\beta=\\dfrac{210\\pi}{180}=3{,}6652\\ \\mathrm{rad}$. La ecuación de Euler es $\\dfrac{T_t}{T_f}=e^{\\mu\\beta}=e^{1{,}0996}\\approx3{,}003$. Así $T_t\\approx1201{,}2\\ \\mathrm{N}$. La diferencia es $T_t-T_f\\approx801{,}2\\ \\mathrm{N}$. El torque máximo es $M_{\\max}=(T_t-T_f)r\\approx801{,}2(0{,}25)=200{,}3\\ \\mathrm{N\\,m}$.\n\nPAUTA PROBLEMA 3\nA1=6400 mm² con centro (20,80); A2=3200 mm² con centro (80,20). Área total=9600. $\\bar{x}=\\dfrac{6400\\cdot20+3200\\cdot80}{9600}=40\\ \\mathrm{mm}$; $\\bar{y}=\\dfrac{6400\\cdot80+3200\\cdot20}{9600}=60\\ \\mathrm{mm}$. Para $I_x$ centroidal: rectángulo 1 aporta 40·160³/12+6400(20)²=16.213.333 mm⁴; rectángulo 2 aporta 80·40³/12+3200(40)²=5.546.667 mm⁴. $I_x=21\\,760\\,000\\ \\mathrm{mm^4}$. Para $I_y$: rectángulo 1 aporta 160·40³/12+6400(20)²=3.413.333 mm⁴; rectángulo 2 aporta 40·80³/12+3200(40)²=6.826.667 mm⁴. $I_y=10\\,240\\,000\\ \\mathrm{mm^4}$. El elemento vertical domina $I_x$ por su gran altura; el horizontal contribuye fuertemente a $I_y$ por su ancho y separación horizontal.",
        "problemCount": 3
      }
    ],
    "mathNotationVersion": 1,
    "folder": "ramos/03_Estatica",
    "materials": [
      {
        "name": "APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "path": "ramos/03_Estatica/APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "type": "MD",
        "size": 3208
      },
      {
        "name": "Ejercicios_Estática.md",
        "path": "ramos/03_Estatica/Ejercicios_Estática.md",
        "type": "MD",
        "size": 9365
      },
      {
        "name": "Ejercicios 1.pdf",
        "path": "ramos/03_Estatica/Material_original/Ejercicios 1.pdf",
        "type": "PDF",
        "size": 406609
      },
      {
        "name": "Ejercicios.zip",
        "path": "ramos/03_Estatica/Material_original/Ejercicios.zip",
        "type": "ZIP",
        "size": 6842680
      },
      {
        "name": "Cert 1 [2024-2] Estatica 440174 - UnaPag.pdf",
        "path": "ramos/03_Estatica/Material_original/Estatica parte 2 ejercicios ect/Cert 1 [2024-2] Estatica 440174 - UnaPag.pdf",
        "type": "PDF",
        "size": 446471
      },
      {
        "name": "Certamen 1 [2023-1] Estatica 440174 (1).pdf",
        "path": "ramos/03_Estatica/Material_original/Estatica parte 2 ejercicios ect/Certamen 1 [2023-1] Estatica 440174 (1).pdf",
        "type": "PDF",
        "size": 324572
      },
      {
        "name": "Pauta Certamen 1 [2023-1]- Estática 440174 (1).pdf",
        "path": "ramos/03_Estatica/Material_original/Estatica parte 2 ejercicios ect/Pauta Certamen 1 [2023-1]- Estática 440174 (1).pdf",
        "type": "PDF",
        "size": 810910
      },
      {
        "name": "Pauta Certamen 1 Estática 440174 2025-2 - Res_Correción.pdf",
        "path": "ramos/03_Estatica/Material_original/Estatica parte 2 ejercicios ect/Pauta Certamen 1 Estática 440174 2025-2 - Res_Correción.pdf",
        "type": "PDF",
        "size": 506281
      },
      {
        "name": "Soluciones_Ejercicios 1.pdf",
        "path": "ramos/03_Estatica/Material_original/Estatica parte 2 ejercicios ect/Soluciones_Ejercicios 1.pdf",
        "type": "PDF",
        "size": 2789921
      },
      {
        "name": "Soluciones_Ejercicios_Estática_P3.pdf",
        "path": "ramos/03_Estatica/Material_original/Estatica parte 2 ejercicios ect/Soluciones_Ejercicios_Estática_P3.pdf",
        "type": "PDF",
        "size": 2561820
      },
      {
        "name": "Estatica_P4.pdf",
        "path": "ramos/03_Estatica/Material_original/Estatica_P4.pdf",
        "type": "PDF",
        "size": 396546
      },
      {
        "name": "Estática_P3.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_P3.pdf",
        "type": "PDF",
        "size": 390369
      },
      {
        "name": "Estática_P5.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_P5.pdf",
        "type": "PDF",
        "size": 432204
      },
      {
        "name": "Estática_T1.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T1.pdf",
        "type": "PDF",
        "size": 743158
      },
      {
        "name": "Estática_T11.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T11.pdf",
        "type": "PDF",
        "size": 1025606
      },
      {
        "name": "Estática_T12.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T12.pdf",
        "type": "PDF",
        "size": 644971
      },
      {
        "name": "Estática_T13.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T13.pdf",
        "type": "PDF",
        "size": 785923
      },
      {
        "name": "Estática_T14.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T14.pdf",
        "type": "PDF",
        "size": 703664
      },
      {
        "name": "Estática_T15.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T15.pdf",
        "type": "PDF",
        "size": 554822
      },
      {
        "name": "Estática_T2.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T2.pdf",
        "type": "PDF",
        "size": 739113
      },
      {
        "name": "Estática_T3.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T3.pdf",
        "type": "PDF",
        "size": 401590
      },
      {
        "name": "Estática_T4.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T4.pdf",
        "type": "PDF",
        "size": 337306
      },
      {
        "name": "Estática_T5.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T5.pdf",
        "type": "PDF",
        "size": 893917
      },
      {
        "name": "Estática_T6 .pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T6 .pdf",
        "type": "PDF",
        "size": 567350
      },
      {
        "name": "Estática_T7.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T7.pdf",
        "type": "PDF",
        "size": 538973
      },
      {
        "name": "Estática_T8.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T8.pdf",
        "type": "PDF",
        "size": 499886
      },
      {
        "name": "Estática_T9.pdf",
        "path": "ramos/03_Estatica/Material_original/Estática_T9.pdf",
        "type": "PDF",
        "size": 520261
      },
      {
        "name": "Screenshot 2026-07-17 203043.png",
        "path": "ramos/03_Estatica/Material_original/Screenshot 2026-07-17 203043.png",
        "type": "PNG",
        "size": 114214
      },
      {
        "name": "Screenshot 2026-07-17 203051.png",
        "path": "ramos/03_Estatica/Material_original/Screenshot 2026-07-17 203051.png",
        "type": "PNG",
        "size": 10397
      },
      {
        "name": "Repaso_basico_opcional.md",
        "path": "ramos/03_Estatica/Repaso_basico_opcional.md",
        "type": "MD",
        "size": 5906
      }
    ]
  },
  {
    "id": "ingles",
    "name": "Inglés Comunicacional I",
    "short": "Inglés",
    "icon": "EN",
    "description": "Evaluaciones completas de lectura, escritura técnica y presentación oral.",
    "sourceNote": "Contextualizado con tu informe y PPT sobre control de VOCs, industria química e Ingeniería Mecánica.",
    "topics": [
      "Certamen 1",
      "Certamen 2",
      "Certamen 3"
    ],
    "exercises": [
      {
        "id": "eng-cert-01",
        "title": "Certamen de entrenamiento 1 - Reading and language use",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 1",
        "time": "80 min",
        "points": "100 ptos",
        "prompt": "PART 1 - READING (45 points)\nRead the text:\n\nVolatile organic compounds, or VOCs, are gases released by many industrial products and processes. At a chemical terminal, emissions may occur during storage, loading, unloading, or maintenance. Although some VOCs cannot be seen, they may produce strong odors, affect workers, and create environmental concerns for nearby communities. A modern control system normally uses several stages. First, floating roofs, seals, and closed connections reduce emissions at the source. Second, ducts collect the remaining vapor and transport it to treatment equipment. A vapor recovery unit can separate and recover useful product, while a regenerative thermal oxidizer destroys residual compounds at high temperature. However, installing equipment is not enough. Sensors must be calibrated, seals must be inspected, and operating conditions must be recorded. Mechanical engineers contribute by calculating flow rates and pressure losses, selecting fans and materials, and preparing preventive maintenance plans.\n\nAnswer in complete sentences:\na) State the main idea.\nb) Name four emission sources or situations.\nc) Explain the difference between a VRU and an RTO.\nd) Why is maintenance necessary?\ne) Give three contributions of a mechanical engineer.\nf) Decide true or false and justify: 'All VOC emissions are visible'; 'One machine is enough to control the problem'; 'Monitoring supports operation.'\n\nPART 2 - LANGUAGE USE (30 points)\na) Find English equivalents in the text for: sellos, pérdida de presión, mantenimiento preventivo, caudal, recuperar.\nb) Change to passive voice: Engineers inspect the seals every month. The company installed new sensors. The system transports vapors through closed ducts.\nc) Complete with first conditional: If a sensor ___ (fail), the operator ___ (not receive) reliable data. If the pressure drop ___ (increase), the fan ___ (consume) more energy.\n\nPART 3 - FORMAL EMAIL (25 points)\nWrite 90-120 words to a professor. Attach a draft presentation and ask for specific feedback on structure, technical vocabulary and pronunciation. Include subject, greeting, purpose, three precise requests and closing.",
        "hint": "Do not translate word by word. Use evidence from the passage and keep the email formal and specific.",
        "solution": "MODEL ANSWERS - PART 1\na) The text explains how VOC emissions at a chemical terminal are controlled and why mechanical engineering and maintenance are essential.\nb) Emissions may occur during storage, loading, unloading, and maintenance.\nc) A VRU separates and recovers useful vapor, whereas an RTO destroys residual compounds by oxidation at high temperature.\nd) Maintenance keeps sensors accurate, seals tight, and the equipment operating within its design conditions.\ne) Mechanical engineers calculate flow rates and pressure losses, select fans and materials, and prepare preventive maintenance plans.\nf) False: VOCs may be invisible. False: the text describes several control stages. True: monitoring provides operating data and helps detect problems.\n\nPART 2\nseals; pressure loss; preventive maintenance; flow rate; recover. Passive: The seals are inspected every month by engineers. New sensors were installed by the company. Vapors are transported through closed ducts by the system. Conditionals: If a sensor fails, the operator will not receive reliable data. If the pressure drop increases, the fan will consume more energy.\n\nPART 3 - MODEL EMAIL\nSubject: Feedback on VOC Control Presentation\n\nDear Professor,\nI hope you are well. I am attaching the first draft of our presentation on VOC emission control at a chemical terminal. Could you please review whether the introduction clearly explains the environmental problem? We would also appreciate feedback on the accuracy of terms such as vapor recovery unit, pressure drop, and regenerative thermal oxidizer. Finally, could you indicate which words we should practise for pronunciation before the oral presentation? Your comments will help us improve both the technical content and our delivery.\n\nThank you for your time.\nBest regards,\nJoaquín",
        "problemCount": 3
      },
      {
        "id": "eng-cert-02",
        "title": "Certamen de entrenamiento 2 - Technical writing",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 2",
        "time": "90 min",
        "points": "100 ptos",
        "prompt": "CONTEXT\nA terminal stores volatile chemical products. Community complaints increased during warm days. An inspection found worn seals, unstable pressure in a collection duct, and two sensors outside calibration. The company replaced the seals, balanced the duct network, calibrated the sensors, and connected the alarms to the control room. VOC readings then decreased by 35%, but energy consumption of the extraction fan increased by 8%.\n\nPART 1 - TECHNICAL SUMMARY (35 points)\nWrite a 130-160 word summary containing the initial problem, inspection findings, corrective actions, result and remaining engineering trade-off. Use at least two passive constructions and three linking expressions.\n\nPART 2 - COMPARISON AND RECOMMENDATION (35 points)\nWrite 140-180 words comparing two options:\nOption A: install a larger fan; low initial engineering time, high electricity consumption, no product recovery.\nOption B: redesign ducts and add a VRU; high initial cost, lower long-term losses, product recovery, more maintenance.\nRecommend one option and justify it using cost, emissions, energy, safety and maintenance.\n\nPART 3 - EDITING (30 points)\nCorrect the paragraph:\n'The emissions was reduce after the company change the seals. The engineers has measured the pressure yesterday and they find two sensor with problems. A VRU is more efficient that release the vapors, but it need regular maintenance. If the company will ignore the alarms, the community complaints increase.'\nExplain at least five corrections.",
        "hint": "A good technical paragraph follows problem → evidence → action → result → limitation. Keep verb tenses consistent.",
        "solution": "PART 1 - MODEL SUMMARY\nCommunity complaints about VOC odors increased at a chemical terminal during warm weather. During an inspection, worn seals were identified, unstable pressure was measured in a collection duct, and two sensors were found outside calibration. Therefore, the seals were replaced, the duct network was balanced, and the sensors were recalibrated. In addition, the alarm signals were connected directly to the control room so that operators could respond more quickly. After these actions, VOC readings decreased by 35%, which indicates that the corrective plan improved emission control. However, the extraction fan consumed 8% more energy. Consequently, the next engineering step should be to optimize pressure losses and fan operation without reducing capture efficiency.\n\nPART 2 - MODEL RECOMMENDATION\nOption B is the stronger long-term solution. A larger fan would be faster to install, but it would increase electricity consumption and would not recover valuable product. In contrast, redesigning the ducts could reduce unnecessary pressure losses, while a VRU could capture vapor that would otherwise be emitted or wasted. The initial investment and maintenance requirements would be higher, so the company would need trained operators and a preventive maintenance plan. Nevertheless, Option B addresses emissions, energy efficiency, product recovery, and safety as one integrated system. Before implementation, the company should compare life-cycle cost, expected recovery value, and hazardous-area requirements. I would recommend Option B if the economic analysis confirms a reasonable payback period.\n\nPART 3 - CORRECTED TEXT\nThe emissions were reduced after the company changed the seals. The engineers measured the pressure yesterday and found two sensors with problems. A VRU is more efficient than releasing the vapors, but it needs regular maintenance. If the company ignores the alarms, community complaints will increase.\nCorrections include subject-verb agreement, passive form, simple past after 'yesterday', plural 'sensors', comparative 'than', gerund after the comparison, third-person 'needs', and the first conditional pattern present + will.",
        "problemCount": 3
      },
      {
        "id": "eng-cert-03",
        "title": "Evaluación integradora - Oral engineering presentation",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 3",
        "time": "Preparación 60 min + presentación 6 min",
        "points": "100 ptos",
        "prompt": "TASK\nPrepare a six-minute presentation titled 'Mechanical Engineering Solutions for VOC Control at a Chilean Chemical Terminal'. The audience consists of classmates and one engineering professor.\n\nREQUIRED STRUCTURE\n1) Opening and relevance: 40-50 seconds.\n2) Description of the emission problem: 60 seconds.\n3) Technical chain: source control, capture, VRU or RTO, monitoring: 2 minutes.\n4) Mechanical engineering contribution: 90 seconds.\n5) Recommendation and conclusion: 50-60 seconds.\n\nREQUIRED LANGUAGE\nUse at least five technical terms, two passive constructions, one comparison, one first conditional and clear signposting expressions.\n\nQUESTION ROUND\nPrepare answers to: Why not use only an RTO? How can pressure loss affect performance? What happens if sensors are not calibrated? Which maintenance tasks are critical? How would you justify the investment to management?\n\nDELIVERABLES\nWrite a complete speaking outline, a 120-word abstract and five slide titles. Include a self-evaluation checklist for pronunciation, timing, eye contact and technical accuracy.",
        "hint": "Do not memorize a dense essay. Build a speaking outline with short sentences, transitions and one central message per slide.",
        "solution": "MODEL SPEAKING OUTLINE\nOpening: Good morning. Today I will explain how mechanical engineering can reduce VOC emissions at a Chilean chemical terminal. This issue matters because invisible vapors can affect workers, nearby communities, and plant reliability.\nProblem: VOCs may escape from tanks, valves, seals, and loading operations. Warm conditions can increase evaporation. Therefore, the solution must begin before the vapor reaches the atmosphere.\nTechnical chain: First, emissions are reduced at the source with floating roofs, compatible seals, and closed connections. Second, the remaining vapor is captured through a balanced duct network. Pressure losses must be calculated because an undersized fan cannot maintain capture, while an oversized fan wastes energy. A VRU is better suited to recover valuable product; an RTO is used when the vapor should be destroyed safely. Finally, sensors are calibrated and alarms are connected to the control room. If monitoring fails, operators will not detect abnormal conditions quickly.\nEngineering contribution: Mechanical engineers select materials, size ducts and fans, evaluate heat recovery, specify instruments, and plan maintenance. Seals, bearings, filters, sensors, and duct connections must be inspected regularly.\nRecommendation: I recommend an integrated system combining source control, optimized capture, vapor recovery where practical, and oxidation for residual streams. To conclude, equipment alone is not enough; design, operation, monitoring, and maintenance must work together.\n\nMODEL ABSTRACT\nThis presentation examines mechanical engineering solutions for controlling volatile organic compound emissions at a Chilean chemical terminal. VOCs may be released from tanks, seals, valves, and product-transfer operations. An effective strategy combines source control, vapor capture, treatment, monitoring, and preventive maintenance. Vapor recovery units can reduce product losses, whereas regenerative thermal oxidizers destroy residual compounds at high temperature. Mechanical engineers contribute through duct and fan sizing, pressure-loss calculations, material selection, heat recovery, instrumentation, and maintenance planning. The presentation recommends an integrated solution because reliable emission control depends on both suitable equipment and disciplined operation.\n\nSLIDES\n1. Why VOC Control Matters\n2. Where Emissions Occur\n3. From Capture to Treatment\n4. Mechanical Engineering Contribution\n5. Recommendation and Key Message\n\nQUESTION MODELS\nOnly an RTO may waste recoverable product and energy. High pressure loss reduces flow or increases fan power. Uncalibrated sensors create unreliable decisions. Critical tasks include seal inspection, sensor calibration, filter cleaning and fan checks. Investment is justified through lower emissions, recovered product, reduced shutdown risk and regulatory compliance.",
        "problemCount": 3
      }
    ],
    "mathNotationVersion": 1,
    "folder": "ramos/04_Ingles_Comunicacional_I",
    "materials": [
      {
        "name": "APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "path": "ramos/04_Ingles_Comunicacional_I/APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "type": "MD",
        "size": 2746
      },
      {
        "name": "Ejercicios_Inglés.md",
        "path": "ramos/04_Ingles_Comunicacional_I/Ejercicios_Inglés.md",
        "type": "MD",
        "size": 13144
      },
      {
        "name": "Guia_presentacion_tecnica.md",
        "path": "ramos/04_Ingles_Comunicacional_I/Guia_presentacion_tecnica.md",
        "type": "MD",
        "size": 536
      },
      {
        "name": "Desarrollo_Sustentable_en_la_Industria_Quimica_COVs_editado.pdf",
        "path": "ramos/04_Ingles_Comunicacional_I/Material_original/Informe y Power Point dia 06.07.2026/Desarrollo_Sustentable_en_la_Industria_Quimica_COVs_editado.pdf",
        "type": "PDF",
        "size": 30700
      },
      {
        "name": "Descontaminazion del aire por industrias quimicas OBJ NRO15.pptx",
        "path": "ramos/04_Ingles_Comunicacional_I/Material_original/Informe y Power Point dia 06.07.2026/Descontaminazion del aire por industrias quimicas OBJ NRO15.pptx",
        "type": "PPTX",
        "size": 380938
      },
      {
        "name": "Informe de Investigacion Caso NRO 15.docx",
        "path": "ramos/04_Ingles_Comunicacional_I/Material_original/Informe y Power Point dia 06.07.2026/Informe de Investigacion Caso NRO 15.docx",
        "type": "DOCX",
        "size": 69752
      },
      {
        "name": "Informe de Investigacion Caso NRO 15.pdf",
        "path": "ramos/04_Ingles_Comunicacional_I/Material_original/Informe y Power Point dia 06.07.2026/Informe de Investigacion Caso NRO 15.pdf",
        "type": "PDF",
        "size": 158137
      },
      {
        "name": "Repaso_basico_opcional.md",
        "path": "ramos/04_Ingles_Comunicacional_I/Repaso_basico_opcional.md",
        "type": "MD",
        "size": 7722
      }
    ]
  },
  {
    "id": "termodinamica",
    "name": "Termodinámica Aplicada",
    "short": "Termodinámica",
    "icon": "ΔT",
    "description": "Certámenes completos de primera ley, segunda ley, combustión y ciclos de vapor.",
    "sourceNote": "Organizado según los módulos de ADECCA: Primera ley, Segunda ley, Combustión y Ciclos de Vapor, con enfoque de Ingeniería Mecánica.",
    "topics": [
      "Certamen 1",
      "Certamen 2",
      "Certamen 3"
    ],
    "exercises": [
      {
        "id": "ter-cert-01",
        "title": "Certamen de entrenamiento 1 - Primera ley",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 1",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Compresión politrópica de aire (35 ptos)\nUn kilogramo de aire ideal está inicialmente a 100 kPa y 300 K. Se comprime politrópicamente con $n=1{,}30$ hasta 600 kPa. Use $R=0{,}287\\ \\mathrm{kJ\\,kg^{-1}\\,K^{-1}}$ y $c_v=0{,}718\\ \\mathrm{kJ\\,kg^{-1}\\,K^{-1}}$.\na) Calcule $V_1$ y $V_2$.\nb) Determine $T_2$.\nc) Calcule trabajo de frontera, $\\Delta U$ y Q con trabajo positivo realizado por el sistema.\nd) Interprete los signos.\n\nPROBLEMA 2 - Turbina en régimen permanente (30 ptos)\nVapor entra a una turbina con $\\dot m=4\\ \\mathrm{kg\\,s^{-1}}$, $h_1=3200\\ \\mathrm{kJ\\,kg^{-1}}$ y $V_1=60\\ \\mathrm{m\\,s^{-1}}$. Sale con $h_2=2600\\ \\mathrm{kJ\\,kg^{-1}}$ y $V_2=120\\ \\mathrm{m\\,s^{-1}}$. La turbina pierde 40 kW de calor y el cambio de energía potencial es despreciable.\na) Plantee el balance.\nb) Determine la potencia producida.\nc) Compare con el resultado al despreciar energía cinética.\n\nPROBLEMA 3 - Intercambiador adiabático (35 ptos)\nAceite caliente: $\\dot m_h=2\\ \\mathrm{kg\\,s^{-1}}$, $c_{p,h}=1{,}1\\ \\mathrm{kJ\\,kg^{-1}\\,K^{-1}}$, entra a 150°C y sale a 70°C. Agua: $\\dot m_c=1\\ \\mathrm{kg\\,s^{-1}}$, $c_{p,c}=4{,}18\\ \\mathrm{kJ\\,kg^{-1}\\,K^{-1}}$, entra a 20°C.\na) Calcule la tasa de transferencia de calor interna.\nb) Determine la salida del agua.\nc) Calcule la generación de entropía del equipo usando temperaturas absolutas y explique si el resultado cumple la segunda ley.",
        "hint": "Para el proceso politrópico $\\dfrac{T_2}{T_1}=\\left(\\dfrac{P_2}{P_1}\\right)^{\\frac{n-1}{n}}$ y $W=\\dfrac{mR(T_2-T_1)}{1-n}$.",
        "solution": "PAUTA PROBLEMA 1\n$V_1=\\dfrac{mRT_1}{P_1}=\\dfrac{(1)(0{,}287)(300)}{100}=0{,}861\\ \\mathrm{m^3}$. $T_2=300\\left(\\dfrac{600}{100}\\right)^{\\frac{0{,}30}{1{,}30}}\\approx453{,}62\\ \\mathrm{K}$. $V_2=\\dfrac{mRT_2}{P_2}\\approx0{,}2170\\ \\mathrm{m^3}$. El trabajo por el sistema es $W=\\dfrac{R(T_2-T_1)}{1-n}=\\dfrac{0{,}287(153{,}62)}{-0{,}30}\\approx-146{,}97\\ \\mathrm{kJ}$. $\\Delta U=c_v(T_2-T_1)=0{,}718(153{,}62)\\approx110{,}30\\ \\mathrm{kJ}$. De $\\Delta U=Q-W$ se obtiene $Q=\\Delta U+W\\approx-36{,}66\\ \\mathrm{kJ}$. Trabajo y calor son negativos: se suministra trabajo al aire y se rechaza calor durante la compresión.\n\nPAUTA PROBLEMA 2\nPara una entrada y una salida: $$\\dot Q-\\dot W=\\dot m\\left[(h_2-h_1)+\\dfrac{V_2^2-V_1^2}{2000}\\right]$$, con términos cinéticos en kJ/kg. El cambio cinético es $\\dfrac{120^2-60^2}{2000}=5{,}4\\ \\mathrm{kJ\\,kg^{-1}}$. Entonces $-40-\\dot W=4[-600+5{,}4]=-2378{,}4\\ \\mathrm{kW}$, de donde $\\dot W=2338{,}4\\ \\mathrm{kW}$. Si se desprecia energía cinética resulta 2360 kW; la diferencia es 21,6 kW, exactamente $\\dot m\\,\\Delta ke$.\n\nPAUTA PROBLEMA 3\nEl aceite cede $\\dot Q=2(1{,}1)(150-70)=176\\ \\mathrm{kW}$. El agua gana esa energía: $176=(1)(4{,}18)(T_{c,\\mathrm{out}}-20)$, por lo que $T_{c,\\mathrm{out}}\\approx62{,}11\\,^{\\circ}\\mathrm{C}$. Como el equipo es adiabático respecto del ambiente, $$\\dot S_{\\mathrm{gen}}=\\dot m_h c_{p,h}\\ln\\left(\\dfrac{T_{h,\\mathrm{out}}}{T_{h,\\mathrm{in}}}\\right)+\\dot m_c c_{p,c}\\ln\\left(\\dfrac{T_{c,\\mathrm{out}}}{T_{c,\\mathrm{in}}}\\right)$$. Usando kelvin: $\\dot S_{\\mathrm{gen}}=2(1{,}1)\\ln\\left(\\dfrac{343{,}15}{423{,}15}\\right)+4{,}18\\ln\\left(\\dfrac{335{,}26}{293{,}15}\\right)\\approx0{,}100\\ \\mathrm{kW\\,K^{-1}}$. Es positivo, por lo que cumple la segunda ley y refleja irreversibilidad por transferencia con diferencia finita de temperatura.",
        "problemCount": 3
      },
      {
        "id": "ter-cert-02",
        "title": "Certamen de entrenamiento 2 - Segunda ley y combustión",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 2",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Compresor adiabático real (35 ptos)\nAire entra a 100 kPa y 300 K y se comprime hasta 800 kPa. Use $k=1{,}4$, $c_p=1{,}005\\ \\mathrm{kJ\\,kg^{-1}\\,K^{-1}}$ y $R=0{,}287\\ \\mathrm{kJ\\,kg^{-1}\\,K^{-1}}$ kJ/(kg·K). La eficiencia isentrópica del compresor es 0,82.\na) Calcule $T_{2s}$.\nb) Calcule $T_2$ real y trabajo específico.\nc) Calcule $\\Delta s$ del aire y explique su signo.\n\nPROBLEMA 2 - Límites de Carnot (25 ptos)\na) Una máquina opera entre 800 K y 300 K y recibe 1200 kJ/ciclo. Obtenga $\\eta_{\\max}$, $W_{\\max}$ y $Q_L$.\nb) Un refrigerador de Carnot opera entre -5°C y 25°C y extrae 15 kW. Obtenga COP, potencia mínima y calor rechazado.\n\nPROBLEMA 3 - Combustión de metano (40 ptos)\nMetano se quema completamente con 20% de exceso de aire seco, modelado como $\\mathrm{O_2}+3{,}76\\,\\mathrm{N_2}$.\na) Escriba y balancee la reacción por kmol de $\\mathrm{CH_4}$.\nb) Calcule la relación aire-combustible másica.\nc) Determine porcentajes molares secos de $\\mathrm{CO_2}$, $\\mathrm{O_2}$ y $\\mathrm{N_2}$.\nd) Explique el efecto cualitativo de aumentar demasiado el exceso de aire sobre temperatura de llama y pérdidas de chimenea.",
        "hint": "$\\eta_c=\\dfrac{T_{2s}-T_1}{T_2-T_1}$. En combustión, el $\\mathrm{O_2}$ real es 1,20 veces el estequiométrico.",
        "solution": "PAUTA PROBLEMA 1\n$T_{2s}=T_1\\left(\\dfrac{P_2}{P_1}\\right)^{\\frac{k-1}{k}}=300\\cdot8^{0{,}285714}\\approx543{,}43\\ \\mathrm{K}$. De $\\eta_c=\\dfrac{T_{2s}-T_1}{T_2-T_1}$: $T_2=300+\\dfrac{543{,}43-300}{0{,}82}\\approx596{,}87\\ \\mathrm{K}$. El trabajo de entrada es $w_{\\mathrm{in}}=c_p(T_2-T_1)\\approx1{,}005(296{,}87)=298{,}36\\ \\mathrm{kJ\\,kg^{-1}}$. $\\Delta s=c_p\\ln\\left(\\dfrac{T_2}{T_1}\\right)-R\\ln\\left(\\dfrac{P_2}{P_1}\\right)\\approx0{,}0946\\ \\mathrm{kJ\\,kg^{-1}\\,K^{-1}}$, positivo por irreversibilidades internas.\n\nPAUTA PROBLEMA 2\nMáquina: $\\eta_{\\max}=1-\\dfrac{300}{800}=0{,}625$. $W_{\\max}=0{,}625(1200)=750\\ \\mathrm{kJ/ciclo}$ y $Q_L=450\\ \\mathrm{kJ/ciclo}$. Refrigerador: $T_L=268{,}15\\ \\mathrm{K}$ y $T_H=298{,}15\\ \\mathrm{K}$. $\\mathrm{COP}_R=\\dfrac{T_L}{T_H-T_L}=\\dfrac{268{,}15}{30}\\approx8{,}938$. $\\dot W_{\\min}=\\dfrac{15}{8{,}938}\\approx1{,}678\\ \\mathrm{kW}$ y $\\dot Q_H=15+1{,}678\\approx16{,}678\\ \\mathrm{kW}$.\n\nPAUTA PROBLEMA 3\nEstequiométricamente se requieren 2 kmol $\\mathrm{O_2}$; con 20% de exceso se suministran 2,4. Reacción: $$\\mathrm{CH_4}+2{,}4(\\mathrm{O_2}+3{,}76\\,\\mathrm{N_2})\\rightarrow\\mathrm{CO_2}+2\\,\\mathrm{H_2O}+0{,}4\\,\\mathrm{O_2}+9{,}024\\,\\mathrm{N_2}$$. El aire real es 1,2 veces el estequiométrico: $\\dfrac{A}{F}\\approx1{,}2(17{,}2)=20{,}6\\ \\mathrm{kg_{aire}\\,kg_{CH_4}^{-1}}$. En base seca el total es 1+0,4+9,024=10,424 kmol. $\\mathrm{CO_2}$≈9,59%, $\\mathrm{O_2}$≈3,84% y $\\mathrm{N_2}$≈86,57%. Exceso de aire moderado ayuda a completar la combustión; exceso elevado diluye los productos, reduce la temperatura de llama y aumenta energía perdida calentando gases que salen por la chimenea.",
        "problemCount": 3
      },
      {
        "id": "ter-cert-03",
        "title": "Certamen de entrenamiento 3 - Ciclos de vapor",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 3",
        "time": "110 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Rankine ideal (40 ptos)\nSe entregan propiedades: $h_1=191{,}8\\ \\mathrm{kJ\\,kg^{-1}}$ a la salida del condensador; trabajo de bomba $w_p=8\\ \\mathrm{kJ\\,kg^{-1}}$; $h_3=3330\\ \\mathrm{kJ\\,kg^{-1}}$ a la entrada de turbina; $h_4=2300\\ \\mathrm{kJ\\,kg^{-1}}$ a la salida. La planta entrega 50 MW netos.\na) Determine h2, wt, wnet, qin, qout y eficiencia.\nb) Calcule flujo másico de vapor.\nc) Calcule potencia térmica rechazada en el condensador.\n\nPROBLEMA 2 - Rankine con recalentamiento (35 ptos)\nPara otro ciclo se suministran: h1=200, h2=210, h3=3500, h4=3100, h5=3580, h6=2450 kJ/kg. 3→4 es turbina de alta, 4→5 recalentamiento y 5→6 turbina de baja.\na) Calcule trabajos de turbinas y bomba.\nb) Calcule calor total añadido y eficiencia.\nc) Determine ṁ para 50 MW netos.\n\nPROBLEMA 3 - Consumo de combustible y aire (25 ptos)\nUna caldera debe transferir 120 MW al agua-vapor y tiene eficiencia de 88%. Se usa metano con PCI=50 MJ/kg y 20% de exceso de aire, A/F=20,6 kg/kg.\na) Calcule consumo de combustible.\nb) Calcule flujo de aire.\nc) Explique tres medidas para mejorar el rendimiento global sin comprometer seguridad.",
        "hint": "En Rankine, $q_{\\mathrm{in}}=h_3-h_2$ y $q_{\\mathrm{out}}=h_4-h_1$ para el ciclo simple. Potencia en kW dividida por kJ/kg da kg/s.",
        "solution": "PAUTA PROBLEMA 1\n$h_2=191{,}8+8=199{,}8\\ \\mathrm{kJ\\,kg^{-1}}$. $w_t=h_3-h_4=1030\\ \\mathrm{kJ\\,kg^{-1}}$; $w_{\\mathrm{net}}=1030-8=1022\\ \\mathrm{kJ\\,kg^{-1}}$. $q_{\\mathrm{in}}=h_3-h_2=3130{,}2\\ \\mathrm{kJ\\,kg^{-1}}$ y $q_{\\mathrm{out}}=h_4-h_1=2108{,}2\\ \\mathrm{kJ\\,kg^{-1}}$. $\\eta=\\dfrac{1022}{3130{,}2}=0{,}3265=32{,}65\\%$. Para 50.000 kW: $\\dot m=\\dfrac{50\\,000}{1022}\\approx48{,}92\\ \\mathrm{kg\\,s^{-1}}$. El condensador rechaza $\\dot m q_{\\mathrm{out}}\\approx48{,}92(2108{,}2)=103\\,141\\ \\mathrm{kW}\\approx103{,}14\\ \\mathrm{MW}$.\n\nPAUTA PROBLEMA 2\nTurbina alta: 3500-3100=400 kJ/kg. Turbina baja: 3580-2450=1130. Trabajo total de turbina=1530; bomba=210-200=10; $w_{\\mathrm{net}}=1520\\ \\mathrm{kJ\\,kg^{-1}}$. Calor de caldera=(3500-210)=3290 y recalentamiento=(3580-3100)=480; $q_{\\mathrm{in,total}}=3770\\ \\mathrm{kJ\\,kg^{-1}}$. $\\eta=\\dfrac{1520}{3770}\\approx40{,}32\\%$. Para 50 MW: $\\dot m=\\dfrac{50\\,000}{1520}\\approx32{,}89\\ \\mathrm{kg\\,s^{-1}}$. El recalentamiento eleva el trabajo específico y normalmente mejora la calidad del vapor al final de la expansión.\n\nPAUTA PROBLEMA 3\nLa potencia química requerida es $\\dfrac{120}{0{,}88}=136{,}36\\ \\mathrm{MW}$. Con PCI=50 MJ/kg, $\\dot m_f=\\dfrac{136{,}36}{50}\\approx2{,}727\\ \\mathrm{kg\\,s^{-1}}$. El aire es $\\dot m_a=20{,}6(2{,}727)\\approx56{,}18\\ \\mathrm{kg\\,s^{-1}}$. Medidas posibles: recuperar calor de gases en economizador o precalentador de aire; controlar exceso de aire con medición de $\\mathrm{O_2}$; reducir incrustaciones y pérdidas térmicas mediante limpieza y aislamiento; mantener quemadores para combustión estable y segura.",
        "problemCount": 3
      }
    ],
    "mathNotationVersion": 1,
    "folder": "ramos/05_Termodinamica_Aplicada",
    "materials": [
      {
        "name": "APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "path": "ramos/05_Termodinamica_Aplicada/APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "type": "MD",
        "size": 3969
      },
      {
        "name": "Ejercicios_Termodinámica.md",
        "path": "ramos/05_Termodinamica_Aplicada/Ejercicios_Termodinámica.md",
        "type": "MD",
        "size": 10232
      },
      {
        "name": "Formulario_base.md",
        "path": "ramos/05_Termodinamica_Aplicada/Formulario_base.md",
        "type": "MD",
        "size": 1637
      },
      {
        "name": "Repaso_basico_opcional.md",
        "path": "ramos/05_Termodinamica_Aplicada/Repaso_basico_opcional.md",
        "type": "MD",
        "size": 6005
      }
    ]
  },
  {
    "id": "matlab",
    "name": "Programación en Ingeniería con MATLAB",
    "short": "MATLAB",
    "icon": ">_",
    "description": "Certámenes completos de programación, métodos numéricos y simulación mecánica.",
    "sourceNote": "Creado como banco universitario de programación aplicada a Ingeniería Mecánica con MATLAB.",
    "topics": [
      "Certamen 1",
      "Certamen 2",
      "Certamen 3"
    ],
    "exercises": [
      {
        "id": "mat-cert-01",
        "title": "Certamen de entrenamiento 1 - Fundamentos y datos",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 1",
        "time": "100 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Diagnóstico de vibraciones (35 ptos)\nSe midieron velocidades RMS [2.1 2.5 3.2 4.8 5.4 3.9 6.2 2.7 4.1 5.8] mm/s.\na) Calcule media, mediana, desviación estándar muestral, máximo y posición.\nb) Clasifique cada medición: Normal ≤3,5; Alerta >3,5 y ≤5,0; Alarma >5,0.\nc) Muestre una tabla y un gráfico de barras con colores por estado.\nd) Exporte la tabla a CSV.\n\nPROBLEMA 2 - Sistema lineal (30 ptos)\nResuelva $\\begin{cases}3x-y+2z=7\\\\2x+4y-z=1\\\\x+2y+5z=12\\end{cases}$.\na) Construya A y b.\nb) Resuelva con $A\\backslash b$.\nc) Calcule norma del residuo.\nd) Calcule número de condición y explique qué informa.\n\nPROBLEMA 3 - Calibración de sensor (35 ptos)\nEntrada x=[0 1 2 3 4 5] y salida y=[0.2 2.1 4.1 6.2 8.0 10.2].\na) Ajuste $y=ax+b$ con polyfit.\nb) Calcule $R^2$ manualmente.\nc) Estime la salida para x=3,6.\nd) Grafique puntos, recta y residuo en dos subgráficos.",
        "hint": "Use indexación lógica para clasificar; para $R^2$ use 1-SSE/SST.",
        "solution": "PAUTA PROBLEMA 1\nv = [2.1 2.5 3.2 4.8 5.4 3.9 6.2 2.7 4.1 5.8];\nmedia = mean(v);\nmediana = median(v);\ns = std(v);\n[maximo,posicion] = max(v);\nestado = strings(size(v));\nestado(v <= 3.5) = \"Normal\";\nestado(v > 3.5 & v <= 5.0) = \"Alerta\";\nestado(v > 5.0) = \"Alarma\";\nT = table((1:numel(v))',v',estado','VariableNames',{'Medicion','Velocidad','Estado'});\ncolores = zeros(numel(v),3);\ncolores(estado==\"Normal\",:) = repmat([0.2 0.7 0.35],sum(estado==\"Normal\"),1);\ncolores(estado==\"Alerta\",:) = repmat([0.95 0.65 0.1],sum(estado==\"Alerta\"),1);\ncolores(estado==\"Alarma\",:) = repmat([0.8 0.1 0.2],sum(estado==\"Alarma\"),1);\nb = bar(v,'FaceColor','flat'); b.CData = colores; grid on;\nwritetable(T,'diagnostico_vibraciones.csv');\n\nResultados: media=4,07; mediana=4,00; s≈1,4469; máximo=6,2 en posición 7. Hay 4 normales, 3 alertas y 3 alarmas.\n\nPAUTA PROBLEMA 2\nA = [3 -1 2; 2 4 -1; 1 2 5];\nb = [7;1;12];\nx = A\\b;\nr = A*x-b;\nnormaResiduo = norm(r);\nkappa = cond(A);\n\nLa solución es aproximadamente [1,0260;0,2597;2,0909]. La norma del residuo debe quedar cercana a precisión de máquina. cond(A) cuantifica sensibilidad: valores grandes indican que pequeños errores en datos pueden amplificarse en la solución.\n\nPAUTA PROBLEMA 3\nx = 0:5;\ny = [0.2 2.1 4.1 6.2 8.0 10.2];\np = polyfit(x,y,1);\nyhat = polyval(p,x);\nSSE = sum((y-yhat).^2);\nSST = sum((y-mean(y)).^2);\nR2 = 1-SSE/SST;\ny36 = polyval(p,3.6);\ntiledlayout(2,1);\nnexttile; plot(x,y,'o',x,yhat,'-','LineWidth',1.5); grid on;\nnexttile; stem(x,y-yhat,'filled'); grid on;\n\nSe obtiene a≈1,99429, b≈0,14762, R²≈0,99953 e y(3,6)≈7,327.",
        "problemCount": 3
      },
      {
        "id": "mat-cert-02",
        "title": "Certamen de entrenamiento 2 - Métodos numéricos",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 2",
        "time": "110 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Método de bisección programado (35 ptos)\nEncuentre la raíz de $f(x)=x^3-4x-1$ en [2,3] con tolerancia $10^{-6}$.\na) Verifique cambio de signo.\nb) Programe la bisección sin usar fzero.\nc) Guarde una tabla de iteración, aproximación y error.\nd) Compare con fzero.\n\nPROBLEMA 2 - Energía de una bomba (30 ptos)\nLa potencia durante 12 h es $P(t)=12+3\\sin\\left(\\dfrac{\\pi t}{6}\\right)\\ \\mathrm{kW}$.\na) Integre con trapz usando pasos 1 h, 0,1 h y 0,01 h.\nb) Compare con la integral analítica.\nc) Grafique convergencia del error.\n\nPROBLEMA 3 - Enfriamiento con ode45 (35 ptos)\nUn componente satisface $\\dfrac{dT}{dt}=-0{,}08(T-20)$, $T(0)=120$, con t en minutos.\na) Resuelva con ode45 en $0\\le t\\le40$.\nb) Compare con la solución analítica.\nc) Determine por interpolación cuándo baja de 50°C.\nd) Calcule el error máximo entre ambas soluciones.",
        "hint": "La raíz es cercana a 2,115. La potencia sinusoidal completa un período en 12 h.",
        "solution": "PAUTA PROBLEMA 1\nf = @(x) x.^3-4*x-1;\na = 2; b = 3; tol = 1e-6;\nif f(a)*f(b) >= 0\n    error('Intervalo sin cambio de signo')\nend\niter = 0; historial = [];\nwhile (b-a)/2 > tol\n    c = (a+b)/2;\n    iter = iter+1;\n    historial(end+1,:) = [iter c (b-a)/2];\n    if f(a)*f(c) < 0\n        b = c;\n    else\n        a = c;\n    end\nend\nraiz = (a+b)/2;\nraizFzero = fzero(f,[2 3]);\nTabla = array2table(historial,'VariableNames',{'Iteracion','Aproximacion','CotaError'});\n\nLa raíz es aproximadamente 2,11490754.\n\nPAUTA PROBLEMA 2\nP = @(t) 12+3*sin(pi*t/6);\npasos = [1 0.1 0.01];\nE = zeros(size(pasos));\nfor k = 1:numel(pasos)\n    t = 0:pasos(k):12;\n    E(k) = trapz(t,P(t));\nend\nEexacta = 144;\nerrorAbs = abs(E-Eexacta);\nloglog(pasos,errorAbs,'o-'); grid on;\n\nLa parte sinusoidal integra cero sobre el período completo, por lo que la energía exacta es 144 kWh. Debido a la simetría de la malla, trapz también entrega un valor prácticamente igual para estos pasos.\n\nPAUTA PROBLEMA 3\nmodelo = @(t,T) -0.08*(T-20);\n[t,Tnum] = ode45(modelo,[0 40],120);\nTana = 20+100*exp(-0.08*t);\nerrorMax = max(abs(Tnum-Tana));\ncruce = find(Tnum <= 50,1);\nt50 = interp1(Tnum(cruce-1:cruce),t(cruce-1:cruce),50);\nplot(t,Tnum,'o',t,Tana,'-','LineWidth',1.4); grid on;\n\nAnalíticamente t50=-ln[(50-20)/(120-20)]/0,08≈15,05 min. El error máximo depende de tolerancias de ode45 y debe ser pequeño.",
        "problemCount": 3
      },
      {
        "id": "mat-cert-03",
        "title": "Evaluación integradora - Simulación mecánica",
        "difficulty": "Tipo certamen",
        "topic": "Certamen 3",
        "time": "120 min",
        "points": "100 ptos",
        "prompt": "PROBLEMA 1 - Oscilador amortiguado (35 ptos)\nModele m x''+c x'+k x=0 con m=5 kg, c=6 N·s/m, k=80 N/m, x(0)=0,08 m y x'(0)=0.\na) Convierta a sistema de primer orden.\nb) Resuelva con ode45 durante 15 s.\nc) Grafique desplazamiento, velocidad y energía E=0,5mv²+0,5kx².\nd) Determine numéricamente el primer máximo posterior a t=0 y el tiempo aproximado de asentamiento dentro de ±2% de x(0).\n\nPROBLEMA 2 - Curva de bomba y sistema (30 ptos)\nBomba: Hp(Q)=42-0,015Q² m. Sistema: Hs(Q)=10+0,005Q² m, Q en m³/h.\na) Encuentre el punto de operación con fzero.\nb) Grafique ambas curvas entre 0 y 55 m³/h.\nc) Calcule potencia hidráulica y potencia de eje para η=0,75. Use ρ=1000 kg/m³ y g=9,81.\n\nPROBLEMA 3 - Procesamiento automático de sensores (35 ptos)\nGenere una tabla con tiempo 0:10:300 s, temperatura 65+8sin(2πt/180)+ruido reproducible y presión 2,4+0,15cos(2πt/120)+ruido.\na) Fije rng(7).\nb) Calcule medias móviles de 5 muestras.\nc) Genere alarma si temperatura suavizada>70 o presión suavizada>2,5.\nd) Grafique señales y límites, exporte CSV y entregue cantidad y tiempos de alarma.",
        "hint": "Para el asentamiento, busque desde qué índice en adelante todos los valores cumplen la banda. En la bomba convierta $Q$ a $\\mathrm{m^3\\,s^{-1}}$ para la potencia.",
        "solution": "PAUTA PROBLEMA 1\nm = 5; c = 6; k = 80;\nmodelo = @(t,y) [y(2); -(c/m)*y(2)-(k/m)*y(1)];\n[t,y] = ode45(modelo,[0 15],[0.08;0]);\nx = y(:,1); v = y(:,2);\nE = 0.5*m*v.^2+0.5*k*x.^2;\ndx = diff(x);\nmaxIdx = find(dx(1:end-1) > 0 & dx(2:end) <= 0,1)+1;\nprimerMaximo = x(maxIdx);\ntiempoPrimerMaximo = t(maxIdx);\nbanda = 0.02*0.08;\ntAsent = NaN;\nfor j = 1:numel(t)\n    if all(abs(x(j:end)) <= banda)\n        tAsent = t(j);\n        break\n    end\nend\ntiledlayout(3,1);\nnexttile; plot(t,x); grid on;\nnexttile; plot(t,v); grid on;\nnexttile; plot(t,E); grid on;\n\nEl sistema de primer orden es x1'=x2 y x2'=-(c/m)x2-(k/m)x1. La energía debe decrecer por disipación viscosa. El cambio de signo de diff(x) localiza el primer máximo posterior sin requerir toolboxes adicionales; el bucle estima el asentamiento.\n\nPAUTA PROBLEMA 2\nHp = @(Q) 42-0.015*Q.^2;\nHs = @(Q) 10+0.005*Q.^2;\nQop = fzero(@(Q) Hp(Q)-Hs(Q),[0 55]);\nHop = Hp(Qop);\nQ = linspace(0,55,300);\nplot(Q,Hp(Q),Q,Hs(Q),'LineWidth',1.5); grid on;\nrho = 1000; g = 9.81; eta = 0.75;\nPh = rho*g*(Qop/3600)*Hop;\nPeje = Ph/eta;\n\nQop=40 m³/h, Hop=18 m. Ph≈1,962 kW y Peje≈2,616 kW.\n\nPAUTA PROBLEMA 3\nrng(7);\nt = (0:10:300)';\nT = 65+8*sin(2*pi*t/180)+0.8*randn(size(t));\nP = 2.4+0.15*cos(2*pi*t/120)+0.02*randn(size(t));\nTsuave = movmean(T,5);\nPsuave = movmean(P,5);\nAlarma = Tsuave > 70 | Psuave > 2.5;\nDatos = table(t,T,P,Tsuave,Psuave,Alarma);\nwritetable(Datos,'registro_sensores.csv');\ntiledlayout(2,1);\nnexttile; plot(t,T,t,Tsuave,'LineWidth',1.2); yline(70); grid on;\nnexttile; plot(t,P,t,Psuave,'LineWidth',1.2); yline(2.5); grid on;\ncantidadAlarmas = nnz(Alarma);\ntiemposAlarma = t(Alarma);\n\nEl uso de rng(7) hace reproducible el resultado. La tabla final permite auditar cada alarma y sus señales suavizadas.",
        "problemCount": 3
      }
    ],
    "mathNotationVersion": 1,
    "folder": "ramos/06_Programacion_Ingenieria_MATLAB",
    "materials": [
      {
        "name": "APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "path": "ramos/06_Programacion_Ingenieria_MATLAB/APUNTES_Y_RUTA_DE_ESTUDIO.md",
        "type": "MD",
        "size": 3252
      },
      {
        "name": "Ejercicios_MATLAB.md",
        "path": "ramos/06_Programacion_Ingenieria_MATLAB/Ejercicios_MATLAB.md",
        "type": "MD",
        "size": 9102
      },
      {
        "name": "Guia_inicio_MATLAB.md",
        "path": "ramos/06_Programacion_Ingenieria_MATLAB/Guia_inicio_MATLAB.md",
        "type": "MD",
        "size": 707
      },
      {
        "name": "analisis_sensores.m",
        "path": "ramos/06_Programacion_Ingenieria_MATLAB/Plantillas_MATLAB/analisis_sensores.m",
        "type": "M",
        "size": 256
      },
      {
        "name": "oscilador_amortiguado.m",
        "path": "ramos/06_Programacion_Ingenieria_MATLAB/Plantillas_MATLAB/oscilador_amortiguado.m",
        "type": "M",
        "size": 222
      },
      {
        "name": "senal_amortiguada.m",
        "path": "ramos/06_Programacion_Ingenieria_MATLAB/Plantillas_MATLAB/senal_amortiguada.m",
        "type": "M",
        "size": 175
      },
      {
        "name": "Repaso_basico_opcional.md",
        "path": "ramos/06_Programacion_Ingenieria_MATLAB/Repaso_basico_opcional.md",
        "type": "MD",
        "size": 6504
      }
    ]
  }
];
