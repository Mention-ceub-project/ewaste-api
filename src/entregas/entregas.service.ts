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
import { GamificacaoService } from '../gamificacao/gamificacao.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import {
  EntregaCompleta,
  EntregasRepository,
} from './repositories/entregas.repository';
import { CalculoDescarteService } from './services/calculo-descarte.service';
import { EntregaDto, paraEntregaDto } from './dto/entrega.dto';
import { CriarEntregaDto, ListarEntregasDto } from './dto/entregas.schemas';

@Injectable()
export class EntregasService {
  constructor(
    private readonly entregas: EntregasRepository,
    private readonly materiais: MateriaisRepository,
    private readonly pontosColeta: PontosColetaService,
    private readonly pontosColetaRepo: PontosColetaRepository,
    private readonly enderecos: EnderecosService,
    private readonly gamificacao: GamificacaoService,
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
    dto: ListarEntregasDto,
  ) {
    const filtros = {
      status: dto.status ?? StatusEntrega.PENDENTE,
      tipoEntrega: dto.tipoEntrega,
      pagina: dto.pagina,
      porPagina: dto.porPagina,
    };

    // O admin enxerga a fila inteira; a ONG so os proprios pontos
    if (usuario.papel !== PapelUsuario.ADMIN) {
      const meusPontos = await this.pontosColetaRepo.listar({
        criadoPor: usuario.id,
      });

      if (meusPontos.length === 0) {
        return { itens: [], total: 0, pagina: dto.pagina, porPagina: dto.porPagina };
      }

      Object.assign(filtros, {
        pontosColetaIds: meusPontos.map((ponto) => ponto.id),
      });
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

    return paraEntregaDto(entrega);
  }

  // Confirmar recebimento: muda o status, credita os pontos e avisa o usuario
  async confirmar(
    id: string,
    usuario: UsuarioAutenticado,
    observacao?: string,
  ): Promise<EntregaDto> {
    const entrega = await this.buscarOuFalhar(id);
    await this.garantirConfirmacao(entrega, usuario);

    if (entrega.status !== StatusEntrega.PENDENTE) {
      throw new BadRequestException(
        'Somente entregas pendentes podem ser confirmadas',
      );
    }

    const confirmada = await this.entregas.atualizarStatus(id, {
      status: StatusEntrega.COLETADO,
      confirmadoPor: usuario.id,
      confirmadoEm: new Date(),
    });

    // Os pontos so entram no saldo depois que a coleta e confirmada
    await this.gamificacao.creditarPontos({
      usuarioId: confirmada.usuarioId,
      pontos: confirmada.pontosGerados,
      descricao: 'Descarte confirmado',
      entregaId: confirmada.id,
      contarEntrega: true,
    });

    await this.notificacoes.notificar({
      usuarioId: confirmada.usuarioId,
      titulo: 'Descarte confirmado',
      mensagem: `Sua entrega foi confirmada e você ganhou ${confirmada.pontosGerados} pontos.${observacao ? ` Observação: ${observacao}` : ''}`,
    });

    return paraEntregaDto(confirmada);
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

    if (entrega.status !== StatusEntrega.PENDENTE) {
      throw new BadRequestException(
        'Somente entregas pendentes podem ser canceladas',
      );
    }

    const cancelada = await this.entregas.atualizarStatus(id, {
      status: StatusEntrega.CANCELADO,
    });

    // Avisa a ONG que estava esperando a entrega naquele ponto
    if (cancelada.pontoColeta) {
      await this.notificacoes.notificar({
        usuarioId: cancelada.pontoColeta.criadoPor,
        titulo: 'Entrega cancelada',
        mensagem: `Uma entrega agendada para o ponto "${cancelada.pontoColeta.nome}" foi cancelada.`,
      });
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
        titulo: 'Descarte registrado',
        mensagem: `Seu descarte de ${pesoTotalKg} kg foi registrado e vale ${entrega.pontosGerados} pontos após a confirmação da coleta.`,
      },
    ];

    if (entrega.pontoColeta) {
      avisos.push({
        usuarioId: entrega.pontoColeta.criadoPor,
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

  // Confirma a coleta: o admin ou a ONG dona do ponto de destino.
  // Entregas em domicilio ficam a cargo do admin enquanto nao ha ONG vinculada.
  private async garantirConfirmacao(
    entrega: EntregaCompleta,
    usuario: UsuarioAutenticado,
  ) {
    if (usuario.papel === PapelUsuario.ADMIN) return;

    if (
      usuario.papel === PapelUsuario.MEMBRO_ONG &&
      entrega.pontoColeta?.criadoPor === usuario.id
    ) {
      return;
    }

    throw new ForbiddenException(
      'Somente a ONG responsável pelo ponto de coleta pode confirmar esta entrega',
    );
  }
}
