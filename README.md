# E-Waste API

API da plataforma E-Waste (NestJS + Prisma + PostgreSQL + JWT): autenticação,
pontos de coleta, descartes, gamificação, impacto ambiental e notificações.

A API em produção está em [ewaste-api.onrender.com](https://ewaste-api.onrender.com).

## Pré-requisitos

- Node.js 24, 22.12+ na linha 22 ou 20.19+ na linha 20
- Docker (para o banco) — ou um PostgreSQL já instalado

## Como rodar

```bash
# 1. Instalar as dependências
npm ci

# 2. Subir o PostgreSQL com Docker
docker compose up -d

# 3. Criar o arquivo .env a partir do exemplo
cp .env.example .env
#    (edite o JWT_SECRET e mantenha DATABASE_URL e DIRECT_URL apontando para o banco local)

# 4. Gerar o Prisma Client e criar as tabelas
npx prisma generate
npx prisma migrate dev

# 5. Rodar a API em modo desenvolvimento
npm run start:dev
```

A API sobe em `http://localhost:3000`.

### Seed

`npm run prisma:seed` carrega o catálogo de materiais. Para criar o primeiro
admin, defina `SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA` no ambiente em que
executar o seed, após as migrações. Use um e-mail dedicado à administração e
uma senha forte de pelo menos 12 caracteres e no máximo 72 bytes. Uma nova
execução preserva a senha de um admin já criado. Se o e-mail pertencer a um
usuário comum, o seed encerra com erro.

Em desenvolvimento, preencher `SEED_DEMO_ONG_SENHA` também cria a ONG
`ong@recicladf.org` e seus pontos de demonstração. Se o seed antigo já criou
essa conta em produção, revise a conta e rotacione a senha antes de liberar o
fluxo para ONGs parceiras.

## Testes

Os testes usam o [Vitest](https://vitest.dev) e ficam divididos em duas suítes:

| Comando | O que roda |
|---------|-----------|
| `npm test` | Testes unitários (`src/**/*.spec.ts`): regras de negócio com repositórios falsos, sem banco |
| `npm run test:cov` | Os mesmos, com relatório de cobertura em `coverage/` |
| `npm run test:e2e` | Testes de integração (`test/*.e2e-spec.ts`): a API completa com requisições HTTP reais |
| `npm run test:watch` | Testes unitários em modo de observação, rodando a cada alteração |

Os testes de integração precisam do PostgreSQL do `docker compose up -d`. Eles
usam um banco separado, `ewaste_test`, que é apagado e recriado a cada execução.
Por segurança, eles se recusam a rodar em qualquer banco que não seja local e
cujo nome não termine em `_test` — o banco de desenvolvimento e o de produção
nunca são tocados. Para usar outro banco de teste, defina `TEST_DATABASE_URL`.

Cada teste de integração leva no nome o código do caso de teste correspondente
(CT 001 a CT 014) do documento de Casos de Teste.

## Deploy no Render

1. Configure `DATABASE_URL` com a conexão **pooled** do Neon (host com
   `-pooler`, incluindo `pgbouncer=true` na configuração existente). Adicione
   `DIRECT_URL` com a conexão **direta** do mesmo banco e branch para o
   Prisma Migrate. Salve as variáveis no painel do Render antes do deploy.
2. Configure `JWT_SECRET` e `NODE_ENV=production`. Se houver um cliente
   web consumindo a API, defina `CORS_ORIGINS` com as origens completas
   separadas por vírgula, incluindo protocolo e porta quando necessário, sem
   barra final. Em produção, a lista vazia bloqueia o acesso de origens web.
   Clientes nativos continuam usando a API normalmente.
3. Use Node.js 24 no Render. Defina `npm ci --include=dev && npm run prisma:generate && npm run build`
   como **Build Command** e `npx prisma migrate deploy && npm run start:prod`
   como **Start Command**. Execute o seed do primeiro admin em um ambiente
   autorizado após as migrações, se ainda não houver uma conta de administração.
4. Após o deploy, valide [`GET /health`](https://ewaste-api.onrender.com/health).
   A rota é pública, verifica a conexão com o PostgreSQL e devolve
   `200 {"status":"ok"}` ou `503 {"status":"unavailable"}`. Use `/health`
   no **Health Check Path** do Render. Para o monitor externo, agende um
   `GET` a cada 10 minutos e ative alertas de falha. O
   [cron-job.org](https://cron-job.org/en/faq/) oferece esse agendamento.

Consulte a documentação de [conexões do Neon](https://neon.com/docs/connect/connection-pooling)
e dos [health checks do Render](https://render.com/docs/health-checks).

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
| `MEMBRO_ONG` | Gerencia os próprios pontos, confirma ou recusa entregas e consulta métricas |
| `ADMIN` | Catálogo de materiais, papéis de usuário e visão geral |

## Rotas

| Base | Rotas |
|------|-------|
| `/health` | `GET /` (público) |
| `/auth` | `POST /register`, `POST /login`, `POST /logout`, `GET /me` |
| `/usuarios` | `GET /me`, `PATCH /me`, `GET /`, `GET /:id`, `PATCH /:id/papel` |
| `/materiais` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `/pontos-coleta` | `GET /`, `GET /minhas-metricas`, `GET /:id`, `GET /:id/metricas`, `POST /`, `PATCH /:id`, `PUT /:id/materiais`, `DELETE /:id` |
| `/enderecos` | `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` |
| `/entregas` | `POST /`, `GET /`, `GET /pendentes`, `GET /:id`, `PATCH /:id/confirmar`, `PATCH /:id/cancelar`, `PATCH /:id/recusar` |
| `/gamificacao` | `GET /me`, `GET /ranking`, `GET /historico` |
| `/impacto` | `GET /me`, `GET /geral` |
| `/notificacoes` | `GET /`, `PATCH /lidas`, `PATCH /:id/lida` |

- Cadastro público cria somente `DESCARTADOR`. Para vincular um parceiro,
  o admin usa `PATCH /usuarios/:id/papel` com `{"papel":"MEMBRO_ONG"}`.
  A consulta `GET /usuarios/:id` é exclusiva de admins.
- Cadastro e login aceitam até cinco tentativas por minuto, por IP e por rota.
  Ao exceder, a API responde `429`. Os limites ficam na memória da instância.
- `PATCH /entregas/:id/recusar` exige `{"motivo":"..."}`. O admin ou o membro
  dono do ponto pode recusar uma entrega pendente. A entrega fica
  `CANCELADO` com `motivoRecusa`, e o descartador recebe uma notificação.
- `GET /pontos-coleta/minhas-metricas` devolve os totais dos pontos do membro
  de ONG autenticado. Apenas entregas coletadas somam peso e CO₂.

Detalhes de payloads, permissões e regras de cálculo na
[documentação do backend](https://github.com/Mention-ceub-project/docs-ewaste/blob/main/Backend/DOCS.md).

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
