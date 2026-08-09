# Guía rápida de MATLAB para Ingeniería

## Flujo recomendado

1. Crea una carpeta para cada práctica.
2. Guarda cada script con extensión `.m`.
3. Usa `clear; clc; close all;` sólo cuando realmente quieras limpiar la sesión y las figuras.
4. Separa datos de entrada, cálculos y gráficos.
5. Verifica resultados con unidades y una estimación manual.

## Operadores importantes

- Multiplicación matricial: `A*B`.
- Multiplicación elemento a elemento: `A.*B`.
- Potencia elemento a elemento: `A.^2`.
- Resolución de sistema: `x=A\b`.
- Función anónima: `f=@(x) x.^2-2`.

## Archivos incluidos

- `senal_amortiguada.m`
- `analisis_sensores.m`
- `oscilador_amortiguado.m`
