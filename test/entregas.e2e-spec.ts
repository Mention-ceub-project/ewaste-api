import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContextoDeTeste, criarApp, limparBanco } from './helpers/app';
import { comToken, criarCenario, entrar } from './helpers/cenario';

// Segue a ordem do documento de Casos de Teste: os casos CT 007 a CT 010
// usam a entrega registrada no CT 004.
describe('Fluxo de descarte', () => {
  let ctx: ContextoDeTeste;
  let cenario: Awaited<ReturnType<typeof criarCenario>>;
  let tokenMaria: string;
  let tokenOng: string;
  let tokenOutraOng: string;
  let entregaId: string;

  const registrar = (token: string, material: string, pesoKg: number, ponto: string) =>
    ctx
      .http()
      .post('/entregas')
      .set(comToken(token))
      .send({
        tipoEntrega: 'PONTO_COLETA',
        pontoColetaId: ponto,
        itens: [{ materialId: material, quantidade: 1, pesoKg }],
      });

  const pontuacaoDaMaria = async () =>
    (await ctx.http().get('/gamificacao/me').set(comToken(tokenMaria)).expect(200)).body;

  const notificacoesDe = async (token: string) =>
    (await ctx.http().get('/notificacoes').set(comToken(token)).expect(200)).body.itens;

  beforeAll(async () => {
    ctx = await criarApp();
    await limparBanco(ctx.prisma);
    cenario = await criarCenario(ctx.prisma);

    const cadastro = await ctx
      .http()
      .post('/auth/register')
      .send({ nomeCompleto: 'Maria Teste', email: 'maria.teste@email.com', senha: 'teste123' })
      .expect(201);
    tokenMaria = cadastro.body.accessToken;
    tokenOng = await entrar(ctx, 'ong@recicladf.org');
    tokenOutraOng = await entrar(ctx, 'joao.ong@email.com');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('CT 004 – Registro de descarte em ponto de coleta', () => {
    it('registra a entrega como pendente, com os pontos e o impacto calculados', async () => {
      const resposta = await registrar(tokenMaria, cenario.materiais.pilhas, 1, cenario.pontos.reciclaDf).expect(201);

      // 1 kg × 240 pts/kg × (1 + (5 − 1) × 0,15) = 384
      expect(resposta.body).toMatchObject({
        status: 'PENDENTE',
        tipoEntrega: 'PONTO_COLETA',
        pesoTotalKg: 1,
        pontosGerados: 384,
        impacto: { co2Evitado: 1.1, aguaEconomizada: 32, energiaEconomizada: 4.8 },
        pontoColeta: { nome: 'ONG Recicla DF' },
      });
      entregaId = resposta.body.id;
    });

    it('os pontos ainda não entram no saldo do descartador', async () => {
      expect(await pontuacaoDaMaria()).toMatchObject({ pontosTotais: 0, nivel: 1, totalEntregas: 0 });
    });

    it('a entrega aparece no histórico do descartador como pendente', async () => {
      const { body } = await ctx.http().get('/entregas').set(comToken(tokenMaria)).expect(200);

      expect(body.total).toBe(1);
      expect(body.itens[0]).toMatchObject({ id: entregaId, status: 'PENDENTE' });
    });

    it('o descartador e a ONG do ponto são avisados', async () => {
      expect(await notificacoesDe(tokenMaria)).toContainEqual(expect.objectContaining({ titulo: 'Descarte registrado' }));
      expect(await notificacoesDe(tokenOng)).toContainEqual(expect.objectContaining({
        titulo: 'Nova entrega pendente',
        entregaId,
      }));
    });
  });

  describe('CT 005 – Registro de descarte com peso inválido', () => {
    it('recusa peso zero com a mensagem de validação', async () => {
      const resposta = await registrar(tokenMaria, cenario.materiais.pilhas, 0, cenario.pontos.reciclaDf).expect(400);

      expect(resposta.body.message).toBe('Erro de validação');
      expect(resposta.body.errors.itens).toContain('O peso deve ser maior que zero');
    });

    it('recusa peso acima do limite de 1.000 kg', async () => {
      await registrar(tokenMaria, cenario.materiais.pilhas, 1000.1, cenario.pontos.reciclaDf).expect(400);
    });

    it('nenhuma entrega é criada pelas tentativas inválidas', async () => {
      const { body } = await ctx.http().get('/entregas').set(comToken(tokenMaria)).expect(200);

      expect(body.total).toBe(1);
    });
  });

  describe('CT 006 – Descarte de material não aceito pelo ponto', () => {
    it('recusa monitor no ponto que só aceita pilhas, celular e mouse', async () => {
      const resposta = await registrar(tokenMaria, cenario.materiais.monitor, 3, cenario.pontos.taguatinga).expect(400);

      expect(resposta.body.message).toBe('Este ponto de coleta não aceita o material informado');
    });
  });

  describe('CT 007 – Descartador tenta confirmar a própria entrega', () => {
    it('é bloqueado pela verificação de perfil (403)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${entregaId}/confirmar`)
        .set(comToken(tokenMaria))
        .expect(403);

      expect(resposta.body.message).toBe('Você não tem permissão para acessar este recurso');
      expect(await pontuacaoDaMaria()).toMatchObject({ pontosTotais: 0 });
    });
  });

  describe('CT 008 – ONG não responsável tenta confirmar a entrega', () => {
    it('é bloqueada (403) e a entrega continua pendente', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${entregaId}/confirmar`)
        .set(comToken(tokenOutraOng))
        .expect(403);

      expect(resposta.body.message).toBe('Somente a ONG responsável pelo ponto de coleta pode confirmar esta entrega');

      const entrega = await ctx.prisma.entrega.findUnique({ where: { id: entregaId } });
      expect(entrega?.status).toBe('PENDENTE');
    });

    it('a entrega não aparece na fila da ONG que não é dona do ponto', async () => {
      const { body } = await ctx.http().get('/entregas/pendentes').set(comToken(tokenOutraOng)).expect(200);

      expect(body).toMatchObject({ itens: [], total: 0 });
    });
  });

  describe('CT 009 – Confirmação de recebimento pela ONG responsável', () => {
    it('a entrega aparece na fila de pendentes da ONG dona do ponto', async () => {
      const { body } = await ctx.http().get('/entregas/pendentes').set(comToken(tokenOng)).expect(200);

      expect(body.itens.map((item: { id: string }) => item.id)).toContain(entregaId);
    });

    it('a ONG confirma e a entrega passa para COLETADO', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${entregaId}/confirmar`)
        .set(comToken(tokenOng))
        .send({ observacao: 'Recebido no balcão' })
        .expect(200);

      expect(resposta.body.status).toBe('COLETADO');
      expect(resposta.body.confirmadoPor).toBe(cenario.usuarios.ong.id);
      expect(resposta.body.confirmadoEm).not.toBeNull();
      expect(resposta.body).toMatchObject({
        confirmadoPorNome: cenario.usuarios.ong.nomeCompleto,
        observacaoConfirmacao: 'Recebido no balcão',
      });
    });

    it('a ONG pode reabrir a entrega e consultar o registro de confirmação', async () => {
      const { body } = await ctx.http().get(`/entregas/${entregaId}`).set(comToken(tokenOng)).expect(200);
      expect(body).toMatchObject({
        confirmadoPorNome: cenario.usuarios.ong.nomeCompleto,
        observacaoConfirmacao: 'Recebido no balcão',
      });

      const visaoDoDescartador = await ctx.http().get(`/entregas/${entregaId}`).set(comToken(tokenMaria)).expect(200);
      expect(visaoDoDescartador.body).not.toHaveProperty('confirmadoPorNome');
    });

    it('os pontos são creditados e o descartador sobe para o nível 2', async () => {
      expect(await pontuacaoDaMaria()).toMatchObject({
        pontosTotais: 384,
        nivel: 2,
        totalEntregas: 1,
        pontosParaProximoNivel: 116,
      });
    });

    it('o descartador recebe a notificação com a observação da ONG', async () => {
      expect(await notificacoesDe(tokenMaria)).toContainEqual(
        expect.objectContaining({
          titulo: 'Descarte confirmado',
          mensagem: 'Sua entrega foi confirmada e você ganhou 384 pontos. Observação: Recebido no balcão',
        }),
      );
    });

    it('o painel de impacto passa a contar a entrega coletada', async () => {
      const { body } = await ctx.http().get('/impacto/me').set(comToken(tokenMaria)).expect(200);

      expect(body.totais).toMatchObject({
        totalEntregas: 1,
        pesoTotalKg: 1,
        co2Evitado: 1.1,
        aguaEconomizada: 32,
        energiaEconomizada: 4.8,
        pontosGerados: 384,
      });
    });

    it('o extrato de pontos registra uma linha vinculada à entrega', async () => {
      const { body } = await ctx.http().get('/gamificacao/historico').set(comToken(tokenMaria)).expect(200);

      expect(body.total).toBe(1);
      expect(body.itens[0]).toMatchObject({ pontos: 384, entregaId, descricao: 'Descarte confirmado' });
    });

    it('as métricas consolidadas da ONG somam a entrega coletada', async () => {
      const { body } = await ctx.http().get('/pontos-coleta/minhas-metricas').set(comToken(tokenOng)).expect(200);

      expect(body).toMatchObject({ entregasColetadas: 1, pesoTotalKg: 1, co2EvitadoKg: 1.1 });
    });
  });

  describe('CT 010 – Confirmação repetida da mesma entrega', () => {
    it('recusa a segunda confirmação (400)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${entregaId}/confirmar`)
        .set(comToken(tokenOng))
        .expect(400);

      expect(resposta.body.message).toBe('Somente entregas pendentes podem ser confirmadas');
    });

    it('o saldo e o extrato não mudam', async () => {
      expect(await pontuacaoDaMaria()).toMatchObject({ pontosTotais: 384 });

      const { body } = await ctx.http().get('/gamificacao/historico').set(comToken(tokenMaria)).expect(200);
      expect(body.total).toBe(1);
    });

    it('duas confirmações simultâneas creditam os pontos uma única vez', async () => {
      const outra = await registrar(tokenMaria, cenario.materiais.pilhas, 1, cenario.pontos.reciclaDf).expect(201);

      const respostas = await Promise.all([
        ctx.http().patch(`/entregas/${outra.body.id}/confirmar`).set(comToken(tokenOng)),
        ctx.http().patch(`/entregas/${outra.body.id}/confirmar`).set(comToken(tokenOng)),
      ]);

      expect(respostas.map((resposta) => resposta.status).sort()).toEqual([200, 400]);
      expect(await pontuacaoDaMaria()).toMatchObject({ pontosTotais: 768 });
    });
  });

  describe('CT 011 – Recusa de entrega pela ONG', () => {
    let recusadaId: string;

    beforeAll(async () => {
      // Computador, 5 kg: 5 × 70 × 1,3 = 455 pontos
      const resposta = await registrar(tokenMaria, cenario.materiais.computador, 5, cenario.pontos.reciclaDf).expect(201);
      recusadaId = resposta.body.id;
    });

    it('exige o motivo da recusa (400)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${recusadaId}/recusar`)
        .set(comToken(tokenOng))
        .send({})
        .expect(400);

      expect(resposta.body.message).toBe('Erro de validação');
      expect(resposta.body.errors).toHaveProperty('motivo');
    });

    it('cancela a entrega e registra o motivo', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${recusadaId}/recusar`)
        .set(comToken(tokenOng))
        .send({ motivo: 'O item não foi entregue no prazo combinado' })
        .expect(200);

      expect(resposta.body).toMatchObject({
        status: 'CANCELADO',
        motivoRecusa: 'O item não foi entregue no prazo combinado',
      });
    });

    it('avisa o descartador e não credita pontos', async () => {
      expect(await notificacoesDe(tokenMaria)).toContainEqual(
        expect.objectContaining({
          titulo: 'Entrega recusada',
          mensagem: 'Sua entrega foi recusada. Motivo: O item não foi entregue no prazo combinado',
        }),
      );
      expect(await pontuacaoDaMaria()).toMatchObject({ pontosTotais: 768 });
    });

    it('não permite recusar a mesma entrega de novo (400)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${recusadaId}/recusar`)
        .set(comToken(tokenOng))
        .send({ motivo: 'Outra tentativa' })
        .expect(400);

      expect(resposta.body.message).toBe('Somente entregas pendentes podem ser recusadas');
    });
  });

  describe('CT 012 – Cancelamento de descarte pendente', () => {
    let pendenteId: string;

    beforeAll(async () => {
      const resposta = await registrar(tokenMaria, cenario.materiais.celular, 1, cenario.pontos.reciclaDf).expect(201);
      pendenteId = resposta.body.id;
    });

    it('outro usuário não pode cancelar a entrega (403)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${pendenteId}/cancelar`)
        .set(comToken(tokenOutraOng))
        .expect(403);

      expect(resposta.body.message).toBe('Você só pode cancelar as suas entregas');
    });

    it('o descartador cancela a própria entrega pendente', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${pendenteId}/cancelar`)
        .set(comToken(tokenMaria))
        .expect(200);

      expect(resposta.body.status).toBe('CANCELADO');
      expect(await pontuacaoDaMaria()).toMatchObject({ pontosTotais: 768 });
    });

    it('a ONG do ponto é avisada do cancelamento', async () => {
      expect(await notificacoesDe(tokenOng)).toContainEqual(
        expect.objectContaining({ titulo: 'Entrega cancelada' }),
      );
    });

    it('uma entrega já coletada não pode ser cancelada (400)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/entregas/${entregaId}/cancelar`)
        .set(comToken(tokenMaria))
        .expect(400);

      expect(resposta.body.message).toBe('Somente entregas pendentes podem ser canceladas');
    });
  });

  it('reverte a confirmação e o crédito se a notificação não puder ser gravada', async () => {
    const { body: nova } = await registrar(
      tokenMaria, cenario.materiais.pilhas, 1, cenario.pontos.reciclaDf,
    ).expect(201);
    const saldoAnterior = await pontuacaoDaMaria();
    const avisosAntes = await notificacoesDe(tokenMaria);
    const confirmar = () => ctx.http()
      .patch(`/entregas/${nova.id}/confirmar`)
      .set(comToken(tokenOng));

    // Bloqueia apenas novas notificações de confirmação no banco isolado de teste.
    await ctx.prisma.$executeRaw`
      ALTER TABLE "notificacoes"
      ADD CONSTRAINT "teste_falha_confirmacao"
      CHECK ("titulo" <> 'Descarte confirmado') NOT VALID
    `;
    try {
      await confirmar().expect(500);
      const { body: pendente } = await ctx.http()
        .get(`/entregas/${nova.id}`)
        .set(comToken(tokenMaria))
        .expect(200);
      expect(pendente).toMatchObject({
        status: 'PENDENTE',
        confirmadoPor: null,
        confirmadoEm: null,
      });
      expect(await pontuacaoDaMaria()).toEqual(saldoAnterior);
      expect(await ctx.prisma.historicoPontos.count({ where: { entregaId: nova.id } })).toBe(0);
      expect(await notificacoesDe(tokenMaria)).toEqual(avisosAntes);
    } finally {
      await ctx.prisma.$executeRaw`
        ALTER TABLE "notificacoes" DROP CONSTRAINT "teste_falha_confirmacao"
      `;
    }

    await confirmar().expect(200);
    await confirmar().expect(400);
    expect(await ctx.prisma.historicoPontos.count({ where: { entregaId: nova.id } })).toBe(1);
    expect(await pontuacaoDaMaria()).toMatchObject({
      pontosTotais: saldoAnterior.pontosTotais + nova.pontosGerados,
      totalEntregas: saldoAnterior.totalEntregas + 1,
    });
  });

  describe('Filtros da fila da ONG', () => {
    const intervalo = {
      dataInicial: '2026-09-15T03:00:00.000Z',
      dataFinal: '2026-09-16T02:59:59.999Z',
    };
    let entregaNoIntervalo: string;

    beforeAll(async () => {
      const material = cenario.materiais.pilhas;
      const fixtures = [
        { ponto: cenario.pontos.reciclaDf, data: intervalo.dataInicial },
        { ponto: cenario.pontos.reciclaDf, data: '2026-09-15T02:59:59.999Z' },
        { ponto: cenario.pontos.taguatinga, data: intervalo.dataFinal },
      ];
      for (const [indice, { ponto, data }] of fixtures.entries()) {
        const { body } = await registrar(tokenMaria, material, 1, ponto).expect(201);
        await ctx.prisma.entrega.update({
          where: { id: body.id },
          data: { dataCriacao: new Date(data) },
        });
        if (indice === 0) entregaNoIntervalo = body.id;
      }
    });

    it('combina ponto e data de registro e conta somente os resultados filtrados', async () => {
      const { body } = await ctx.http().get('/entregas/pendentes')
        .set(comToken(tokenOng))
        .query({ pontoColetaId: cenario.pontos.reciclaDf, ...intervalo })
        .expect(200);

      expect(body.total).toBe(1);
      expect(body.itens).toMatchObject([{ id: entregaNoIntervalo, pontoColeta: { id: cenario.pontos.reciclaDf } }]);
    });

    it('mantém a fila vazia quando outra ONG filtra pelo ponto', async () => {
      const { body } = await ctx.http().get('/entregas/pendentes')
        .set(comToken(tokenOutraOng))
        .query({ pontoColetaId: cenario.pontos.reciclaDf, ...intervalo })
        .expect(200);
      expect(body).toMatchObject({ total: 0, itens: [] });
    });

    it('rejeita o intervalo com data inicial posterior à final', async () => {
      await ctx.http().get('/entregas/pendentes')
        .set(comToken(tokenOng))
        .query({ dataInicial: intervalo.dataFinal, dataFinal: intervalo.dataInicial })
        .expect(400);
    });
  });
});
