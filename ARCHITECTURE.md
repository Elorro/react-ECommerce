# 🧠 Visión general del sistema

Atelier Commerce es un e-commerce fullstack construido como un monolito moderno sobre `Next.js App Router`. Resuelve el problema típico de una tienda online de catálogo: descubrimiento de productos, autenticación, carrito, checkout, creación de órdenes, operación administrativa y soporte post-compra.

El objetivo técnico del sistema no es solo renderizar una vitrina, sino concentrar en una misma base:

- experiencia pública de compra
- lógica de negocio crítica del checkout
- persistencia transaccional de órdenes
- administración de catálogo y operación interna
- integración con terceros como Stripe y OAuth

Los módulos principales del sistema son:

- catálogo y storefront
- autenticación y sesiones
- carrito y checkout
- órdenes y lifecycle operativo
- panel administrativo
- pagos con Stripe
- persistencia con Prisma/PostgreSQL
- observabilidad y operación

## 🧱 Arquitectura general

El proyecto sigue un patrón de **monolito fullstack moderno**:

- UI pública y admin en `Next.js App Router`
- Server Components para lectura y composición server-side
- Route Handlers en `app/api/*` para escritura, integraciones y operaciones sensibles
- acceso a datos centralizado vía `Prisma`
- PostgreSQL como sistema de registro

No hay un backend separado ni microservicios. La aplicación concentra frontend, backend HTTP, auth, pagos y operación en una sola unidad desplegable.

### Patrón principal

- render server-first para pantallas de catálogo, cuenta y admin
- mutaciones críticas vía API routes
- lógica de negocio en `lib/*`
- UI reutilizable en `components/*`

### Diagrama conceptual

```text
[Cliente / Navegador]
        ↓
[Next.js App Router]
        ├── Server Components
        ├── Client Components
        ├── Route Handlers (/app/api/*)
        └── Middleware / session guards ligeros
                    ↓
               [Capa de dominio]
        (auth, orders, cart, payments, permissions, observability)
                    ↓
                [Prisma ORM]
                    ↓
           [PostgreSQL / Neon en producción]
                    ↓
        ┌───────────────┴───────────────┐
        │                               │
   [NextAuth OAuth]                [Stripe]
        │                               │
 [Google / GitHub]       [Checkout Session + Webhooks]
```

## 🔄 Flujo de datos

### Flujo catálogo

1. El usuario entra a `/` o `/catalog`.
2. La página usa Server Components para leer productos y categorías desde la capa `lib/catalog.ts`.
3. `lib/catalog.ts` consulta PostgreSQL a través de Prisma.
4. Los datos renderizados llegan ya filtrados/ordenados al cliente.
5. Las interacciones ligeras de UI se resuelven en client components sin recalcular lógica crítica.

### Flujo autenticación

1. El usuario inicia sesión con OAuth desde `/auth/sign-in`.
2. `NextAuth` maneja el handshake con Google/GitHub.
3. Si la cuenta no existe, el adapter Prisma la crea.
4. En el callback de auth se asigna rol según email:
   - `ADMIN_EMAILS`
   - `OPERATIONS_EMAILS`
   - fallback a `CUSTOMER`
5. La sesión queda disponible en server y cliente.
6. Las rutas sensibles verifican sesión y permisos antes de ejecutar acciones.

### Flujo checkout (Stripe)

1. El usuario autenticado avanza desde carrito hacia `/checkout`.
2. El formulario envía el payload a `/api/payments/checkout-session`.
3. El servidor:
   - valida payload
   - recalcula precios y disponibilidad
   - crea una orden pendiente
   - crea una `Stripe Checkout Session`
4. Stripe redirige al usuario a su checkout hospedado.
5. Tras pagar, Stripe redirige de vuelta a `/checkout/success`.

### Flujo webhook → actualización de orden

1. Stripe envía eventos a `/api/payments/webhook`.
2. El servidor valida la firma con `STRIPE_WEBHOOK_SECRET`.
3. Para `checkout.session.completed`, el sistema confirma la orden.
4. Se actualiza:
   - estado de orden
   - estado de pago
   - stock
   - eventos operativos
