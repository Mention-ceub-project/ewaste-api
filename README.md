# E-Waste API — Autenticação

API de autenticação (NestJS + Prisma + PostgreSQL + JWT) para o app E-Waste.

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

## Rotas

### Auth

| Método | Rota             | Protegida | Corpo                          |
|--------|------------------|-----------|--------------------------------|
| POST   | `/auth/register` | Não       | `{ name, email, password }`    |
| POST   | `/auth/login`    | Não       | `{ email, password }`          |
| POST   | `/auth/logout`   | Sim       | — (header Bearer)              |
| GET    | `/auth/me`       | Sim       | — (header Bearer)              |

`register` e `login` retornam `{ accessToken, user }`.

## Testando com curl

```bash
# Cadastrar
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Pedro","email":"pedro@email.com","password":"123456"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pedro@email.com","password":"123456"}'

# Dados do usuário logado (troque SEU_TOKEN pelo accessToken retornado)
curl http://localhost:3000/auth/me \
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
