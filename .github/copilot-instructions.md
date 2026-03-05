# Project Guidelines

## Visao Geral

API de treinos construida com Fastify 5, TypeScript, Prisma 7 e Better-Auth. Roda em Node.js 24.x com pnpm 10.30.0 (ambos obrigatorios via `engine-strict`).

## Comandos

- `pnpm dev` — Servidor de desenvolvimento (hot-reload na porta 8081)
- `docker-compose up -d` — Iniciar PostgreSQL
- `pnpm exec prisma migrate dev` — Rodar migrations
- `pnpm exec prisma generate` — Gerar tipos do Prisma
- `pnpm exec eslint .` — Lint
- `pnpm exec prettier --write .` — Formatacao

Nao ha script de build ou teste configurado ainda. TypeScript compila para `./dist` via `tsc`.

## Arquitetura

Padrao em camadas: **Routes → Use Cases → Prisma**

- **Routes** (`src/routes/`) — Handlers Fastify. Registram schemas Zod via `fastify-type-provider-zod`. Extraem sessao de autenticacao e definem status HTTP.
- **Use Cases** (`src/usecases/`) — Logica de negocio. Recebem DTOs, usam transacoes Prisma para atomicidade. Uma classe por caso de uso.
- **Schemas** (`src/schemas/`) — Schemas Zod compartilhados entre rotas e OpenAPI docs.
- **Errors** (`src/errors/`) — Classes de erro customizadas (ex: `NotFoundError`) usadas nos use cases e tratadas nas rotas.

### Autenticacao

Better-Auth com adaptador Prisma (`src/lib/auth.ts`). Rotas de auth em `/api/auth/*`. Autenticacao baseada em sessao — rotas extraem sessao via `auth.api.getSession()`.

### Banco de Dados

PostgreSQL 16 via Docker. Prisma client em `src/lib/db.ts`. Tipos gerados em `src/generated/prisma/` (gitignored). Schema em `prisma/schema.prisma`.

### Documentacao da API

Swagger JSON em `/swagger.json`, Scalar UI em `/docs`. Endpoints de auth mesclados no spec OpenAPI via plugin do Better-Auth.

## Convencoes

- **TypeScript strict** com target ES2024 e module resolution `nodenext`
- **Zod 4** para validacao — usar `z.interface()`, nao `z.object()`
- **Imports ordenados** via `simple-import-sort`
- **CORS** permite `http://localhost:3000` com credentials
- Variaveis de ambiente: `PORT`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
