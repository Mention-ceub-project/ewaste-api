import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CriarNotificacaoData,
  NotificacoesRepository,
} from './repositories/notificacoes.repository';
import { NotificacaoDto, paraNotificacaoDto } from './dto/notificacao.dto';
import { ListarNotificacoesDto } from './dto/notificacoes.schemas';

@Injectable()
export class NotificacoesService {
  constructor(private readonly notificacoes: NotificacoesRepository) {}

  async listarMinhas(usuarioId: string, dto: ListarNotificacoesDto) {
    const { itens, total, naoLidas } = await this.notificacoes.listar({
      usuarioId,
      ...dto,
    });

    return {
      itens: itens.map(paraNotificacaoDto),
      total,
      naoLidas,
      pagina: dto.pagina,
      porPagina: dto.porPagina,
    };
  }

  async marcarComoLida(id: string, usuarioId: string): Promise<NotificacaoDto> {
    const notificacao = await this.notificacoes.buscarPorId(id);

    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }
    if (notificacao.usuarioId !== usuarioId) {
      throw new ForbiddenException('Esta notificação não pertence a você');
    }

    return paraNotificacaoDto(await this.notificacoes.marcarComoLida(id));
  }

  async marcarTodasComoLidas(usuarioId: string) {
    const atualizadas = await this.notificacoes.marcarTodasComoLidas(usuarioId);
    return { atualizadas };
  }

  // Usado pelos outros modulos (ex.: entregas) para avisar o usuario
  async notificar(dados: CriarNotificacaoData): Promise<void> {
    await this.notificacoes.criar(dados);
  }

  async notificarVarios(dados: CriarNotificacaoData[]): Promise<void> {
    await this.notificacoes.criarVarias(dados);
  }
}
