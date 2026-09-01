import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AtualizarUsuarioData,
  CriarUsuarioData,
  ListarUsuariosFiltros,
  UsuarioComGamificacao,
  UsuariosRepository,
} from './usuarios.repository';

@Injectable()
export class PrismaUsuariosRepository implements UsuariosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dados: CriarUsuarioData): Promise<UsuarioComGamificacao> {
    // A linha de gamificacao nasce junto com o usuario (relacao 1:1)
    return this.prisma.usuario.create({
      data: {
        nomeCompleto: dados.nomeCompleto,
        email: dados.email,
        senhaHash: dados.senhaHash,
        telefone: dados.telefone ?? null,
        papel: dados.papel,
        gamificacao: { create: {} },
      },
      include: { gamificacao: true },
    });
  }

  async buscarPorId(id: string): Promise<UsuarioComGamificacao | null> {
    return this.prisma.usuario.findUnique({
      where: { id },
      include: { gamificacao: true },
    });
  }

  async buscarPorEmail(email: string): Promise<UsuarioComGamificacao | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
      include: { gamificacao: true },
    });
  }

  async atualizar(
    id: string,
    dados: AtualizarUsuarioData,
  ): Promise<UsuarioComGamificacao> {
    return this.prisma.usuario.update({
      where: { id },
      data: dados,
      include: { gamificacao: true },
    });
  }

  async incrementarTokenVersion(id: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async listar(filtros: ListarUsuariosFiltros) {
    const where: Prisma.UsuarioWhereInput = {
      papel: filtros.papel,
      ...(filtros.busca
        ? {
            OR: [
              { nomeCompleto: { contains: filtros.busca, mode: 'insensitive' } },
              { email: { contains: filtros.busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [itens, total] = await this.prisma.$transaction([
      this.prisma.usuario.findMany({
        where,
        include: { gamificacao: true },
        orderBy: { dataCriacao: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return { itens, total };
  }
}
