# Apuntes y ruta de estudio - Programación en Ingeniería con MATLAB

## Método de trabajo

Separa siempre el problema en entradas, modelo, cálculo, verificación y salida. Antes de programar escribe en papel qué datos tienes, qué ecuaciones usarás y qué resultado esperas aproximadamente.

## Fundamentos que debes dominar

- Vectores fila y columna.
- Indexación lógica.
- Operadores matriciales frente a elemento a elemento.
- Condicionales y ciclos.
- Scripts, funciones y funciones anónimas.
- Tablas, importación y exportación.
- Gráficos con título, unidades, leyenda y cuadrícula.

Operadores clave:

- `A*B`: producto matricial.
- `A.*B`: producto elemento a elemento.
- `A^2`: potencia matricial.
- `A.^2`: potencia por elemento.
- `x=A\b`: solución recomendada de sistema lineal.
- `f=@(x) ...`: función anónima.

## Métodos numéricos

Para raíces aprende primero bisección porque muestra claramente convergencia y cota de error. Después usa `fzero` como verificación. Para integración usa `trapz` y estudia convergencia reduciendo el paso. Para EDO transforma ecuaciones de orden superior en sistemas de primer orden y usa `ode45`.

Nunca confíes sólo en que el código “corrió”. Verifica residuos, compara con un caso conocido y revisa gráficos.

## Datos de ingeniería

Usa `table` para conservar nombres de variables y unidades en el diseño. Las alarmas se construyen con expresiones lógicas. Para ruido de sensores, compara señal original y suavizada; `movmean` es útil, pero introduce efectos en bordes y puede ocultar transitorios rápidos.

## Gráficos de calidad

Cada figura debe tener:

- variable y unidad en ambos ejes;
- leyenda cuando existen varias curvas;
- rango razonable;
- espesor visible;
- título que explique el fenómeno.

## Depuración

Lee el primer mensaje de error, no todos a la vez. Revisa dimensiones con `size`, valores con `whos` y resultados parciales. Evita usar `inv(A)*b`; usa `A\b`. Preasigna vectores en ciclos largos. No sobrescribas nombres de funciones como `sum`, `mean` o `plot`.

## Ruta de práctica

1. Ejecuta y modifica las plantillas incluidas.
2. Resuelve el certamen sin copiar código.
3. Prueba casos límite y entradas incorrectas.
4. Compara con cálculo manual.
5. Convierte el script en una función reutilizable.

Para este ramo la pauta no es sólo el número final: se evalúa estructura, nombres claros, uso correcto de operaciones, verificación y presentación de resultados.

## Notación matemática y código

En el enunciado se mostrará la ecuación con notación matemática, por ejemplo $A\mathbf{x}=\mathbf{b}$ o $\dfrac{dT}{dt}=-k(T-T_\infty)$. En la pauta se conservará la sintaxis real de MATLAB, por ejemplo `x = A\b`, porque esa es precisamente la instrucción que debe ejecutarse. No confundas la representación matemática del modelo con su implementación en código.

## Libros de referencia

- Steven C. Chapra, *Applied Numerical Methods with MATLAB for Engineers and Scientists*, McGraw Hill.
- Amos Gilat, *MATLAB: An Introduction with Applications*, Wiley.
- MathWorks, *MATLAB Documentation*, como referencia oficial de sintaxis y funciones.
