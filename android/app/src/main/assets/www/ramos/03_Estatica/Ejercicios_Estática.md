# Estática - Evaluaciones y ejercicios

Alineado con Estática_T1-T15, ejercicios, certámenes y los RA de fuerzas, equilibrio, fricción y propiedades de área.

## 1. Certamen de entrenamiento 1 - Sistemas de fuerzas

**Dificultad:** Tipo certamen  
**Tema:** Certamen 1
**Tiempo:** 90 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Resultante en 2D (30 ptos)
En un anillo concurren tres fuerzas: $\vec F_1=400\ \mathrm{N}$ a 0°, $\vec F_2=250\ \mathrm{N}$ a 120° y $\vec F_3=300\ \mathrm{N}$ a 240°, medidas desde +x en sentido antihorario.
a) Exprese cada fuerza en forma cartesiana.
b) Calcule la resultante y su ángulo mediante atan2.
c) Determine el equilibrante y explique su significado físico.

PROBLEMA 2 - Cable en el espacio (30 ptos)
Un cable va desde A(0,0,0) m hasta B(2,-3,6) m y ejerce 350 N desde A hacia B.
a) Obtenga AB, su módulo y el vector unitario.
b) Exprese F en componentes cartesianas.
c) Calcule los tres ángulos directores y verifique $\cos^2\alpha+\cos^2\beta+\cos^2\gamma=1$.

PROBLEMA 3 - Reducción fuerza-par y apoyos (40 ptos)
Una viga AB de 6 m está articulada en A y apoyada con rodillo en B. Actúa una carga puntual de 10 kN hacia abajo en x=4 m, una carga uniforme de 4 kN/m en toda la viga y un par horario de 12 kN·m.
a) Reemplace la carga distribuida por su fuerza equivalente.
b) Reduzca todas las cargas a un sistema fuerza-par en A.
c) Calcule Ax, Ay y By.
d) Compruebe las ecuaciones de equilibrio.

<details>
<summary>Pista</summary>

Conserve signos en los momentos: antihorario positivo. La carga uniforme total es $wL$ y actúa en $L/2$.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
$\vec F_1=(400,0)\ \mathrm{N}$. $\vec F_2=(250\cos120^\circ,250\sin120^\circ)=(-125,216{,}506)\ \mathrm{N}$. $\vec F_3=(300\cos240^\circ,300\sin240^\circ)=(-150,-259{,}808)\ \mathrm{N}$. La suma es $\vec R=(125,-43{,}301)\ \mathrm{N}$. $\lVert\vec R\rVert=132{,}288\ \mathrm{N}$ y $\theta=\operatorname{atan2}(-43{,}301,125)=-19{,}107^\circ$, equivalente a 340,893°. El equilibrante es $\vec E=-\vec R=(-125,43{,}301)\ \mathrm{N}$; aplicado junto con las tres fuerzas produce suma nula.

PAUTA PROBLEMA 2
$\overrightarrow{AB}=(2,-3,6)\ \mathrm{m}$ y $\lVert\overrightarrow{AB}\rVert=\sqrt{4+9+36}=7\ \mathrm{m}$. $\hat{\mathbf u}_{AB}=\left(\dfrac{2}{7},-\dfrac{3}{7},\dfrac{6}{7}\right)$. $\vec F=350\hat{\mathbf u}_{AB}=(100,-150,300)\ \mathrm{N}$. $\cos\alpha=\dfrac{2}{7}$, $\cos\beta=-\dfrac{3}{7}$ y $\cos\gamma=\dfrac{6}{7}$, por lo que α≈73,40°, β≈115,38° y γ≈31,00°. La suma de cuadrados es $\dfrac{4+9+36}{49}=1$.

PAUTA PROBLEMA 3
La carga uniforme equivale a 24 kN hacia abajo aplicada a x=3 m. En A, la fuerza resultante externa es 34 kN hacia abajo y el momento equivalente es $M_A=-(24\cdot3+10\cdot4+12)=-124\ \mathrm{kN\,m}$, horario. No hay cargas horizontales, luego $A_x=0$. Momentos en A: $6B_y-124=0$, de donde $B_y=20{,}667\ \mathrm{kN}$. Fuerzas verticales: $A_y+B_y-24-10=0$, por lo que $A_y=13{,}333\ \mathrm{kN}$. La suma vertical y la suma de momentos quedan iguales a cero.

