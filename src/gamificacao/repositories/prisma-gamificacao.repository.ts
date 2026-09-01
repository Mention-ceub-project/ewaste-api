import { Injectable } from '@nestjs/common';
import { GamificacaoUsuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreditarPontosData,
  GamificacaoRepository,
  ListarHistoricoFiltros,
  LinhaRanking,
} from './gamificacao.repository';

@Injectable()
export class PrismaGamificacaoRepository implements GamificacaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorUsuario(
    usuarioId: string,
  ): Promise<GamificacaoUsuario | null> {
    return this.prisma.gamificacaoUsuario.findUnique({ where: { usuarioId } });
  }

  async creditarPontos(dados: CreditarPontosData): Promise<GamificacaoUsuario> {
    const [gamificacao] = await this.prisma.$transaction([
      // upsert cobre usuarios criados antes da gamificacao existir
      this.prisma.gamificacaoUsuario.upsert({
        where: { usuarioId: dados.usuarioId },
        create: {
          usuarioId: dados.usuarioId,
          pontosTotais: dados.pontos,
          totalEntregas: dados.contarEntrega ? 1 : 0,
        },
        update: {
          pontosTotais: { increment: dados.pontos },
          totalEntregas: { increment: dados.contarEntrega ? 1 : 0 },
        },
      }),
      this.prisma.historicoPontos.create({
        data: {
          usuarioId: dados.usuarioId,
          entregaId: dados.entregaId ?? null,
          descricao: dados.descricao,
          pontos: dados.pontos,
        },
      }),
    ]);

    return gamificacao;
  }

  async atualizarNivel(
    usuarioId: string,
    nivel: number,
  ): Promise<GamificacaoUsuario> {
    return this.prisma.gamificacaoUsuario.update({
      where: { usuarioId },
      data: { nivel },
    });
  }

  async listarHistorico(filtros: ListarHistoricoFiltros) {
    const where = { usuarioId: filtros.usuarioId };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.historicoPontos.findMany({
        where,
        orderBy: { dataRegistro: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.historicoPontos.count({ where }),
    ]);

    return { itens, total };
  }

  async listarRanking(limite: number): Promise<LinhaRanking[]> {
    return this.prisma.gamificacaoUsuario.findMany({
      where: { pontosTotais: { gt: 0 } },
      orderBy: [{ pontosTotais: 'desc' }, { dataAtualizacao: 'asc' }],
      take: limite,
      include: {
        usuario: {
          select: { id: true, nomeCompleto: true, avatarUrl: true },
        },
      },
    });
  }

  async contarUsuariosAcimaDe(pontos: number): Promise<number> {
    return this.prisma.gamificacaoUsuario.count({
      where: { pontosTotais: { gt: pontos } },
    });
  }
}
