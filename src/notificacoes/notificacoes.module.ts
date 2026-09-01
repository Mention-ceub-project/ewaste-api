import { Module } from '@nestjs/common';
import { NotificacoesController } from './notificacoes.controller';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesRepository } from './repositories/notificacoes.repository';
import { PrismaNotificacoesRepository } from './repositories/prisma-notificacoes.repository';

@Module({
  controllers: [NotificacoesController],
  providers: [
    NotificacoesService,
    { provide: NotificacoesRepository, useClass: PrismaNotificacoesRepository },
  ],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
