import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GamificacaoUsuario } from '@prisma/client';
import { calcularNivel, GamificacaoService } from './gamificacao.service';
import { GamificacaoRepository } from './repositories/gamificacao.repository';

function estado(pontosTotais: number, nivel: number): GamificacaoUsuario {
  return {
    id: 'g1',
    usuarioId: 'u1',
    pontosTotais,
    nivel,
    totalEntregas: 1,
    dataAtualizacao: new Date(),
  };
}

describe('calcularNivel', () => {
  it.each([
    [0, 1],
    [249, 1],
    [250, 2], // valor-limite da troca de nível
    [384, 2],
    [499, 2],
    [500, 3],
    [-10, 1], // saldo negativo nunca derruba abaixo do nível 1
  ])('%i pontos correspondem ao nível %i', (pontos, nivel) => {
    expect(calcularNivel(pontos)).toBe(nivel);
  });
});

describe('GamificacaoService', () => {
  let repositorio: {
    buscarPorUsuario: ReturnType<typeof vi.fn>;
    creditarPontos: ReturnType<typeof vi.fn>;
    atualizarNivel: ReturnType<typeof vi.fn>;
    contarUsuariosAcimaDe: ReturnType<typeof vi.fn>;
    listarRanking: ReturnType<typeof vi.fn>;
    listarHistorico: ReturnType<typeof vi.fn>;
  };
  let servico: GamificacaoService;

  beforeEach(() => {
    repositorio = {
      buscarPorUsuario: vi.fn(),
      creditarPontos: vi.fn(),
      atualizarNivel: vi.fn(),
      contarUsuariosAcimaDe: vi.fn().mockResolvedValue(0),
      listarRanking: vi.fn(),
      listarHistorico: vi.fn(),
    };
    servico = new GamificacaoService(repositorio as unknown as GamificacaoRepository);
  });

  describe('creditarPontos', () => {
    const credito = {
      usuarioId: 'u1',
      pontos: 384,
      descricao: 'Descarte confirmado',
      entregaId: 'e1',
      contarEntrega: true,
    };

    it('sobe o nível quando o novo saldo ultrapassa a faixa atual', async () => {
      repositorio.creditarPontos.mockResolvedValue(estado(384, 1));
      repositorio.atualizarNivel.mockResolvedValue(estado(384, 2));

      const resultado = await servico.creditarPontos(credito);

      expect(repositorio.creditarPontos).toHaveBeenCalledWith(credito);
      expect(repositorio.atualizarNivel).toHaveBeenCalledWith('u1', 2);
      expect(resultado.nivel).toBe(2);
    });

    it('não atualiza o nível quando ele já está correto', async () => {
      repositorio.creditarPontos.mockResolvedValue(estado(100, 1));

      const resultado = await servico.creditarPontos({ ...credito, pontos: 100 });

      expect(repositorio.atualizarNivel).not.toHaveBeenCalled();
      expect(resultado.nivel).toBe(1);
    });
  });

  describe('verRanking', () => {
    it('numera as posições na ordem devolvida pelo repositório', async () => {
      repositorio.listarRanking.mockResolvedValue([
        { ...estado(900, 4), usuario: { id: 'a', nomeCompleto: 'Ana', avatarUrl: null } },
        { ...estado(384, 2), usuario: { id: 'b', nomeCompleto: 'Bruno', avatarUrl: 'foto.png' } },
      ]);

      const ranking = await servico.verRanking(10);

      expect(repositorio.listarRanking).toHaveBeenCalledWith(10);
      expect(ranking).toEqual([
        { posicao: 1, usuarioId: 'a', nomeCompleto: 'Ana', avatarUrl: null, pontosTotais: 900, nivel: 4, totalEntregas: 1 },
        { posicao: 2, usuarioId: 'b', nomeCompleto: 'Bruno', avatarUrl: 'foto.png', pontosTotais: 384, nivel: 2, totalEntregas: 1 },
      ]);
    });
  });

  describe('verHistorico', () => {
    it('devolve o extrato paginado, sem expor dados internos', async () => {
      const registro = { id: 'h1', usuarioId: 'u1', entregaId: 'e1', descricao: 'Descarte confirmado', pontos: 384, dataRegistro: new Date('2026-11-17') };
      repositorio.listarHistorico.mockResolvedValue({ itens: [registro], total: 1 });

      const extrato = await servico.verHistorico('u1', { pagina: 1, porPagina: 20 });

      expect(repositorio.listarHistorico).toHaveBeenCalledWith({ usuarioId: 'u1', pagina: 1, porPagina: 20 });
      expect(extrato).toEqual({
        itens: [{ id: 'h1', descricao: 'Descarte confirmado', pontos: 384, entregaId: 'e1', dataRegistro: registro.dataRegistro }],
        total: 1,
        pagina: 1,
        porPagina: 20,
      });
    });
  });

  describe('verMinhaPontuacao', () => {
    it('calcula o progresso até o próximo nível e a posição no ranking', async () => {
      repositorio.buscarPorUsuario.mockResolvedValue(estado(384, 2));
      repositorio.contarUsuariosAcimaDe.mockResolvedValue(3);

      const pontuacao = await servico.verMinhaPontuacao('u1');

      expect(pontuacao).toEqual({
        pontosTotais: 384,
        nivel: 2,
        totalEntregas: 1,
        pontosParaProximoNivel: 116, // 250 − (384 % 250)
        progressoNivel: 54, // 134 / 250 = 53,6%
        posicaoRanking: 4,
      });
      expect(repositorio.contarUsuariosAcimaDe).toHaveBeenCalledWith(384);
    });

    it('usa valores iniciais quando o usuário ainda não tem gamificação', async () => {
      repositorio.buscarPorUsuario.mockResolvedValue(null);

      const pontuacao = await servico.verMinhaPontuacao('u1');

      expect(pontuacao).toMatchObject({
        pontosTotais: 0,
        nivel: 1,
        totalEntregas: 0,
        pontosParaProximoNivel: 250,
        progressoNivel: 0,
        posicaoRanking: 1,
      });
    });
  });
});