</details>

## 2. Certamen de entrenamiento 2 - Cuerpos rígidos y estructuras

**Dificultad:** Tipo certamen  
**Tema:** Certamen 2
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Viga con carga triangular (35 ptos)
Una viga AB de 8 m tiene pasador en A y rodillo en B. Sobre los primeros 6 m actúa una carga triangular descendente que crece linealmente desde 0 en A hasta 9 kN/m en x=6 m. Además actúa una carga puntual de 18 kN hacia abajo en x=7 m.
a) Sustituya la carga triangular por su resultante y ubíquela.
b) Calcule reacciones.
c) Explique cómo verificaría el DCL.

PROBLEMA 2 - Armadura triangular (35 ptos)
Una armadura tiene A(0,0), B(4,0), C(2,3), pasador en A, rodillo en B y carga de 12 kN descendente en C.
a) Calcule reacciones externas.
b) Use el método de nodos para hallar AC, BC y AB.
c) Indique tracción o compresión y dibuje verbalmente el sentido de las fuerzas asumidas.

PROBLEMA 3 - Bastidor simple y cable (30 ptos)
Una barra horizontal AB de 1,2 m está articulada en A. En B se fija un cable cuya dirección desde B es proporcional a (-4i+3j). Sobre la barra actúa una carga de 900 N hacia abajo a 0,8 m de A.
a) Determine la tensión del cable.
b) Determine Ax y Ay.
c) Identifique si alguna reacción cambia de sentido respecto de la suposición positiva.

<details>
<summary>Pista</summary>

La resultante triangular es el área del triángulo y actúa a 2/3 de la base desde el extremo de intensidad cero.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
La carga triangular vale $\dfrac{1}{2}(6)(9)=27\ \mathrm{kN}$ y actúa a $x=\dfrac{2}{3}(6)=4\ \mathrm{m}$ desde A. $\sum M_A=0$: $8B_y-27\cdot4-18\cdot7=0$, así $B_y=\dfrac{234}{8}=29{,}25\ \mathrm{kN}$. $\sum F_y=0$: $A_y+29{,}25-27-18=0$, por lo que $A_y=15{,}75\ \mathrm{kN}$; $A_x=0$. El DCL se verifica comprobando $\sum F_x=0$, $\sum F_y=0$ y $\sum M_A=0$ con la resultante en su centroide.

PAUTA PROBLEMA 2
Por simetría $A_y=B_y=6\ \mathrm{kN}$ y $A_x=0$. En C se suponen AC y BC en tracción, alejándose del nodo. Sus componentes verticales son $-\dfrac{3F}{\sqrt{13}}$. $\sum F_y=0$: $2\left(-\dfrac{3F}{\sqrt{13}}\right)-12=0$, luego $F=-2\sqrt{13}=-7{,}211\ \mathrm{kN}$; el signo negativo indica que AC y BC están en compresión. En A, la fuerza de AC sobre el nodo tiene componentes (-4,-6) kN debido a la compresión; con Ay=6, $\sum F_x=0$ exige $F_{AB}=4\ \mathrm{kN}$ hacia la derecha, es decir AB está en tracción.

PAUTA PROBLEMA 3
El vector unitario del cable es $\left(-\dfrac{4}{5},\dfrac{3}{5}\right)$. En B la componente vertical es $\dfrac{3T}{5}$. Momentos en A: $1{,}2\left(\dfrac{3T}{5}\right)-900(0{,}8)=0$, por lo que $0{,}72T=720$ y $T=1000\ \mathrm{N}$. Fuerzas horizontales: $A_x-\dfrac{4T}{5}=0$, entonces $A_x=800\ \mathrm{N}$. Fuerzas verticales: $A_y+\dfrac{3T}{5}-900=0$, de donde $A_y=300\ \mathrm{N}$. Ambas reacciones resultan en los sentidos positivos asumidos.

</details>

## 3. Certamen de entrenamiento 3 - Fricción y propiedades de área

