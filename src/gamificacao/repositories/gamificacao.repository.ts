import { GamificacaoUsuario, HistoricoPontos, Prisma } from '@prisma/client';

export type CreditarPontosData = {
  usuarioId: string;
  pontos: number;
  descricao: string;
  entregaId?: string | null;
  // Uma entrega confirmada conta no total; um bonus avulso nao
  contarEntrega: boolean;
};

export type ListarHistoricoFiltros = {
  usuarioId: string;
  pagina: number;
  porPagina: number;
};

export type LinhaRanking = GamificacaoUsuario & {
  usuario: { id: string; nomeCompleto: string; avatarUrl: string | null };
};

// Contrato de persistencia da gamificacao (estado + extrato de pontos)
export abstract class GamificacaoRepository {
  abstract buscarPorUsuario(
    usuarioId: string,
  ): Promise<GamificacaoUsuario | null>;
  // Credita os pontos e grava o extrato na mesma transacao
  abstract creditarPontos(
    dados: CreditarPontosData,
    transacao?: Prisma.TransactionClient,
  ): Promise<GamificacaoUsuario>;
  abstract atualizarNivel(
    usuarioId: string,
    nivel: number,
    transacao?: Prisma.TransactionClient,
  ): Promise<GamificacaoUsuario>;
  abstract listarHistorico(
    filtros: ListarHistoricoFiltros,
  ): Promise<{ itens: HistoricoPontos[]; total: number }>;
  abstract listarRanking(limite: number): Promise<LinhaRanking[]>;
  abstract contarUsuariosAcimaDe(pontos: number): Promise<number>;
}
