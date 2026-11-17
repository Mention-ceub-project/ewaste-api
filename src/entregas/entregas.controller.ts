import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { EntregasService } from './entregas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  confirmarEntregaSchema,
  ConfirmarEntregaDto,
  criarEntregaSchema,
  CriarEntregaDto,
  listarEntregasSchema,
  ListarEntregasDto,
  recusarEntregaSchema,
  RecusarEntregaDto,
} from './dto/entregas.schemas';

@Controller('entregas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EntregasController {
  constructor(private readonly entregasService: EntregasService) {}

  @Post()
  criar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(criarEntregaSchema)) dto: CriarEntregaDto,
  ) {
    return this.entregasService.criar(usuario, dto);
  }

  // Historico de descartes do usuario logado
  @Get()
  listarMinhas(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(listarEntregasSchema)) dto: ListarEntregasDto,
  ) {
    return this.entregasService.listarMinhas(usuario.id, dto);
  }

  // Fila da ONG (rota fixa declarada antes de :id)
  @Get('pendentes')
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  listarPendentes(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(listarEntregasSchema)) dto: ListarEntregasDto,
  ) {
    return this.entregasService.listarPendentesDaOng(usuario, dto);
  }

  @Get(':id')
  buscarPorId(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.entregasService.buscarPorId(id, usuario);
  }

  @Patch(':id/confirmar')
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  confirmar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(confirmarEntregaSchema))
    dto: ConfirmarEntregaDto,
  ) {
    return this.entregasService.confirmar(id, usuario, dto.observacao);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.entregasService.cancelar(id, usuario);
  }

  @Patch(':id/recusar')
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  recusar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(recusarEntregaSchema)) dto: RecusarEntregaDto,
  ) {
    return this.entregasService.recusar(id, usuario, dto.motivo);
  }
}
