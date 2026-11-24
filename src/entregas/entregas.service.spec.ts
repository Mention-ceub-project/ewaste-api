import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PapelUsuario, Prisma, StatusEntrega, TipoEntrega } from '@prisma/client';
import { UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { EntregasService } from './entregas.service';
import { CalculoDescarteService } from './services/calculo-descarte.service';
import { EntregaCompleta } from './repositories/entregas.repository';

// ---------------------------------------------------------------------------
// Dados de apoio
// ---------------------------------------------------------------------------

const DESCARTADOR: UsuarioAutenticado = { id: 'descartador', nomeCompleto: 'Maria Teste', email: 'maria@email.com', papel: PapelUsuario.DESCARTADOR };
const ONG_DONA: UsuarioAutenticado = { id: 'ong-dona', nomeCompleto: 'Recicla DF', email: 'ong@recicladf.org', papel: PapelUsuario.MEMBRO_ONG };
const OUTRA_ONG: UsuarioAutenticado = { id: 'outra-ong', nomeCompleto: 'Outra ONG', email: 'outra@ong.org', papel: PapelUsuario.MEMBRO_ONG };
const ADMIN: UsuarioAutenticado = { id: 'admin', nomeCompleto: 'Admin', email: 'admin@ewaste.dev', papel: PapelUsuario.ADMIN };

function entrega(dados: Partial<EntregaCompleta> = {}): EntregaCompleta {
  return {
    id: 'entrega-1',
    usuarioId: DESCARTADOR.id,
    pontoColetaId: 'ponto-1',
    enderecoEntregaId: null,
    tipoEntrega: TipoEntrega.PONTO_COLETA,
    status: StatusEntrega.PENDENTE,
    observacao: null,
    motivoRecusa: null,
    fotoUrl: null,
    pontosGerados: 384,
    co2Evitado: new Prisma.Decimal(1.1),
    aguaEconomizada: new Prisma.Decimal(32),
    energiaEconomizada: new Prisma.Decimal(4.8),
    confirmadoPor: null,
    confirmadoEm: null,
    observacaoConfirmacao: null,
    confirmador: null,
    dataEntrega: null,
    dataCriacao: new Date(),
    materiais: [],
    pontoColeta: {
      id: 'ponto-1',
      nome: 'ONG Recicla DF',
      criadoPor: ONG_DONA.id,
      rua: 'SCS Quadra 2',
      numero: '120',
      bairro: 'Asa Sul',
      cidade: 'Brasília',
      estado: 'DF',
    } as EntregaCompleta['pontoColeta'],
    endereco: null,
    usuario: { id: DESCARTADOR.id, nomeCompleto: DESCARTADOR.nomeCompleto, email: DESCARTADOR.email, telefone: null },
    ...dados,
  } as EntregaCompleta;
}

// ---------------------------------------------------------------------------
// Montagem do service com dependências falsas
// ---------------------------------------------------------------------------

function montar() {
  const deps = {
    entregas: {
      criar: vi.fn(),
      buscarPorId: vi.fn(),
      listar: vi.fn(),
      confirmarPendente: vi.fn(),
      atualizarStatusPendente: vi.fn(),
    },
    materiais: { buscarPorIds: vi.fn() },
    pontosColeta: { validarParaEntrega: vi.fn() },
    pontosColetaRepo: { listar: vi.fn() },
    enderecos: { buscarDoUsuarioOuFalhar: vi.fn() },
    notificacoes: { notificarVarios: vi.fn() },
  };

  const servico = new EntregasService(
    deps.entregas as never,
    deps.materiais as never,
    deps.pontosColeta as never,
    deps.pontosColetaRepo as never,
    deps.enderecos as never,
    deps.notificacoes as never,
    new CalculoDescarteService(),
  );

  return { servico, ...deps };
}

describe('EntregasService', () => {
  let ctx: ReturnType<typeof montar>;

  beforeEach(() => {
    ctx = montar();
  });

  // -------------------------------------------------------------------------
  // Confirmação — tabela de decisão do Plano de Testes (R1 a R6)
  // -------------------------------------------------------------------------
  describe('confirmar', () => {
    it('R1 · o admin confirma uma entrega pendente e os pontos são creditados', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());
      ctx.entregas.confirmarPendente.mockResolvedValue(entrega({ status: StatusEntrega.COLETADO }));

      const resultado = await ctx.servico.confirmar('entrega-1', ADMIN);

      expect(resultado.status).toBe(StatusEntrega.COLETADO);
      expect(ctx.entregas.confirmarPendente).toHaveBeenCalledWith(
        'entrega-1',
        expect.objectContaining({
          confirmadoPor: ADMIN.id,
          credito: {
            usuarioId: DESCARTADOR.id,
            pontos: 384,
            descricao: 'Descarte confirmado',
            entregaId: 'entrega-1',
            contarEntrega: true,
          },
        }),
      );
    });

    it('R2 · a ONG dona do ponto confirma, e o descartador é notificado com a observação', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());
      ctx.entregas.confirmarPendente.mockResolvedValue(entrega({ status: StatusEntrega.COLETADO }));

      await ctx.servico.confirmar('entrega-1', ONG_DONA, 'Recebido no balcão');

      expect(ctx.entregas.confirmarPendente).toHaveBeenCalledWith(
        'entrega-1',
        expect.objectContaining({
          confirmadoPor: ONG_DONA.id,
          observacaoConfirmacao: 'Recebido no balcão',
          notificacao: {
            usuarioId: DESCARTADOR.id,
            entregaId: 'entrega-1',
            titulo: 'Descarte confirmado',
            mensagem: 'Sua entrega foi confirmada e você ganhou 384 pontos. Observação: Recebido no balcão',
          },
        }),
      );
    });

    it('R3 · uma ONG que não é dona do ponto é bloqueada', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());

      await expect(ctx.servico.confirmar('entrega-1', OUTRA_ONG)).rejects.toThrow(
        new ForbiddenException('Somente a ONG responsável pelo ponto de coleta pode confirmar esta entrega'),
      );
      expect(ctx.entregas.confirmarPendente).not.toHaveBeenCalled();
    });

    it('R4 · o descartador não pode confirmar a própria entrega', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());

      await expect(ctx.servico.confirmar('entrega-1', DESCARTADOR)).rejects.toBeInstanceOf(ForbiddenException);
      expect(ctx.entregas.confirmarPendente).not.toHaveBeenCalled();
    });

    it('R5 · uma entrega que não está pendente não é confirmada nem gera pontos', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega({ status: StatusEntrega.COLETADO }));
      // A atualização condicional não encontra a entrega como PENDENTE
      ctx.entregas.confirmarPendente.mockResolvedValue(null);

      await expect(ctx.servico.confirmar('entrega-1', ONG_DONA)).rejects.toThrow(
        new BadRequestException('Somente entregas pendentes podem ser confirmadas'),
      );
    });

    it('R6 · uma entrega inexistente retorna "não encontrada"', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(null);

      await expect(ctx.servico.confirmar('nao-existe', ADMIN)).rejects.toThrow(
        new NotFoundException('Entrega não encontrada'),
      );
    });

    it('entregas em domicílio, sem ponto vinculado, só podem ser confirmadas pelo admin', async () => {
      const domicilio = entrega({ pontoColeta: null, pontoColetaId: null, tipoEntrega: TipoEntrega.DOMICILIO });
      ctx.entregas.buscarPorId.mockResolvedValue(domicilio);
      ctx.entregas.confirmarPendente.mockResolvedValue({ ...domicilio, status: StatusEntrega.COLETADO });

      await expect(ctx.servico.confirmar('entrega-1', ONG_DONA)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(ctx.servico.confirmar('entrega-1', ADMIN)).resolves.toMatchObject({ status: StatusEntrega.COLETADO });
    });
  });

  // -------------------------------------------------------------------------
  // Recusa
  // -------------------------------------------------------------------------
  describe('recusar', () => {
    it('a ONG dona cancela a entrega com o motivo e avisa o descartador na mesma operação', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());
      ctx.entregas.atualizarStatusPendente.mockResolvedValue(
        entrega({ status: StatusEntrega.CANCELADO, motivoRecusa: 'Não compareceu' }),
      );

      const resultado = await ctx.servico.recusar('entrega-1', ONG_DONA, 'Não compareceu');

      expect(ctx.entregas.atualizarStatusPendente).toHaveBeenCalledWith(
        'entrega-1',
        { status: StatusEntrega.CANCELADO, motivoRecusa: 'Não compareceu' },
        { usuarioId: DESCARTADOR.id, entregaId: 'entrega-1', titulo: 'Entrega recusada', mensagem: 'Sua entrega foi recusada. Motivo: Não compareceu' },
      );
      expect(resultado).toMatchObject({ status: StatusEntrega.CANCELADO, motivoRecusa: 'Não compareceu' });
      expect(ctx.entregas.confirmarPendente).not.toHaveBeenCalled();
    });

    it('uma ONG que não é dona do ponto é bloqueada', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());

      await expect(ctx.servico.recusar('entrega-1', OUTRA_ONG, 'motivo')).rejects.toThrow(
        new ForbiddenException('Somente a ONG responsável pelo ponto de coleta pode recusar esta entrega'),
      );
    });

    it('uma entrega que não está pendente não pode ser recusada', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega({ status: StatusEntrega.COLETADO }));
      ctx.entregas.atualizarStatusPendente.mockResolvedValue(null);

      await expect(ctx.servico.recusar('entrega-1', ONG_DONA, 'motivo')).rejects.toThrow(
        new BadRequestException('Somente entregas pendentes podem ser recusadas'),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Cancelamento
  // -------------------------------------------------------------------------
  describe('cancelar', () => {
    it('o dono cancela a entrega pendente e a ONG do ponto é avisada', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());
      ctx.entregas.atualizarStatusPendente.mockResolvedValue(entrega({ status: StatusEntrega.CANCELADO }));

      await ctx.servico.cancelar('entrega-1', DESCARTADOR);

      expect(ctx.entregas.atualizarStatusPendente).toHaveBeenCalledWith(
        'entrega-1',
        { status: StatusEntrega.CANCELADO },
        {
          usuarioId: ONG_DONA.id,
          titulo: 'Entrega cancelada',
          entregaId: 'entrega-1',
          mensagem: 'Uma entrega agendada para o ponto "ONG Recicla DF" foi cancelada.',
        },
      );
    });

    it('outro usuário não pode cancelar a entrega', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());

      await expect(ctx.servico.cancelar('entrega-1', OUTRA_ONG)).rejects.toThrow(
        new ForbiddenException('Você só pode cancelar as suas entregas'),
      );
    });

    it('o admin pode cancelar a entrega de qualquer usuário', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());
      ctx.entregas.atualizarStatusPendente.mockResolvedValue(entrega({ status: StatusEntrega.CANCELADO }));

      await expect(ctx.servico.cancelar('entrega-1', ADMIN)).resolves.toMatchObject({ status: StatusEntrega.CANCELADO });
    });

    it('uma entrega que não está pendente não pode ser cancelada', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega({ status: StatusEntrega.COLETADO }));
      ctx.entregas.atualizarStatusPendente.mockResolvedValue(null);

      await expect(ctx.servico.cancelar('entrega-1', DESCARTADOR)).rejects.toThrow(
        new BadRequestException('Somente entregas pendentes podem ser canceladas'),
      );
    });

    it('a entrega em domicílio é cancelada sem notificação, porque não há ONG vinculada', async () => {
      const domicilio = entrega({ pontoColeta: null, pontoColetaId: null, tipoEntrega: TipoEntrega.DOMICILIO });
      ctx.entregas.buscarPorId.mockResolvedValue(domicilio);
      ctx.entregas.atualizarStatusPendente.mockResolvedValue({ ...domicilio, status: StatusEntrega.CANCELADO });

      await ctx.servico.cancelar('entrega-1', DESCARTADOR);

      expect(ctx.entregas.atualizarStatusPendente).toHaveBeenCalledWith(
        'entrega-1',
        { status: StatusEntrega.CANCELADO },
        undefined,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Registro
  // -------------------------------------------------------------------------
  describe('criar', () => {
    const pilhas = {
      id: 'pilhas',
      nome: 'Pilhas',
      ativo: true,
      pontosPorKg: 240,
      nivelToxicidade: 5,
      co2PorKg: new Prisma.Decimal(1.1),
      aguaPorKg: new Prisma.Decimal(32),
      energiaPorKg: new Prisma.Decimal(4.8),
    };
    const dto = {
      tipoEntrega: TipoEntrega.PONTO_COLETA,
      pontoColetaId: 'ponto-1',
      itens: [{ materialId: 'pilhas', quantidade: 1, pesoKg: 1 }],
    };

    it('recusa material inexistente', async () => {
      ctx.materiais.buscarPorIds.mockResolvedValue([]);

      await expect(ctx.servico.criar(DESCARTADOR, dto)).rejects.toThrow(
        new BadRequestException('Um ou mais materiais não existem'),
      );
      expect(ctx.entregas.criar).not.toHaveBeenCalled();
    });

    it('recusa material desativado no catálogo', async () => {
      ctx.materiais.buscarPorIds.mockResolvedValue([{ ...pilhas, ativo: false }]);

      await expect(ctx.servico.criar(DESCARTADOR, dto)).rejects.toThrow(
        new BadRequestException('O material "Pilhas" não está mais disponível para descarte'),
      );
    });

    it('valida o ponto de coleta e grava os pontos e o impacto calculados', async () => {
      ctx.materiais.buscarPorIds.mockResolvedValue([pilhas]);
      ctx.entregas.criar.mockResolvedValue(entrega());

      await ctx.servico.criar(DESCARTADOR, dto);

      expect(ctx.pontosColeta.validarParaEntrega).toHaveBeenCalledWith('ponto-1', ['pilhas']);
      expect(ctx.entregas.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: DESCARTADOR.id,
          pontoColetaId: 'ponto-1',
          enderecoEntregaId: null,
          pontosGerados: 384,
          co2Evitado: 1.1,
          aguaEconomizada: 32,
          energiaEconomizada: 4.8,
        }),
      );
    });

    it('avisa o descartador e a ONG dona do ponto sobre a nova entrega', async () => {
      ctx.materiais.buscarPorIds.mockResolvedValue([pilhas]);
      ctx.entregas.criar.mockResolvedValue(entrega());

      await ctx.servico.criar(DESCARTADOR, dto);

      const avisos = ctx.notificacoes.notificarVarios.mock.calls[0][0];
      expect(avisos).toHaveLength(2);
      expect(avisos[0]).toMatchObject({ usuarioId: DESCARTADOR.id, titulo: 'Descarte registrado' });
      expect(avisos[1]).toMatchObject({ usuarioId: ONG_DONA.id, titulo: 'Nova entrega pendente' });
    });

    it('na coleta em domicílio, confere se o endereço pertence ao usuário', async () => {
      ctx.materiais.buscarPorIds.mockResolvedValue([pilhas]);
      ctx.entregas.criar.mockResolvedValue(entrega({ pontoColeta: null, tipoEntrega: TipoEntrega.DOMICILIO }));

      await ctx.servico.criar(DESCARTADOR, {
        tipoEntrega: TipoEntrega.DOMICILIO,
        enderecoEntregaId: 'endereco-1',
        itens: dto.itens,
      });

      expect(ctx.enderecos.buscarDoUsuarioOuFalhar).toHaveBeenCalledWith('endereco-1', DESCARTADOR.id);
      expect(ctx.pontosColeta.validarParaEntrega).not.toHaveBeenCalled();
      expect(ctx.entregas.criar).toHaveBeenCalledWith(
        expect.objectContaining({ pontoColetaId: null, enderecoEntregaId: 'endereco-1' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Listagens e visualização
  // -------------------------------------------------------------------------
  describe('listarMinhas', () => {
    it('lista somente as entregas do próprio usuário, com a paginação pedida', async () => {
      ctx.entregas.listar.mockResolvedValue({ itens: [entrega()], total: 1 });

      const pagina = await ctx.servico.listarMinhas(DESCARTADOR.id, { pagina: 2, porPagina: 10 });

      expect(ctx.entregas.listar).toHaveBeenCalledWith({ usuarioId: DESCARTADOR.id, pagina: 2, porPagina: 10 });
      expect(pagina).toMatchObject({ total: 1, pagina: 2, porPagina: 10 });
      expect(pagina.itens[0]).toMatchObject({ id: 'entrega-1', pontosGerados: 384 });
    });
  });

  describe('listarPendentesDaOng', () => {
    const pagina = { pagina: 1, porPagina: 20 };

    it('o admin enxerga a fila inteira, sem filtro de ponto', async () => {
      ctx.entregas.listar.mockResolvedValue({ itens: [], total: 0 });

      await ctx.servico.listarPendentesDaOng(ADMIN, pagina);

      expect(ctx.pontosColetaRepo.listar).not.toHaveBeenCalled();
      expect(ctx.entregas.listar).toHaveBeenCalledWith(
        expect.not.objectContaining({ pontosColetaIds: expect.anything() }),
      );
      expect(ctx.entregas.listar).toHaveBeenCalledWith(expect.objectContaining({ status: StatusEntrega.PENDENTE }));
    });

    it('a ONG enxerga apenas as entregas dos próprios pontos', async () => {
      ctx.pontosColetaRepo.listar.mockResolvedValue([{ id: 'ponto-1' }, { id: 'ponto-2' }]);
      ctx.entregas.listar.mockResolvedValue({ itens: [entrega()], total: 1 });

      const resultado = await ctx.servico.listarPendentesDaOng(ONG_DONA, pagina);

      expect(ctx.pontosColetaRepo.listar).toHaveBeenCalledWith({ criadoPor: ONG_DONA.id });
      expect(ctx.entregas.listar).toHaveBeenCalledWith(
        expect.objectContaining({ pontosColetaIds: ['ponto-1', 'ponto-2'], status: StatusEntrega.PENDENTE }),
      );
      expect(resultado.total).toBe(1);
    });

    it('a ONG sem pontos recebe uma fila vazia, sem consultar entregas', async () => {
      ctx.pontosColetaRepo.listar.mockResolvedValue([]);

      const resultado = await ctx.servico.listarPendentesDaOng(OUTRA_ONG, pagina);

      expect(resultado).toEqual({ itens: [], total: 0, pagina: 1, porPagina: 20 });
      expect(ctx.entregas.listar).not.toHaveBeenCalled();
    });

    it('respeita o filtro de status para consultar o histórico de coletadas', async () => {
      ctx.pontosColetaRepo.listar.mockResolvedValue([{ id: 'ponto-1' }]);
      ctx.entregas.listar.mockResolvedValue({ itens: [], total: 0 });

      await ctx.servico.listarPendentesDaOng(ONG_DONA, { ...pagina, status: StatusEntrega.COLETADO });

      expect(ctx.entregas.listar).toHaveBeenCalledWith(expect.objectContaining({ status: StatusEntrega.COLETADO }));
    });
  });

  describe('buscarPorId', () => {
    it.each([
      ['o próprio descartador', DESCARTADOR],
      ['o admin', ADMIN],
      ['a ONG dona do ponto', ONG_DONA],
    ])('%s pode ver a entrega', async (_quem, usuario) => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());

      await expect(ctx.servico.buscarPorId('entrega-1', usuario)).resolves.toMatchObject({ id: 'entrega-1' });
    });

    it('uma ONG que não é dona do ponto não vê a entrega', async () => {
      ctx.entregas.buscarPorId.mockResolvedValue(entrega());

      await expect(ctx.servico.buscarPorId('entrega-1', OUTRA_ONG)).rejects.toThrow(
        new ForbiddenException('Você não tem permissão para ver esta entrega'),
      );
    });
  });
});
