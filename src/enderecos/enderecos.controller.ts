import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EnderecosService } from './enderecos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  atualizarEnderecoSchema,
  AtualizarEnderecoDto,
  criarEnderecoSchema,
  CriarEnderecoDto,
} from './dto/enderecos.schemas';

// Todas as rotas operam apenas sobre os enderecos do usuario logado
@Controller('enderecos')
@UseGuards(JwtAuthGuard)
export class EnderecosController {
  constructor(private readonly enderecosService: EnderecosService) {}

  @Get()
  listarMeus(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.enderecosService.listarMeus(usuario.id);
  }

  @Post()
  criar(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(criarEnderecoSchema)) dto: CriarEnderecoDto,
  ) {
    return this.enderecosService.criar(usuario.id, dto);
  }

  @Patch(':id')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body(new ZodValidationPipe(atualizarEnderecoSchema))
    dto: AtualizarEnderecoDto,
  ) {
    return this.enderecosService.atualizar(id, usuario.id, dto);
  }

  @Delete(':id')
  remover(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.enderecosService.remover(id, usuario.id);
  }
}
