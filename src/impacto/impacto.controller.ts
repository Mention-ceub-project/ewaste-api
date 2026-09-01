import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { ImpactoService } from './impacto.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  painelImpactoSchema,
  PainelImpactoDto,
} from './dto/impacto.schemas';

@Controller('impacto')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImpactoController {
  constructor(private readonly impactoService: ImpactoService) {}

  // Painel de impacto ambiental do usuario logado
  @Get('me')
  meuPainel(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(painelImpactoSchema)) dto: PainelImpactoDto,
  ) {
    return this.impactoService.verPainel(usuario.id, dto.meses);
  }

  // Numeros consolidados da plataforma
  @Get('geral')
  @Roles(PapelUsuario.ADMIN)
  painelGeral(
    @Query(new ZodValidationPipe(painelImpactoSchema)) dto: PainelImpactoDto,
  ) {
    return this.impactoService.verPainelGeral(dto.meses);
  }
}
