import { Injectable } from '@nestjs/common';
import { Prisma, StatusEntrega } from '@prisma/client';
import { GamificacaoService } from '../../gamificacao/gamificacao.service';
import { CriarNotificacaoData } from '../../notificacoes/repositories/notificacoes.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AtualizarStatusData,
  ConfirmarEntregaData,
  CriarEntregaData,
  EntregaCompleta,
  EntregasRepository,
  ListarEntregasFiltros,
} from './entregas.repository';

const incluirRelacoes = {
  materiais: { include: { material: true } },
  pontoColeta: true,
  endereco: true,
  usuario: {
    select: { id: true, nomeCompleto: true, email: true, telefone: true },
  },
} satisfies Prisma.EntregaInclude;

@Injectable()
export class PrismaEntregasRepository implements EntregasRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificacao: GamificacaoService,
  ) {}

  async criar(dados: CriarEntregaData): Promise<EntregaCompleta> {
    const { itens, ...entrega } = dados;

    // A entrega e seus itens nascem na mesma operacao (nested write)
    return this.prisma.entrega.create({
      data: {
        ...entrega,
        materiais: {
          create: itens.map((item) => ({
            materialId: item.materialId,
            quantidade: item.quantidade,
            pesoKg: item.pesoKg,
          })),
        },
      },
      include: incluirRelacoes,
    });
  }

  async buscarPorId(id: string): Promise<EntregaCompleta | null> {
    return this.prisma.entrega.findUnique({
      where: { id },
      include: incluirRelacoes,
    });
  }

  async listar(filtros: ListarEntregasFiltros) {
    const where: Prisma.EntregaWhereInput = {
      usuarioId: filtros.usuarioId,
      status: filtros.status,
      tipoEntrega: filtros.tipoEntrega,
      pontoColetaId: filtros.pontosColetaIds
        ? { in: filtros.pontosColetaIds }
        : undefined,
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.entrega.findMany({
        where,
        include: incluirRelacoes,
        orderBy: { dataCriacao: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.entrega.count({ where }),
    ]);

    return { itens, total };
  }

  async confirmarPendente(
    id: string,
    dados: ConfirmarEntregaData,
  ): Promise<EntregaCompleta | null> {
    return this.prisma.$transaction(async (transacao) => {
      const confirmada = await this.atualizarPendente(transacao, id, {
        status: StatusEntrega.COLETADO,
        confirmadoPor: dados.confirmadoPor,
        confirmadoEm: dados.confirmadoEm,
      });
      if (!confirmada) return null;

      await this.gamificacao.creditarPontos(dados.credito, transacao);
      await transacao.notificacao.create({ data: dados.notificacao });
      return confirmada;
    });
  }

  async atualizarStatusPendente(
    id: string,
    dados: AtualizarStatusData,
    notificacao?: CriarNotificacaoData,
  ): Promise<EntregaCompleta | null> {
    if (!notificacao) return this.atualizarPendente(this.prisma, id, dados);

    return this.prisma.$transaction(async (transacao) => {
      const entrega = await this.atualizarPendente(transacao, id, dados);
      if (!entrega) return null;

      await transacao.notificacao.create({ data: notificacao });
      return entrega;
    });
  }

  private async atualizarPendente(
    transacao: Prisma.TransactionClient,
    id: string,
    dados: AtualizarStatusData,
  ): Promise<EntregaCompleta | null> {
    try {
      // A condição no UPDATE impede que duas operações concluam a mesma entrega.
      return await transacao.entrega.update({
        where: { id, status: StatusEntrega.PENDENTE },
        data: dados,
        include: incluirRelacoes,
      });
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2025'
      ) {
        return null;
      }
      throw erro;
    }
  }
}
