Sensor = ["S1";"S2";"S3";"S4";"S5"];
Temperatura = [68;74;81;77;92];
Presion = [2.1;2.3;2.8;2.5;3.2];
T = table(Sensor,Temperatura,Presion);
alertas = T(T.Temperatura > 80 | T.Presion > 3,:);
writetable(alertas,'alertas_sensores.csv')
disp(alertas)