5. Eventos adicionales (`payment_intent.succeeded`, expiración, fallos async) quedan registrados para trazabilidad.
6. Un job interno puede reconciliar órdenes pendientes expiradas vía `/api/internal/orders/reconcile`.

## 🧩 Módulos principales

### UI / Frontend

Ubicación principal:

- `app/*`
- `components/*`

Responsabilidades:

- renderizar storefront
- componer navegación y layouts
- formularios de checkout y auth
- paneles admin
- feedback visual, loading, empty states, confirmaciones

La UI no decide precios, stock ni permisos críticos. Solo orquesta interacción y consume resultados del backend interno.

### Backend (API / Route Handlers)

Ubicación principal:

- `app/api/*`

Responsabilidades:

- recibir mutaciones
- validar sesión y roles
- validar y sanitizar payloads
- ejecutar lógica de dominio
- hablar con Stripe
- devolver respuestas seguras y operables

Ejemplos:

- `/api/orders`
- `/api/cart`
- `/api/payments/checkout-session`
- `/api/payments/webhook`
- `/api/admin/*`

### Auth (NextAuth)

Ubicación principal:

- `lib/auth.ts`
- `app/api/auth/[...nextauth]/route.ts`

Responsabilidades:

- login OAuth
- persistencia de usuario/sesión
- exposición de sesión a la app
- asignación de rol según configuración de entorno

### Payments (Stripe)

Ubicación principal:

- `lib/payments.ts`
- `lib/orders.ts`
- `app/api/payments/*`

Responsabilidades:

- creación de sesión de checkout
- metadata de pagos/órdenes
- confirmación de pagos
- refunds
- trazabilidad vía webhook

### DB (Prisma)

Ubicación principal:

- `prisma/schema.prisma`
- `lib/db.ts`

Responsabilidades:

- tipado del modelo de datos
- acceso consistente a PostgreSQL
- migraciones
- relaciones y consultas

## 🗄️ Modelo de datos

El sistema está orientado alrededor de usuarios, catálogo, carrito y órdenes.

### Entidades principales

#### User

Representa un usuario autenticado.

Campos relevantes:

- identidad OAuth
- email
- rol
- relaciones con órdenes, cuentas y carrito

#### Product

Representa un producto vendible.

Campos relevantes:

- nombre
- slug
- precio
- stock
- estado
- categoría

#### Category

Agrupa productos para navegación y administración.

Campos relevantes:

- nombre
- slug
- relación 1:N con productos

#### Order

Representa la compra completa.

Campos relevantes:

- usuario
- estado de orden
- estado de pago
- total
- dirección
- referencias a Stripe
- timestamps operativos

#### OrderItem

Línea individual dentro de una orden.

Campos relevantes:

- producto
- precio al momento de compra
- cantidad
- relación N:1 con orden

### Relaciones

```text
User 1 ─── N Order
User 1 ─── 1 Cart
Category 1 ─── N Product
Order 1 ─── N OrderItem
Product 1 ─── N OrderItem
Cart 1 ─── N CartItem
Product 1 ─── N CartItem
Order 1 ─── N OrderNote
```

## 🔐 Seguridad

### Manejo de sesiones

- sesiones delegadas a `NextAuth`
- no hay contraseñas propias
- las pantallas sensibles validan sesión server-side

### Protección de rutas

- páginas de cuenta y órdenes requieren sesión
- rutas admin requieren permisos explícitos
- la autorización real ocurre en el servidor, no en el cliente

### Roles

Modelo actual:

- `CUSTOMER`
- `OPERATIONS`
- `ADMIN`

Los permisos más finos se resuelven en `lib/permissions.ts`.

### Secrets y entorno

Todo secreto vive en variables de entorno:

- NextAuth
- Stripe
- jobs internos
- OAuth

El runtime incluye checks de readiness para detectar:

