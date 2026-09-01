import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Material } from '@prisma/client';
import { MateriaisRepository } from './repositories/materiais.repository';
import { MaterialDto, paraMaterialDto } from './dto/material.dto';
import {
  AtualizarMaterialDto,
  CriarMaterialDto,
  ListarMateriaisDto,
} from './dto/materiais.schemas';

@Injectable()
export class MateriaisService {
  constructor(private readonly materiais: MateriaisRepository) {}

  async listar(dto: ListarMateriaisDto): Promise<MaterialDto[]> {
    const encontrados = await this.materiais.listar(dto);
    return encontrados.map(paraMaterialDto);
  }

  async buscarPorId(id: string): Promise<MaterialDto> {
    return paraMaterialDto(await this.buscarOuFalhar(id));
  }

  async criar(dto: CriarMaterialDto): Promise<MaterialDto> {
    const jaExiste = await this.materiais.buscarPorNome(dto.nome);
    if (jaExiste) {
      throw new ConflictException('Já existe um material com este nome');
    }

    return paraMaterialDto(await this.materiais.criar(dto));
  }

  async atualizar(
    id: string,
    dto: AtualizarMaterialDto,
  ): Promise<MaterialDto> {
    await this.buscarOuFalhar(id);

    if (dto.nome) {
      const outro = await this.materiais.buscarPorNome(dto.nome);
      if (outro && outro.id !== id) {
        throw new ConflictException('Já existe um material com este nome');
      }
    }

    return paraMaterialDto(await this.materiais.atualizar(id, dto));
  }

  // Remocao logica: entregas antigas continuam apontando para o material
  async remover(id: string): Promise<MaterialDto> {
    await this.buscarOuFalhar(id);
    return paraMaterialDto(await this.materiais.atualizar(id, { ativo: false }));
  }

  private async buscarOuFalhar(id: string): Promise<Material> {
    const material = await this.materiais.buscarPorId(id);
    if (!material) {
      throw new NotFoundException('Material não encontrado');
    }
    return material;
  }
}
