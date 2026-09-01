import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';

// O que a JwtStrategy coloca em request.user
export type UsuarioAutenticado = {
  id: string;
  nomeCompleto: string;
  email: string;
  papel: PapelUsuario;
};

// Atalho: verPerfil(@CurrentUser() usuario: UsuarioAutenticado) {...}
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
