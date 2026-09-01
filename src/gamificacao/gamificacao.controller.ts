import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GamificacaoService } from './gamificacao.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  UsuarioAutenticado,
} from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  listarHistoricoSchema,
  ListarHistoricoDto,
  rankingSchema,
  RankingDto,
} from './dto/gamificacao.schemas';

@Controller('gamificacao')
@UseGuards(JwtAuthGuard)
export class GamificacaoController {
  constructor(private readonly gamificacaoService: GamificacaoService) {}

  // Pontos, nivel e progresso do usuario logado
  @Get('me')
  minhaPontuacao(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.gamificacaoService.verMinhaPontuacao(usuario.id);
  }

  @Get('ranking')
  ranking(@Query(new ZodValidationPipe(rankingSchema)) dto: RankingDto) {
    return this.gamificacaoService.verRanking(dto.limite);
  }

  // Extrato de pontos (ledger) do usuario logado
  @Get('historico')
  historico(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Query(new ZodValidationPipe(listarHistoricoSchema))
    dto: ListarHistoricoDto,
  ) {
    return this.gamificacaoService.verHistorico(usuario.id, dto);
  }
}
