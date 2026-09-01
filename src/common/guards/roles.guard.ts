import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelUsuario } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsuarioAutenticado } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // O decorator pode estar no metodo ou na classe do controller
    const papeisPermitidos = this.reflector.getAllAndOverride<PapelUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Rota sem @Roles: qualquer usuario autenticado passa
    if (!papeisPermitidos || papeisPermitidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const usuario: UsuarioAutenticado | undefined = request.user;

    if (!usuario || !papeisPermitidos.includes(usuario.papel)) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este recurso',
      );
    }

    return true;
  }
}
