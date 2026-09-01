import { Injectable } from '@nestjs/common';
import { Material, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AtualizarMaterialData,
  CriarMaterialData,
  ListarMateriaisFiltros,
  MateriaisRepository,
} from './materiais.repository';

@Injectable()
export class PrismaMateriaisRepository implements MateriaisRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarMaterialData): Promise<Material> {
    return this.prisma.material.create({ data: dados });
  }

  async buscarPorId(id: string): Promise<Material | null> {
    return this.prisma.material.findUnique({ where: { id } });
  }

  async buscarPorNome(nome: string): Promise<Material | null> {
    return this.prisma.material.findUnique({ where: { nome } });
  }

  async buscarPorIds(ids: string[]): Promise<Material[]> {
    return this.prisma.material.findMany({ where: { id: { in: ids } } });
  }

  async listar(filtros: ListarMateriaisFiltros): Promise<Material[]> {
    const where: Prisma.MaterialWhereInput = {
      ativo: filtros.ativo,
      ...(filtros.busca
        ? { nome: { contains: filtros.busca, mode: 'insensitive' } }
        : {}),
    };

    return this.prisma.material.findMany({ where, orderBy: { nome: 'asc' } });
  }

  async atualizar(
    id: string,
    dados: AtualizarMaterialData,
  ): Promise<Material> {
    return this.prisma.material.update({ where: { id }, data: dados });
  }
}
