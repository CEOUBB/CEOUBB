# Termodinámica Aplicada - Evaluaciones y ejercicios

Creado para los módulos visibles del curso: Primera ley, Segunda ley, Combustión y Ciclos de Vapor.

## 1. Balance de energía en sistema cerrado

**Dificultad:** Inicial  
**Tema:** Primera ley
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Un sistema cerrado recibe 850 kJ de calor y realiza 300 kJ de trabajo. Despreciando cambios de energía cinética y potencial, calcula ΔU.

<details>
<summary>Pista</summary>

Con la convención Q hacia el sistema y W hecho por el sistema: ΔU=Q-W.

</details>

<details>
<summary>Solución</summary>

ΔU=850-300=550 kJ. La energía interna del sistema aumenta en 550 kJ.

</details>

## 2. Trabajo de frontera a presión constante

**Dificultad:** Inicial  
**Tema:** Primera ley
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Un gas se expande a presión constante de 250 kPa desde 0,12 m³ hasta 0,38 m³. Calcula el trabajo de frontera.

<details>
<summary>Pista</summary>

W_b=P(V₂-V₁) y 1 kPa·m³=1 kJ.

</details>

<details>
<summary>Solución</summary>

W_b=250(0,38-0,12)=250·0,26=65 kJ. Es positivo porque el sistema se expande y realiza trabajo.

</details>

## 3. Tobera adiabática

**Dificultad:** Intermedio  
**Tema:** Flujo estable
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Vapor entra a una tobera adiabática con h₁=3100 kJ/kg y V₁=50 m/s, y sale con h₂=2800 kJ/kg. Desprecia energía potencial y calcula V₂.

<details>
<summary>Pista</summary>

h₁+V₁²/2=h₂+V₂²/2; convierte kJ/kg a J/kg.

</details>

<details>
<summary>Solución</summary>

V₂=√[V₁²+2(h₁-h₂)·1000]=√[50²+2·300·1000]≈776,2 m/s.

</details>

## 4. Potencia de una turbina

**Dificultad:** Intermedio  
**Tema:** Flujo estable
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una turbina opera en régimen permanente con ṁ=4 kg/s, h₁=3200 kJ/kg y h₂=2600 kJ/kg. Pierde 40 kW de calor y se desprecia la energía cinética y potencial. Calcula la potencia producida.

<details>
<summary>Pista</summary>

Q̇-Ẇ=ṁ(h₂-h₁), con Q̇=-40 kW.

</details>

<details>
<summary>Solución</summary>

-40-Ẇ=4(2600-3200)=-2400 kW. Por tanto, Ẇ=2360 kW=2,36 MW producidos.

</details>

## 5. Cambio de entropía de gas ideal

**Dificultad:** Intermedio  
**Tema:** Segunda ley
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Aire ideal se comprime isotérmicamente a 300 K desde 1 bar hasta 6 bar. Usa R=0,287 kJ/(kg·K). Calcula Δs por kg y el calor reversible específico.

<details>
<summary>Pista</summary>

Para gas ideal isotérmico: Δs=-R ln(P₂/P₁) y q_rev=TΔs.

</details>

<details>
<summary>Solución</summary>

Δs=-0,287ln(6)≈-0,514 kJ/(kg·K). Para un proceso reversible isotérmico, q_rev=300(-0,514)≈-154,3 kJ/kg. El signo negativo indica calor rechazado.

</details>

## 6. Máquina de Carnot

**Dificultad:** Inicial  
**Tema:** Segunda ley
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Una máquina de Carnot opera entre 800 K y 300 K y recibe Q_H=1200 kJ por ciclo. Calcula eficiencia, trabajo neto y calor rechazado.

<details>
<summary>Pista</summary>

η=1-T_L/T_H, W=ηQ_H y Q_L=Q_H-W.

</details>

<details>
<summary>Solución</summary>

η=1-300/800=0,625=62,5%. W=0,625·1200=750 kJ. Q_L=1200-750=450 kJ por ciclo.

</details>

## 7. Ciclo Rankine simple

**Dificultad:** Avanzado  
**Tema:** Ciclos
**Tiempo:** Sin límite  
**Puntaje:** Práctica

En un Rankine ideal: h₁=191,8 kJ/kg a la salida del condensador, trabajo de bomba w_p=8 kJ/kg, h₃=3330 kJ/kg a la entrada de la turbina y h₄=2300 kJ/kg a la salida. Calcula eficiencia térmica.

<details>
<summary>Pista</summary>

h₂=h₁+w_p; w_t=h₃-h₄; q_in=h₃-h₂.

</details>

<details>
<summary>Solución</summary>

h₂=199,8 kJ/kg. w_t=1030 kJ/kg y w_net=1030-8=1022 kJ/kg. q_in=3330-199,8=3130,2 kJ/kg. η_th=1022/3130,2≈0,3265=32,65%.

</details>

## 8. Combustión estequiométrica de metano

**Dificultad:** Intermedio  
**Tema:** Combustión
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Escribe la combustión completa estequiométrica de CH₄ con aire seco modelado como O₂+3,76N₂ y estima la relación aire-combustible másica.

<details>
<summary>Pista</summary>

Balancea primero C y H; después determina el O₂ requerido.

</details>

<details>
<summary>Solución</summary>

CH₄+2(O₂+3,76N₂)→CO₂+2H₂O+7,52N₂. La masa de aire estequiométrico por kmol de CH₄ es aproximadamente 274,6 kg y la masa del combustible es 16,0 kg, por lo que (A/F)_est≈17,2 kg de aire/kg de CH₄.

</details>

## 9. Metano con exceso de aire

**Dificultad:** Avanzado  
**Tema:** Combustión
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Escribe la reacción de combustión completa de CH₄ con 20% de exceso de aire, suponiendo productos CO₂, H₂O, O₂ y N₂.

<details>
<summary>Pista</summary>

El oxígeno real es 1,20 veces el estequiométrico: 2,4 kmol.

</details>

<details>
<summary>Solución</summary>

CH₄+2,4(O₂+3,76N₂)→CO₂+2H₂O+0,4O₂+9,024N₂. El O₂ sobrante aparece porque se suministró 0,4 kmol más que el requerido estequiométricamente.

</details>

## 10. Intercambiador de calor

**Dificultad:** Intermedio  
**Tema:** Intercambiadores
**Tiempo:** Sin límite  
**Puntaje:** Práctica

Aceite caliente (ṁ=2 kg/s, cp=1,1 kJ/(kg·K)) se enfría de 150°C a 70°C y calienta agua (ṁ=1 kg/s, cp=4,18 kJ/(kg·K)) que entra a 20°C. Sin pérdidas, calcula Q̇ y la temperatura de salida del agua.

<details>
<summary>Pista</summary>

El calor perdido por el aceite es ganado por el agua.

</details>

<details>
<summary>Solución</summary>

Q̇=2·1,1·(150-70)=176 kW. Para el agua, 176=1·4,18·(T_out-20), de donde T_out≈62,1°C.

</details>
