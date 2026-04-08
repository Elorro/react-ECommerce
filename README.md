# 🧾 Atelier Commerce

Atelier Commerce es un e-commerce fullstack construido con `Next.js`, `TypeScript`, `Prisma`, `PostgreSQL`, `NextAuth` y `Stripe`.

Está pensado como una base profesional para una tienda online moderna: catálogo, carrito, checkout, órdenes, panel administrativo, autenticación delegada y despliegue en Vercel.

## 🚀 Features principales

- Autenticación con OAuth usando `NextAuth`
- Roles de usuario (`CUSTOMER`, `OPERATIONS`, `ADMIN`)
- Catálogo de productos y categorías
- Carrito híbrido:
  - anónimo en navegador
  - persistente para usuarios autenticados
- Checkout con `Stripe Checkout`
- Webhooks de Stripe para confirmación y trazabilidad
- Gestión de órdenes
- Reembolsos y devoluciones desde panel interno
- Panel admin para productos, categorías y órdenes
- Base de datos con `Prisma` sobre `PostgreSQL`
- Preparado para despliegue en `Vercel`
- Testing unitario/integración y E2E

## 🏗️ Arquitectura

### Stack

- Frontend: `Next.js 16` con `App Router`
- Backend: Route Handlers en `app/api/*`
- Base de datos: `PostgreSQL` (Neon en producción) + `Prisma`
- Auth: `NextAuth` con OAuth
- Pagos: `Stripe Checkout` + webhooks
- Estilos: `Tailwind CSS`
- Hosting: `Vercel`
- Testing: `Vitest` + `Playwright`

### Cómo interactúan los componentes

1. El usuario navega catálogo y detalle de producto desde `app/`.
2. El carrito se gestiona desde cliente, pero las validaciones críticas viven en servidor.
3. El checkout crea una orden pendiente en base de datos y genera una sesión de Stripe.
4. Stripe redirige al usuario y además notifica por webhook.
5. El backend confirma el pago, actualiza el estado de la orden y registra eventos operativos.
6. Los usuarios autenticados consultan sus órdenes desde la cuenta.
7. Los usuarios `ADMIN` y `OPERATIONS` operan órdenes desde el panel interno.

## 🧩 Estructura del proyecto

```text
.
├── app/
│   ├── admin/
│   ├── api/
│   ├── auth/
│   ├── cart/
│   ├── catalog/
│   ├── checkout/
│   ├── orders/
│   ├── account/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin/
│   ├── auth/
│   ├── layout/
│   ├── store/
│   └── ui/
├── lib/
│   ├── validators/
│   ├── auth.ts
│   ├── cart.ts
│   ├── catalog.ts
│   ├── db.ts
│   ├── logger.ts
│   ├── observability.ts
│   ├── order-status.ts
│   ├── orders.ts
│   ├── payments.ts
│   ├── permissions.ts
│   └── runtime-config.ts
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   ├── schema.postgres.prisma
│   └── seed.ts
├── public/
├── scripts/
├── tests/
├── e2e/
├── package.json
└── next.config.ts
```

### Directorios clave

#### `/app`

Contiene las pantallas, layouts y Route Handlers del proyecto.

- rutas públicas: home, catálogo, carrito, checkout
- rutas autenticadas: cuenta, órdenes
- rutas administrativas: `/admin/*`
- API interna: `/api/*`

#### `/components`

Componentes reutilizables de UI y composición.

- `store/`: catálogo, carrito, checkout
- `admin/`: tablas, soporte de órdenes, paneles internos
- `auth/`: login, estado de sesión
- `layout/`: header, footer
- `ui/`: componentes base como notices, dialogs, skeletons, toasts

#### `/lib`

Lógica de dominio y servicios del sistema.

- acceso a base de datos
- auth y permisos
- pagos
- lifecycle de órdenes
- observabilidad
- validaciones

#### `/prisma`

Fuente de verdad del modelo de datos.

- esquema principal
- migraciones
- seed de desarrollo

#### `/app/api`

Endpoints server-side del sistema:

- auth
- carrito
- órdenes
- checkout con Stripe
- webhooks
- reconciliación
- admin

## ⚙️ Configuración del entorno

### Variables de entorno necesarias

Usa `.env.example` o `.env.production.example` como referencia.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"
DATABASE_URL_POSTGRES="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public"

NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="tu-secreto-largo-y-seguro"
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"

AUTH_GOOGLE_ID="google-oauth-client-id"
AUTH_GOOGLE_SECRET="google-oauth-client-secret"
AUTH_GITHUB_ID="github-oauth-client-id"
AUTH_GITHUB_SECRET="github-oauth-client-secret"

ADMIN_EMAILS="admin@tu-dominio.com"
OPERATIONS_EMAILS="ops@tu-dominio.com"

STRIPE_SECRET_KEY="sk_live_o_sk_test"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

INTERNAL_JOB_SECRET="token-largo-para-jobs-internos"

SENTRY_DSN=""
ALERT_WEBHOOK_URL=""
ALERT_WEBHOOK_BEARER_TOKEN=""

