import { Module } from '@nestjs/common';
import { EnderecosController } from './enderecos.controller';
import { EnderecosService } from './enderecos.service';
import { EnderecosRepository } from './repositories/enderecos.repository';
import { PrismaEnderecosRepository } from './repositories/prisma-enderecos.repository';

@Module({
  controllers: [EnderecosController],
  providers: [
    EnderecosService,
    { provide: EnderecosRepository, useClass: PrismaEnderecosRepository },
  ],
  exports: [EnderecosService, EnderecosRepository],
})
export class EnderecosModule {}
