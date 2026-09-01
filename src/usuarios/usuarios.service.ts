import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  AtualizarUsuarioData,
  UsuarioComGamificacao,
  UsuariosRepository,
} from './repositories/usuarios.repository';
import { paraUsuarioDto, UsuarioDto } from './dto/usuario.dto';
import { AtualizarPerfilDto, ListarUsuariosDto } from './dto/usuarios.schemas';

@Injectable()
export class UsuariosService {
  constructor(private readonly usuarios: UsuariosRepository) {}

  async verPerfil(usuarioId: string): Promise<UsuarioDto> {
    return paraUsuarioDto(await this.buscarOuFalhar(usuarioId));
  }

  async buscarPorId(id: string): Promise<UsuarioDto> {
    return paraUsuarioDto(await this.buscarOuFalhar(id));
  }

  async atualizarPerfil(
    usuarioId: string,
    dto: AtualizarPerfilDto,
  ): Promise<UsuarioDto> {
    const usuario = await this.buscarOuFalhar(usuarioId);

    const dados: AtualizarUsuarioData = {
      nomeCompleto: dto.nomeCompleto,
      telefone: dto.telefone,
      avatarUrl: dto.avatarUrl,
    };

    if (dto.novaSenha) {
      const senhaConfere = await bcrypt.compare(
        dto.senhaAtual as string,
        usuario.senhaHash,
      );
      if (!senhaConfere) {
        throw new UnauthorizedException('Senha atual incorreta');
      }
      dados.senhaHash = await bcrypt.hash(dto.novaSenha, 10);
    }

    return paraUsuarioDto(await this.usuarios.atualizar(usuarioId, dados));
  }

  async listar(dto: ListarUsuariosDto) {
    const { itens, total } = await this.usuarios.listar(dto);

    return {
      itens: itens.map(paraUsuarioDto),
      total,
      pagina: dto.pagina,
      porPagina: dto.porPagina,
    };
  }

  async alterarPapel(id: string, papel: PapelUsuario): Promise<UsuarioDto> {
    await this.buscarOuFalhar(id);
    return paraUsuarioDto(await this.usuarios.atualizar(id, { papel }));
  }

  private async buscarOuFalhar(id: string): Promise<UsuarioComGamificacao> {
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return usuario;
  }
}
