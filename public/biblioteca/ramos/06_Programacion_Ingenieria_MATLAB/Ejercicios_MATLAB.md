# Programación en Ingeniería con MATLAB - Evaluaciones y ejercicios

Creado como biblioteca académica de programación aplicada a Ingeniería Mecánica con MATLAB.

## 1. Certamen de entrenamiento 1 - Fundamentos y datos

**Dificultad:** Tipo certamen  
**Tema:** Certamen 1
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Diagnóstico de vibraciones (35 ptos)
Se midieron velocidades RMS [2.1 2.5 3.2 4.8 5.4 3.9 6.2 2.7 4.1 5.8] mm/s.
a) Calcule media, mediana, desviación estándar muestral, máximo y posición.
b) Clasifique cada medición: Normal ≤3,5; Alerta >3,5 y ≤5,0; Alarma >5,0.
c) Muestre una tabla y un gráfico de barras con colores por estado.
d) Exporte la tabla a CSV.

PROBLEMA 2 - Sistema lineal (30 ptos)
Resuelva $\begin{cases}3x-y+2z=7\\2x+4y-z=1\\x+2y+5z=12\end{cases}$.
a) Construya A y b.
b) Resuelva con $A\backslash b$.
c) Calcule norma del residuo.
d) Calcule número de condición y explique qué informa.

PROBLEMA 3 - Calibración de sensor (35 ptos)
Entrada x=[0 1 2 3 4 5] y salida y=[0.2 2.1 4.1 6.2 8.0 10.2].
a) Ajuste $y=ax+b$ con polyfit.
b) Calcule $R^2$ manualmente.
c) Estime la salida para x=3,6.
d) Grafique puntos, recta y residuo en dos subgráficos.

<details>
<summary>Pista</summary>

Use indexación lógica para clasificar; para $R^2$ use 1-SSE/SST.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
v = [2.1 2.5 3.2 4.8 5.4 3.9 6.2 2.7 4.1 5.8];
media = mean(v);
mediana = median(v);
s = std(v);
[maximo,posicion] = max(v);
estado = strings(size(v));
estado(v <= 3.5) = "Normal";
estado(v > 3.5 & v <= 5.0) = "Alerta";
estado(v > 5.0) = "Alarma";
T = table((1:numel(v))',v',estado','VariableNames',{'Medicion','Velocidad','Estado'});
colores = zeros(numel(v),3);
colores(estado=="Normal",:) = repmat([0.2 0.7 0.35],sum(estado=="Normal"),1);
colores(estado=="Alerta",:) = repmat([0.95 0.65 0.1],sum(estado=="Alerta"),1);
colores(estado=="Alarma",:) = repmat([0.8 0.1 0.2],sum(estado=="Alarma"),1);
b = bar(v,'FaceColor','flat'); b.CData = colores; grid on;
writetable(T,'diagnostico_vibraciones.csv');

Resultados: media=4,07; mediana=4,00; s≈1,4469; máximo=6,2 en posición 7. Hay 4 normales, 3 alertas y 3 alarmas.

PAUTA PROBLEMA 2
A = [3 -1 2; 2 4 -1; 1 2 5];
b = [7;1;12];
x = A\b;
r = A*x-b;
normaResiduo = norm(r);
kappa = cond(A);

La solución es aproximadamente [1,0260;0,2597;2,0909]. La norma del residuo debe quedar cercana a precisión de máquina. cond(A) cuantifica sensibilidad: valores grandes indican que pequeños errores en datos pueden amplificarse en la solución.

PAUTA PROBLEMA 3
x = 0:5;
y = [0.2 2.1 4.1 6.2 8.0 10.2];
p = polyfit(x,y,1);
yhat = polyval(p,x);
SSE = sum((y-yhat).^2);
SST = sum((y-mean(y)).^2);
R2 = 1-SSE/SST;
y36 = polyval(p,3.6);
tiledlayout(2,1);
nexttile; plot(x,y,'o',x,yhat,'-','LineWidth',1.5); grid on;
nexttile; stem(x,y-yhat,'filled'); grid on;

Se obtiene a≈1,99429, b≈0,14762, R²≈0,99953 e y(3,6)≈7,327.

</details>

## 2. Certamen de entrenamiento 2 - Métodos numéricos

**Dificultad:** Tipo certamen  
**Tema:** Certamen 2
**Tiempo:** 110 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Método de bisección programado (35 ptos)
Encuentre la raíz de $f(x)=x^3-4x-1$ en [2,3] con tolerancia $10^{-6}$.
a) Verifique cambio de signo.
b) Programe la bisección sin usar fzero.
c) Guarde una tabla de iteración, aproximación y error.
d) Compare con fzero.

