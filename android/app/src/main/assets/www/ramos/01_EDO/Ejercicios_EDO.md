# Ecuaciones Diferenciales Ordinarias - Evaluaciones y ejercicios

Nivelado con el programa 2026, las guías formativas y las pautas de evaluaciones UBB disponibles en tu carpeta.

## 1. Certamen de entrenamiento 1 - EDO de primer orden

**Dificultad:** Tipo certamen  
**Tema:** Certamen 1
**Tiempo:** 90 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Exactitud y PVI (30 ptos)
Considere $(2xy+y^2)\,dx+(x^2+2xy)\,dy=0$.
a) Verifique si la ecuación es exacta.
b) Obtenga la solución implícita general.
c) Determine la curva que satisface $y(1)=1$ y compruebe la condición inicial.

PROBLEMA 2 - Circuito RC con cambio de alimentación (35 ptos)
Un circuito en serie tiene $R=20\ \Omega$ y $C=0{,}05\ \mathrm{F}$. El capacitor está inicialmente descargado. La fuente vale 10 V para $0\le t<3\ \mathrm{s}$ y cambia instantáneamente a 4 V para $t\ge 3\ \mathrm{s}$.
a) Plantee la EDO para la carga $q(t)$.
b) Resuelva $q(t)$ en ambos intervalos imponiendo continuidad en t=3.
c) Determine la corriente $i(t)=\dfrac{dq}{dt}$, $q(3)$ y la carga límite.

PROBLEMA 3 - Modelo logístico (35 ptos)
Una población de microorganismos satisface $\dfrac{dP}{dt}=rP\left(1-\dfrac{P}{K}\right)$. Inicialmente hay 200 individuos; a las 2 h hay 400 y la capacidad de carga es $K=2000$.
a) Determine r.
b) Obtenga $P(t)$.
c) Calcule cuándo se alcanzan 1500 individuos.
d) Determine el instante de crecimiento máximo y explique por qué ocurre allí.

<details>
<summary>Pista</summary>

En el problema 2 usa la constante de tiempo $RC=1\ \mathrm{s}$. En el problema logístico trabaja con $P(t)=\dfrac{K}{1+A e^{-rt}}$.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
$M=2xy+y^2$ y $N=x^2+2xy$. $M_y=2x+2y$ y $N_x=2x+2y$, por lo que es exacta. Integrando M respecto de x: $\Phi=x^2y+xy^2+g(y)$. Al derivar respecto de y se obtiene $x^2+2xy+g'(y)=N$, luego $g'(y)=0$. La familia es $x^2y+xy^2=C$, o $xy(x+y)=C$. Con $y(1)=1$ resulta $C=2$. La solución del PVI queda $xy(x+y)=2$ y al reemplazar (1,1) se verifica 2=2.

PAUTA PROBLEMA 2
La ecuación es $R\dfrac{dq}{dt}+\dfrac{q}{C}=V(t)$: $20\dfrac{dq}{dt}+20q=V(t)$, o $\dfrac{dq}{dt}+q=\dfrac{V(t)}{20}$. Para 0≤t<3: $\dfrac{dq}{dt}+q=0{,}5$, $q(0)=0$, por lo que $q_1(t)=0{,}5\left(1-e^{-t}\right)\ \mathrm{C}$. Entonces $q(3)=0{,}5\left(1-e^{-3}\right)\approx0{,}4751\ \mathrm{C}$. Para t≥3: $\dfrac{dq}{dt}+q=0{,}2$. Usando el tiempo desplazado, $q_2(t)=0{,}2+\left[q(3)-0{,}2\right]e^{-(t-3)}=0{,}2+0{,}2751e^{-(t-3)}\ \mathrm{C}$. La corriente es $i_1(t)=0{,}5e^{-t}\ \mathrm{A}$ para t<3 e $i_2(t)=-0{,}2751e^{-(t-3)}\ \mathrm{A}$ para t>3; el signo negativo indica descarga después de bajar la fuente. La carga límite es 0,2 C.

