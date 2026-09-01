import { Injectable } from '@nestjs/common';
import { Prisma, StatusEntrega } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paraNumero } from '../../common/utils/decimal.util';
import {
  EntregaResumida,
  ImpactoPorMaterial,
  ImpactoRepository,
  TotaisImpacto,
} from './impacto.repository';

@Injectable()
export class PrismaImpactoRepository implements ImpactoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // So entregas confirmadas entram no painel de impacto
  private onde(usuarioId?: string): Prisma.EntregaWhereInput {
    return { status: StatusEntrega.COLETADO, usuarioId };
  }

  async obterTotais(usuarioId?: string): Promise<TotaisImpacto> {
    const where = this.onde(usuarioId);

    const [entregas, peso] = await Promise.all([
      this.prisma.entrega.aggregate({
        where,
        _count: true,
        _sum: {
          co2Evitado: true,
          aguaEconomizada: true,
          energiaEconomizada: true,
          pontosGerados: true,
        },
      }),
      this.prisma.entregaMaterial.aggregate({
        where: { entrega: where },
        _sum: { pesoKg: true },
      }),
    ]);

    return {
      totalEntregas: entregas._count,
      pesoTotalKg: paraNumero(peso._sum.pesoKg),
      co2Evitado: paraNumero(entregas._sum.co2Evitado),
      aguaEconomizada: paraNumero(entregas._sum.aguaEconomizada),
      energiaEconomizada: paraNumero(entregas._sum.energiaEconomizada),
      pontosGerados: entregas._sum.pontosGerados ?? 0,
    };
  }

  async listarEntregasDesde(
    inicio: Date,
    usuarioId?: string,
  ): Promise<EntregaResumida[]> {
    const entregas = await this.prisma.entrega.findMany({
      where: { ...this.onde(usuarioId), dataCriacao: { gte: inicio } },
      select: {
        dataCriacao: true,
        co2Evitado: true,
        aguaEconomizada: true,
        energiaEconomizada: true,
      },
      orderBy: { dataCriacao: 'asc' },
    });

    return entregas.map((entrega) => ({
      dataCriacao: entrega.dataCriacao,
      co2Evitado: paraNumero(entrega.co2Evitado),
      aguaEconomizada: paraNumero(entrega.aguaEconomizada),
      energiaEconomizada: paraNumero(entrega.energiaEconomizada),
    }));
  }

  async agruparPorMaterial(
    usuarioId?: string,
    limite = 5,
  ): Promise<ImpactoPorMaterial[]> {
    const grupos = await this.prisma.entregaMaterial.groupBy({
      by: ['materialId'],
      where: { entrega: this.onde(usuarioId) },
      _sum: { pesoKg: true },
      _count: { _all: true },
      orderBy: { _sum: { pesoKg: 'desc' } },
      take: limite,
    });

    if (grupos.length === 0) return [];

    const materiais = await this.prisma.material.findMany({
      where: { id: { in: grupos.map((grupo) => grupo.materialId) } },
      select: { id: true, nome: true, icone: true },
    });
    const porId = new Map(materiais.map((material) => [material.id, material]));

    return grupos.map((grupo) => ({
      materialId: grupo.materialId,
      nome: porId.get(grupo.materialId)?.nome ?? 'Material removido',
      icone: porId.get(grupo.materialId)?.icone ?? null,
      pesoKg: paraNumero(grupo._sum.pesoKg),
      itens: grupo._count._all,
    }));
  }
}
