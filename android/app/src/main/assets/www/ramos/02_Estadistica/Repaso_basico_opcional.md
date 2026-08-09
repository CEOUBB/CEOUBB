# Estadística - Evaluaciones y ejercicios

Basado en los cuestionarios, ejercicios resueltos, tablas y guías del Escritorio.

## 1. Clasificación de variables

**Dificultad:** Inicial  
**Tema:** Descriptiva
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Clasifica: estado civil, escolaridad por niveles, número de integrantes del hogar, años de estudio e ingreso mensual exacto.

<details>
<summary>Pista</summary>

Distingue categorías sin orden, categorías ordenadas, conteos y mediciones.

</details>

<details>
<summary>Solución</summary>

Estado civil: cualitativa nominal. Escolaridad por niveles: cualitativa ordinal. Número de integrantes: cuantitativa discreta. Años de estudio: cuantitativa discreta si se registra en años completos. Ingreso mensual exacto: cuantitativa continua.

</details>

## 2. Hogares: tendencia central y dispersión

**Dificultad:** Intermedio  
**Tema:** Descriptiva
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Para los 30 tamaños de hogar 4,4,1,3,5,3,2,4,1,6,2,3,4,5,5,6,2,3,3,2,2,1,8,3,5,3,4,7,2,3, calcula media, mediana, moda, desviación estándar muestral y proporción de hogares con 3 o menos personas.

<details>
<summary>Pista</summary>

La suma de los 30 datos es 106.

</details>

<details>
<summary>Solución</summary>

Media=106/30=3,533. Mediana=3. Moda=3, que aparece 8 veces. Desviación estándar muestral s≈1,756. Hay 17 hogares con 3 o menos personas, por lo que la proporción es 17/30≈56,7%.

</details>

## 3. Efecto de un valor atípico

**Dificultad:** Inicial  
**Tema:** Descriptiva
**Tiempo:** Sin límite  
**Puntaje:** Práctica

A los 30 tamaños de hogar del ejercicio anterior se agrega un hogar con 16 personas. ¿Cómo cambian la media y la mediana? Explica qué medida es más resistente.

<details>
<summary>Pista</summary>

La nueva suma es 122 y n=31.

</details>

<details>
<summary>Solución</summary>

La media pasa de 3,533 a 122/31≈3,935. La mediana continúa siendo 3. El valor 16 arrastra la media hacia arriba, mientras la mediana casi no reacciona; por eso la mediana es más resistente a valores atípicos.

</details>

## 4. Unión, intersección y complemento

**Dificultad:** Intermedio  
**Tema:** Probabilidad
**Tiempo:** Sin límite  
**Puntaje:** Práctica

El 70% de las empresas tiene errores en activos, el 60% en pasivos y el 40% en ambos. ¿Qué porcentaje no tiene errores en ninguno? ¿Cuántas se esperan en una muestra de 500?

<details>
<summary>Pista</summary>

Usa P(A∪B)=P(A)+P(B)-P(A∩B).

</details>

<details>
<summary>Solución</summary>

P(A∪B)=0,7+0,6-0,4=0,9. Por complemento, P(ningún error)=0,1=10%. En 500 empresas se esperan 500·0,1=50 empresas.

</details>

## 5. Independencia de sucesos

**Dificultad:** Intermedio  
**Tema:** Probabilidad
**Tiempo:** Sin límite  
**Puntaje:** Práctica

En 1.000 personas, 300 saben inglés, 100 saben ruso y 50 saben ambos. Determina si 'saber inglés' y 'saber ruso' son independientes.

<details>
<summary>Pista</summary>

Compara P(A∩B) con P(A)P(B).

</details>

<details>
<summary>Solución</summary>

P(A)=0,3, P(B)=0,1 y P(A∩B)=0,05. Si fueran independientes, la intersección sería 0,3·0,1=0,03. Como 0,05≠0,03, no son independientes.

</details>

## 6. Bayes en control de calidad

**Dificultad:** Avanzado  
**Tema:** Probabilidad
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Se producen por igual bolígrafos A, B y C. Sus tasas de defecto son 0,015; 0,003 y 0,007. El control detecta el 70%, 80% y 90% de los defectuosos, respectivamente. Si se toma uno de los detectados y eliminados, ¿cuál es la probabilidad de que sea A?

<details>
<summary>Pista</summary>

P(A|D∩T) es proporcional a P(A)P(D|A)P(T|D,A).

</details>

<details>
<summary>Solución</summary>

Los pesos son A:(1/3)(0,015)(0,70)=0,0035; B:(1/3)(0,003)(0,80)=0,0008; C:(1/3)(0,007)(0,90)=0,0021. La probabilidad buscada es 0,0035/(0,0035+0,0008+0,0021)=0,546875≈54,7%.

</details>

## 7. Distribución binomial

**Dificultad:** Intermedio  
**Tema:** Distribuciones
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una columna falla con probabilidad 0,05. Para 16 columnas independientes, calcula P(X=2), P(X≥3), E(X) y Var(X).

<details>
<summary>Pista</summary>

X~Binomial(16,0,05) y para la cola conviene usar el complemento.

</details>

<details>
<summary>Solución</summary>

P(X=2)=C(16,2)(0,05)²(0,95)¹⁴≈0,1463. P(X≥3)=1-[P(0)+P(1)+P(2)]≈0,04294. E(X)=np=0,8 y Var(X)=np(1-p)=0,76.

</details>

## 8. Proceso de Poisson

**Dificultad:** Intermedio  
**Tema:** Distribuciones
**Tiempo:** Sin límite  
**Puntaje:** Práctica

En un proceso aparecen 0,8 imperfecciones por minuto. Calcula la probabilidad de una imperfección en un minuto y de cuatro imperfecciones en cinco minutos.

<details>
<summary>Pista</summary>

En cinco minutos el parámetro cambia a λ=4.

</details>

<details>
<summary>Solución</summary>

Para un minuto, P(X=1)=e^(-0,8)(0,8)≈0,3595. Para cinco minutos, λ=0,8·5=4 y P(X=4)=e^(-4)4⁴/4!≈0,1954.

</details>

## 9. Exponencial y falta de memoria

**Dificultad:** Intermedio  
**Tema:** Distribuciones
**Tiempo:** Sin límite  
**Puntaje:** Práctica

La vida de un marcapasos es exponencial con media 16 años. Calcula P(T<20) y P(T<25 | T>5).

<details>
<summary>Pista</summary>

λ=1/16 y la distribución exponencial no tiene memoria.

</details>

<details>
<summary>Solución</summary>

P(T<20)=1-e^(-20/16)≈0,7135. Por falta de memoria, P(T<25|T>5)=P(T-5<20|T>5)=P(T<20)≈0,7135.

</details>

## 10. Intervalo de confianza para la media

**Dificultad:** Avanzado  
**Tema:** Inferencia
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una muestra de 64 mediciones tiene media 72 y se conoce σ=8. Construye un intervalo de confianza del 95% para la media poblacional e interprétalo.

<details>
<summary>Pista</summary>

Usa x̄ ± z₀,₉₇₅·σ/√n con z=1,96.

</details>

<details>
<summary>Solución</summary>

El error estándar es 8/√64=1. El margen es 1,96. El intervalo es [72-1,96;72+1,96]=[70,04;73,96]. Con este procedimiento, el 95% de los intervalos construidos en muestras repetidas contendría la media poblacional.

</details>
