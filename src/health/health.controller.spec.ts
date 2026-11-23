import { describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

function controllerCom(consulta: () => Promise<unknown>) {
  const prisma = { $queryRaw: vi.fn(consulta) } as unknown as PrismaService;
  return new HealthController(prisma);
}

// CT 014 — o cenário com o banco fora do ar é testado aqui, sem derrubar banco nenhum
describe('HealthController', () => {
  it('responde "ok" quando o banco responde', async () => {
    const controller = controllerCom(() => Promise.resolve([{ '?column?': 1 }]));

    await expect(controller.verificar()).resolves.toEqual({ status: 'ok' });
  });

  it('responde 503 "unavailable" quando o banco está fora do ar', async () => {
    const controller = controllerCom(() => Promise.reject(new Error('connection refused')));

    const erro = await controller.verificar().catch((e) => e);

    expect(erro).toBeInstanceOf(ServiceUnavailableException);
    expect(erro.getStatus()).toBe(503);
    expect(erro.getResponse()).toEqual({ status: 'unavailable' });
  });
});
