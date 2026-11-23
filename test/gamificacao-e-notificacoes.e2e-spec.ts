import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContextoDeTeste, criarApp, limparBanco } from './helpers/app';
import { comToken, criarCenario, entrar } from './helpers/cenario';

describe('Gamificação, impacto e notificações', () => {
  let ctx: ContextoDeTeste;
  let cenario: Awaited<ReturnType<typeof criarCenario>>;
  let tokenMaria: string;
  let tokenJoana: string;
  let tokenOng: string;

  const cadastrar = async (nomeCompleto: string, email: string) =>
    (await ctx.http().post('/auth/register').send({ nomeCompleto, email, senha: 'teste123' }).expect(201)).body.accessToken;

  const descartarEConfirmar = async (token: string, material: string, pesoKg: number) => {
    const entrega = await ctx
      .http()
      .post('/entregas')
      .set(comToken(token))
      .send({ tipoEntrega: 'PONTO_COLETA', pontoColetaId: cenario.pontos.reciclaDf, itens: [{ materialId: material, quantidade: 1, pesoKg }] })
      .expect(201);
    await ctx.http().patch(`/entregas/${entrega.body.id}/confirmar`).set(comToken(tokenOng)).expect(200);
  };

  beforeAll(async () => {
    ctx = await criarApp();
    await limparBanco(ctx.prisma);
    cenario = await criarCenario(ctx.prisma);

    tokenMaria = await cadastrar('Maria Teste', 'maria.teste@email.com');
    tokenJoana = await cadastrar('Joana Teste', 'joana.teste@email.com');
    tokenOng = await entrar(ctx, 'ong@recicladf.org');

    // Maria: Pilhas, 1 kg = 384 pontos · Joana: Celular, 1 kg = 174 pontos
    await descartarEConfirmar(tokenMaria, cenario.materiais.pilhas, 1);
    await descartarEConfirmar(tokenJoana, cenario.materiais.celular, 1);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('CT 029 – Ranking de usuários', () => {
    it('ordena os usuários pela pontuação, do maior para o menor', async () => {
      const { body } = await ctx.http().get('/gamificacao/ranking').set(comToken(tokenJoana)).expect(200);

      expect(body).toEqual([
        expect.objectContaining({ posicao: 1, nomeCompleto: 'Maria Teste', pontosTotais: 384, nivel: 2 }),
        expect.objectContaining({ posicao: 2, nomeCompleto: 'Joana Teste', pontosTotais: 174, nivel: 1 }),
      ]);
    });

    it('usuários sem pontos não aparecem no ranking', async () => {
      const { body } = await ctx.http().get('/gamificacao/ranking').set(comToken(tokenJoana)).expect(200);

      expect(body.map((linha: { nomeCompleto: string }) => linha.nomeCompleto)).not.toContain('Equipe Recicla DF');
    });

    it('a posição de cada usuário aparece na própria pontuação', async () => {
      const { body } = await ctx.http().get('/gamificacao/me').set(comToken(tokenJoana)).expect(200);

      expect(body.posicaoRanking).toBe(2);
    });
  });

  describe('CT 030 – Painel de impacto conta somente entregas coletadas', () => {
    beforeAll(async () => {
      // Uma entrega pendente da Maria que não pode entrar no painel
      await ctx
        .http()
        .post('/entregas')
        .set(comToken(tokenMaria))
        .send({
          tipoEntrega: 'PONTO_COLETA',
          pontoColetaId: cenario.pontos.reciclaDf,
          itens: [{ materialId: cenario.materiais.computador, quantidade: 1, pesoKg: 5 }],
        })
        .expect(201);
    });

    it('os totais consideram apenas a entrega coletada', async () => {
      const { body } = await ctx.http().get('/impacto/me').set(comToken(tokenMaria)).expect(200);

      expect(body.totais).toMatchObject({ totalEntregas: 1, pesoTotalKg: 1, co2Evitado: 1.1, pontosGerados: 384 });
      expect(body.porMaterial.map((material: { nome: string }) => material.nome)).toEqual(['Pilhas']);
    });

    it('a evolução mensal tem um ponto para cada mês pedido, com o mês atual por último', async () => {
      const { body } = await ctx.http().get('/impacto/me?meses=3').set(comToken(tokenMaria)).expect(200);

      expect(body.evolucaoMensal).toHaveLength(3);
      expect(body.evolucaoMensal[2]).toMatchObject({ co2Evitado: 1.1, entregas: 1 });
    });

    it('recusa período acima de 24 meses (400)', async () => {
      await ctx.http().get('/impacto/me?meses=25').set(comToken(tokenMaria)).expect(400);
    });
  });

  describe('CT 031 – Marcar notificações como lidas', () => {
    let idNotificacao: string;
    let naoLidasAntes: number;

    beforeAll(async () => {
      const { body } = await ctx.http().get('/notificacoes').set(comToken(tokenMaria)).expect(200);
      naoLidasAntes = body.naoLidas;
      idNotificacao = body.itens[0].id;
    });

    it('o usuário tem notificações não lidas depois dos descartes', () => {
      expect(naoLidasAntes).toBeGreaterThan(0);
    });

    it('marcar uma notificação como lida reduz a contagem de não lidas', async () => {
      const resposta = await ctx
        .http()
        .patch(`/notificacoes/${idNotificacao}/lida`)
        .set(comToken(tokenMaria))
        .expect(200);

      expect(resposta.body.lida).toBe(true);
      const { body } = await ctx.http().get('/notificacoes').set(comToken(tokenMaria)).expect(200);
      expect(body.naoLidas).toBe(naoLidasAntes - 1);
    });

    it('outro usuário não pode marcar a notificação (403)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/notificacoes/${idNotificacao}/lida`)
        .set(comToken(tokenJoana))
        .expect(403);

      expect(resposta.body.message).toBe('Esta notificação não pertence a você');
    });

    it('marcar todas como lidas zera a contagem', async () => {
      const resposta = await ctx.http().patch('/notificacoes/lidas').set(comToken(tokenMaria)).expect(200);

      expect(resposta.body.atualizadas).toBe(naoLidasAntes - 1);
      const { body } = await ctx.http().get('/notificacoes').set(comToken(tokenMaria)).expect(200);
      expect(body.naoLidas).toBe(0);
    });
  });
});
