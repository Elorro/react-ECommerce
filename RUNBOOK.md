# 🧠 Qué es este documento

Este documento es la guía operativa de Atelier Commerce en producción.

Su objetivo es dar un punto de referencia claro para:

- desplegar el sistema
- validarlo después de un release
- revisar problemas comunes
- operar pagos, webhooks y base de datos
- responder a incidentes sin improvisar

No es una guía de desarrollo. Es una guía para mantener el sistema funcionando en producción.

## 🚀 Deploy

### Cómo hacer deploy en Vercel

1. Empuja los cambios a la rama que Vercel usa para producción.
2. Verifica que las variables de entorno estén configuradas en Vercel.
3. Deja que Vercel construya y despliegue la aplicación.
4. Revisa el estado del build y del runtime.

### Variables necesarias

Como mínimo:

- `DATABASE_URL`
- `DATABASE_URL_POSTGRES`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `INTERNAL_JOB_SECRET`

### Cómo validar un deploy

Después del deploy:

1. abre `/api/health`
2. abre `/api/readiness`
3. valida login OAuth
4. valida catálogo
5. valida carrito
6. valida checkout en test
7. valida creación de orden
8. revisa panel admin

Si `/api/readiness` devuelve `503`, no des por bueno el deploy.

## 🔐 Variables de entorno críticas

### `DATABASE_URL`

Conexión principal a PostgreSQL.

Si falla:

- no carga catálogo
- no se crean órdenes
- fallan admin, cuenta, carrito autenticado y observabilidad

### `NEXTAUTH_SECRET`

Secreto usado para firmar y validar sesiones.

Si falla:

- login inestable
- sesiones inválidas
- errores de autenticación

### `STRIPE_SECRET_KEY`

Clave privada usada para crear checkout sessions y operar pagos/refunds.

Si falla:

- checkout no inicia
- reembolsos fallan
- la integración de pagos queda inutilizable

### `STRIPE_WEBHOOK_SECRET`

Firma usada para validar eventos enviados por Stripe.

Si falla:

- los webhooks se rechazan
- pagos pueden quedar sin confirmación automática
- órdenes pendientes pueden no cerrarse correctamente

## 💳 Pagos (Stripe)

### Cómo verificar pagos

1. Revisa en Stripe Dashboard si la sesión de checkout fue creada.
2. Verifica si el pago quedó como `succeeded`.
3. Comprueba en la base de datos o en la UI admin que la orden cambió a estado pagado/confirmado.
4. Revisa logs de `/api/payments/checkout-session` y `/api/payments/webhook`.

### Cómo probar en test

Usa claves `test` y tarjetas de prueba de Stripe.

Valida:

- creación de checkout session
- redirect correcto
- recepción de webhook
- actualización de orden

### Cómo detectar fallos

Síntomas comunes:

- el usuario no sale hacia Stripe
- vuelve de Stripe pero la orden no se confirma
- el pago existe en Stripe pero la orden sigue pendiente
- refunds fallan desde admin

Busca errores en:

- Vercel logs
- Stripe Dashboard
- `/api/health`
- `/api/readiness`
- admin observability

## 🔔 Webhooks

### Endpoint

```text
/api/payments/webhook
```

### Cómo verificar que funcionan

1. Revisa en Stripe Dashboard el historial del webhook.
2. Confirma que el endpoint responde `2xx`.
3. Verifica que eventos como `checkout.session.completed` están llegando.
4. Comprueba en la orden correspondiente que hubo actualización.

### Qué pasa si fallan

Si el webhook falla:

- Stripe reintentará según su política
- la orden puede quedar pendiente más tiempo
- el retorno del checkout puede ayudar, pero no debe ser la única fuente de verdad

Si ves muchos fallos:

- revisa `STRIPE_WEBHOOK_SECRET`
- revisa que el dominio y la ruta sean correctos
- revisa que el endpoint esté accesible públicamente

## 🗄️ Base de datos

### Migraciones

Despliega migraciones con:

