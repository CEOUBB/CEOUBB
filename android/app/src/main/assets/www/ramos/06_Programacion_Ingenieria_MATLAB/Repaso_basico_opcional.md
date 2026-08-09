# Programación en Ingeniería con MATLAB - Evaluaciones y ejercicios

Banco inicial creado desde cero para práctica de programación aplicada a ingeniería en MATLAB.

## 1. Vectores y operaciones básicas

**Dificultad:** Inicial  
**Tema:** Fundamentos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Crea el vector v=[12 15 11 18 20 17]. Calcula media, máximo, posición del máximo y suma de cuadrados.

<details>
<summary>Pista</summary>

Usa mean, max y sum con el operador .^.

</details>

<details>
<summary>Solución</summary>

v = [12 15 11 18 20 17];
promedio = mean(v);
[maximo, posicion] = max(v);
sumaCuadrados = sum(v.^2);

Resultados: promedio=15.5, máximo=20, posición=5 y suma de cuadrados=1503.

</details>

## 2. Sistema lineal de ingeniería

**Dificultad:** Inicial  
**Tema:** Matrices
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Resuelve en MATLAB el sistema 3x-y+2z=7; 2x+4y-z=1; x+2y+5z=12. Verifica el residuo.

<details>
<summary>Pista</summary>

Forma A y b; usa x=A\b, no inv(A)*b.

</details>

<details>
<summary>Solución</summary>

A = [3 -1 2; 2 4 -1; 1 2 5];
b = [7; 1; 12];
sol = A\b;
residuo = A*sol - b;

sol ≈ [1.0260; 0.2597; 2.0909] y el residuo debe ser cercano a cero.

</details>

## 3. Gráfico de una señal amortiguada

**Dificultad:** Inicial  
**Tema:** Gráficos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Grafica y(t)=e^(-0,2t)sin(3t) para 0≤t≤10 con 1001 puntos, cuadrícula, título y ejes rotulados.

<details>
<summary>Pista</summary>

Usa linspace y operadores elemento a elemento.

</details>

<details>
<summary>Solución</summary>

t = linspace(0,10,1001);
y = exp(-0.2*t).*sin(3*t);
plot(t,y,'LineWidth',1.8);
grid on;
xlabel('Tiempo, t [s]');
ylabel('Amplitud');
title('Señal sinusoidal amortiguada');

</details>

## 4. Función con decisiones

**Dificultad:** Intermedio  
**Tema:** Control
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Escribe una función clasificarTemperatura(T) que devuelva 'baja' si T<15, 'normal' si 15≤T≤30 y 'alta' si T>30.

<details>
<summary>Pista</summary>

Usa if, elseif y else en un archivo con el mismo nombre de la función.

</details>

<details>
<summary>Solución</summary>

function categoria = clasificarTemperatura(T)
if T < 15
    categoria = "baja";
elseif T <= 30
    categoria = "normal";
else
    categoria = "alta";
end
end

</details>

## 5. Alcance de un proyectil

**Dificultad:** Intermedio  
**Tema:** Fundamentos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Para v₀=40 m/s y ángulos de 15° a 75° cada 5°, calcula R=v₀²sin(2θ)/g, encuentra el máximo y grafica R contra θ.

<details>
<summary>Pista</summary>

Usa sind porque los ángulos están en grados.

</details>

<details>
<summary>Solución</summary>

v0 = 40;
g = 9.81;
theta = 15:5:75;
R = v0^2*sind(2*theta)/g;
[Rmax, idx] = max(R);
thetaOpt = theta(idx);
plot(theta,R,'o-','LineWidth',1.6); grid on;
xlabel('Ángulo [grados]'); ylabel('Alcance [m]');

El máximo de la lista ocurre a 45° y Rmax≈163.10 m.

</details>

## 6. Estadística de mediciones

**Dificultad:** Intermedio  
**Tema:** Datos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Para datos=[18.2 17.9 18.5 18.1 19.0 17.8 18.4 18.3], calcula media, mediana, desviación estándar muestral y coeficiente de variación porcentual. Grafica un histograma.

<details>
<summary>Pista</summary>

std usa por defecto la normalización muestral en MATLAB.

</details>

<details>
<summary>Solución</summary>

datos = [18.2 17.9 18.5 18.1 19.0 17.8 18.4 18.3];
media = mean(datos);
mediana = median(datos);
s = std(datos);
CV = 100*s/media;
histogram(datos);
grid on; xlabel('Medición'); ylabel('Frecuencia');

media=18.275, mediana=18.25, s≈0.377 y CV≈2.06%.

</details>

## 7. Integración numérica

**Dificultad:** Intermedio  
**Tema:** Métodos numéricos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Aproxima ∫₀^π sin(x)dx con trapz usando paso 0,01 y calcula el error absoluto respecto del valor exacto.

<details>
<summary>Pista</summary>

Construye x=0:0.01:pi y recuerda incluir pi si el colon no lo alcanza exactamente.

</details>

<details>
<summary>Solución</summary>

x = [0:0.01:pi pi];
y = sin(x);
I = trapz(x,y);
errorAbs = abs(2-I);

El resultado debe ser muy cercano a 2 y el error del orden de 10^-5.

</details>

## 8. Raíz de una ecuación no lineal

**Dificultad:** Intermedio  
**Tema:** Métodos numéricos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Encuentra con fzero la raíz de cos(x)-x=0 cercana a 0,7 y verifica el residuo.

<details>
<summary>Pista</summary>

Define una función anónima y entrega un valor inicial.

</details>

<details>
<summary>Solución</summary>

f = @(x) cos(x)-x;
raiz = fzero(f,0.7);
residuo = f(raiz);

raiz≈0.7390851332 y el residuo debe ser cercano a cero.

</details>

## 9. Oscilador amortiguado con ode45

**Dificultad:** Avanzado  
**Tema:** EDO numérica
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Resuelve x''+0,4x'+4x=0 con x(0)=1 y x'(0)=0 en 0≤t≤15 usando ode45. Grafica desplazamiento y velocidad.

<details>
<summary>Pista</summary>

Define y₁=x, y₂=x' y escribe y'=[y₂; -0,4y₂-4y₁].

</details>

<details>
<summary>Solución</summary>

modelo = @(t,y) [y(2); -0.4*y(2)-4*y(1)];
[t,y] = ode45(modelo,[0 15],[1;0]);
plot(t,y(:,1),'LineWidth',1.6); hold on;
plot(t,y(:,2),'LineWidth',1.6); grid on;
legend('Desplazamiento','Velocidad');
xlabel('Tiempo [s]');

</details>

## 10. Análisis de una tabla de sensores

**Dificultad:** Avanzado  
**Tema:** Datos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Crea una tabla con sensores S1-S5, temperaturas [68 74 81 77 92] °C y presiones [2.1 2.3 2.8 2.5 3.2] bar. Filtra las filas con temperatura>80 o presión>3 y exporta el resultado a CSV.

<details>
<summary>Pista</summary>

Usa table, indexación lógica y writetable.

</details>

<details>
<summary>Solución</summary>

Sensor = ["S1";"S2";"S3";"S4";"S5"];
Temperatura = [68;74;81;77;92];
Presion = [2.1;2.3;2.8;2.5;3.2];
T = table(Sensor,Temperatura,Presion);
alertas = T(T.Temperatura > 80 | T.Presion > 3,:);
writetable(alertas,'alertas_sensores.csv');

Se seleccionan S3 y S5.

</details>
