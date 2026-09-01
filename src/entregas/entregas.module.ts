import { Module } from '@nestjs/common';
import { EntregasController } from './entregas.controller';
import { EntregasService } from './entregas.service';
import { CalculoDescarteService } from './services/calculo-descarte.service';
import { EntregasRepository } from './repositories/entregas.repository';
import { PrismaEntregasRepository } from './repositories/prisma-entregas.repository';
import { MateriaisModule } from '../materiais/materiais.module';
import { PontosColetaModule } from '../pontos-coleta/pontos-coleta.module';
import { EnderecosModule } from '../enderecos/enderecos.module';
import { GamificacaoModule } from '../gamificacao/gamificacao.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [
    MateriaisModule,
    PontosColetaModule,
    EnderecosModule,
    GamificacaoModule,
    NotificacoesModule,
  ],
  controllers: [EntregasController],
  providers: [
    EntregasService,
    CalculoDescarteService,
    { provide: EntregasRepository, useClass: PrismaEntregasRepository },
  ],
  exports: [EntregasRepository],
})
export class EntregasModule {}
