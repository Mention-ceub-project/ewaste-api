import { Module } from '@nestjs/common';
import { ImpactoController } from './impacto.controller';
import { ImpactoService } from './impacto.service';
import { ImpactoRepository } from './repositories/impacto.repository';
import { PrismaImpactoRepository } from './repositories/prisma-impacto.repository';

@Module({
  controllers: [ImpactoController],
  providers: [
    ImpactoService,
    { provide: ImpactoRepository, useClass: PrismaImpactoRepository },
  ],
})
export class ImpactoModule {}
