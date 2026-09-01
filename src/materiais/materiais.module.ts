import { Module } from '@nestjs/common';
import { MateriaisController } from './materiais.controller';
import { MateriaisService } from './materiais.service';
import { MateriaisRepository } from './repositories/materiais.repository';
import { PrismaMateriaisRepository } from './repositories/prisma-materiais.repository';

@Module({
  controllers: [MateriaisController],
  providers: [
    MateriaisService,
    { provide: MateriaisRepository, useClass: PrismaMateriaisRepository },
  ],
  exports: [MateriaisRepository],
})
export class MateriaisModule {}
