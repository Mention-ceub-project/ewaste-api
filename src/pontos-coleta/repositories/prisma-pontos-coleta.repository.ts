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
      materiaisAceitos: filtros.materialId
        ? { some: { materialId: filtros.materialId } }
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
    return this.prisma.pontoColeta.update({
      where: { id },
      data: dados,
      include: incluirMateriais,
    });
  }

  async definirMateriais(
    pontoId: string,
    materiaisIds: string[],
  ): Promise<PontoColetaCompleto> {
    // Troca atomica: limpa a lista atual e regrava a nova
    const [, , ponto] = await this.prisma.$transaction([
      this.prisma.pontoMaterial.deleteMany({ where: { pontoId } }),
      this.prisma.pontoMaterial.createMany({
        data: materiaisIds.map((materialId) => ({ pontoId, materialId })),
        skipDuplicates: true,
      }),
      this.prisma.pontoColeta.findUniqueOrThrow({
        where: { id: pontoId },
        include: incluirMateriais,
      }),
    ]);

    return ponto;
  }

  async obterMetricas(pontoId: string): Promise<MetricasPonto> {
    const [total, pendentes, coletadas, impacto, peso] = await Promise.all([
      this.prisma.entrega.count({ where: { pontoColetaId: pontoId } }),
      this.prisma.entrega.count({
        where: { pontoColetaId: pontoId, status: StatusEntrega.PENDENTE },
      }),
      this.prisma.entrega.count({
        where: { pontoColetaId: pontoId, status: StatusEntrega.COLETADO },
      }),
      this.prisma.entrega.aggregate({
        where: { pontoColetaId: pontoId, status: StatusEntrega.COLETADO },
        _sum: { co2Evitado: true },
      }),
      this.prisma.entregaMaterial.aggregate({
        where: {
          entrega: { pontoColetaId: pontoId, status: StatusEntrega.COLETADO },
        },
        _sum: { pesoKg: true },
      }),
    ]);

    return {
      totalEntregas: total,
      entregasPendentes: pendentes,
      entregasColetadas: coletadas,
      pesoTotalKg: paraNumero(peso._sum.pesoKg),
      co2EvitadoKg: paraNumero(impacto._sum.co2Evitado),
    };
  }
}
