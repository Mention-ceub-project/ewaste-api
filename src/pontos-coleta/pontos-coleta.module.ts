import { Module } from '@nestjs/common';
import { PontosColetaController } from './pontos-coleta.controller';
import { PontosColetaService } from './pontos-coleta.service';
import { PontosColetaRepository } from './repositories/pontos-coleta.repository';
import { PrismaPontosColetaRepository } from './repositories/prisma-pontos-coleta.repository';
import { MateriaisModule } from '../materiais/materiais.module';

@Module({
  imports: [MateriaisModule],
  controllers: [PontosColetaController],
  providers: [
    PontosColetaService,
    { provide: PontosColetaRepository, useClass: PrismaPontosColetaRepository },
  ],
  exports: [PontosColetaService, PontosColetaRepository],
})
export class PontosColetaModule {}
