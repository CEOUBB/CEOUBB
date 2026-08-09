# Termodinámica Aplicada - Evaluaciones y ejercicios

Organizado según los módulos de ADECCA: Primera ley, Segunda ley, Combustión y Ciclos de Vapor, con enfoque de Ingeniería Mecánica.

## 1. Certamen de entrenamiento 1 - Primera ley

**Dificultad:** Tipo certamen  
**Tema:** Certamen 1
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Compresión politrópica de aire (35 ptos)
Un kilogramo de aire ideal está inicialmente a 100 kPa y 300 K. Se comprime politrópicamente con $n=1{,}30$ hasta 600 kPa. Use $R=0{,}287\ \mathrm{kJ\,kg^{-1}\,K^{-1}}$ y $c_v=0{,}718\ \mathrm{kJ\,kg^{-1}\,K^{-1}}$.
a) Calcule $V_1$ y $V_2$.
b) Determine $T_2$.
c) Calcule trabajo de frontera, $\Delta U$ y Q con trabajo positivo realizado por el sistema.
d) Interprete los signos.

PROBLEMA 2 - Turbina en régimen permanente (30 ptos)
Vapor entra a una turbina con $\dot m=4\ \mathrm{kg\,s^{-1}}$, $h_1=3200\ \mathrm{kJ\,kg^{-1}}$ y $V_1=60\ \mathrm{m\,s^{-1}}$. Sale con $h_2=2600\ \mathrm{kJ\,kg^{-1}}$ y $V_2=120\ \mathrm{m\,s^{-1}}$. La turbina pierde 40 kW de calor y el cambio de energía potencial es despreciable.
a) Plantee el balance.
b) Determine la potencia producida.
c) Compare con el resultado al despreciar energía cinética.

PROBLEMA 3 - Intercambiador adiabático (35 ptos)
Aceite caliente: $\dot m_h=2\ \mathrm{kg\,s^{-1}}$, $c_{p,h}=1{,}1\ \mathrm{kJ\,kg^{-1}\,K^{-1}}$, entra a 150°C y sale a 70°C. Agua: $\dot m_c=1\ \mathrm{kg\,s^{-1}}$, $c_{p,c}=4{,}18\ \mathrm{kJ\,kg^{-1}\,K^{-1}}$, entra a 20°C.
a) Calcule la tasa de transferencia de calor interna.
b) Determine la salida del agua.
c) Calcule la generación de entropía del equipo usando temperaturas absolutas y explique si el resultado cumple la segunda ley.

<details>
<summary>Pista</summary>

Para el proceso politrópico $\dfrac{T_2}{T_1}=\left(\dfrac{P_2}{P_1}\right)^{\frac{n-1}{n}}$ y $W=\dfrac{mR(T_2-T_1)}{1-n}$.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
$V_1=\dfrac{mRT_1}{P_1}=\dfrac{(1)(0{,}287)(300)}{100}=0{,}861\ \mathrm{m^3}$. $T_2=300\left(\dfrac{600}{100}\right)^{\frac{0{,}30}{1{,}30}}\approx453{,}62\ \mathrm{K}$. $V_2=\dfrac{mRT_2}{P_2}\approx0{,}2170\ \mathrm{m^3}$. El trabajo por el sistema es $W=\dfrac{R(T_2-T_1)}{1-n}=\dfrac{0{,}287(153{,}62)}{-0{,}30}\approx-146{,}97\ \mathrm{kJ}$. $\Delta U=c_v(T_2-T_1)=0{,}718(153{,}62)\approx110{,}30\ \mathrm{kJ}$. De $\Delta U=Q-W$ se obtiene $Q=\Delta U+W\approx-36{,}66\ \mathrm{kJ}$. Trabajo y calor son negativos: se suministra trabajo al aire y se rechaza calor durante la compresión.

PAUTA PROBLEMA 2
Para una entrada y una salida: $$\dot Q-\dot W=\dot m\left[(h_2-h_1)+\dfrac{V_2^2-V_1^2}{2000}\right]$$, con términos cinéticos en kJ/kg. El cambio cinético es $\dfrac{120^2-60^2}{2000}=5{,}4\ \mathrm{kJ\,kg^{-1}}$. Entonces $-40-\dot W=4[-600+5{,}4]=-2378{,}4\ \mathrm{kW}$, de donde $\dot W=2338{,}4\ \mathrm{kW}$. Si se desprecia energía cinética resulta 2360 kW; la diferencia es 21,6 kW, exactamente $\dot m\,\Delta ke$.

