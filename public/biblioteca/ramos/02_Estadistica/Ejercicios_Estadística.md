# Estadística - Evaluaciones y ejercicios

Construido a partir de los listados, certámenes, ejercicios resueltos, distribuciones y tablas estadísticas de tu carpeta.

## 1. Certamen de entrenamiento 1 - Estadística descriptiva

**Dificultad:** Tipo certamen  
**Tema:** Certamen 1
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Tamaño de hogares (40 ptos)
Se observaron 30 hogares: 4,4,1,3,5,3,2,4,1,6,2,3,4,5,5,6,2,3,3,2,2,1,8,3,5,3,4,7,2,3.
a) Defina variable, unidad de observación, población conceptual y muestra.
b) Construya la tabla con frecuencia absoluta, relativa y acumulada.
c) Calcule media, mediana, moda, varianza y desviación estándar muestral.
d) Calcule Q1 y Q3 con el método de medianas de mitades; construya límites para detectar atípicos.
e) Determine la proporción de hogares con 3 o menos personas y la proporción de individuos que vive en esos hogares.

PROBLEMA 2 - Datos agrupados de puntajes (40 ptos)
Intervalos y frecuencias: [38,44):7; [44,50):8; [50,56):15; [56,62):25; [62,68):18; [68,74):9; [74,80):6.
a) Calcule la media agrupada y la mediana interpolada.
b) Estime varianza y desviación estándar muestral.
c) Calcule el porcentaje entre 56 y 68 puntos.
d) Analice homogeneidad con el coeficiente de variación.

PROBLEMA 3 - Transformación lineal (20 ptos)
El costo diario de operación se modela por $Y=1{,}35X+12$, donde X es el puntaje del problema 2 interpretado como índice de actividad. Obtenga media, varianza, desviación estándar y coeficiente de variación de Y; explique qué cambia y qué no frente a X.

<details>
<summary>Pista</summary>

Para el problema 2 use marcas de clase 41,47,53,59,65,71 y 77. En $Y=aX+b$, $\operatorname{Var}(Y)=a^2\operatorname{Var}(X)$.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
La variable es número de personas por hogar, cuantitativa discreta; la unidad es el hogar y $n=30$. Frecuencias para $x\in\{1,2,3,4,5,6,7,8\}$: $f_i=(3,6,8,5,4,2,1,1)$; hi=0,10;0,20;0,2667;0,1667;0,1333;0,0667;0,0333;0,0333; acumuladas $F_i=(3,9,17,22,26,28,29,30)$. La suma es 106, de modo que $\bar{x}=3{,}533$. Mediana=3 y moda=3. La varianza muestral es $s^2\approx3{,}085$ y $s\approx1{,}756$. Por medianas de mitades, $Q_1=2$ y $Q_3=5$; $\mathrm{RIC}=3$. Límites: 2-1,5·3=-2,5 y 5+1,5·3=9,5, por lo que no hay atípicos bajo este criterio. Hay $\dfrac{17}{30}=56{,}7\%$ de hogares con 3 o menos personas. En ellos viven $39$ personas de un total de $106$, es decir 36,8% de los individuos.

PAUTA PROBLEMA 2
$N=88$. Con marcas de clase, $\bar{x}=\dfrac{\sum f_i x_i}{N}=59{,}136$. Para la mediana, $N/2=44$; la clase mediana es [56,62), con acumulada previa 30, frecuencia 25 y amplitud 6: $\mathrm{Me}=56+\left(\dfrac{44-30}{25}\right)6=59{,}36$. La estimación muestral entrega $s^2\approx90{,}188$ y $s\approx9{,}497$. Entre 56 y 68 hay 25+18=43 observaciones: $\dfrac{43}{88}=48{,}86\%$. $\mathrm{CV}=100\left(\dfrac{9{,}497}{59{,}136}\right)=16{,}06\%$, lo que indica dispersión relativa moderada y datos razonablemente homogéneos bajo el criterio usual $\mathrm{CV}<30\%$.

