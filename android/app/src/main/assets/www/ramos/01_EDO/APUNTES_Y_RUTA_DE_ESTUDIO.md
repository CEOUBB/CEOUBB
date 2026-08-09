# Apuntes y ruta de estudio - Ecuaciones Diferenciales Ordinarias

## Qué estudiar primero

1. Revisa `programa-220299-EDO IE IEE IME.docx (1).pdf` para ubicar las unidades y el orden del semestre.
2. Para primer orden trabaja completa `Formativo_1_EDO (1).pdf`. No mires la pauta mientras planteas el método.
3. Para segundo orden y sistemas usa `Guia formativo 2 EDO.pdf` y después contrasta con `pauta_sumativo_2_EDO (1).pdf`.
4. Para Laplace usa `EDO TransLaplace.pdf`, `ejercicios transformada.pdf`, `ejercicios transformada inversa de laplace.pdf` y `Formativo 3 + clase 26-06.pdf`.
5. Usa el libro de Dennis Zill sólo después de identificar la unidad; busca ejemplos del mismo tipo y luego cambia los datos.

## Certamen 1: ecuaciones de primer orden

Antes de calcular, clasifica la ecuación.

- Separable: puede escribirse $g(y)\,dy=f(x)\,dx$.
- Lineal: $y'+P(x)y=Q(x)$. Factor integrante $\mu(x)=e^{\int P(x)\,dx}$.
- Bernoulli: $y'+P(x)y=Q(x)y^n$. Cambio $v=y^{1-n}$.
- Exacta: $M(x,y)\,dx+N(x,y)\,dy=0$ con $\dfrac{\partial M}{\partial y}=\dfrac{\partial N}{\partial x}$.
- Homogénea de primer orden: $y'=F\!\left(\dfrac{y}{x}\right)$. Cambio $y=vx$.

En aplicaciones siempre escribe unidades, condición inicial y significado del límite. En circuitos RC la constante de tiempo es $\tau=RC$. En caída con resistencia lineal la velocidad terminal se obtiene haciendo $t\to\infty$. En crecimiento logístico el máximo crecimiento ocurre en $P=K/2$.

## Certamen 2: segundo orden y sistemas

Para una ecuación lineal con coeficientes constantes:

1. Resuelve primero la homogénea mediante el polinomio característico.
2. Revisa si el forzamiento coincide con una parte de la homogénea.
3. Si hay resonancia, multiplica la propuesta por la potencia mínima de `x` necesaria.
4. Sustituye la particular antes de escribir la solución final.

Usa coeficientes indeterminados para polinomios, exponenciales, senos y cosenos. Usa variación de parámetros cuando el forzamiento no admite una propuesta simple. Para sistemas $\mathbf X'=A\mathbf X$, calcula valores propios, vectores propios y clasifica si son reales distintos, repetidos o complejos.

## Certamen 3: transformada de Laplace

Memoriza las transformadas básicas y comprende los desplazamientos.

- $\mathcal L\{1\}=\dfrac{1}{s}$
- $\mathcal L\{t^n\}=\dfrac{n!}{s^{n+1}}$
- $\mathcal L\{e^{at}\}=\dfrac{1}{s-a}$
- $\mathcal L\{\sin bt\}=\dfrac{b}{s^2+b^2}$
- $\mathcal L\{\cos bt\}=\dfrac{s}{s^2+b^2}$
- $\mathcal L\{U(t-a)f(t-a)\}=e^{-as}F(s)$
- $\mathcal L\{\delta(t-a)\}=e^{-as}$

En un PVI transforma las derivadas conservando las condiciones iniciales. Antes de invertir, factoriza, completa cuadrados y usa fracciones parciales. En funciones por tramos aprende las dos rutas: integral por definición y representación con Heaviside.

## Método de preparación

- Día 1: teoría y ejemplos resueltos.
- Día 2: guía sin mirar soluciones.
- Día 3: corrección completa y lista de errores.
- Día 4: certamen de entrenamiento con tiempo real.
- Día 5: rehacer únicamente los problemas fallados, desde una hoja en blanco.

Tu desarrollo debe mostrar clasificación, método escogido, cálculo ordenado, solución general o del PVI y verificación.

## Libros de referencia

- Boyce, DiPrima y Meade, *Elementary Differential Equations and Boundary Value Problems*, Wiley.
- Dennis G. Zill, *A First Course in Differential Equations with Modeling Applications*, Cengage.
- Erwin Kreyszig, *Advanced Engineering Mathematics*, Wiley.
