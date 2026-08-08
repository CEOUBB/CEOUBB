t = linspace(0,10,1001);
y = exp(-0.2*t).*sin(3*t);
plot(t,y,'LineWidth',1.8)
grid on
xlabel('Tiempo, t [s]')
ylabel('Amplitud')
title('Señal sinusoidal amortiguada')
