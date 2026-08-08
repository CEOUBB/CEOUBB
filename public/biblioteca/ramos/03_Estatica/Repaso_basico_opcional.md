# Estática - Evaluaciones y ejercicios

Basado en las presentaciones 2026, ejercicios, certámenes y resultados de aprendizaje mostrados.

## 1. Componentes rectangulares

**Dificultad:** Inicial  
**Tema:** Vectores
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una fuerza de 100 N forma 30° sobre el eje +x. Determina Fx y Fy.

<details>
<summary>Pista</summary>

Fx=F cosθ y Fy=F sinθ.

</details>

<details>
<summary>Solución</summary>

Fx=100cos30°=86,60 N y Fy=100sin30°=50,00 N. Ambas componentes son positivas por estar la fuerza en el primer cuadrante.

</details>

## 2. Fuerza en el espacio

**Dificultad:** Intermedio  
**Tema:** Vectores
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una fuerza de 350 N apunta desde A(0,0,0) hacia B(2,-3,6). Escríbela en forma cartesiana.

<details>
<summary>Pista</summary>

Primero normaliza el vector AB; su longitud es 7.

</details>

<details>
<summary>Solución</summary>

u_AB=(2,-3,6)/7. Entonces F=350u_AB=(100,-150,300) N, es decir, F=100i-150j+300k N.

</details>

## 3. Resultante de fuerzas concurrentes

**Dificultad:** Intermedio  
**Tema:** Vectores
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Actúan tres fuerzas: 400 N a 0°, 250 N a 120° y 300 N a 240°. Calcula la resultante y su dirección.

<details>
<summary>Pista</summary>

Suma por separado todas las componentes x e y.

</details>

<details>
<summary>Solución</summary>

ΣFx=400+250cos120°+300cos240°=125 N. ΣFy=250sin120°+300sin240°=-43,30 N. R=√(125²+(-43,30)²)=132,29 N y θ=atan2(-43,30;125)=-19,11°, o 340,89° medidos en sentido antihorario desde +x.

</details>

## 4. Momento de una fuerza

**Dificultad:** Intermedio  
**Tema:** Momento
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Desde O al punto de aplicación r=(0,4i+0,2j) m y F=(-300i+500j) N. Calcula el momento respecto de O.

<details>
<summary>Pista</summary>

En 2D, Mz=rxFy-ryFx.

</details>

<details>
<summary>Solución</summary>

Mz=(0,4)(500)-(0,2)(-300)=200+60=260 N·m. El signo positivo indica sentido antihorario: M_O=260k N·m.

</details>

## 5. Sistema fuerza-par equivalente

**Dificultad:** Intermedio  
**Tema:** Momento
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una fuerza vertical de 600 N hacia abajo actúa a 1,2 m a la derecha de O. Trasládala a O como sistema fuerza-par equivalente.

<details>
<summary>Pista</summary>

Mantén la misma fuerza y agrega r×F.

</details>

<details>
<summary>Solución</summary>

En O se aplica la misma fuerza F=(0,-600) N y un par M_O=(1,2)(-600)=-720 N·m. El signo negativo corresponde a giro horario.

</details>

## 6. Reacciones en una viga

**Dificultad:** Intermedio  
**Tema:** Equilibrio
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una viga simplemente apoyada AB mide 6 m. Tiene 12 kN hacia abajo a 2 m de A y una carga distribuida de 4 kN/m en los últimos 3 m. Determina Ay y By.

<details>
<summary>Pista</summary>

Reemplaza la carga distribuida por 12 kN aplicada en su centroide, a 4,5 m de A.

</details>

<details>
<summary>Solución</summary>

ΣM_A=0: 6By-12·2-12·4,5=0, por lo que By=13 kN. Luego ΣFy=0: Ay+13-12-12=0, así que Ay=11 kN.

</details>

## 7. Armadura por método de nodos

**Dificultad:** Avanzado  
**Tema:** Estructuras
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una armadura triangular tiene A(0,0), B(4,0), C(2,3), apoyo pasador en A, rodillo en B y carga de 12 kN hacia abajo en C. Determina las fuerzas en AC, BC y AB.

<details>
<summary>Pista</summary>

Por simetría Ay=By=6 kN; comienza por el nodo C.

</details>

<details>
<summary>Solución</summary>

En C, por simetría F_AC=F_BC. De ΣFy=0: 2F(3/√13)+12=0, entonces F=-2√13=-7,21 kN; AC y BC están en compresión. En el nodo A, ΣFx=0 entrega F_AB=4,00 kN en tracción.

</details>

## 8. Bloque con fricción seca

**Dificultad:** Intermedio  
**Tema:** Fricción
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Un bloque de 50 kg está sobre un plano inclinado 25° con μs=0,35. ¿Permanece en reposo sin ayuda? Si no, ¿qué fuerza mínima paralela al plano y hacia arriba evita el deslizamiento? Usa g=9,81 m/s².

<details>
<summary>Pista</summary>

Compara mg sin25° con μs mg cos25°.

</details>

<details>
<summary>Solución</summary>

La componente descendente es mg sin25°≈207,3 N. N=mg cos25°≈444,6 N y fs,max=0,35N≈155,6 N. Como 207,3>155,6, desliza. La fuerza mínima ascendente es P=207,3-155,6≈51,7 N.

</details>

## 9. Fricción en correa

**Dificultad:** Avanzado  
**Tema:** Fricción
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una correa abraza un tambor 210°. Si μ=0,30 y la tensión del lado flojo es 400 N, determina la tensión máxima del lado tenso antes de deslizar.

<details>
<summary>Pista</summary>

Usa T_tenso/T_flojo=e^(μβ), con β en radianes.

</details>

<details>
<summary>Solución</summary>

β=210π/180=3,665 rad. La razón es e^(0,30·3,665)≈3,003. Entonces T_tenso≈400·3,003≈1.201 N.

</details>

## 10. Centroide de un área en L

**Dificultad:** Avanzado  
**Tema:** Centroides
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Un área en L se forma con un rectángulo vertical de 40×160 mm y otro horizontal de 80×40 mm unido a su derecha en la base. El origen está en la esquina inferior izquierda. Determina (x̄,ȳ).

<details>
<summary>Pista</summary>

Usa dos áreas sin superposición: A₁=40·160 con centro (20,80) y A₂=80·40 con centro (80,20).

</details>

<details>
<summary>Solución</summary>

A₁=6.400 mm² y A₂=3.200 mm². x̄=(6.400·20+3.200·80)/9.600=40 mm. ȳ=(6.400·80+3.200·20)/9.600=60 mm. El centroide es (40,60) mm.

</details>
