import { Injectable } from '@nestjs/common';
import {
  CreditarPontosData,
  GamificacaoRepository,
} from './repositories/gamificacao.repository';
import { ListarHistoricoDto } from './dto/gamificacao.schemas';

// Regra de progressao: a cada PONTOS_POR_NIVEL pontos o usuario sobe um nivel
export const PONTOS_POR_NIVEL = 250;

export function calcularNivel(pontosTotais: number): number {
  return Math.floor(Math.max(pontosTotais, 0) / PONTOS_POR_NIVEL) + 1;
}

@Injectable()
export class GamificacaoService {
  constructor(private readonly gamificacao: GamificacaoRepository) {}

  async verMinhaPontuacao(usuarioId: string) {
    const estado = await this.gamificacao.buscarPorUsuario(usuarioId);

    const pontosTotais = estado?.pontosTotais ?? 0;
    const nivel = estado?.nivel ?? 1;
    const pontosNoNivel = pontosTotais % PONTOS_POR_NIVEL;

    return {
      pontosTotais,
      nivel,
      totalEntregas: estado?.totalEntregas ?? 0,
      // Barra de progresso da tela de perfil
      pontosParaProximoNivel: PONTOS_POR_NIVEL - pontosNoNivel,
      progressoNivel: Math.round((pontosNoNivel / PONTOS_POR_NIVEL) * 100),
      posicaoRanking:
        (await this.gamificacao.contarUsuariosAcimaDe(pontosTotais)) + 1,
    };
  }

  async verRanking(limite: number) {
    const linhas = await this.gamificacao.listarRanking(limite);

    return linhas.map((linha, indice) => ({
      posicao: indice + 1,
      usuarioId: linha.usuario.id,
      nomeCompleto: linha.usuario.nomeCompleto,
      avatarUrl: linha.usuario.avatarUrl,
      pontosTotais: linha.pontosTotais,
      nivel: linha.nivel,
      totalEntregas: linha.totalEntregas,
    }));
  }

  async verHistorico(usuarioId: string, dto: ListarHistoricoDto) {
    const { itens, total } = await this.gamificacao.listarHistorico({
      usuarioId,
      ...dto,
    });

    return {
      itens: itens.map((linha) => ({
        id: linha.id,
        descricao: linha.descricao,
        pontos: linha.pontos,
        entregaId: linha.entregaId,
        dataRegistro: linha.dataRegistro,
      })),
      total,
      pagina: dto.pagina,
      porPagina: dto.porPagina,
    };
  }

  // Chamado pelas entregas quando a ONG confirma a coleta
  async creditarPontos(dados: CreditarPontosData) {
    const estado = await this.gamificacao.creditarPontos(dados);

    const nivelCalculado = calcularNivel(estado.pontosTotais);
    if (nivelCalculado !== estado.nivel) {
      return this.gamificacao.atualizarNivel(dados.usuarioId, nivelCalculado);
    }

    return estado;
  }
}
