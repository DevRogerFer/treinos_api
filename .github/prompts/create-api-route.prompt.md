---
description: "Template para criar uma rota de API com use case, schema Zod e handler Fastify"
---

# Criar Rota de API

Crie a rota `{{METHOD}} {{PATH}}`

## Descrição

{{DESCRIÇÃO}}

## Requisitos Técnicos

- Use case deve se chamar "{{NOME_DO_USE_CASE}}".

## Autenticação

- Rota protegida? {{SIM/NÃO}}
- {{REGRAS_DE_ACESSO}}

## Request

```ts
interface Body {
  // {{CAMPOS_DO_BODY}}
}
```

```ts
interface Params {
  // {{PARAMS}}
}
```

```ts
interface Query {
  // {{QUERY}}
}
```

## Response

{{STATUS_CODE}}: {{CAMPOS_DE_RETORNO}}

## Regras de Negócio

{{REGRAS}}
