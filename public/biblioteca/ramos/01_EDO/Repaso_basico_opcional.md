# Ecuaciones Diferenciales Ordinarias - Evaluaciones y ejercicios

Basado en el programa 2026, guías formativas, ejercicios de Laplace y pautas del Escritorio.

## 1. Orden, grado y linealidad

**Dificultad:** Inicial  
**Tema:** Clasificación
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Clasifica la ecuación y'' + 3y' - 5y = e^x según orden, grado, linealidad y homogeneidad.

<details>
<summary>Pista</summary>

Observa la derivada de mayor orden y cómo aparecen y, y' e y''.

</details>

<details>
<summary>Solución</summary>

Es de segundo orden, grado 1, lineal y no homogénea. Es lineal porque y y sus derivadas aparecen sólo a la primera potencia y no se multiplican entre sí; es no homogénea porque el lado derecho es e^x ≠ 0.

</details>

## 2. Variables separables

**Dificultad:** Inicial  
**Tema:** Primer orden
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Resuelve dy/dx = x²/y y expresa la familia de soluciones en forma implícita.

<details>
<summary>Pista</summary>

Multiplica por y dx e integra ambos lados.

</details>

<details>
<summary>Solución</summary>

y dy = x² dx. Al integrar: y²/2 = x³/3 + C. Una forma equivalente es y² = (2/3)x³ + C. En forma explícita: y = ±√((2/3)x³ + C), en los intervalos donde el radicando sea no negativo.

</details>

## 3. Ecuación lineal con factor integrante

**Dificultad:** Inicial  
**Tema:** Primer orden
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Resuelve y' + y = e^(3x).

<details>
<summary>Pista</summary>

El factor integrante es μ(x)=e^x.

</details>

<details>
<summary>Solución</summary>

Multiplicando por e^x: (e^x y)' = e^(4x). Integrando: e^x y = e^(4x)/4 + C. Por tanto, y(x) = (1/4)e^(3x) + Ce^(-x).

</details>

## 4. Ecuación exacta

**Dificultad:** Intermedio  
**Tema:** Primer orden
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Determina si (2x-y)dx + (2y-x)dy = 0 es exacta y resuélvela.

<details>
<summary>Pista</summary>

Compara ∂M/∂y con ∂N/∂x e integra M respecto de x.

</details>

<details>
<summary>Solución</summary>

M=2x-y y N=2y-x. Como M_y=-1=N_x, es exacta. Una función potencial es Φ=x²-xy+y², pues Φ_x=2x-y y Φ_y=-x+2y. La solución implícita es x²-xy+y²=C.

</details>

## 5. Circuito RC

**Dificultad:** Intermedio  
**Tema:** Primer orden
**Tiempo:** Sin límite  
**Puntaje:** Práctica

En un circuito RC se cumple R dq/dt + q/C = V. Si R=10 Ω, C=0,1 F, V=12 V y q(0)=0, determina q(t) y la carga límite.

<details>
<summary>Pista</summary>

Divide la ecuación por 10 y resuelve el PVI lineal.

</details>

<details>
<summary>Solución</summary>

La ecuación queda q' + q = 1,2. Su solución general es q=1,2+Ce^(-t). Con q(0)=0 se obtiene C=-1,2. Entonces q(t)=1,2(1-e^(-t)) C y lim(t→∞)q(t)=1,2 C.

</details>

## 6. Caída con resistencia lineal

**Dificultad:** Intermedio  
**Tema:** Primer orden
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Un cuerpo cae desde el reposo y satisface m dv/dt = mg-kv. Encuentra v(t) y la velocidad terminal.

<details>
<summary>Pista</summary>

Es una ecuación lineal en v y v(0)=0.

</details>

<details>
<summary>Solución</summary>

Al escribir v'+(k/m)v=g, la solución es v(t)=mg/k + Ce^(-kt/m). La condición v(0)=0 da C=-mg/k. Así, v(t)=(mg/k)(1-e^(-kt/m)) y la velocidad terminal es v∞=mg/k.

</details>

## 7. Coeficientes indeterminados

**Dificultad:** Intermedio  
**Tema:** Segundo orden
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Resuelve y''-y'-2y=4x² mediante coeficientes indeterminados.

<details>
<summary>Pista</summary>

La homogénea tiene raíces 2 y -1; prueba yp=Ax²+Bx+C.

</details>

<details>
<summary>Solución</summary>

La solución homogénea es yh=C₁e^(2x)+C₂e^(-x). Sustituyendo yp=Ax²+Bx+C se obtiene A=-2, B=2 y C=-3. Por tanto, y=C₁e^(2x)+C₂e^(-x)-2x²+2x-3.

</details>

## 8. Sistema lineal por valores propios

**Dificultad:** Intermedio  
**Tema:** Sistemas
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Resuelve x'=5x+y, y'=y usando valores y vectores propios.

<details>
<summary>Pista</summary>

La matriz es triangular y sus valores propios son 5 y 1.

</details>

<details>
<summary>Solución</summary>

Para λ₁=5 sirve v₁=(1,0)ᵀ. Para λ₂=1 sirve v₂=(1,-4)ᵀ. La solución general es X(t)=C₁e^(5t)(1,0)ᵀ+C₂e^t(1,-4)ᵀ.

</details>

## 9. Transformada inversa con fracciones parciales

**Dificultad:** Avanzado  
**Tema:** Laplace
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Calcula L⁻¹{(4s+9)/[(s+2)(s²-4s+13)]}.

<details>
<summary>Pista</summary>

Usa s²-4s+13=(s-2)²+9 y separa A/(s+2)+[B(s-2)+C]/[(s-2)²+9].

</details>

<details>
<summary>Solución</summary>

Los coeficientes son A=1/25, B=-1/25 y C=104/25. Entonces f(t)=(1/25)e^(-2t)-(1/25)e^(2t)cos(3t)+(104/75)e^(2t)sin(3t).

</details>

## 10. PVI con Heaviside y Delta de Dirac

**Dificultad:** Avanzado  
**Tema:** Laplace
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Resuelve y''+9y=2U(t-1)-δ(t-3), con y(0)=1 e y'(0)=-1.

<details>
<summary>Pista</summary>

Transforma el PVI y aplica el segundo teorema de traslación.

</details>

<details>
<summary>Solución</summary>

La respuesta libre es cos(3t)-(1/3)sin(3t). El escalón aporta (2/9)U(t-1)[1-cos(3(t-1))] y el impulso aporta -(1/3)U(t-3)sin(3(t-3)). La solución es la suma de esos tres términos.

</details>
