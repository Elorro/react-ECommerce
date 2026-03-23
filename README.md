# Atelier Commerce

Base full-stack para un e-commerce moderno con `Next.js`, `TypeScript`, `Tailwind`, `Prisma`, `NextAuth`, `Stripe`, validación con `Zod` y testing con `Vitest`.

## Stack actual

- Frontend y backend: Next.js App Router
- Tipado: TypeScript estricto
- Datos: Prisma
- Base de datos activa: PostgreSQL
- SQLite quedó relegado a la etapa anterior y ya no es la ruta principal
- Auth delegada: NextAuth con Google y GitHub
- Pagos: Stripe Checkout + webhook
- Validación y sanitización: Zod + sanitize-html

## Scripts

- `npm run dev`: entorno local
- `npm run build`: build de producción
- `npm run start`: servir build
- `npm run lint`: ESLint CLI
- `npm run typecheck`: chequeo estricto de tipos
- `npm run test`: tests
- `npm run db:generate`: generar cliente Prisma para SQLite
- `npm run db:push`: sincronizar esquema PostgreSQL activa
- `npm run db:migrate`: crear/aplicar migraciones sobre PostgreSQL activa
- `npm run db:seed`: poblar catálogo local sobre PostgreSQL
- `npm run db:generate:pg`: generar cliente Prisma usando esquema PostgreSQL
- `npm run db:push:pg`: sincronizar esquema PostgreSQL
- `npm run db:migrate:pg`: migraciones dev sobre PostgreSQL
- `npm run db:seed:pg`: poblar PostgreSQL
- `GET /api/readiness`: readiness estricto para despliegue y probes

## Variables de entorno

Copia `.env.example` a `.env` y completa:

- `DATABASE_URL`: SQLite local por defecto
- `DATABASE_URL`: PostgreSQL activo del proyecto
- `.env.production.example`: base recomendada para producción real
- `NEXTAUTH_SECRET`: secreto real
- `NEXTAUTH_URL`: URL base de la app
- `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`: OAuth Google
- `ADMIN_EMAILS`: correos con rol admin separados por coma
- `STRIPE_SECRET_KEY`: clave privada Stripe
- `STRIPE_WEBHOOK_SECRET`: firma del webhook
- `INTERNAL_JOB_SECRET`: token bearer para el endpoint interno de reconciliación
- `NEXT_PUBLIC_APP_URL`: URL pública usada por Stripe
- `SENTRY_DSN`: captura opcional de errores en producción
- `ALERT_WEBHOOK_URL`: webhook opcional para alertas críticas
- `ALERT_WEBHOOK_BEARER_TOKEN`: bearer opcional para el webhook de alertas

## Auth

No hay formulario manual de registro. El flujo es deliberado:

- el usuario entra con OAuth;
- la cuenta se crea automáticamente en el primer acceso;
- en accesos siguientes solo inicia sesión.

Eso reduce superficie de ataque y evita gestionar contraseñas propias.

## Admin

Los accesos admin solo aparecen para usuarios autenticados con rol `ADMIN`.

Rutas principales:

- `/admin/products`
- `/admin/categories`
- `/admin/orders`

## Soporte operativo

- `/orders/[id]` ahora incluye timeline operativo del pedido
- `/admin/observability` agrupa errores y muestra auditoría admin reciente
- `GET /api/admin/export/orders` exporta timestamps operativos, estado de pago y dirección
- `GET /api/admin/export/logs?orderId=<id>` permite exportar eventos de una orden concreta

## Pagos y reconciliación

El checkout con Stripe crea una orden pendiente y la confirma por dos vías:

- retorno del checkout en `/checkout/success`
- webhook `POST /api/payments/webhook`

Eventos de Stripe esperados en producción:

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `payment_intent.succeeded`

`payment_intent.succeeded` queda registrado para trazabilidad operativa. La confirmación comercial del pedido sigue apoyándose en `checkout.session.completed`.

