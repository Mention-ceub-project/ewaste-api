import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // carrega o .env globalmente
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
})
export class AppModule {}
