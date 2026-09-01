import { Injectable } from '@nestjs/common';
import { Endereco } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AtualizarEnderecoData,
  CriarEnderecoData,
  EnderecosRepository,
} from './enderecos.repository';

@Injectable()
export class PrismaEnderecosRepository implements EnderecosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarEnderecoData): Promise<Endereco> {
    return this.prisma.endereco.create({ data: dados });
  }

  async buscarPorId(id: string): Promise<Endereco | null> {
    return this.prisma.endereco.findUnique({ where: { id } });
  }

  async listarPorUsuario(usuarioId: string): Promise<Endereco[]> {
    return this.prisma.endereco.findMany({
      where: { usuarioId },
      orderBy: { dataCriacao: 'desc' },
    });
  }

  async atualizar(
    id: string,
    dados: AtualizarEnderecoData,
  ): Promise<Endereco> {
    return this.prisma.endereco.update({ where: { id }, data: dados });
  }

  async remover(id: string): Promise<void> {
    await this.prisma.endereco.delete({ where: { id } });
  }

  async contarEntregas(enderecoId: string): Promise<number> {
    return this.prisma.entrega.count({
      where: { enderecoEntregaId: enderecoId },
    });
  }
}
