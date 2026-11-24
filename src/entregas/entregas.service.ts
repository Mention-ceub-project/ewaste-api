import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PapelUsuario, StatusEntrega, TipoEntrega } from '@prisma/client';
import { UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { MateriaisRepository } from '../materiais/repositories/materiais.repository';
import { PontosColetaService } from '../pontos-coleta/pontos-coleta.service';
import { PontosColetaRepository } from '../pontos-coleta/repositories/pontos-coleta.repository';
import { EnderecosService } from '../enderecos/enderecos.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import {
  EntregaCompleta,
  EntregasRepository,
  ListarEntregasFiltros,
} from './repositories/entregas.repository';
import { CalculoDescarteService } from './services/calculo-descarte.service';
import { EntregaDto, paraEntregaDto, paraRecebimentoDto } from './dto/entrega.dto';
import { CriarEntregaDto, ListarEntregasDto, ListarFilaEntregasDto } from './dto/entregas.schemas';

@Injectable()
export class EntregasService {
  constructor(
    private readonly entregas: EntregasRepository,
    private readonly materiais: MateriaisRepository,
    private readonly pontosColeta: PontosColetaService,
    private readonly pontosColetaRepo: PontosColetaRepository,
    private readonly enderecos: EnderecosService,
    private readonly notificacoes: NotificacoesService,
    private readonly calculo: CalculoDescarteService,
  ) {}

  // Registrar descarte: valida destino e materiais, calcula os snapshots de
  // pontuacao/impacto e avisa quem precisa saber.
  async criar(
    usuario: UsuarioAutenticado,
    dto: CriarEntregaDto,
  ): Promise<EntregaDto> {
    const materiaisIds = dto.itens.map((item) => item.materialId);
    const materiais = await this.materiais.buscarPorIds([
      ...new Set(materiaisIds),
    ]);

    if (materiais.length !== new Set(materiaisIds).size) {
      throw new BadRequestException('Um ou mais materiais não existem');
    }

    const inativo = materiais.find((material) => !material.ativo);
    if (inativo) {
      throw new BadRequestException(
        `O material "${inativo.nome}" não está mais disponível para descarte`,
      );
    }

    if (dto.tipoEntrega === TipoEntrega.PONTO_COLETA) {
      await this.pontosColeta.validarParaEntrega(
        dto.pontoColetaId as string,
        materiaisIds,
      );
    } else {
      await this.enderecos.buscarDoUsuarioOuFalhar(
        dto.enderecoEntregaId as string,
        usuario.id,
      );
    }

    const calculado = this.calculo.calcular(dto.itens, materiais);

    const entrega = await this.entregas.criar({
      usuarioId: usuario.id,
      tipoEntrega: dto.tipoEntrega,
      pontoColetaId:
        dto.tipoEntrega === TipoEntrega.PONTO_COLETA
          ? dto.pontoColetaId
          : null,
      enderecoEntregaId:
        dto.tipoEntrega === TipoEntrega.DOMICILIO
          ? dto.enderecoEntregaId
          : null,
      observacao: dto.observacao ?? null,
      fotoUrl: dto.fotoUrl ?? null,
      dataEntrega: dto.dataEntrega ?? null,
      pontosGerados: calculado.pontosGerados,
      co2Evitado: calculado.co2Evitado,
      aguaEconomizada: calculado.aguaEconomizada,
      energiaEconomizada: calculado.energiaEconomizada,
      itens: dto.itens,
    });

    await this.avisarSobreNovaEntrega(entrega, calculado.pesoTotalKg);

    return paraEntregaDto(entrega);
  }

  async listarMinhas(usuarioId: string, dto: ListarEntregasDto) {
    const { itens, total } = await this.entregas.listar({
      usuarioId,
      ...dto,
    });

    return {
      itens: itens.map(paraEntregaDto),
      total,
      pagina: dto.pagina,
      porPagina: dto.porPagina,
    };
  }

  // Fila da ONG: entregas pendentes destinadas aos pontos que ela mantem
  async listarPendentesDaOng(
    usuario: UsuarioAutenticado,
    dto: ListarFilaEntregasDto,
  ) {
    const filtros: ListarEntregasFiltros = {
      status: dto.status ?? StatusEntrega.PENDENTE,
      tipoEntrega: dto.tipoEntrega,
      pagina: dto.pagina,
      porPagina: dto.porPagina,
      pontosColetaIds: dto.pontoColetaId ? [dto.pontoColetaId] : undefined,
      dataInicial: dto.dataInicial,
      dataFinal: dto.dataFinal,
    };

    // O admin enxerga a fila inteira; a ONG so os proprios pontos
    if (usuario.papel !== PapelUsuario.ADMIN) {
      const meusPontos = await this.pontosColetaRepo.listar({
        criadoPor: usuario.id,
      });

      const pontosPermitidos = meusPontos
        .filter((ponto) => !dto.pontoColetaId || ponto.id === dto.pontoColetaId)
        .map((ponto) => ponto.id);

      if (pontosPermitidos.length === 0) {
        return { itens: [], total: 0, pagina: dto.pagina, porPagina: dto.porPagina };
      }

      filtros.pontosColetaIds = pontosPermitidos;
    }

    const { itens, total } = await this.entregas.listar(filtros);

    return {
      itens: itens.map(paraEntregaDto),
      total,
      pagina: dto.pagina,
      porPagina: dto.porPagina,
    };
  }

