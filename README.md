# Bootcamp Treinos API

API RESTful para gerenciamento de treinos, construída com **Fastify 5**, **TypeScript**, **Prisma 7** e **Better-Auth**. Permite criar planos de treino, registrar sessões, acompanhar estatísticas e interagir com um personal trainer via IA.

## Tecnologias

| Tecnologia      | Versão | Descrição                           |
| --------------- | ------ | ----------------------------------- |
| **Node.js**     | 24.x   | Runtime JavaScript                  |
| **pnpm**        | 10.28+ | Gerenciador de pacotes              |
| **Fastify**     | 5.7    | Framework HTTP de alta performance  |
| **TypeScript**  | 5.9    | Tipagem estática                    |
| **Prisma**      | 7.4    | ORM para PostgreSQL                 |
| **PostgreSQL**  | 16     | Banco de dados relacional           |
| **Better-Auth** | 1.4    | Autenticação baseada em sessão      |
| **Zod**         | 4.3    | Validação de schemas                |
| **AI SDK**      | 6.0    | Integração com OpenAI (GPT-4o-mini) |
| **Scalar**      | —      | Documentação interativa da API      |
| **Day.js**      | 1.11   | Manipulação de datas                |
| **Docker**      | —      | Containerização                     |

## Pré-requisitos

