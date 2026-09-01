import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PapelUsuario } from '@prisma/client';
import { UsuariosRepository } from '../../usuarios/repositories/usuarios.repository';
import { UsuarioAutenticado } from '../decorators/current-user.decorator';

export type JwtPayload = {
  sub: string; // id do usuario
  email: string;
  papel: PapelUsuario;
  tokenVersion: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usuarios: UsuariosRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // O retorno fica disponivel em request.user
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.usuarios.buscarPorId(payload.sub);

    // Versao diferente = o usuario deslogou depois que este token foi emitido
    if (!usuario || usuario.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    return {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      papel: usuario.papel,
    };
  }
}