PAUTA PROBLEMA 3
El aceite cede $\dot Q=2(1{,}1)(150-70)=176\ \mathrm{kW}$. El agua gana esa energía: $176=(1)(4{,}18)(T_{c,\mathrm{out}}-20)$, por lo que $T_{c,\mathrm{out}}\approx62{,}11\,^{\circ}\mathrm{C}$. Como el equipo es adiabático respecto del ambiente, $$\dot S_{\mathrm{gen}}=\dot m_h c_{p,h}\ln\left(\dfrac{T_{h,\mathrm{out}}}{T_{h,\mathrm{in}}}\right)+\dot m_c c_{p,c}\ln\left(\dfrac{T_{c,\mathrm{out}}}{T_{c,\mathrm{in}}}\right)$$. Usando kelvin: $\dot S_{\mathrm{gen}}=2(1{,}1)\ln\left(\dfrac{343{,}15}{423{,}15}\right)+4{,}18\ln\left(\dfrac{335{,}26}{293{,}15}\right)\approx0{,}100\ \mathrm{kW\,K^{-1}}$. Es positivo, por lo que cumple la segunda ley y refleja irreversibilidad por transferencia con diferencia finita de temperatura.

</details>

## 2. Certamen de entrenamiento 2 - Segunda ley y combustión

**Dificultad:** Tipo certamen  
**Tema:** Certamen 2
**Tiempo:** 100 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Compresor adiabático real (35 ptos)
Aire entra a 100 kPa y 300 K y se comprime hasta 800 kPa. Use $k=1{,}4$, $c_p=1{,}005\ \mathrm{kJ\,kg^{-1}\,K^{-1}}$ y $R=0{,}287\ \mathrm{kJ\,kg^{-1}\,K^{-1}}$ kJ/(kg·K). La eficiencia isentrópica del compresor es 0,82.
a) Calcule $T_{2s}$.
b) Calcule $T_2$ real y trabajo específico.
c) Calcule $\Delta s$ del aire y explique su signo.

PROBLEMA 2 - Límites de Carnot (25 ptos)
a) Una máquina opera entre 800 K y 300 K y recibe 1200 kJ/ciclo. Obtenga $\eta_{\max}$, $W_{\max}$ y $Q_L$.
b) Un refrigerador de Carnot opera entre -5°C y 25°C y extrae 15 kW. Obtenga COP, potencia mínima y calor rechazado.

PROBLEMA 3 - Combustión de metano (40 ptos)
Metano se quema completamente con 20% de exceso de aire seco, modelado como $\mathrm{O_2}+3{,}76\,\mathrm{N_2}$.
a) Escriba y balancee la reacción por kmol de $\mathrm{CH_4}$.
b) Calcule la relación aire-combustible másica.
c) Determine porcentajes molares secos de $\mathrm{CO_2}$, $\mathrm{O_2}$ y $\mathrm{N_2}$.
d) Explique el efecto cualitativo de aumentar demasiado el exceso de aire sobre temperatura de llama y pérdidas de chimenea.

<details>
<summary>Pista</summary>

$\eta_c=\dfrac{T_{2s}-T_1}{T_2-T_1}$. En combustión, el $\mathrm{O_2}$ real es 1,20 veces el estequiométrico.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
$T_{2s}=T_1\left(\dfrac{P_2}{P_1}\right)^{\frac{k-1}{k}}=300\cdot8^{0{,}285714}\approx543{,}43\ \mathrm{K}$. De $\eta_c=\dfrac{T_{2s}-T_1}{T_2-T_1}$: $T_2=300+\dfrac{543{,}43-300}{0{,}82}\approx596{,}87\ \mathrm{K}$. El trabajo de entrada es $w_{\mathrm{in}}=c_p(T_2-T_1)\approx1{,}005(296{,}87)=298{,}36\ \mathrm{kJ\,kg^{-1}}$. $\Delta s=c_p\ln\left(\dfrac{T_2}{T_1}\right)-R\ln\left(\dfrac{P_2}{P_1}\right)\approx0{,}0946\ \mathrm{kJ\,kg^{-1}\,K^{-1}}$, positivo por irreversibilidades internas.

PAUTA PROBLEMA 2
Máquina: $\eta_{\max}=1-\dfrac{300}{800}=0{,}625$. $W_{\max}=0{,}625(1200)=750\ \mathrm{kJ/ciclo}$ y $Q_L=450\ \mathrm{kJ/ciclo}$. Refrigerador: $T_L=268{,}15\ \mathrm{K}$ y $T_H=298{,}15\ \mathrm{K}$. $\mathrm{COP}_R=\dfrac{T_L}{T_H-T_L}=\dfrac{268{,}15}{30}\approx8{,}938$. $\dot W_{\min}=\dfrac{15}{8{,}938}\approx1{,}678\ \mathrm{kW}$ y $\dot Q_H=15+1{,}678\approx16{,}678\ \mathrm{kW}$.

PAUTA PROBLEMA 3
Estequiométricamente se requieren 2 kmol $\mathrm{O_2}$; con 20% de exceso se suministran 2,4. Reacción: $$\mathrm{CH_4}+2{,}4(\mathrm{O_2}+3{,}76\,\mathrm{N_2})\rightarrow\mathrm{CO_2}+2\,\mathrm{H_2O}+0{,}4\,\mathrm{O_2}+9{,}024\,\mathrm{N_2}$$. El aire real es 1,2 veces el estequiométrico: $\dfrac{A}{F}\approx1{,}2(17{,}2)=20{,}6\ \mathrm{kg_{aire}\,kg_{CH_4}^{-1}}$. En base seca el total es 1+0,4+9,024=10,424 kmol. $\mathrm{CO_2}$≈9,59%, $\mathrm{O_2}$≈3,84% y $\mathrm{N_2}$≈86,57%. Exceso de aire moderado ayuda a completar la combustión; exceso elevado diluye los productos, reduce la temperatura de llama y aumenta energía perdida calentando gases que salen por la chimenea.

