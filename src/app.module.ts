import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { isIP } from 'node:net';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { MateriaisModule } from './materiais/materiais.module';
import { PontosColetaModule } from './pontos-coleta/pontos-coleta.module';
import { EnderecosModule } from './enderecos/enderecos.module';
import { EntregasModule } from './entregas/entregas.module';
import { GamificacaoModule } from './gamificacao/gamificacao.module';
import { ImpactoModule } from './impacto/impacto.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // carrega o .env globalmente
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 5 }],
      getTracker: (request: Request) => {
        // No serviço público do Render, Cloudflare substitui este cabeçalho.
        const ipRender =
          process.env.RENDER === 'true'
            ? request.get('CF-Connecting-IP')
            : undefined;
        return ipRender && isIP(ipRender)
          ? ipRender
          : request.socket.remoteAddress ?? 'desconhecido';
      },
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    MateriaisModule,
    PontosColetaModule,
    EnderecosModule,
    EntregasModule,
    GamificacaoModule,
    ImpactoModule,
    NotificacoesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