- [Node.js 24.x](https://nodejs.org/)
- [pnpm 10.28+](https://pnpm.io/)
- [Docker](https://www.docker.com/) (para o PostgreSQL)

## Configuração

### 1. Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=8081
DATABASE_URL=postgresql://postgres:password@localhost:5432/bootcamp-treinos-api
BETTER_AUTH_SECRET=sua-chave-secreta
API_BASE_URL=http://localhost:8081
WEB_APP_BASE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret
OPENAI_API_KEY=sua-openai-api-key          # opcional
NODE_ENV=development                        # development | production | test
```

### 2. Banco de dados

```bash
docker-compose up -d
```

### 3. Dependências e migrations

```bash
pnpm install
pnpm exec prisma migrate dev
```

### 4. Iniciar o servidor

```bash
pnpm dev
```

O servidor estará disponível em `http://localhost:8081`.

## Documentação da API

| URL             | Descrição                     |
| --------------- | ----------------------------- |
| `/docs`         | Interface interativa (Scalar) |
| `/swagger.json` | Especificação OpenAPI         |

## Arquitetura

O projeto segue o padrão em camadas **Routes → Use Cases → Prisma**:

```
src/
├── index.ts              # Bootstrap do servidor Fastify
├── routes/               # Handlers HTTP (validação, auth, status codes)
├── usecases/             # Lógica de negócio (uma classe por caso de uso)
├── schemas/              # Schemas Zod compartilhados
├── errors/               # Classes de erro customizadas
├── lib/                  # Configurações (auth, db, env)
└── generated/prisma/     # Tipos gerados pelo Prisma (gitignored)
```

## Endpoints

Todas as rotas (exceto auth) requerem autenticação via sessão.

### Autenticação (`/api/auth/*`)

Gerenciada pelo Better-Auth com login social via Google.

### Home (`/home`)

| Método | Rota     | Descrição                                                             |
| ------ | -------- | --------------------------------------------------------------------- |
| `GET`  | `/:date` | Dados da página inicial (treino do dia, streak, consistência semanal) |

### Planos de Treino (`/workout-plans`)

| Método  | Rota                                       | Descrição                                                 |
| ------- | ------------------------------------------ | --------------------------------------------------------- |
| `GET`   | `/`                                        | Lista planos de treino (filtro opcional `?active=true`)   |
| `POST`  | `/`                                        | Cria um novo plano de treino completo (dias + exercícios) |
| `GET`   | `/:id`                                     | Detalhes de um plano de treino                            |
| `GET`   | `/:planId/days/:dayId`                     | Detalhes de um dia de treino com exercícios e sessões     |
| `POST`  | `/:planId/days/:dayId/sessions`            | Inicia uma sessão de treino                               |
| `PATCH` | `/:planId/days/:dayId/sessions/:sessionId` | Conclui uma sessão de treino                              |

### Perfil (`/me`)

| Método | Rota | Descrição                                                 |
| ------ | ---- | --------------------------------------------------------- |
| `GET`  | `/`  | Dados físicos do usuário (peso, altura, idade, % gordura) |
| `PUT`  | `/`  | Cria ou atualiza dados físicos do usuário                 |

### Estatísticas (`/stats`)

| Método | Rota          | Descrição                                                                      |
| ------ | ------------- | ------------------------------------------------------------------------------ |
| `GET`  | `/?from=&to=` | Estatísticas do período (streak, consistência, taxa de conclusão, tempo total) |

### IA (`/ai`)

| Método | Rota | Descrição                                        |
| ------ | ---- | ------------------------------------------------ |
| `POST` | `/`  | Chat com personal trainer IA via streaming (SSE) |

O assistente de IA pode consultar dados do usuário, listar planos existentes e criar novos planos de treino através da conversa.

## Modelo de Dados

```
User ─────────── WorkoutPlan ─────── WorkoutDay ─────── WorkoutExercise
  │                                       │
  │                                       └──────────── WorkoutSession
  │
  ├── Session
  ├── Account
  └── Verification
```

### Principais entidades

- **User** — Usuário com dados físicos opcionais (peso, altura, idade, % gordura corporal)
- **WorkoutPlan** — Plano de treino (apenas um ativo por vez)
- **WorkoutDay** — Dia da semana com exercícios ou descanso
- **WorkoutExercise** — Exercício com séries, repetições e tempo de descanso
- **WorkoutSession** — Sessão de treino com horários de início e conclusão

## Casos de Uso

| Caso de Uso              | Descrição                                                                  |
| ------------------------ | -------------------------------------------------------------------------- |
| `CreateWorkoutPlan`      | Cria plano completo (dias + exercícios) e desativa o anterior atomicamente |
| `GetHomeData`            | Busca plano ativo, treino do dia, streak e consistência semanal            |
| `GetWorkoutPlan`         | Retorna detalhes de um plano com contagem de exercícios por dia            |
| `GetWorkoutDay`          | Retorna dia de treino com exercícios e histórico de sessões                |
| `ListWorkoutPlans`       | Lista planos com filtro opcional por status ativo                          |
| `StartWorkoutSession`    | Inicia sessão validando ownership e plano ativo                            |
| `CompleteWorkoutSession` | Conclui sessão com validações de ownership e existência                    |
| `GetStats`               | Calcula streak, consistência, taxa de conclusão e tempo total              |
| `GetUserTrainData`       | Retorna dados físicos do usuário                                           |
| `UpsertUserTrainData`    | Cria ou atualiza dados físicos do usuário                                  |

## Scripts

| Comando                        | Descrição                                                  |
| ------------------------------ | ---------------------------------------------------------- |
| `pnpm dev`                     | Servidor de desenvolvimento com hot-reload                 |
| `pnpm build`                   | Build de produção (gera tipos Prisma + compila TypeScript) |
| `pnpm exec prisma migrate dev` | Executa migrations pendentes                               |
| `pnpm exec prisma generate`    | Gera tipos do Prisma                                       |
| `pnpm exec eslint .`           | Lint com ESLint                                            |
| `pnpm exec prettier --write .` | Formatação de código                                       |

## Docker

### Desenvolvimento (apenas PostgreSQL)

```bash
docker-compose up -d
```

### Produção (API completa)

O projeto inclui um `Dockerfile` multi-stage otimizado:

```bash
docker build -t bootcamp-treinos-api .
docker run -p 8081:8081 --env-file .env bootcamp-treinos-api
```

## Tratamento de Erros

A API utiliza classes de erro customizadas mapeadas para status HTTP:

| Classe                      | Status HTTP |
| --------------------------- | ----------- |
| `NotFoundError`             | 404         |
| `ForbiddenError`            | 403         |
| `ConflictError`             | 409         |
| `WorkoutPlanNotActiveError` | 403         |