</details>

## 3. Certamen de entrenamiento 3 - Ciclos de vapor

**Dificultad:** Tipo certamen  
**Tema:** Certamen 3
**Tiempo:** 110 min  
**Puntaje:** 100 ptos

PROBLEMA 1 - Rankine ideal (40 ptos)
Se entregan propiedades: $h_1=191{,}8\ \mathrm{kJ\,kg^{-1}}$ a la salida del condensador; trabajo de bomba $w_p=8\ \mathrm{kJ\,kg^{-1}}$; $h_3=3330\ \mathrm{kJ\,kg^{-1}}$ a la entrada de turbina; $h_4=2300\ \mathrm{kJ\,kg^{-1}}$ a la salida. La planta entrega 50 MW netos.
a) Determine h2, wt, wnet, qin, qout y eficiencia.
b) Calcule flujo másico de vapor.
c) Calcule potencia térmica rechazada en el condensador.

PROBLEMA 2 - Rankine con recalentamiento (35 ptos)
Para otro ciclo se suministran: h1=200, h2=210, h3=3500, h4=3100, h5=3580, h6=2450 kJ/kg. 3→4 es turbina de alta, 4→5 recalentamiento y 5→6 turbina de baja.
a) Calcule trabajos de turbinas y bomba.
b) Calcule calor total añadido y eficiencia.
c) Determine ṁ para 50 MW netos.

PROBLEMA 3 - Consumo de combustible y aire (25 ptos)
Una caldera debe transferir 120 MW al agua-vapor y tiene eficiencia de 88%. Se usa metano con PCI=50 MJ/kg y 20% de exceso de aire, A/F=20,6 kg/kg.
a) Calcule consumo de combustible.
b) Calcule flujo de aire.
c) Explique tres medidas para mejorar el rendimiento global sin comprometer seguridad.

<details>
<summary>Pista</summary>

En Rankine, $q_{\mathrm{in}}=h_3-h_2$ y $q_{\mathrm{out}}=h_4-h_1$ para el ciclo simple. Potencia en kW dividida por kJ/kg da kg/s.

</details>

<details>
<summary>Solución</summary>

PAUTA PROBLEMA 1
$h_2=191{,}8+8=199{,}8\ \mathrm{kJ\,kg^{-1}}$. $w_t=h_3-h_4=1030\ \mathrm{kJ\,kg^{-1}}$; $w_{\mathrm{net}}=1030-8=1022\ \mathrm{kJ\,kg^{-1}}$. $q_{\mathrm{in}}=h_3-h_2=3130{,}2\ \mathrm{kJ\,kg^{-1}}$ y $q_{\mathrm{out}}=h_4-h_1=2108{,}2\ \mathrm{kJ\,kg^{-1}}$. $\eta=\dfrac{1022}{3130{,}2}=0{,}3265=32{,}65\%$. Para 50.000 kW: $\dot m=\dfrac{50\,000}{1022}\approx48{,}92\ \mathrm{kg\,s^{-1}}$. El condensador rechaza $\dot m q_{\mathrm{out}}\approx48{,}92(2108{,}2)=103\,141\ \mathrm{kW}\approx103{,}14\ \mathrm{MW}$.

PAUTA PROBLEMA 2
Turbina alta: 3500-3100=400 kJ/kg. Turbina baja: 3580-2450=1130. Trabajo total de turbina=1530; bomba=210-200=10; $w_{\mathrm{net}}=1520\ \mathrm{kJ\,kg^{-1}}$. Calor de caldera=(3500-210)=3290 y recalentamiento=(3580-3100)=480; $q_{\mathrm{in,total}}=3770\ \mathrm{kJ\,kg^{-1}}$. $\eta=\dfrac{1520}{3770}\approx40{,}32\%$. Para 50 MW: $\dot m=\dfrac{50\,000}{1520}\approx32{,}89\ \mathrm{kg\,s^{-1}}$. El recalentamiento eleva el trabajo específico y normalmente mejora la calidad del vapor al final de la expansión.

PAUTA PROBLEMA 3
La potencia química requerida es $\dfrac{120}{0{,}88}=136{,}36\ \mathrm{MW}$. Con PCI=50 MJ/kg, $\dot m_f=\dfrac{136{,}36}{50}\approx2{,}727\ \mathrm{kg\,s^{-1}}$. El aire es $\dot m_a=20{,}6(2{,}727)\approx56{,}18\ \mathrm{kg\,s^{-1}}$. Medidas posibles: recuperar calor de gases en economizador o precalentador de aire; controlar exceso de aire con medición de $\mathrm{O_2}$; reducir incrustaciones y pérdidas térmicas mediante limpieza y aislamiento; mantener quemadores para combustión estable y segura.

</details>
