import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { MateriaisService } from './materiais.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  atualizarMaterialSchema,
  AtualizarMaterialDto,
  criarMaterialSchema,
  CriarMaterialDto,
  listarMateriaisSchema,
  ListarMateriaisDto,
} from './dto/materiais.schemas';

@Controller('materiais')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

  // Catalogo consultado por qualquer usuario logado (usado no novo descarte)
  @Get()
  listar(
    @Query(new ZodValidationPipe(listarMateriaisSchema)) dto: ListarMateriaisDto,
  ) {
    return this.materiaisService.listar(dto);
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.materiaisService.buscarPorId(id);
  }

  @Post()
  @Roles(PapelUsuario.ADMIN)
  criar(@Body(new ZodValidationPipe(criarMaterialSchema)) dto: CriarMaterialDto) {
    return this.materiaisService.criar(dto);
  }

  @Patch(':id')
  @Roles(PapelUsuario.ADMIN)
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarMaterialSchema))
    dto: AtualizarMaterialDto,
  ) {
    return this.materiaisService.atualizar(id, dto);
  }

  // Desativa o material (remocao logica) para preservar o historico
  @Delete(':id')
  @Roles(PapelUsuario.ADMIN)
  remover(@Param('id', ParseUUIDPipe) id: string) {
    return this.materiaisService.remover(id);
  }
}
