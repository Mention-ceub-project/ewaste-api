import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { UsuariosRepository } from './repositories/usuarios.repository';
import { PrismaUsuariosRepository } from './repositories/prisma-usuarios.repository';

@Module({
  controllers: [UsuariosController],
  providers: [
    UsuariosService,
    // A abstracao e o token de injecao; a implementacao Prisma e o detalhe
    { provide: UsuariosRepository, useClass: PrismaUsuariosRepository },
  ],
  exports: [UsuariosService, UsuariosRepository],
})
export class UsuariosModule {}
