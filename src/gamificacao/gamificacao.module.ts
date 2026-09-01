import { Module } from '@nestjs/common';
import { GamificacaoController } from './gamificacao.controller';
import { GamificacaoService } from './gamificacao.service';
import { GamificacaoRepository } from './repositories/gamificacao.repository';
import { PrismaGamificacaoRepository } from './repositories/prisma-gamificacao.repository';

@Module({
  controllers: [GamificacaoController],
  providers: [
    GamificacaoService,
    { provide: GamificacaoRepository, useClass: PrismaGamificacaoRepository },
  ],
  exports: [GamificacaoService],
})
export class GamificacaoModule {}
