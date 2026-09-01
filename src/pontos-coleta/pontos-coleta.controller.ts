import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { PontosColetaService } from './pontos-coleta.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  atualizarPontoColetaSchema,
  AtualizarPontoColetaDto,
  criarPontoColetaSchema,
  CriarPontoColetaDto,
  definirMateriaisSchema,
  DefinirMateriaisDto,
  listarPontosSchema,
  ListarPontosDto,
} from './dto/pontos-coleta.schemas';

@Controller('pontos-coleta')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PontosColetaController {
  constructor(private readonly pontosService: PontosColetaService) {}

  // Mapa: aceita latitude/longitude para devolver a distancia e ordenar
  @Get()
  listar(
    @Query(new ZodValidationPipe(listarPontosSchema)) dto: ListarPontosDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pontosService.listar(dto, usuario);
  }

  @Get(':id')
  buscarPorId(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(listarPontosSchema)) dto: ListarPontosDto,
  ) {
    return this.pontosService.buscarPorId(id, {
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
  }

  @Get(':id/metricas')
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  metricas(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pontosService.obterMetricas(id, usuario);
  }

  @Post()
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  criar(
    @Body(new ZodValidationPipe(criarPontoColetaSchema))
    dto: CriarPontoColetaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pontosService.criar(dto, usuario);
  }

  @Patch(':id')
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarPontoColetaSchema))
    dto: AtualizarPontoColetaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pontosService.atualizar(id, dto, usuario);
  }

  // Substitui a lista de materiais aceitos pelo ponto
  @Put(':id/materiais')
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  definirMateriais(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(definirMateriaisSchema))
    dto: DefinirMateriaisDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pontosService.definirMateriais(id, dto.materiaisIds, usuario);
  }

  @Delete(':id')
  @Roles(PapelUsuario.MEMBRO_ONG, PapelUsuario.ADMIN)
  desativar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pontosService.desativar(id, usuario);
  }
}
