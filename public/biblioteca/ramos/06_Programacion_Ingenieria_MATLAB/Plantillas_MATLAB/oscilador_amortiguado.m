modelo = @(t,y) [y(2); -0.4*y(2)-4*y(1)];
[t,y] = ode45(modelo,[0 15],[1;0]);
plot(t,y(:,1),'LineWidth',1.6)
hold on
plot(t,y(:,2),'LineWidth',1.6)
grid on
legend('Desplazamiento','Velocidad')
xlabel('Tiempo [s]')
