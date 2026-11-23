import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContextoDeTeste, criarApp, limparBanco } from './helpers/app';

const LIMITE_POR_MINUTO = 5;
const TENTATIVA = { email: 'maria.teste@email.com', senha: 'senhaErrada1' };

// Única suíte que sobe a API com o limite de tentativas ligado. Cada instância
// da API guarda a contagem na própria memória, então ela começa zerada aqui.
describe('CT 003 – Limite de tentativas de login', () => {
  let ctx: ContextoDeTeste;

  beforeAll(async () => {
    ctx = await criarApp({ limitarTentativas: true });
    await limparBanco(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it(`aceita até ${LIMITE_POR_MINUTO} tentativas por minuto e responde 429 na seguinte`, async () => {
    for (let tentativa = 1; tentativa <= LIMITE_POR_MINUTO; tentativa++) {
      const resposta = await ctx.http().post('/auth/login').send(TENTATIVA);
      expect(resposta.status, `tentativa ${tentativa}`).toBe(401);
    }

    // Bloqueada antes mesmo de verificar as credenciais
    await ctx.http().post('/auth/login').send(TENTATIVA).expect(429);
  });

  it('a contagem é separada por rota: o cadastro continua disponível', async () => {
    await ctx
      .http()
      .post('/auth/register')
      .send({ nomeCompleto: 'Maria Teste', email: 'maria.teste@email.com', senha: 'teste123' })
      .expect(201);
  });
});