PAUTA PROBLEMA 3
La solución logística es $P(t)=\dfrac{2000}{1+A e^{-rt}}$. De $P(0)=200$ resulta $A=9$. Con $P(2)=400$: $400=\dfrac{2000}{1+9e^{-2r}}$, luego $1+9e^{-2r}=5$, $e^{-2r}=\dfrac{4}{9}$ y $r=\dfrac{1}{2}\ln\!\left(\dfrac{9}{4}\right)\approx0{,}4055\ \mathrm{h}^{-1}$. Así $P(t)=\dfrac{2000}{1+9e^{-0{,}4055t}}$. Para $P=1500$: $1+9e^{-rt}=\dfrac{4}{3}$, de donde $e^{-rt}=\dfrac{1}{27}$ y $t=\dfrac{\ln(27)}{r}\approx8{,}13\ \mathrm{h}$. El crecimiento es máximo cuando $P=\dfrac{K}{2}=1000$. Resolviendo 1000=2000/(1+9e^{-rt}) se obtiene $t=\dfrac{\ln(9)}{r}\approx5{,}42\ \mathrm{h}$. Allí el producto $P\left(1-\dfrac{P}{K}\right)$ alcanza su máximo.

</details>

## 2. Certamen de entrenamiento 2 - Segundo orden y sistemas

**Dificultad:** Tipo certamen  
**Tema:** Certamen 2
**Tiempo:** 90 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Coeficientes indeterminados con resonancia (35 ptos)
Resuelva $y''-4y'+4y=8e^{2x}+3x$.
a) Encuentre la solución homogénea.
b) Justifique la forma de la particular para cada término del lado derecho.
c) Obtenga la solución general y verifique por sustitución la parte particular.

PROBLEMA 2 - Variación de parámetros (30 ptos)
Resuelva $y''+y=\sec x$ en el intervalo $-\dfrac{\pi}{2}<x<\dfrac{\pi}{2}$. Debe calcular el Wronskiano, las funciones auxiliares y la solución general.

PROBLEMA 3 - Sistema mecánico lineal (35 ptos)
Sea $\mathbf{X}'=A\mathbf{X}$ con $A=\begin{bmatrix}2&-1\\5&-2\end{bmatrix}$ y $\mathbf{X}(0)=\begin{bmatrix}1\\0\end{bmatrix}$.
a) Determine los valores propios y clasifique su naturaleza.
b) Demuestre que $A^2=-I$.
c) Use $e^{At}=I\cos t+A\sin t$ para obtener la solución del PVI.
d) Verifique directamente que la solución satisface el sistema y la condición inicial.

<details>
<summary>Pista</summary>

En el problema 1 el operador es $(D-2)^2$. Para $e^{2x}$ existe resonancia doble.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
La ecuación característica es $(r-2)^2=0$, por lo que $y_h=(C_1+C_2x)e^{2x}$. Para 8$e^{2x}$, como 2 es raíz doble, se propone $y_{p1}=Ax^2e^{2x}$. Usando $(D-2)^2\!\left[e^{2x}v\right]=e^{2x}v''$, con $v=Ax^2$ se obtiene $2Ae^{2x}=8e^{2x}$, luego $A=4$. Para 3x se propone $y_{p2}=ax+b$. Al sustituir: $-4a+4ax+4b=3x$, de donde $a=\dfrac{3}{4}$ y $b=\dfrac{3}{4}$. La solución es $y=(C_1+C_2x)e^{2x}+4x^2e^{2x}+\dfrac{3}{4}x+\dfrac{3}{4}$.

PAUTA PROBLEMA 2
La homogénea tiene $y_1=\cos x$, $y_2=\sin x$ y $W=y_1y_2'-y_1'y_2=\cos^2x+\sin^2x=1$. Para $g(x)=\sec x$: $v_1'=-\dfrac{y_2g}{W}=-\tan x$, de modo que $v_1=\ln(\cos x)$ en el intervalo dado. Además $v_2'=\dfrac{y_1g}{W}=1$, por lo que $v_2=x$. La particular es $y_p=v_1y_1+v_2y_2=\cos x\ln(\cos x)+x\sin x$. Entonces y=C₁cos x+C₂sin x+cos x ln(cos x)+x sin x.

