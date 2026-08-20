# Alertas de gasto de Google Cloud

Estado verificado: 2026-08-20. Seguimiento interno: Linear CEO-10.

## Configuración vigente

| Campo                      | Valor                                                               |
| -------------------------- | ------------------------------------------------------------------- |
| Proyecto                   | `centro-de-estudio-ubb`                                             |
| Período                    | Mensual                                                             |
| Monto                      | CLP 10.000                                                          |
| Base de medición           | Gasto real                                                          |
| Umbrales                   | 50%, 80% y 100%                                                     |
| Alcance                    | Sólo el proyecto Centro de Estudio UBB                              |
| Destinatarios              | Administradores/usuarios de facturación y propietarios del proyecto |
| Límite automático de gasto | No configurado                                                      |

Los destinatarios nominales y la evidencia del estado de la prueba gratuita se mantienen en el ticket interno CEO-10. No deben copiarse al repositorio público.

## Respuesta operativa

- Al 50%, revisar el informe de costos por servicio y confirmar que el crecimiento corresponde a uso esperado.
- Al 80%, avisar a los responsables del proyecto y contener manualmente cualquier abuso o recurso anómalo.
- Al 100%, tratar el evento como incidente de infraestructura y detener manualmente el origen del gasto si no es legítimo.

Las alertas de presupuesto no suspenden servicios ni impiden nuevos cargos. Google Cloud además puede tardar varias horas en reflejar costos; el umbral no sustituye cuotas, App Check, límites por API ni una respuesta manual.

## Prueba gratuita

La cuenta estaba en prueba gratuita durante la verificación. Si el crédito se agota o termina el período sin activar una cuenta pagada, Google Cloud deshabilita la facturación y detiene los recursos. Existe un período de gracia de 30 días para activar la cuenta y recuperar recursos; después, los datos pueden eliminarse. Activar una cuenta pagada antes del vencimiento mantiene la continuidad y conserva el crédito no vencido, pero habilita cobros por uso no cubierto.

Referencias oficiales:

- [Crear y administrar presupuestos y alertas](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Personalizar destinatarios de alertas](https://docs.cloud.google.com/billing/docs/how-to/budgets-notification-recipients?hl=es-419)
- [Prueba gratuita de Google Cloud](https://docs.cloud.google.com/free/docs/free-cloud-features?hl=es-419)
