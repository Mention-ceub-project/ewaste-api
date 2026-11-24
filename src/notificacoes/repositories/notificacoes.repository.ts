import { Notificacao } from '@prisma/client';

export type CriarNotificacaoData = {
  usuarioId: string;
  entregaId?: string | null;
  titulo: string;
  mensagem: string;
};

export type ListarNotificacoesFiltros = {
  usuarioId: string;
  lida?: boolean;
  pagina: number;
  porPagina: number;
};

// Contrato de persistencia das notificacoes do app
export abstract class NotificacoesRepository {
  abstract criar(dados: CriarNotificacaoData): Promise<Notificacao>;
  abstract criarVarias(dados: CriarNotificacaoData[]): Promise<void>;
  abstract buscarPorId(id: string): Promise<Notificacao | null>;
  abstract listar(
    filtros: ListarNotificacoesFiltros,
  ): Promise<{ itens: Notificacao[]; total: number; naoLidas: number }>;
  abstract marcarComoLida(id: string): Promise<Notificacao>;
  abstract marcarTodasComoLidas(usuarioId: string): Promise<number>;
}