PAUTA PROBLEMA 3
$E(Y)=1{,}35E(X)+12=1{,}35(59{,}136)+12\approx91{,}834$. $\operatorname{Var}(Y)=1{,}35^2(90{,}188)\approx164{,}368$. $s_Y=1{,}35(9{,}497)\approx12{,}821$. $\mathrm{CV}_Y=100\left(\dfrac{12{,}821}{91{,}834}\right)\approx13{,}96\%$. La multiplicación por 1,35 escala tanto promedio como desviación; sumar 12 cambia la media pero no la varianza. Por eso el CV sí cambia al existir término aditivo.

</details>

## 2. Certamen de entrenamiento 2 - Probabilidad y distribuciones

**Dificultad:** Tipo certamen  
**Tema:** Certamen 2
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Bayes en control de calidad (35 ptos)
Una planta produce por igual piezas A, B y C. Las tasas de defecto son 0,015; 0,003 y 0,007. Un sistema detecta el 70%, 80% y 90% de los defectuosos de cada tipo.
a) Construya el árbol de probabilidades.
b) Calcule la probabilidad de que una pieza tomada entre las detectadas sea A.
c) Si se producen 90.000 piezas, estime cuántas serán detectadas y cuántas detectadas serán tipo A.

PROBLEMA 2 - Fallas de columnas (35 ptos)
Cada columna falla ante cierta carga con $p=0{,}05$, independientemente. Se ensayan 16 columnas.
a) Justifique el modelo.
b) Calcule $P(X=2)$, $P(X\ge3)$, media, varianza y desviación estándar.
c) Determine el menor número m tal que $P(X\le m)>0{,}95$.

PROBLEMA 3 - Poisson y tiempo de espera (30 ptos)
Se observan en promedio 0,8 imperfecciones por minuto en un proceso.
a) Calcule P(exactamente 1 en un minuto).
b) Calcule P(exactamente 4 en cinco minutos).
c) Calcule P(ninguna en los próximos 2 minutos).
d) Si T es el tiempo hasta la próxima imperfección, obtenga $P(T>3)$, $E(T)$ y explique la falta de memoria.

<details>
<summary>Pista</summary>

En el problema 1 trabaje con pesos conjuntos. En el 3, Poisson y exponencial comparten $\lambda=0{,}8\ \mathrm{min}^{-1}$ por minuto.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
Los pesos de detección son A:(1/3)(0,015)(0,70)=0,0035; B:(1/3)(0,003)(0,80)=0,0008; C:(1/3)(0,007)(0,90)=0,0021. La probabilidad total de detección es 0,0064. Por Bayes, $P(A\mid D)=\dfrac{0{,}0035}{0{,}0064}=0{,}546875\approx54{,}69\%$. En 90.000 piezas se esperan 90.000(0,0064)=576 detectadas; de ellas, 90.000(0,0035)=315 serán A.

PAUTA PROBLEMA 2
$X\sim\operatorname{Binomial}(16,0{,}05)$ porque hay número fijo de ensayos, dos resultados, p constante e independencia. $P(X=2)=\binom{16}{2}(0{,}05)^2(0{,}95)^{14}\approx0{,}14630$. $P(X\ge3)=1-\left[P(0)+P(1)+P(2)\right]\approx0{,}04294$. $E(X)=np=0{,}8$; $\operatorname{Var}(X)=np(1-p)=0{,}76$; $\sigma\approx0{,}8718$. $P(X\le1)=P(0)+P(1)\approx0{,}8108<0{,}95$, mientras $P(X\le2)\approx0{,}9571>0{,}95$; por tanto $m=2$.

