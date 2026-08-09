# Apuntes y ruta de estudio - Estadística

## Archivos recomendados

- Descriptiva: `LISTADO 1 EJERCICIOS DE ESTADISTICA DESCRIPTIVA.docx`, `Ejercicio EstadDescrip.docx`, `DIAGRAMA DE CAJA.docx` y `Formulario Est descriptiva.doc`.
- Probabilidad: `ej de PROB..docx`, `EJER RESUELTOS DE PROB (2r) (1).docx`, diagramas de árbol y formulario.
- Distribuciones: `EJEMPLO DISTRIBUCION BINOMIAL, Poisson, Hipergeometrica.docx`, `DISTRIB UNIFORME.docx`, `DISTRIB.EXPONENCIAL.docx` y `RESUMEN DISTRIBUCIONES.pdf`.
- Inferencia: carpeta `Estadistica Intervalos de Confianza`, tabla normal, tabla t y chi-cuadrado, y `Tabla F mayo2016.pdf`.

## Descriptiva: orden obligatorio

1. Define variable, unidad, población y muestra.
2. Clasifica la variable.
3. Construye tabla y gráfico apropiado.
4. Calcula tendencia central.
5. Calcula dispersión.
6. Interpreta en el contexto; un número sin interpretación queda incompleto.

Para datos muestrales usa $s^2=\dfrac{\sum_{i=1}^{n}(x_i-\bar{x})^2}{n-1}$. El coeficiente de variación es $\mathrm{CV}=100\dfrac{s}{\bar{x}}$ y sólo conviene comparar CV cuando las medias son positivas y las variables tienen sentido de razón. Para una transformación $Y=aX+b$: $E(Y)=aE(X)+b$, $\operatorname{Var}(Y)=a^2\operatorname{Var}(X)$ y $s_Y=|a|s_X$.

En diagramas de caja indica el método de cuartiles utilizado. Límites: $L_I=Q_1-1{,}5\,\mathrm{RIC}$ y $L_S=Q_3+1{,}5\,\mathrm{RIC}$.

## Probabilidad y distribuciones

- Unión: $P(A\cup B)=P(A)+P(B)-P(A\cap B)$.
- Condicional: $P(A\mid B)=\dfrac{P(A\cap B)}{P(B)}$.
- Independencia: $P(A\cap B)=P(A)P(B)$.
- Bayes: construye primero probabilidades conjuntas; normaliza al final.

Identifica el modelo antes de usar fórmulas.

- Binomial: número fijo de ensayos, independencia y `p` constante.
- Hipergeométrica: muestreo sin reemplazo desde población finita.
- Poisson: conteo de eventos en un intervalo con tasa constante.
- Exponencial: tiempo de espera entre eventos Poisson y falta de memoria.
- Normal: variable continua simétrica; estandarización $Z=\dfrac{X-\mu}{\sigma}$.

## Inferencia

Antes del intervalo identifica: parámetro, supuestos, estadístico, distribución crítica y nivel de confianza.

- Media con $\sigma$ conocida: $\bar{x}\pm z_{\alpha/2}\dfrac{\sigma}{\sqrt n}$.
- Media con $\sigma$ desconocida y normalidad: $\bar{x}\pm t_{\alpha/2,n-1}\dfrac{s}{\sqrt n}$.
- Varianza normal: $\dfrac{(n-1)s^2}{\chi^2}$ usando cuantiles invertidos en los extremos.
- Diferencia de medias: escribe claramente si las muestras son independientes o pareadas.

No digas “hay 95% de probabilidad de que μ esté dentro” después de observar el intervalo. La interpretación correcta se refiere al procedimiento de muestreo repetido.

## Cómo entrenar

Haz primero cálculos manuales con calculadora. Después verifica en Excel o MATLAB. En la corrección separa errores de concepto, fórmula, tabla, redondeo e interpretación. Repite el certamen hasta poder justificar cada decisión estadística.

## Libros de referencia

- Montgomery y Runger, *Applied Statistics and Probability for Engineers*, Wiley.
- Walpole, Myers, Myers y Ye, *Probability & Statistics for Engineers & Scientists*, Pearson.
- Devore, *Probability and Statistics for Engineering and the Sciences*, Cengage.
