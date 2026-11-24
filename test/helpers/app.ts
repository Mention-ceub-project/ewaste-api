import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { garantirBancoDeTeste } from '../setup/banco-de-teste';

export type ContextoDeTeste = {
  app: INestApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
};

const TABELAS = [
  'historico_pontos',
  'notificacoes',
  'entrega_materiais',
  'entregas',
  'enderecos',
  'ponto_materiais',
  'pontos_coleta',
  'materiais',
  'gamificacao_usuarios',
  'usuarios',
];

// Sobe a API completa, como em produção, apontando para o banco de teste.
// O limite de tentativas de login fica desligado por padrão, porque vários
// testes fazem login em sequência; só o teste do CT 003 o mantém ligado.
export async function criarApp({ limitarTentativas = false } = {}): Promise<ContextoDeTeste> {
  garantirBancoDeTeste(process.env.DATABASE_URL ?? '');

  let construtor = Test.createTestingModule({ imports: [AppModule] });
  if (!limitarTentativas) {
    construtor = construtor.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true });
  }

  const modulo = await construtor.compile();
  const app = modulo.createNestApplication();
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    http: () => request(app.getHttpServer()),
  };
}

export async function limparBanco(prisma: PrismaService): Promise<void> {
  const lista = TABELAS.map((tabela) => `"${tabela}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
}
