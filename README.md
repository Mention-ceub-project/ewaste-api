# E-Waste API

API da plataforma E-Waste (NestJS + Prisma + PostgreSQL + JWT): autenticação,
pontos de coleta, descartes, gamificação, impacto ambiental e notificações.

## Pré-requisitos

- Node.js 18+
- Docker (para o banco) — ou um PostgreSQL já instalado

## Como rodar

```bash
# 1. Instalar as dependências
npm install

# 2. Subir o PostgreSQL com Docker
docker compose up -d

# 3. Criar o arquivo .env a partir do exemplo
cp .env.example .env
#    (edite o .env e troque o JWT_SECRET por um valor aleatório)

# 4. Gerar o Prisma Client e criar as tabelas
npx prisma generate
npx prisma migrate dev --name init

# 5. Rodar a API em modo desenvolvimento
npm run start:dev
```

A API sobe em `http://localhost:3000`.

## Arquitetura

Cada módulo de `src/` segue as mesmas camadas:

```
Controller (rotas + guards + validação Zod)
   → Service (regras de negócio)
      → Repository (classe abstrata)
         → PrismaXRepository (implementação)
```

Os *schemas* Zod e os *mappers* de resposta ficam em `dto/`. Os services dependem
da abstração do repositório, então dá para trocar a implementação (ou usar um fake
nos testes) sem mexer na regra de negócio.

## Papéis

| Papel | O que faz |
|-------|-----------|
| `DESCARTADOR` | Registra descartes, acompanha pontuação e impacto |
| `MEMBRO_ONG` | Gerencia pontos de coleta e confirma entregas |
| `ADMIN` | Catálogo de materiais, papéis de usuário e visão geral |

## Rotas

| Base | Rotas |
|------|-------|
| `/auth` | `POST /register`, `POST /login`, `POST /logout`, `GET /me` |
| `/usuarios` | `GET /me`, `PATCH /me`, `GET /`, `GET /:id`, `PATCH /:id/papel` |
| `/materiais` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `/pontos-coleta` | `GET /`, `GET /:id`, `GET /:id/metricas`, `POST /`, `PATCH /:id`, `PUT /:id/materiais`, `DELETE /:id` |
| `/enderecos` | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `/entregas` | `POST /`, `GET /`, `GET /pendentes`, `GET /:id`, `PATCH /:id/confirmar`, `PATCH /:id/cancelar` |
| `/gamificacao` | `GET /me`, `GET /ranking`, `GET /historico` |
| `/impacto` | `GET /me`, `GET /geral` |
| `/notificacoes` | `GET /`, `PATCH /lidas`, `PATCH /:id/lida` |

Detalhes de payloads, permissões e regras de cálculo: `docs-ewaste/Backend/DOCS.md`.

## Testando com curl

```bash
# Cadastrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nomeCompleto":"Pedro","email":"pedro@email.com","senha":"123456"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pedro@email.com","senha":"123456"}'

# Dados do usuário logado (troque SEU_TOKEN pelo accessToken retornado)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer SEU_TOKEN"

# Pontos de coleta mais próximos (Brasília)
curl "http://localhost:3000/pontos-coleta?latitude=-15.79&longitude=-47.88&raioKm=20" \
  -H "Authorization: Bearer SEU_TOKEN"

# Registrar um descarte em um ponto de coleta
curl -X POST http://localhost:3000/entregas \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tipoEntrega":"PONTO_COLETA","pontoColetaId":"UUID_DO_PONTO","itens":[{"materialId":"UUID_DO_MATERIAL","quantidade":2,"pesoKg":1.5}]}'

# Painel de impacto
curl "http://localhost:3000/impacto/me?meses=6" \
  -H "Authorization: Bearer SEU_TOKEN"

# Logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Conectando o app React Native

No celular físico (Expo Go), `localhost` não funciona — use o IP da sua
máquina na rede local (o mesmo que o Expo mostra, ex: `192.168.0.105`):

```
http://192.168.0.105:3000
```

O fluxo no app: salve o `accessToken` no AsyncStorage após o login e envie
em todas as requisições no header `Authorization: Bearer <token>`.

## Ferramentas úteis

```bash
# Ver/editar os dados do banco numa interface visual
npx prisma studio
```
