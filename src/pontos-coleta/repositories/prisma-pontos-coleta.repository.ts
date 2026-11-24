import { Injectable } from '@nestjs/common';
import { Prisma, StatusEntrega } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paraNumero } from '../../common/utils/decimal.util';
import {
  AtualizarPontoColetaData,
  CriarPontoColetaData,
  ListarPontosFiltros,
  MetricasPonto,
  PontoColetaCompleto,
  PontosColetaRepository,
} from './pontos-coleta.repository';

const incluirMateriais = {
  materiaisAceitos: { include: { material: true } },
} satisfies Prisma.PontoColetaInclude;

@Injectable()
export class PrismaPontosColetaRepository implements PontosColetaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarPontoColetaData): Promise<PontoColetaCompleto> {
    const { materiaisIds, ...ponto } = dados;

    return this.prisma.pontoColeta.create({
      data: {
        ...ponto,
        materiaisAceitos: materiaisIds?.length
          ? { create: materiaisIds.map((materialId) => ({ materialId })) }
          : undefined,
      },
      include: incluirMateriais,
    });
  }

  async buscarPorId(id: string): Promise<PontoColetaCompleto | null> {
    return this.prisma.pontoColeta.findUnique({
      where: { id },
      include: incluirMateriais,
    });
  }

  async listar(filtros: ListarPontosFiltros): Promise<PontoColetaCompleto[]> {
    const where: Prisma.PontoColetaWhereInput = {
      ativo: filtros.ativo,
      criadoPor: filtros.criadoPor,
      cidade: filtros.cidade
        ? { equals: filtros.cidade, mode: 'insensitive' }
        : undefined,
      estado: filtros.estado
        ? { equals: filtros.estado, mode: 'insensitive' }
        : undefined,
      ...(filtros.busca
        ? {
            OR: [
              { nome: { contains: filtros.busca, mode: 'insensitive' } },
              { bairro: { contains: filtros.busca, mode: 'insensitive' } },
              { rua: { contains: filtros.busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (filtros.materialId) {
      where.AND = [{
        OR: [
          { materiaisAceitos: { some: { materialId: filtros.materialId } } },
          { materiaisAceitos: { none: {} } },
        ],
      }];
    }

    return this.prisma.pontoColeta.findMany({
      where,
      include: incluirMateriais,
      orderBy: { nome: 'asc' },
    });
  }

  async atualizar(
    id: string,
    dados: AtualizarPontoColetaData,
  ): Promise<PontoColetaCompleto> {
    const { materiaisIds, ...campos } = dados;
    return this.prisma.pontoColeta.update({
      where: { id },
      data: {
        ...campos,
        materiaisAceitos: materiaisIds && {
          deleteMany: { materialId: { notIn: materiaisIds } },
          createMany: {
            data: materiaisIds.map((materialId) => ({ materialId })),
            skipDuplicates: true,
          },
        },
      },
      include: incluirMateriais,
    });
  }

  async definirMateriais(
    pontoId: string,
    materiaisIds: string[],
  ): Promise<PontoColetaCompleto> {
    return this.atualizar(pontoId, { materiaisIds });
  }

  obterMetricas(pontoId: string): Promise<MetricasPonto> {
    return this.agregarMetricas({ pontoColetaId: pontoId });
  }

  obterMetricasPorCriador(usuarioId: string): Promise<MetricasPonto> {
    return this.agregarMetricas({ pontoColeta: { criadoPor: usuarioId } });
  }

  private async agregarMetricas(
    where: Prisma.EntregaWhereInput,
  ): Promise<MetricasPonto> {
    const agruparEntregas = this.prisma.entrega.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { co2Evitado: true },
    });
    const [porStatus, peso] = await this.prisma.$transaction(
      [
        agruparEntregas,
        this.prisma.entregaMaterial.aggregate({
          where: { entrega: { ...where, status: StatusEntrega.COLETADO } },
          _sum: { pesoKg: true },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const pendentes = porStatus.find(
      ({ status }) => status === StatusEntrega.PENDENTE,
    );
    const coletadas = porStatus.find(
      ({ status }) => status === StatusEntrega.COLETADO,
    );

    return {
      totalEntregas: porStatus.reduce(
        (total, grupo) => total + grupo._count._all,
        0,
      ),
      entregasPendentes: pendentes?._count._all ?? 0,
      entregasColetadas: coletadas?._count._all ?? 0,
      pesoTotalKg: paraNumero(peso._sum.pesoKg),
      co2EvitadoKg: paraNumero(coletadas?._sum.co2Evitado ?? null),
    };
  }
}