PAUTA PROBLEMA 3
Para un minuto $\lambda=0{,}8\ \mathrm{min}^{-1}$: $P(X=1)=e^{-0{,}8}(0{,}8)\approx0{,}35946$. Para cinco minutos λ=4: $P(X=4)=\dfrac{e^{-4}4^4}{4!}\approx0{,}19537$. En dos minutos λ=1,6: $P(X=0)=e^{-1{,}6}\approx0{,}20190$. El tiempo T es exponencial con tasa 0,8 min^{-1}: $P(T>3)=e^{-2{,}4}\approx0{,}09072$ y $E(T)=\dfrac{1}{0{,}8}=1{,}25\ \mathrm{min}$. Falta de memoria significa $P(T>s+t\mid T>s)=P(T>t)$.

</details>

## 3. Certamen de entrenamiento 3 - Inferencia estadística

**Dificultad:** Tipo certamen  
**Tema:** Certamen 3
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Intervalo para una media (30 ptos)
Una muestra normal de $n=25$ ejes mecanizados tiene resistencia media 82 kN y desviación estándar 10 kN.
a) Construya un IC del 95% para μ. Use $t_{0{,}975;24}=2{,}064$.
b) Evalúe la afirmación $\mu=87\ \mathrm{kN}$.
c) Calcule el tamaño muestral aproximado necesario para estimar μ con error máximo 3 kN al 95%, usando s como estimación preliminar y $z=1{,}96$.

PROBLEMA 2 - Comparación de dos grupos (40 ptos)
Número de reflejos y frecuencias: valores 0,1,2,3,4. Grupo control: 3,6,3,2,1. Grupo experimental: 9,4,1,1,0.
a) Calcule medias y varianzas muestrales.
b) Construya un IC de Welch del 95% para $\mu_C-\mu_E$ usando t≈2,056.
c) Contraste $H_0:\mu_C=\mu_E$ frente a $H_1:\mu_C\ne\mu_E$ e interprete.

PROBLEMA 3 - Intervalo para la varianza (30 ptos)
Para n=20 mediciones normales se obtiene $s^2=16$. Construya un IC del 95% para σ² usando $\chi^2_{0{,}025;19}=8{,}907$ y $\chi^2_{0{,}975;19}=32{,}852$. Luego obtenga el intervalo para σ y evalúe si $\sigma^2=40$ es compatible.

<details>
<summary>Pista</summary>

Para Welch use $\mathrm{SE}=\sqrt{\dfrac{s_1^2}{n_1}+\dfrac{s_2^2}{n_2}}$. Para varianza, invierta el orden de los cuantiles en los límites.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
$\mathrm{SE}=\dfrac{10}{\sqrt{25}}=2$. El IC es $82\pm2{,}064(2)=82\pm4{,}128$, es decir [77,872;86,128] kN. El valor 87 queda fuera, por lo que la afirmación no es compatible al 5%. Para error E=3: $n\approx\left(\dfrac{zs}{E}\right)^2=\left(\dfrac{1{,}96\cdot10}{3}\right)^2=42{,}68$; se redondea hacia arriba a 43 ejes.

PAUTA PROBLEMA 2
Control: $\bar{x}_C=1{,}4667$ y $s_C^2\approx1{,}4095$. Experimental: $\bar{x}_E=0{,}6000$ y $s_E^2\approx0{,}8286$. La diferencia es 0,8667. $\mathrm{SE}=\sqrt{\dfrac{1{,}4095}{15}+\dfrac{0{,}8286}{15}}\approx0{,}38627$. El margen es 2,056(0,38627)≈0,7942 y el IC≈[0,0725;1,6609]. Como cero no pertenece al intervalo, se rechaza H0 al 5%; el grupo control presenta un promedio mayor. El estadístico es $t\approx\dfrac{0{,}8667}{0{,}38627}=2{,}244$.

PAUTA PROBLEMA 3
Con $\nu=19$: límite inferior=$\dfrac{19\cdot16}{32{,}852}\approx9{,}25$ y superior=$\dfrac{19\cdot16}{8{,}907}\approx34{,}13$. Así $\mathrm{IC}_{95\%}(\sigma^2)=[9{,}25;34{,}13]$. Para σ se extrae raíz: [3,04;5,84]. Como 40 no pertenece al intervalo de varianza, no es compatible al 95%.

</details>
