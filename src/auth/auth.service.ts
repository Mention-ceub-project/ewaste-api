import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import {
  UsuarioComGamificacao,
  UsuariosRepository,
} from '../usuarios/repositories/usuarios.repository';
import { paraUsuarioDto, UsuarioDto } from '../usuarios/dto/usuario.dto';
import { RegistrarDto, LoginDto } from './dto/auth.schemas';
import { JwtPayload } from './strategies/jwt.strategy';

export type RespostaAutenticacao = {
  accessToken: string;
  usuario: UsuarioDto;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registrar(dto: RegistrarDto): Promise<RespostaAutenticacao> {
    const jaExiste = await this.usuarios.buscarPorEmail(dto.email);
    if (jaExiste) {
      throw new ConflictException('Este email já está cadastrado');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const usuario = await this.usuarios.criar({
      nomeCompleto: dto.nomeCompleto,
      email: dto.email,
      senhaHash,
      telefone: dto.telefone,
      papel: dto.papel,
    });

    return this.montarResposta(usuario);
  }

  async login(dto: LoginDto): Promise<RespostaAutenticacao> {
    const usuario = await this.usuarios.buscarPorEmail(dto.email);
    // Mensagem generica de proposito: nao revela se o email existe
    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaConfere = await bcrypt.compare(dto.senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.montarResposta(usuario);
  }

  // Incrementa o tokenVersion: todos os tokens emitidos antes deixam de valer
  async logout(usuarioId: string) {
    await this.usuarios.incrementarTokenVersion(usuarioId);
    return { message: 'Logout realizado com sucesso' };
  }

  private async montarResposta(
    usuario: UsuarioComGamificacao,
  ): Promise<RespostaAutenticacao> {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      papel: usuario.papel,
      tokenVersion: usuario.tokenVersion,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES') ?? '7d',
    });

    return { accessToken, usuario: paraUsuarioDto(usuario) };
  }
}