- secretos débiles
- claves Stripe incorrectas
- URLs no HTTPS en producción
- proveedores OAuth faltantes

## ⚙️ Decisiones técnicas

### Por qué Next.js App Router

Porque permite:

- render server-first
- co-localizar páginas, layouts y APIs
- reducir overhead de un backend separado
- unificar storefront, panel admin y mutaciones críticas

### Por qué Prisma

Porque aporta:

- esquema fuertemente tipado
- cliente consistente para TypeScript
- migraciones controladas
- velocidad de iteración razonable

### Por qué Stripe Checkout y no un checkout custom

Porque Stripe Checkout reduce superficie de riesgo:

- no se manipulan tarjetas directamente
- menos responsabilidad PCI
- mejor time-to-production
- flujos de pago más robustos desde el día uno

### Por qué Vercel

Porque encaja con el modelo del sistema:

- despliegue directo de Next.js
- runtime y build simples
- integración natural con App Router
- menor costo operativo inicial

## ⚠️ Trade-offs

### Monolito fullstack

Ventajas:

- menos moving parts
- onboarding más rápido
- despliegue simple

Costes:

- menor separación dura entre frontend y backend
- el crecimiento organizacional puede pedir segmentación futura

### Checkout hospedado por Stripe

Ventajas:

- seguridad
- robustez
- menos complejidad

Costes:

- menos control sobre la UX final del pago
- dependencia de redirects y webhook

### Roles por email

Ventajas:

- implementación simple y auditables

Costes:

- modelo menos flexible que un RBAC completo gestionado por UI

### Observabilidad básica

Ventajas:

- logs estructurados y persistencia inicial

Costes:

- aún no equivale a observabilidad enterprise
- depende de mejoras futuras como Sentry/alerting más formal

## 📈 Escalabilidad

Si el tráfico crece, las primeras zonas a tensionarse serían:

1. consultas de catálogo y admin con más volumen
2. operación intensiva de órdenes y logs operativos
3. throughput de webhook/reconciliación
4. jobs de soporte y auditoría

### Qué escala primero

- PostgreSQL/Neon: índices, tuning, pool de conexiones
- capa de lectura de catálogo: caché y estrategias de revalidación
- observabilidad: mover de logging básico a error tracking y alerting externos
- cron/reconciliación: posiblemente migrar a jobs más robustos o colas

### Qué no debería escalar primero

- split en microservicios
- separación prematura de backend

Ese costo no se justifica en esta etapa.

## 🔍 Observabilidad (actual y futura)

### Estado actual

Existe:

- logging estructurado con `requestId`
- eventos operativos persistidos
- endpoint de health
- endpoint de readiness
- alertas opcionales por webhook

Ubicación relevante:

- `lib/logger.ts`
- `lib/observability.ts`
- `app/api/health/route.ts`
- `app/api/readiness/route.ts`

### Mejoras sugeridas

- integrar Sentry de forma formal
- alertas más ricas por severidad
- métricas de negocio y pago
- dashboards externos
- correlación entre request, orden y evento Stripe

## 🧪 Testing strategy

### Qué se testea

- validaciones y utilidades
- lógica de órdenes
- permisos
- rutas API críticas
- panel admin a nivel de componentes
- flujos E2E:
  - carrito
  - checkout
  - acceso admin por rol

### Qué falta o sigue siendo útil ampliar

- más E2E de refund/return en entorno realista
- smoke tests automatizados post-deploy
- pruebas de carga en checkout/webhook
- escenarios de fallo más agresivos con Stripe real/test

## 📌 Resumen técnico

Atelier Commerce está construido como un monolito moderno orientado a producción:

- UI y APIs en Next.js
- dominio encapsulado en `lib/*`
- persistencia en Prisma/PostgreSQL
- auth delegada a NextAuth
- pagos delegados a Stripe Checkout
- operación interna integrada en el mismo sistema

La arquitectura prioriza:

- simplicidad operativa
- seguridad razonable
- velocidad de evolución
- una base clara para seguir creciendo sin reescribir el sistema desde cero
