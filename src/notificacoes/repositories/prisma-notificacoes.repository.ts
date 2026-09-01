import { Injectable } from '@nestjs/common';
import { Notificacao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CriarNotificacaoData,
  ListarNotificacoesFiltros,
  NotificacoesRepository,
} from './notificacoes.repository';

@Injectable()
export class PrismaNotificacoesRepository implements NotificacoesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarNotificacaoData): Promise<Notificacao> {
    return this.prisma.notificacao.create({ data: dados });
  }

  async criarVarias(dados: CriarNotificacaoData[]): Promise<void> {
    if (dados.length === 0) return;
    await this.prisma.notificacao.createMany({ data: dados });
  }

  async buscarPorId(id: string): Promise<Notificacao | null> {
    return this.prisma.notificacao.findUnique({ where: { id } });
  }

  async listar(filtros: ListarNotificacoesFiltros) {
    const where = { usuarioId: filtros.usuarioId, lida: filtros.lida };

    const [itens, total, naoLidas] = await this.prisma.$transaction([
      this.prisma.notificacao.findMany({
        where,
        orderBy: { dataCriacao: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.notificacao.count({ where }),
      this.prisma.notificacao.count({
        where: { usuarioId: filtros.usuarioId, lida: false },
      }),
    ]);

    return { itens, total, naoLidas };
  }

  async marcarComoLida(id: string): Promise<Notificacao> {
    return this.prisma.notificacao.update({
      where: { id },
      data: { lida: true },
    });
  }

  async marcarTodasComoLidas(usuarioId: string): Promise<number> {
    const { count } = await this.prisma.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true },
    });
    return count;
  }
}
