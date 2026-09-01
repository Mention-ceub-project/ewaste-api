import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Endereco } from '@prisma/client';
import { EnderecosRepository } from './repositories/enderecos.repository';
import { EnderecoDto, paraEnderecoDto } from './dto/endereco.dto';
import {
  AtualizarEnderecoDto,
  CriarEnderecoDto,
} from './dto/enderecos.schemas';

@Injectable()
export class EnderecosService {
  constructor(private readonly enderecos: EnderecosRepository) {}

  async listarMeus(usuarioId: string): Promise<EnderecoDto[]> {
    const encontrados = await this.enderecos.listarPorUsuario(usuarioId);
    return encontrados.map(paraEnderecoDto);
  }

  async criar(usuarioId: string, dto: CriarEnderecoDto): Promise<EnderecoDto> {
    return paraEnderecoDto(await this.enderecos.criar({ ...dto, usuarioId }));
  }

  async atualizar(
    id: string,
    usuarioId: string,
    dto: AtualizarEnderecoDto,
  ): Promise<EnderecoDto> {
    await this.buscarDoUsuarioOuFalhar(id, usuarioId);
    return paraEnderecoDto(await this.enderecos.atualizar(id, dto));
  }

  async remover(id: string, usuarioId: string) {
    await this.buscarDoUsuarioOuFalhar(id, usuarioId);

    // Apagar quebraria o historico de entregas em domicilio
    const entregas = await this.enderecos.contarEntregas(id);
    if (entregas > 0) {
      throw new BadRequestException(
        'Este endereço está vinculado a entregas e não pode ser removido',
      );
    }

    await this.enderecos.remover(id);
    return { message: 'Endereço removido com sucesso' };
  }

  // Usado pelas entregas em domicilio: o endereco precisa ser do proprio usuario
  async buscarDoUsuarioOuFalhar(
    id: string,
    usuarioId: string,
  ): Promise<Endereco> {
    const endereco = await this.enderecos.buscarPorId(id);
    if (!endereco) {
      throw new NotFoundException('Endereço não encontrado');
    }
    if (endereco.usuarioId !== usuarioId) {
      throw new ForbiddenException('Este endereço não pertence a você');
    }
    return endereco;
  }
}
