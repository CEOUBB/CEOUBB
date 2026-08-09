# Apuntes y ruta de estudio - Termodinámica Aplicada

## Orden recomendado del curso

Sigue las secciones de ADECCA en este orden: `01 Primera ley`, `02 Segunda ley`, `03 Combustión` y `04 Ciclos de Vapor`. Crea una hoja de propiedades para cada problema y no empieces el balance antes de definir sistema, entradas, salidas y supuestos.

## Primera ley

Sistema cerrado: $\Delta U+\Delta KE+\Delta PE=Q-W$, con calor hacia el sistema positivo y trabajo realizado por el sistema positivo. Para trabajo de frontera: $W_b=\displaystyle\int_{V_1}^{V_2}P\,dV$.

Volumen de control en régimen permanente:

$$\dot Q-\dot W=\sum_{\mathrm{sal}}\dot m\left(h+\frac{V^2}{2}+gz\right)-\sum_{\mathrm{ent}}\dot m\left(h+\frac{V^2}{2}+gz\right)$$

Procedimiento:

1. Define el volumen de control.
2. Escribe continuidad.
3. Declara adiabático, cambios cinéticos o potenciales despreciables sólo si corresponde.
4. Conserva unidades: $1\ \mathrm{kPa\,m^3}=1\ \mathrm{kJ}$ y $V^2/2$ debe convertirse de $\mathrm{J\,kg^{-1}}$ a $\mathrm{kJ\,kg^{-1}}$.
5. Revisa si el signo de potencia coincide con turbina, compresor o bomba.

## Segunda ley

Balance de entropía: $\Delta S=\displaystyle\int\dfrac{\delta Q}{T_b}+S_{\mathrm{gen}}$, con $S_{\mathrm{gen}}\ge0$. En régimen permanente incluye entropía transportada por los flujos. Una entropía generada negativa indica error de signos, temperaturas absolutas o propiedades.

Límites de Carnot:

- Máquina: $\eta_{\max}=1-\dfrac{T_L}{T_H}$.
- Refrigerador: $\mathrm{COP}_R=\dfrac{T_L}{T_H-T_L}$.
- Bomba de calor: $\mathrm{COP}_{HP}=\dfrac{T_H}{T_H-T_L}$.

Para gas ideal: $\Delta s=c_p\ln\left(\dfrac{T_2}{T_1}\right)-R\ln\left(\dfrac{P_2}{P_1}\right)$.

## Combustión

Balancea primero carbono, luego hidrógeno, después oxígeno y finalmente nitrógeno. Aire seco aproximado: $\mathrm{O_2}+3{,}76\,\mathrm{N_2}$. Distingue aire estequiométrico, aire real y porcentaje de exceso. En análisis seco elimina el vapor de agua antes de normalizar fracciones molares.

Exceso de aire insuficiente puede producir combustión incompleta. Exceso demasiado alto reduce temperatura de llama y aumenta pérdidas en gases de escape.

## Ciclos de vapor

En Rankine ideal identifica estados:

1. Salida de condensador.
2. Salida de bomba.
3. Entrada de turbina.
4. Salida de turbina.

Fórmulas específicas:

- $w_t=h_3-h_4$
- $w_p=h_2-h_1$
- $q_{\mathrm{in}}=h_3-h_2$
- $q_{\mathrm{out}}=h_4-h_1$
- $\eta=\dfrac{w_t-w_p}{q_{\mathrm{in}}}$

En ciclos con recalentamiento suma el calor y el trabajo de ambas etapas. Después calcula flujo másico a partir de potencia neta.

## Cómo estudiar tablas

Antes de interpolar identifica región: líquido comprimido, saturación, mezcla o sobrecalentado. Anota siempre dos propiedades independientes. Si el estado está en mezcla usa calidad $x$ y $h=h_f+xh_{fg}$.

Estudia resolviendo balances completos, no memorizando resultados. Al finalizar cada problema realiza tres controles: unidades, signo físico y orden de magnitud.

## Convención de símbolos

- Propiedades específicas en minúscula: $u$, $h$, $s$, $v$.
- Propiedades totales en mayúscula: $U$, $H$, $S$, $V$.
- Una magnitud con punto, como $\dot Q$, $\dot W$ o $\dot m$, representa una tasa por unidad de tiempo.
- Los subíndices $\mathrm{in}$ y $\mathrm{out}$ indican entrada y salida; $f$, $g$ y $fg$ corresponden a líquido saturado, vapor saturado y diferencia de vaporización.
- Todas las temperaturas de relaciones termodinámicas y entropía se expresan en kelvin.

## Libros de referencia

- Çengel, Boles y Kanoğlu, *Thermodynamics: An Engineering Approach*, McGraw Hill.
- Moran, Shapiro, Boettner y Bailey, *Fundamentals of Engineering Thermodynamics*, Wiley.
- Sonntag, Borgnakke y Van Wylen, *Fundamentals of Thermodynamics*, Wiley.
- Ling, Moebs y Sanny, *University Physics Volume 2*, OpenStax, capítulo de Termodinámica.