```bash
npx prisma migrate deploy
```

No uses comandos de desarrollo en producción.

### Backup

Conceptualmente, debes tener:

- backups periódicos de PostgreSQL
- confirmación de que el backup realmente se puede restaurar

Scripts disponibles en el repo:

```bash
npm run ops:pg:backup
npm run ops:pg:restore -- <archivo>
npm run ops:pg:restore:verify -- <archivo>
```

### Recuperación básica

Pasos mínimos:

1. detener cambios riesgosos
2. identificar el backup correcto
3. restaurar en entorno temporal si es posible
4. validar integridad
5. restaurar al entorno requerido

No restaure a ciegas sobre producción sin validar el dump antes.

## 🚨 Troubleshooting

### ❌ No carga catálogo

Posibles causas:

- `DATABASE_URL` incorrecta
- PostgreSQL caído
- migraciones incompletas
- error en consultas Prisma

Solución:

1. verifica `/api/health`
2. valida conexión DB
3. revisa logs de runtime
4. confirma que las tablas existen
5. revisa si el deploy usó variables correctas

### ❌ Error en login

Posibles causas:

- `NEXTAUTH_URL` mal configurada
- `NEXTAUTH_SECRET` inválida
- OAuth provider mal configurado
- redirect URI incorrecta en Google/GitHub

Solución:

1. revisa logs de auth
2. valida credenciales del proveedor
3. valida dominio y redirect URI
4. confirma que la URL pública coincide con la configuración

### ❌ Checkout falla

Posibles causas:

- `STRIPE_SECRET_KEY` inválida
- Stripe en modo incorrecto
- validación de orden fallida
- error de red hacia Stripe
- sesión expirada

Solución:

1. revisa logs de `/api/payments/checkout-session`
2. revisa Stripe Dashboard
3. valida claves test/live
4. revisa que el usuario esté autenticado correctamente
5. confirma que la orden pendiente se esté creando

### ❌ Webhook no responde

Posibles causas:

- `STRIPE_WEBHOOK_SECRET` incorrecta
- endpoint caído
- dominio incorrecto
- error interno en procesamiento del evento

Solución:

1. revisa logs del endpoint
2. verifica eventos fallidos en Stripe
3. confirma signing secret
4. reenvía el webhook desde Stripe Dashboard si hace falta

## 📊 Logs

### Dónde ver logs

En producción, la primera fuente es:

- logs de Vercel

Además, el proyecto mantiene:

- logging estructurado
- observabilidad persistida
- panel interno de observabilidad

### Qué buscar

Busca por:

- `requestId`
- `orderId`
- errores de checkout
- errores de webhook
- errores de auth
- timeouts o fallos de DB

## 🔄 Re-deploy

### Cuándo hacerlo

Haz redeploy cuando:

- cambias variables de entorno
- arreglas un bug de runtime
- necesitas relanzar un deploy fallido
- el código ya fue corregido y validado

### Cómo hacerlo

1. asegura que la rama correcta tiene el cambio
2. dispara redeploy desde Vercel o empuja un commit nuevo
3. revisa build logs
4. ejecuta validación post-deploy

No uses redeploy como sustituto de debugging si no sabes qué estás corrigiendo.

## ⚠️ Incidentes

### Respuesta básica

1. **Identificar**
   - qué parte falla
   - desde cuándo
   - a cuántos usuarios afecta

2. **Aislar**
   - auth
   - checkout
   - webhook
   - DB
   - admin

3. **Mitigar**
   - detener despliegues riesgosos
   - desactivar la ruta operativa si hace falta
   - usar fallback temporal
   - restaurar servicio crítico

4. **Corregir**
   - aplicar fix
   - validar
   - desplegar
   - revisar logs posteriores

## 📈 Mejoras futuras

- Sentry real integrado
- alertas automáticas por webhook/Slack/email
- métricas de negocio y pagos
- dashboards externos
- smoke tests post-deploy automatizados
- mejor trazabilidad entre Stripe, orden y evento operativo