  async buscarPorId(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<EntregaDto> {
    const entrega = await this.buscarOuFalhar(id);
    await this.garantirVisualizacao(entrega, usuario);

    return this.podeGerenciar(entrega, usuario)
      ? paraRecebimentoDto(entrega)
      : paraEntregaDto(entrega);
  }

  // Confirmar recebimento: muda o status, credita os pontos e avisa o usuario
  async confirmar(
    id: string,
    usuario: UsuarioAutenticado,
    observacao?: string,
  ): Promise<EntregaDto> {
    const entrega = await this.buscarOuFalhar(id);
    this.garantirGestao(entrega, usuario, 'confirmar');
    const nota = observacao?.trim() || null;

    const confirmada = await this.entregas.confirmarPendente(id, {
      confirmadoPor: usuario.id,
      confirmadoEm: new Date(),
      observacaoConfirmacao: nota,
      credito: {
        usuarioId: entrega.usuarioId,
        pontos: entrega.pontosGerados,
        descricao: 'Descarte confirmado',
        entregaId: entrega.id,
        contarEntrega: true,
      },
      notificacao: {
        usuarioId: entrega.usuarioId,
        entregaId: entrega.id,
        titulo: 'Descarte confirmado',
        mensagem: `Sua entrega foi confirmada e você ganhou ${entrega.pontosGerados} pontos.${nota ? ` Observação: ${nota}` : ''}`,
      },
    });
    if (!confirmada) {
      throw new BadRequestException(
        'Somente entregas pendentes podem ser confirmadas',
      );
    }

    return paraRecebimentoDto(confirmada);
  }

  async recusar(
    id: string,
    usuario: UsuarioAutenticado,
    motivo: string,
  ): Promise<EntregaDto> {
    const entrega = await this.buscarOuFalhar(id);
    this.garantirGestao(entrega, usuario, 'recusar');

    const recusada = await this.entregas.atualizarStatusPendente(
      id,
      { status: StatusEntrega.CANCELADO, motivoRecusa: motivo },
      {
        usuarioId: entrega.usuarioId,
        entregaId: entrega.id,
        titulo: 'Entrega recusada',
        mensagem: `Sua entrega foi recusada. Motivo: ${motivo}`,
      },
    );
    if (!recusada) {
      throw new BadRequestException(
        'Somente entregas pendentes podem ser recusadas',
      );
    }

    return paraEntregaDto(recusada);
  }

  async cancelar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<EntregaDto> {
    const entrega = await this.buscarOuFalhar(id);

    const ehDono = entrega.usuarioId === usuario.id;
    if (!ehDono && usuario.papel !== PapelUsuario.ADMIN) {
      throw new ForbiddenException('Você só pode cancelar as suas entregas');
    }

    const ponto = entrega.pontoColeta;
    const cancelada = await this.entregas.atualizarStatusPendente(
      id,
      { status: StatusEntrega.CANCELADO },
      ponto
        ? {
            usuarioId: ponto.criadoPor,
            entregaId: entrega.id,
            titulo: 'Entrega cancelada',
            mensagem: `Uma entrega agendada para o ponto "${ponto.nome}" foi cancelada.`,
          }
        : undefined,
    );
    if (!cancelada) {
      throw new BadRequestException(
        'Somente entregas pendentes podem ser canceladas',
      );
    }

    return paraEntregaDto(cancelada);
  }

  private async avisarSobreNovaEntrega(
    entrega: EntregaCompleta,
    pesoTotalKg: number,
  ) {
    const avisos = [
      {
        usuarioId: entrega.usuarioId,
        entregaId: entrega.id,
        titulo: 'Descarte registrado',
        mensagem: `Seu descarte de ${pesoTotalKg} kg foi registrado e vale ${entrega.pontosGerados} pontos após a confirmação da coleta.`,
      },
    ];

    if (entrega.pontoColeta) {
      avisos.push({
        usuarioId: entrega.pontoColeta.criadoPor,
        entregaId: entrega.id,
        titulo: 'Nova entrega pendente',
        mensagem: `${entrega.usuario.nomeCompleto} registrou uma entrega para o ponto "${entrega.pontoColeta.nome}".`,
      });
    }

    await this.notificacoes.notificarVarios(avisos);
  }

  private async buscarOuFalhar(id: string): Promise<EntregaCompleta> {
    const entrega = await this.entregas.buscarPorId(id);
    if (!entrega) {
      throw new NotFoundException('Entrega não encontrada');
    }
    return entrega;
  }

  // Ve a entrega: o proprio descartador, o admin ou a ONG dona do ponto
  private async garantirVisualizacao(
    entrega: EntregaCompleta,
    usuario: UsuarioAutenticado,
  ) {
    if (
      entrega.usuarioId === usuario.id ||
      usuario.papel === PapelUsuario.ADMIN ||
      entrega.pontoColeta?.criadoPor === usuario.id
    ) {
      return;
    }

    throw new ForbiddenException(
      'Você não tem permissão para ver esta entrega',
    );
  }

  // Confirmação e recusa cabem ao admin ou à ONG dona do ponto de destino.
  // Entregas em domicilio ficam a cargo do admin enquanto nao ha ONG vinculada.
  private garantirGestao(
    entrega: EntregaCompleta,
    usuario: UsuarioAutenticado,
    acao: 'confirmar' | 'recusar',
  ) {
    if (this.podeGerenciar(entrega, usuario)) return;

    throw new ForbiddenException(
      `Somente a ONG responsável pelo ponto de coleta pode ${acao} esta entrega`,
    );
  }

  private podeGerenciar(entrega: EntregaCompleta, usuario: UsuarioAutenticado) {
    return usuario.papel === PapelUsuario.ADMIN ||
      (usuario.papel === PapelUsuario.MEMBRO_ONG && entrega.pontoColeta?.criadoPor === usuario.id);
  }
}
