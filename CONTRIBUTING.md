# 🤝 Cómo contribuir

Gracias por contribuir a Atelier Commerce.

La meta de este documento es que cualquier desarrollador pueda entrar rápido al proyecto, trabajar con criterio y no romper una base que ya tiene flujos sensibles de e-commerce.

## Flujo recomendado

1. Haz fork del repositorio o trabaja sobre una rama del repo principal si tienes acceso.
2. Crea una rama nueva a partir de `master`.
3. Trabaja en cambios acotados y con intención clara.
4. Ejecuta validaciones locales antes de abrir PR.
5. Abre un Pull Request con contexto técnico suficiente.

## Naming convention de ramas

Usa prefijos claros:

- `feature/...` para nuevas funcionalidades
- `fix/...` para correcciones
- `chore/...` para mantenimiento, tooling o dependencias
- `refactor/...` para refactors sin cambio funcional
- `docs/...` para documentación
- `test/...` para trabajo enfocado en testing

Ejemplos:

- `feature/product-search`
- `fix/stripe-webhook-retry`
- `chore/update-prisma`

## 🛠️ Setup local

### Requisitos

- Node.js compatible con el proyecto
- npm
- Docker
- PostgreSQL local vía `docker compose`

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

La app correrá en:

```text
http://localhost:3000
```

## Variables de entorno

No reutilices valores reales de producción.

Trabaja siempre a partir de:

- `.env.example`
- `.env.production.example`

Si vas a probar auth o Stripe, usa credenciales de desarrollo o test.

## 📦 Convenciones de código

## Estructura del proyecto

- `app/`: páginas, layouts y Route Handlers
- `components/`: componentes reutilizables
- `lib/`: lógica de dominio, servicios, permisos, pagos, auth, validaciones
- `prisma/`: esquema, migraciones y seed
- `tests/`: unit/integration tests
- `e2e/`: tests end-to-end

## Naming de archivos

- usa nombres descriptivos y consistentes
- componentes React en `kebab-case.tsx` o siguiendo el patrón ya existente del repo
- evita nombres ambiguos como `helpers2.ts`, `utils-new.ts`, `test-final.ts`

## TypeScript

- el proyecto usa TypeScript estricto
- no uses `any` sin justificación real
- tipa props, payloads, responses y utilidades
- si introduces validación de entrada, usa los validators existentes o sigue el patrón actual con `Zod`

## Organización de componentes

- UI pura en `components/*`
- lógica de negocio en `lib/*`
- no mezcles reglas críticas dentro de componentes si deben vivir en servidor
- evita duplicar componentes cuando una variante o composición es suficiente

## 🧪 Testing

## Cómo correr tests

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

## Cuándo escribir tests

Escribe o ajusta tests cuando toques:

- lógica de órdenes
- checkout o Stripe
- auth y permisos
- validaciones
- rutas API críticas
- panel admin
- UX sensible que ya tenga cobertura E2E o de componentes

## Buenas prácticas

- prueba el caso feliz y al menos un caso de error
- si tocas permisos, añade cobertura explícita de acceso/denegación
- si tocas checkout, valida que no rompa `build` ni `e2e`
- no cambies snapshots o asserts sin entender por qué fallaban

## 🔀 Pull Requests

## Qué debe incluir un PR

- objetivo del cambio
- contexto suficiente para entender por qué se hizo
- alcance real
- riesgos o trade-offs
- capturas si hay cambios relevantes de UI

## Checklist mínimo antes de abrir PR

- `npm run lint` pasa
- `npm run typecheck` pasa
- `npm run test` pasa
- `npm run build` pasa
- `npm run e2e` pasa si el cambio toca flujos críticos o UI sensible
- no hay secretos ni credenciales reales en el diff
- el cambio está acotado al objetivo del PR

## 🚫 Qué NO hacer

- no subir secretos, tokens o credenciales
- no commitear `.env` con valores reales
- no romper build o tests para “arreglarlo luego”
- no meter refactors grandes junto con cambios funcionales pequeños
- no modificar lógica crítica de pagos, auth u órdenes sin entender el flujo completo
- no ignorar validaciones server-side existentes
- no introducir dependencias nuevas sin una razón clara

## 🧠 Estilo de commits

Usa mensajes cortos, claros y consistentes.

Formato recomendado:

```text
tipo: descripción corta
```

Ejemplos:

- `feat: add product filtering`
- `fix: resolve checkout bug`
- `chore: update dependencies`
- `docs: improve architecture guide`
- `refactor: simplify order status transitions`

Evita:

- `changes`
- `fix stuff`
- `update`
- `final final now`

## 📌 Issues

## Cómo reportar bugs

Incluye siempre:

- descripción clara
- pasos para reproducir
- comportamiento esperado
- comportamiento actual
- entorno afectado
- screenshots o logs si aplica

## Cómo proponer features

Describe:

- problema a resolver
- impacto esperado
- flujo de usuario
- restricciones técnicas si ya las conoces

No abras requests del tipo “agregar X” sin explicar el caso de uso.

## Criterio general

Este proyecto ya tiene pagos, auth, roles y operación administrativa. No es un sandbox cualquiera.

Contribuir bien aquí implica:

- respetar el dominio existente
- no improvisar cambios en flujos sensibles
- validar localmente
- dejar el código más claro, no más frágil