PROBLEMA 2 - Energía de una bomba (30 ptos)
La potencia durante 12 h es $P(t)=12+3\sin\left(\dfrac{\pi t}{6}\right)\ \mathrm{kW}$.
a) Integre con trapz usando pasos 1 h, 0,1 h y 0,01 h.
b) Compare con la integral analítica.
c) Grafique convergencia del error.

PROBLEMA 3 - Enfriamiento con ode45 (35 ptos)
Un componente satisface $\dfrac{dT}{dt}=-0{,}08(T-20)$, $T(0)=120$, con t en minutos.
a) Resuelva con ode45 en $0\le t\le40$.
b) Compare con la solución analítica.
c) Determine por interpolación cuándo baja de 50°C.
d) Calcule el error máximo entre ambas soluciones.

<details>
<summary>Pista</summary>

La raíz es cercana a 2,115. La potencia sinusoidal completa un período en 12 h.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
f = @(x) x.^3-4*x-1;
a = 2; b = 3; tol = 1e-6;
if f(a)*f(b) >= 0
    error('Intervalo sin cambio de signo')
end
iter = 0; historial = [];
while (b-a)/2 > tol
    c = (a+b)/2;
    iter = iter+1;
    historial(end+1,:) = [iter c (b-a)/2];
    if f(a)*f(c) < 0
        b = c;
    else
        a = c;
    end
end
raiz = (a+b)/2;
raizFzero = fzero(f,[2 3]);
Tabla = array2table(historial,'VariableNames',{'Iteracion','Aproximacion','CotaError'});

La raíz es aproximadamente 2,11490754.

PAUTA PROBLEMA 2
P = @(t) 12+3*sin(pi*t/6);
pasos = [1 0.1 0.01];
E = zeros(size(pasos));
for k = 1:numel(pasos)
    t = 0:pasos(k):12;
    E(k) = trapz(t,P(t));
end
Eexacta = 144;
errorAbs = abs(E-Eexacta);
loglog(pasos,errorAbs,'o-'); grid on;

La parte sinusoidal integra cero sobre el período completo, por lo que la energía exacta es 144 kWh. Debido a la simetría de la malla, trapz también entrega un valor prácticamente igual para estos pasos.

PAUTA PROBLEMA 3
modelo = @(t,T) -0.08*(T-20);
[t,Tnum] = ode45(modelo,[0 40],120);
Tana = 20+100*exp(-0.08*t);
errorMax = max(abs(Tnum-Tana));
cruce = find(Tnum <= 50,1);
t50 = interp1(Tnum(cruce-1:cruce),t(cruce-1:cruce),50);
plot(t,Tnum,'o',t,Tana,'-','LineWidth',1.4); grid on;

Analíticamente t50=-ln[(50-20)/(120-20)]/0,08≈15,05 min. El error máximo depende de tolerancias de ode45 y debe ser pequeño.

</details>

## 3. Evaluación integradora - Simulación mecánica

**Dificultad:** Tipo certamen  
**Tema:** Certamen 3
**Tiempo:** 120 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Oscilador amortiguado (35 ptos)
Modele m x''+c x'+k x=0 con m=5 kg, c=6 N·s/m, k=80 N/m, x(0)=0,08 m y x'(0)=0.
a) Convierta a sistema de primer orden.
b) Resuelva con ode45 durante 15 s.
c) Grafique desplazamiento, velocidad y energía E=0,5mv²+0,5kx².
d) Determine numéricamente el primer máximo posterior a t=0 y el tiempo aproximado de asentamiento dentro de ±2% de x(0).

