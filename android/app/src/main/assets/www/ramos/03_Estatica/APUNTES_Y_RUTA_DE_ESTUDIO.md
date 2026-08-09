# Apuntes y ruta de estudio - Estática

## Ruta por material

- Fundamentos, unidades y leyes de Newton: `Estática_T1.pdf`.
- Vectores y fuerzas 2D/3D: `Estática_T2.pdf` y `Ejercicios 1.pdf`.
- Fuerzas, momentos y equilibrio: continúa con las presentaciones T3-T10 y practica con los certámenes de la carpeta `Estatica parte 2 ejercicios ect`.
- Armaduras: `Estática_T11.pdf` y `Estatica_P4.pdf`.
- Marcos y máquinas: `Estática_T12.pdf`.
- Fricción seca y correas: `Estática_T13.pdf` y `Estática_P5.pdf`.
- Centroides, Steiner y propiedades de área: presentaciones finales T14-T15 y el RA de propiedades de área y masa.

## Procedimiento universal

1. Aísla el cuerpo.
2. Dibuja el diagrama de cuerpo libre.
3. Define ejes y signo de momento.
4. Reemplaza apoyos por reacciones correctas.
5. Sustituye cargas distribuidas por sus resultantes cuando corresponda.
6. Escribe ecuaciones antes de reemplazar números.
7. Resuelve y revisa signos, unidades y sentido físico.

En 2D tienes $\sum F_x=0$, $\sum F_y=0$ y $\sum M_O=0$. Un pasador tiene dos componentes; un rodillo una reacción normal a la superficie; un empotramiento dos fuerzas y un momento.

## Fuerzas y momentos

Para una fuerza $\vec F$ entre dos puntos usa $\hat{\mathbf u}_{AB}=\dfrac{\vec r_B-\vec r_A}{\lVert\vec r_B-\vec r_A\rVert}$ y $\vec F=F\hat{\mathbf u}_{AB}$. En 3D verifica que el vector unitario tenga módulo 1. Momento: $\vec M_O=\vec r\times\vec F$. Al trasladar una fuerza a otro punto conserva la fuerza y añade el par correspondiente.

Una carga uniforme $w$ sobre longitud $L$ equivale a $wL$ aplicada en el centro. Una carga triangular equivale a $\dfrac{w_{\max}L}{2}$ y actúa a $\dfrac{2L}{3}$ desde el extremo de intensidad cero.

## Armaduras, marcos y máquinas

En armaduras empieza por las reacciones externas. El método de nodos entrega dos ecuaciones por nodo; el método de secciones es más rápido para pocas barras. Supón inicialmente las barras en tracción. Resultado negativo significa compresión.

En marcos y máquinas separa los miembros, reconoce miembros de dos fuerzas y recuerda que las fuerzas internas en un pasador aparecen iguales y opuestas en cuerpos distintos.

## Fricción

La fricción estática no siempre vale $\mu_sN$; se ajusta hasta un máximo. Primero calcula la fricción requerida y compárala con $\mu_sN$. En deslizamiento usa $f_k=\mu_kN$. Para correas: $\dfrac{T_t}{T_f}=e^{\mu\beta}$ con $\beta$ en radianes.

## Centroides e inercia de área

Para áreas compuestas usa áreas positivas y vacíos negativos.

- $\bar{x}=\dfrac{\sum A_i x_i}{\sum A_i}$
- $\bar{y}=\dfrac{\sum A_i y_i}{\sum A_i}$
- Steiner: $I=I_c+Ad^2$
- Rectángulo: $I_{x,c}=\dfrac{bh^3}{12}$, $I_{y,c}=\dfrac{hb^3}{12}$

La mayor fuente de error en certamen no suele ser la ecuación: es un DCL incompleto, una distancia de momento incorrecta o una carga distribuida mal ubicada.

## Libros de referencia

- R. C. Hibbeler, *Engineering Mechanics: Statics*, Pearson.
- Beer, Johnston, Mazurek y Cornwell, *Vector Mechanics for Engineers: Statics*, McGraw Hill.
- Meriam, Kraige y Bolton, *Engineering Mechanics: Statics*, Wiley.
