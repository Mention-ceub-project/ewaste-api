import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  alterarPapelSchema,
  AlterarPapelDto,
  atualizarPerfilSchema,
  AtualizarPerfilDto,
  listarUsuariosSchema,
  ListarUsuariosDto,
} from './dto/usuarios.schemas';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Perfil do usuario logado
  @Get('me')
  verPerfil(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usuariosService.verPerfil(usuario.id);
  }

  @Patch('me')
  atualizarPerfil(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(atualizarPerfilSchema)) dto: AtualizarPerfilDto,
  ) {
    return this.usuariosService.atualizarPerfil(usuario.id, dto);
  }

  @Get()
  @Roles(PapelUsuario.ADMIN)
  listar(
    @Query(new ZodValidationPipe(listarUsuariosSchema)) dto: ListarUsuariosDto,
  ) {
    return this.usuariosService.listar(dto);
  }

  @Get(':id')
  @Roles(PapelUsuario.ADMIN)
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.buscarPorId(id);
  }

  // Promove/rebaixa um usuario (ex.: transformar em MEMBRO_ONG ou ADMIN)
  @Patch(':id/papel')
  @Roles(PapelUsuario.ADMIN)
  alterarPapel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(alterarPapelSchema)) dto: AlterarPapelDto,
  ) {
    return this.usuariosService.alterarPapel(id, dto.papel);
  }
}