PROBLEMA 2 - Curva de bomba y sistema (30 ptos)
Bomba: Hp(Q)=42-0,015Q² m. Sistema: Hs(Q)=10+0,005Q² m, Q en m³/h.
a) Encuentre el punto de operación con fzero.
b) Grafique ambas curvas entre 0 y 55 m³/h.
c) Calcule potencia hidráulica y potencia de eje para η=0,75. Use ρ=1000 kg/m³ y g=9,81.

PROBLEMA 3 - Procesamiento automático de sensores (35 ptos)
Genere una tabla con tiempo 0:10:300 s, temperatura 65+8sin(2πt/180)+ruido reproducible y presión 2,4+0,15cos(2πt/120)+ruido.
a) Fije rng(7).
b) Calcule medias móviles de 5 muestras.
c) Genere alarma si temperatura suavizada>70 o presión suavizada>2,5.
d) Grafique señales y límites, exporte CSV y entregue cantidad y tiempos de alarma.

<details>
<summary>Pista</summary>

Para el asentamiento, busque desde qué índice en adelante todos los valores cumplen la banda. En la bomba convierta $Q$ a $\mathrm{m^3\,s^{-1}}$ para la potencia.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
m = 5; c = 6; k = 80;
modelo = @(t,y) [y(2); -(c/m)*y(2)-(k/m)*y(1)];
[t,y] = ode45(modelo,[0 15],[0.08;0]);
x = y(:,1); v = y(:,2);
E = 0.5*m*v.^2+0.5*k*x.^2;
dx = diff(x);
maxIdx = find(dx(1:end-1) > 0 & dx(2:end) <= 0,1)+1;
primerMaximo = x(maxIdx);
tiempoPrimerMaximo = t(maxIdx);
banda = 0.02*0.08;
tAsent = NaN;
for j = 1:numel(t)
    if all(abs(x(j:end)) <= banda)
        tAsent = t(j);
        break
    end
end
tiledlayout(3,1);
nexttile; plot(t,x); grid on;
nexttile; plot(t,v); grid on;
nexttile; plot(t,E); grid on;

El sistema de primer orden es x1'=x2 y x2'=-(c/m)x2-(k/m)x1. La energía debe decrecer por disipación viscosa. El cambio de signo de diff(x) localiza el primer máximo posterior sin requerir toolboxes adicionales; el bucle estima el asentamiento.

PAUTA PROBLEMA 2
Hp = @(Q) 42-0.015*Q.^2;
Hs = @(Q) 10+0.005*Q.^2;
Qop = fzero(@(Q) Hp(Q)-Hs(Q),[0 55]);
Hop = Hp(Qop);
Q = linspace(0,55,300);
plot(Q,Hp(Q),Q,Hs(Q),'LineWidth',1.5); grid on;
rho = 1000; g = 9.81; eta = 0.75;
Ph = rho*g*(Qop/3600)*Hop;
Peje = Ph/eta;

Qop=40 m³/h, Hop=18 m. Ph≈1,962 kW y Peje≈2,616 kW.

PAUTA PROBLEMA 3
rng(7);
t = (0:10:300)';
T = 65+8*sin(2*pi*t/180)+0.8*randn(size(t));
P = 2.4+0.15*cos(2*pi*t/120)+0.02*randn(size(t));
Tsuave = movmean(T,5);
Psuave = movmean(P,5);
Alarma = Tsuave > 70 | Psuave > 2.5;
Datos = table(t,T,P,Tsuave,Psuave,Alarma);
writetable(Datos,'registro_sensores.csv');
tiledlayout(2,1);
nexttile; plot(t,T,t,Tsuave,'LineWidth',1.2); yline(70); grid on;
nexttile; plot(t,P,t,Psuave,'LineWidth',1.2); yline(2.5); grid on;
cantidadAlarmas = nnz(Alarma);
tiemposAlarma = t(Alarma);

El uso de rng(7) hace reproducible el resultado. La tabla final permite auditar cada alarma y sus señales suavizadas.

</details>