**Dificultad:** Tipo certamen  
**Tema:** Certamen 3
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Fricción en plano inclinado (30 ptos)
Un bloque de 50 kg está sobre un plano de 25°. Los coeficientes son $\mu_s=0{,}35$ y $\mu_k=0{,}28$.
a) Determine si permanece en reposo sin fuerza externa.
b) Calcule la fuerza mínima paralela al plano y hacia arriba necesaria para impedir el deslizamiento.
c) Si se suelta y desliza, calcule su aceleración. Use $g=9{,}81\ \mathrm{m\,s^{-2}}$.

PROBLEMA 2 - Correa sobre tambor (25 ptos)
Una correa abraza un tambor un ángulo de 210°. $\mu_s=0{,}30$ y la tensión del lado flojo es 400 N.
a) Calcule la máxima tensión del lado tenso.
b) Obtenga la diferencia de tensiones transmitida.
c) Si el radio es 0,25 m, determine el torque máximo.

PROBLEMA 3 - Área compuesta en L (45 ptos)
Un área en L se forma sin superposición con: rectángulo 1 vertical de 40×160 mm cuyo vértice inferior izquierdo es el origen; rectángulo 2 horizontal de 80×40 mm unido a la derecha del primero en la base, ocupando $40\le x\le120$ y $0\le y\le40$.
a) Determine el centroide.
b) Calcule $I_x$ e $I_y$ respecto de ejes centroidales paralelos a los ejes coordenados usando Steiner.
c) Explique qué rectángulo domina cada segundo momento y por qué.

<details>
<summary>Pista</summary>

En el problema 3 use $I_{x,c}=\dfrac{bh^3}{12}$, $I_{y,c}=\dfrac{hb^3}{12}$ y sume $Ad^2$.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
El peso es 490,5 N. La componente paralela es $W\sin25^\circ\approx207{,}29\ \mathrm{N}$ y $N=W\cos25^\circ\approx444{,}62\ \mathrm{N}$. La fricción estática máxima es $0{,}35N\approx155{,}62\ \mathrm{N}$, menor que 207,29; no permanece en reposo. Para equilibrio inminente descendente, $P_{\min}+f_{s,\max}=W\sin25^\circ$, luego $P_{\min}\approx51{,}67\ \mathrm{N}$ hacia arriba. Al deslizar, $f_k=0{,}28N\approx124{,}49\ \mathrm{N}$ y $ma=W\sin25^\circ-f_k$; $a\approx\dfrac{207{,}29-124{,}49}{50}=1{,}656\ \mathrm{m\,s^{-2}}$ hacia abajo.

PAUTA PROBLEMA 2
$\beta=\dfrac{210\pi}{180}=3{,}6652\ \mathrm{rad}$. La ecuación de Euler es $\dfrac{T_t}{T_f}=e^{\mu\beta}=e^{1{,}0996}\approx3{,}003$. Así $T_t\approx1201{,}2\ \mathrm{N}$. La diferencia es $T_t-T_f\approx801{,}2\ \mathrm{N}$. El torque máximo es $M_{\max}=(T_t-T_f)r\approx801{,}2(0{,}25)=200{,}3\ \mathrm{N\,m}$.

PAUTA PROBLEMA 3
A1=6400 mm² con centro (20,80); A2=3200 mm² con centro (80,20). Área total=9600. $\bar{x}=\dfrac{6400\cdot20+3200\cdot80}{9600}=40\ \mathrm{mm}$; $\bar{y}=\dfrac{6400\cdot80+3200\cdot20}{9600}=60\ \mathrm{mm}$. Para $I_x$ centroidal: rectángulo 1 aporta 40·160³/12+6400(20)²=16.213.333 mm⁴; rectángulo 2 aporta 80·40³/12+3200(40)²=5.546.667 mm⁴. $I_x=21\,760\,000\ \mathrm{mm^4}$. Para $I_y$: rectángulo 1 aporta 160·40³/12+6400(20)²=3.413.333 mm⁴; rectángulo 2 aporta 40·80³/12+3200(40)²=6.826.667 mm⁴. $I_y=10\,240\,000\ \mathrm{mm^4}$. El elemento vertical domina $I_x$ por su gran altura; el horizontal contribuye fuertemente a $I_y$ por su ancho y separación horizontal.

</details>
