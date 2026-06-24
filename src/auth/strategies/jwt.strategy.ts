import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export type JwtPayload = {
  sub: string; // id do usuário
  email: string;
  role: string;
  tokenVersion: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // O retorno fica disponível em request.user
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        points: true,
        level: true,
        tokenVersion: true,
      },
    });

    // Se a versão do token não bate, o usuário fez logout depois que ele foi emitido
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    // Remove o tokenVersion do objeto que volta para o request
    const { tokenVersion, ...publicUser } = user;
    return publicUser;
  }
}
