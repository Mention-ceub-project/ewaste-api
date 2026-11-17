import { Injectable } from '@nestjs/common';
import { Prisma, StatusEntrega } from '@prisma/client';
import { CriarNotificacaoData } from '../../notificacoes/repositories/notificacoes.repository';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AtualizarStatusData,
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
  constructor(private readonly prisma: PrismaService) {}

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

  async atualizarStatusPendente(
    id: string,
    dados: AtualizarStatusData,
    notificacao?: CriarNotificacaoData,
  ): Promise<EntregaCompleta | null> {
    // A condição no UPDATE impede que duas operações concluam a mesma entrega.
    const atualizar = this.prisma.entrega.update({
      where: { id, status: StatusEntrega.PENDENTE },
      data: dados,
      include: incluirRelacoes,
    });

    try {
      if (!notificacao) return await atualizar;

      const [entrega] = await this.prisma.$transaction([
        atualizar,
        this.prisma.notificacao.create({ data: notificacao }),
      ]);
      return entrega;
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
