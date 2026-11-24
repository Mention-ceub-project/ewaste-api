import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelUsuario } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function contexto(usuario?: { papel: PapelUsuario }): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }),
  } as unknown as ExecutionContext;
}

function guardComPapeis(papeis: PapelUsuario[] | undefined) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(papeis) } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('libera rotas sem @Roles para qualquer usuário autenticado', () => {
    expect(guardComPapeis(undefined).canActivate(contexto({ papel: PapelUsuario.DESCARTADOR }))).toBe(true);
  });

  it('libera quando o papel do usuário está entre os permitidos', () => {
    const guard = guardComPapeis([PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN]);

    expect(guard.canActivate(contexto({ papel: PapelUsuario.MEMBRO_ONG }))).toBe(true);
  });

  it('bloqueia quando o papel não está entre os permitidos', () => {
    const guard = guardComPapeis([PapelUsuario.ADMIN]);

    expect(() => guard.canActivate(contexto({ papel: PapelUsuario.DESCARTADOR }))).toThrow(
      new ForbiddenException('Você não tem permissão para acessar este recurso'),
    );
  });

  it('bloqueia quando não há usuário na requisição', () => {
    expect(() => guardComPapeis([PapelUsuario.ADMIN]).canActivate(contexto())).toThrow(ForbiddenException);
  });
});
