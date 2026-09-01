import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  listarNotificacoesSchema,
  ListarNotificacoesDto,
} from './dto/notificacoes.schemas';

@Controller('notificacoes')
@UseGuards(JwtAuthGuard)
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  listarMinhas(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(listarNotificacoesSchema))
    dto: ListarNotificacoesDto,
  ) {
    return this.notificacoesService.listarMinhas(usuario.id, dto);
  }

  // Rota fixa antes da rota com :id para nao ser capturada por ela
  @Patch('lidas')
  marcarTodasComoLidas(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.notificacoesService.marcarTodasComoLidas(usuario.id);
  }

  @Patch(':id/lida')
  marcarComoLida(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.notificacoesService.marcarComoLida(id, usuario.id);
  }
}