Además existe un endpoint interno para expirar órdenes pendientes vencidas:

- `POST /api/internal/orders/reconcile`
- Header requerido: `Authorization: Bearer <INTERNAL_JOB_SECRET>`

Ese endpoint está pensado para un cron externo.

## PostgreSQL local y producción

Scripts operativos añadidos:

- `npm run ops:pg:wait`: espera a que Postgres acepte conexiones
- `npm run ops:pg:backup`: genera backup `.dump`
- `npm run ops:pg:restore -- <archivo>`: restaura un backup
- `npm run ops:pg:restore:verify -- <archivo>`: restaura el dump en una base temporal y valida que sea utilizable
- `npm run ops:check:env`: valida variables mínimas de producción
- `npm run ops:orders:reconcile`: ejecuta manualmente la reconciliación de órdenes pendientes
- `npm run ops:smoke`: ejecuta smoke checks básicos contra health, readiness y reconciliación

Setup local activo:

1. levanta Postgres con `docker compose up -d`
2. espera salud con `npm run ops:pg:wait`
3. verifica que `DATABASE_URL` apunte al valor PostgreSQL
4. ejecuta `npm run db:generate`
5. ejecuta `npm run db:migrate`
6. ejecuta `npm run db:seed`

Runbook mínimo de despliegue:

1. valida env con `npm run ops:check:env`
2. genera backup con `npm run ops:pg:backup`
3. valida el backup con `npm run ops:pg:restore:verify -- .backups/<archivo>.dump`
4. aplica `npm run db:generate`
5. aplica `npm run db:migrate`
6. construye con `npm run build`
7. verifica `GET /api/health` y `GET /api/readiness`
8. ejecuta `npm run ops:smoke`
9. si algo falla, restaura con `npm run ops:pg:restore -- .backups/<archivo>.dump`

Cron mínimo recomendado:

- ejecuta `npm run ops:orders:reconcile` cada 5 minutos
- ese script llama `POST /api/internal/orders/reconcile`
- necesita `INTERNAL_JOB_SECRET` y `NEXT_PUBLIC_APP_URL` o `NEXTAUTH_URL`

La respuesta de `GET /api/health` también expone un bloque `readiness` con variables faltantes y la URL esperada del job interno.

Los scripts `ops:pg:*` usan binarios locales de PostgreSQL si existen. Si no, hacen fallback al contenedor `atelier-commerce-postgres` por `docker exec`, que es la ruta local recomendada en este repo.

`GET /api/readiness` devuelve `503` cuando la app no está lista para producción. En particular falla si:

- falta un secreto o URL crítica
- no hay ningún proveedor OAuth configurado
- `DATABASE_URL` sigue apuntando a SQLite
- Stripe está incompleto
- `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` no coinciden
- `E2E_STRIPE_MODE=mock` sigue activo fuera de entorno local
- `NEXTAUTH_SECRET` o `INTERNAL_JOB_SECRET` son débiles
- las URLs públicas no usan HTTPS
- Stripe usa una clave `sk_test_` en un entorno `production`

## Monitoreo y alertas

El repo ya deja preparada esta base operativa:

- logs estructurados con `requestId`
- observabilidad persistida en base de datos
- alertas opcionales por webhook cuando ocurre un error crítico (`ALERT_WEBHOOK_URL`)
- preparación para Sentry a través de `SENTRY_DSN`

Qué debes activar en un entorno real:

1. un error tracker externo como Sentry
2. un webhook de alertas para checkout, webhook de Stripe y reconciliación
3. probes externos a `/api/health` y `/api/readiness`

## Smoke test real recomendado

Antes de abrir tráfico real:

1. login con OAuth real
2. navegación de catálogo y PDP
3. agregar productos al carrito
4. checkout con Stripe
5. verificación de creación de orden en base de datos
6. revisión del detalle de orden
7. refund desde admin
8. return desde admin
9. ejecución manual del job `ops:orders:reconcile`

El proyecto ya usa PostgreSQL como datasource principal.