PAUTA PROBLEMA 3
El polinomio característico es $\lambda^2+1=0$, así que $\lambda=\pm i$. Multiplicando A por sí misma se obtiene $A^2=\begin{bmatrix}-1&0\\0&-1\end{bmatrix}=-I$. Por la serie de la exponencial, e^{At}=Icos t+Asin t. Aplicando X(0)=(1,0): X(t)=cos t(1,0)^T+sin t A(1,0)^T=(cos t+2sin t,5sin t)^T. Derivando se obtiene X'=(-sin t+2cos t,5cos t)^T. Al calcular AX se obtiene exactamente el mismo vector. En t=0 resulta (1,0)^T.

</details>

## 3. Certamen de entrenamiento 3 - Transformada de Laplace

**Dificultad:** Tipo certamen  
**Tema:** Certamen 3
**Tiempo:** 90 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Función por tramos (30 ptos)
Sea $f(t)=2$ para 0≤t<3 y $f(t)=e^{-t}$ para t≥3.
a) Calcule $\mathcal{L}\{f\}$ directamente mediante integrales impropias.
b) Reescriba f con la función escalón y confirme el resultado usando traslación.

PROBLEMA 2 - Transformada inversa (30 ptos)
Determine $\mathcal{L}^{-1}\!\left\{\dfrac{4s+9}{(s+2)(s^2-4s+13)}\right\}$. Debe mostrar la descomposición en fracciones parciales, completar cuadrados e identificar cada par transformado.

PROBLEMA 3 - PVI forzado por escalón e impulso (40 ptos)
Resuelva $y''+4y=U(t-\pi)+\delta(t-2\pi)$, $y(0)=0$, $y'(0)=0$.
a) Transforme la ecuación.
b) Despeje $Y(s)$.
c) Invierta usando el segundo teorema de traslación.
d) Interprete el efecto del escalón y del impulso sobre la respuesta.

<details>
<summary>Pista</summary>

$\mathcal{L}^{-1}\!\left\{\dfrac{1}{s(s^2+4)}\right\}=\dfrac{1}{4}(1-\cos 2t)$ y $\mathcal{L}^{-1}\!\left\{\dfrac{1}{s^2+4}\right\}=\dfrac{1}{2}\sin 2t$.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
Por definición: $$F(s)=\int_0^3 2e^{-st}\,dt+\int_3^{\infty}e^{-(s+1)t}\,dt=\dfrac{2(1-e^{-3s})}{s}+\dfrac{e^{-3(s+1)}}{s+1}$$, para s>0. Una representación por escalón es $f(t)=2+U(t-3)\left[e^{-t}-2\right]$. Al transformar el término desplazado debe escribirse e^{-t}=e^{-3}e^{-(t-3)} para recuperar el mismo resultado.

PAUTA PROBLEMA 2
Como $s^2-4s+13=(s-2)^2+9$, se plantea $\dfrac{A}{s+2}+\dfrac{B(s-2)+C}{(s-2)^2+9}$. Al igualar coeficientes se obtiene $A=\dfrac{1}{25}$, $B=-\dfrac{1}{25}$ y $C=\dfrac{104}{25}$. Por tanto, f(t)=(1/25)e^{-2t}-(1/25)e^{2t}cos3t+(104/75)e^{2t}sin3t.

PAUTA PROBLEMA 3
Con condiciones iniciales nulas: $(s^2+4)Y(s)=\dfrac{e^{-\pi s}}{s}+e^{-2\pi s}$. Así $Y(s)=\dfrac{e^{-\pi s}}{s(s^2+4)}+\dfrac{e^{-2\pi s}}{s^2+4}$. Invirtiendo: $$y(t)=\dfrac{1}{4}U(t-\pi)\left[1-\cos\!\bigl(2(t-\pi)\bigr)\right]+\dfrac{1}{2}U(t-2\pi)\sin\!\bigl(2(t-2\pi)\bigr)$$. El primer término activa desde t=π una respuesta sostenida asociada a una entrada escalón. El segundo activa desde t=2π la respuesta impulsiva; el impulso produce un salto instantáneo de magnitud 1 en y', aunque y permanece continua.

</details>