E2E_TEST_SECRET=""
```

### Qué hace cada variable

- `DATABASE_URL`: conexión principal a PostgreSQL
- `DATABASE_URL_POSTGRES`: conexión explícita usada en validaciones/runtime checks
- `NEXTAUTH_URL`: URL base usada por NextAuth
- `NEXTAUTH_SECRET`: firma segura para sesiones y tokens
- `NEXT_PUBLIC_APP_URL`: URL pública usada por frontend y Stripe
- `AUTH_GOOGLE_*`: credenciales OAuth de Google
- `AUTH_GITHUB_*`: credenciales OAuth de GitHub
- `ADMIN_EMAILS`: correos que reciben rol `ADMIN`
- `OPERATIONS_EMAILS`: correos que reciben rol `OPERATIONS`
- `STRIPE_SECRET_KEY`: clave privada de Stripe
- `STRIPE_WEBHOOK_SECRET`: firma del webhook de Stripe
- `INTERNAL_JOB_SECRET`: token requerido para reconciliación interna
- `SENTRY_DSN`: captura de errores en producción
- `ALERT_WEBHOOK_URL`: webhook opcional para alertas operativas
- `ALERT_WEBHOOK_BEARER_TOKEN`: bearer opcional para el webhook de alertas
- `E2E_TEST_SECRET`: secreto para helpers de test end-to-end

## 🗄️ Base de datos

El proyecto usa `Prisma` como ORM y `PostgreSQL` como base principal.

### Prisma

Archivos principales:

- [schema.prisma](/home/elorro/Projects/react-ECommerce/prisma/schema.prisma)
- [schema.postgres.prisma](/home/elorro/Projects/react-ECommerce/prisma/schema.postgres.prisma)
- [seed.ts](/home/elorro/Projects/react-ECommerce/prisma/seed.ts)

### Migraciones

Desarrollo:

```bash
npm run db:migrate
```

Producción:

```bash
npx prisma migrate deploy
```

### Seed

El seed carga categorías y productos base.

```bash
npm run db:seed
```

## 🔐 Autenticación y roles

### Cómo funciona NextAuth

La autenticación está delegada a proveedores OAuth.

Flujo:

1. el usuario inicia sesión con Google o GitHub
2. si es la primera vez, se crea su cuenta automáticamente
3. en ingresos posteriores se reutiliza la cuenta existente

No existe registro manual por formulario ni manejo propio de contraseñas.

### Roles

El sistema trabaja con estos roles:

- `CUSTOMER`: compra y consulta sus órdenes
- `OPERATIONS`: opera órdenes y soporte
- `ADMIN`: acceso total a panel administrativo

### Cómo se determina admin vs user

El rol se deriva principalmente del correo autenticado:

- si el correo está en `ADMIN_EMAILS` -> `ADMIN`
- si el correo está en `OPERATIONS_EMAILS` -> `OPERATIONS`
- si no, queda como `CUSTOMER`

### Cómo configurar un usuario admin

Ejemplo:

```env
ADMIN_EMAILS="admin@tu-dominio.com,otra-admin@tu-dominio.com"
```

## 💳 Pagos con Stripe

### Flujo de pago

1. el usuario inicia checkout
2. el backend crea una orden pendiente
3. el backend crea una sesión de `Stripe Checkout`
4. el usuario paga en Stripe
5. Stripe redirige de vuelta a la app
6. Stripe también dispara un webhook
7. el backend confirma el pago y actualiza la orden

### Eventos relevantes

- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_failed`
- `payment_intent.succeeded`

### Test vs producción

- `sk_test_*`: entorno de pruebas
- `sk_live_*`: producción real

Nunca mezcles secretos test y live con dominios productivos.

## 🔔 Webhooks

### Endpoint

El proyecto usa:

```text
/api/payments/webhook
```

### Cómo configurarlo en Stripe

1. entra al dashboard de Stripe
2. crea un webhook apuntando a:

```text
https://tu-dominio.com/api/payments/webhook
```

3. selecciona los eventos necesarios:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `checkout.session.async_payment_failed`
   - `payment_intent.succeeded`

4. copia el signing secret y guárdalo como:

```env
STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

## 🧪 Testing

### Qué tests existen

- unit tests con `Vitest`
- integration tests para rutas y lógica de dominio
- E2E con `Playwright`

### Cómo ejecutarlos

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

## 🚀 Deploy

### Cómo desplegar en Vercel

1. conecta el repo en Vercel
2. configura las variables de entorno del proyecto
3. asegúrate de usar PostgreSQL real (Neon en producción)
4. configura OAuth con el dominio real
5. configura Stripe con el dominio real y webhook real

### Variables en Vercel

Carga al menos:

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

### Consideraciones importantes

- `GET /api/readiness` devuelve `503` si el entorno no está listo
- `ops:check:env` valida configuración mínima
- producción exige HTTPS y secretos fuertes

## 🛠️ Desarrollo local

### Pasos

```bash
npm install
cp .env.example .env
docker compose up -d
npm run ops:pg:wait
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

La app quedará disponible en:

```text
http://localhost:3000
```

## ⚠️ Consideraciones importantes

- El proyecto usa `overrides` en `package.json` para fijar dependencias transitivas vulnerables sin romper el stack.
- `vite` existe solo en tooling de desarrollo/test, no como runtime productivo del e-commerce.
- Stripe puede operar en modo test o live, pero el entorno productivo debe usar claves `live`.
- El sistema incluye validaciones de readiness para evitar despliegues inseguros.
- Los scripts operativos de PostgreSQL soportan fallback al contenedor Docker local.

## 📌 Roadmap / mejoras futuras

- integración formal con Sentry
- alerting más completo y externo
- dashboards de observabilidad más ricos
- más cobertura E2E para flujos administrativos
- mejoras adicionales de UX comercial
- mayor automatización de despliegue y smoke tests

## 📄 Scripts útiles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run e2e

npm run db:generate
npm run db:migrate
npm run db:seed

npm run ops:check:env
npm run ops:pg:backup
npm run ops:pg:restore -- <archivo>
npm run ops:pg:restore:verify -- <archivo>
npm run ops:orders:reconcile
npm run ops:smoke
```
