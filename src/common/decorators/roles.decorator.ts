import { SetMetadata } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';

export const ROLES_KEY = 'papeis';

// Restringe a rota aos papeis informados: @Roles(PapelUsuario.ADMIN)
// Precisa ser usado junto com o RolesGuard (depois do JwtAuthGuard).
export const Roles = (...papeis: PapelUsuario[]) =>
  SetMetadata(ROLES_KEY, papeis);
