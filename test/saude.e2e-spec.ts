import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContextoDeTeste, criarApp } from './helpers/app';

// O cenário com o banco fora do ar está em src/health/health.controller.spec.ts
describe('CT 014 – Verificação de disponibilidade da API', () => {
  let ctx: ContextoDeTeste;

  beforeAll(async () => {
    ctx = await criarApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('responde 200 "ok" sem exigir autenticação quando o banco está disponível', async () => {
    const resposta = await ctx.http().get('/health').expect(200);

    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('não permite que a resposta seja guardada em cache', async () => {
    const resposta = await ctx.http().get('/health').expect(200);

    expect(resposta.headers['cache-control']).toBe('no-store');
  });
});
