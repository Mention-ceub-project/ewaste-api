import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PapelUsuario } from '@prisma/client';
import { MateriaisRepository } from '../materiais/repositories/materiais.repository';
import { UsuarioAutenticado } from '../auth/decorators/current-user.decorator';
import { distanciaEmKm } from '../common/utils/geo.util';
import { paraNumero } from '../common/utils/decimal.util';
import {
  PontoColetaCompleto,
  PontosColetaRepository,
} from './repositories/pontos-coleta.repository';
import { paraPontoColetaDto, PontoColetaDto } from './dto/ponto-coleta.dto';
import {
  AtualizarPontoColetaDto,
  CriarPontoColetaDto,
  ListarPontosDto,
} from './dto/pontos-coleta.schemas';

@Injectable()
export class PontosColetaService {
  constructor(
    private readonly pontos: PontosColetaRepository,
    private readonly materiais: MateriaisRepository,
  ) {}

  async listar(
    dto: ListarPontosDto,
    usuario: UsuarioAutenticado,
  ): Promise<PontoColetaDto[]> {
    const encontrados = await this.pontos.listar({
      // Sem filtro explicito, o mapa mostra apenas os pontos ativos
      ativo: dto.ativo ?? true,
      cidade: dto.cidade,
      estado: dto.estado,
      materialId: dto.materialId,
      busca: dto.busca,
      criadoPor: dto.meus ? usuario.id : undefined,
    });

    const origem =
      dto.latitude !== undefined && dto.longitude !== undefined
        ? { latitude: dto.latitude, longitude: dto.longitude }
        : undefined;

    let resultado = encontrados.map((ponto) =>
      paraPontoColetaDto(ponto, origem),
    );

    if (origem) {
      // Com a posicao do usuario: filtra pelo raio e ordena do mais proximo
      if (dto.raioKm !== undefined) {
        resultado = resultado.filter(
          (ponto) => (ponto.distanciaKm as number) <= (dto.raioKm as number),
        );
      }
      resultado.sort(
        (a, b) => (a.distanciaKm as number) - (b.distanciaKm as number),
      );
    }

    return resultado;
  }

  async buscarPorId(
    id: string,
    origem?: { latitude?: number; longitude?: number },
  ): Promise<PontoColetaDto> {
    const ponto = await this.buscarOuFalhar(id);

    const coordenada =
      origem?.latitude !== undefined && origem?.longitude !== undefined
        ? { latitude: origem.latitude, longitude: origem.longitude }
        : undefined;

    return paraPontoColetaDto(ponto, coordenada);
  }

  async criar(
    dto: CriarPontoColetaDto,
    usuario: UsuarioAutenticado,
  ): Promise<PontoColetaDto> {
    await this.validarMateriais(dto.materiaisIds);

    const ponto = await this.pontos.criar({
      ...dto,
      criadoPor: usuario.id,
    });

    return paraPontoColetaDto(ponto);
  }

  async atualizar(
    id: string,
    dto: AtualizarPontoColetaDto,
    usuario: UsuarioAutenticado,
  ): Promise<PontoColetaDto> {
    const ponto = await this.buscarOuFalhar(id);
    this.garantirPermissao(ponto, usuario);

    return paraPontoColetaDto(await this.pontos.atualizar(id, dto));
  }

  // Desativacao logica: o ponto some do mapa mas o historico continua valido
  async desativar(
    id: string,
    usuario: UsuarioAutenticado,
  ): Promise<PontoColetaDto> {
    const ponto = await this.buscarOuFalhar(id);
    this.garantirPermissao(ponto, usuario);

    return paraPontoColetaDto(await this.pontos.atualizar(id, { ativo: false }));
  }

  async definirMateriais(
    id: string,
    materiaisIds: string[],
    usuario: UsuarioAutenticado,
  ): Promise<PontoColetaDto> {
    const ponto = await this.buscarOuFalhar(id);
    this.garantirPermissao(ponto, usuario);
    await this.validarMateriais(materiaisIds);

    return paraPontoColetaDto(
      await this.pontos.definirMateriais(id, [...new Set(materiaisIds)]),
    );
  }

  async obterMetricas(id: string, usuario: UsuarioAutenticado) {
    const ponto = await this.buscarOuFalhar(id);
    this.garantirPermissao(ponto, usuario);

    return this.pontos.obterMetricas(id);
  }

  // Usado pelas entregas: o ponto precisa estar ativo e aceitar os materiais
  async validarParaEntrega(
    pontoId: string,
    materiaisIds: string[],
  ): Promise<PontoColetaCompleto> {
    const ponto = await this.buscarOuFalhar(pontoId);

    if (!ponto.ativo) {
      throw new BadRequestException(
        'Este ponto de coleta não está aceitando entregas',
      );
    }

    // Ponto sem lista configurada aceita qualquer material
    if (ponto.materiaisAceitos.length > 0) {
      const aceitos = new Set(
        ponto.materiaisAceitos.map((item) => item.materialId),
      );
      const recusado = materiaisIds.find((id) => !aceitos.has(id));

      if (recusado) {
        const nome = ponto.materiaisAceitos.find(
          (item) => item.materialId === recusado,
        )?.material.nome;
        throw new BadRequestException(
          `Este ponto de coleta não aceita o material informado${nome ? `: ${nome}` : ''}`,
        );
      }
    }

    return ponto;
  }

  // Distancia em km entre um ponto e uma coordenada qualquer
  calcularDistancia(
    ponto: PontoColetaCompleto,
    origem: { latitude: number; longitude: number },
  ): number {
    return distanciaEmKm(
      origem.latitude,
      origem.longitude,
      paraNumero(ponto.latitude),
      paraNumero(ponto.longitude),
    );
  }

  private async validarMateriais(materiaisIds?: string[]) {
    if (!materiaisIds?.length) return;

    const encontrados = await this.materiais.buscarPorIds(materiaisIds);
    if (encontrados.length !== new Set(materiaisIds).size) {
      throw new BadRequestException(
        'Um ou mais materiais informados não existem',
      );
    }
  }

  private async buscarOuFalhar(id: string): Promise<PontoColetaCompleto> {
    const ponto = await this.pontos.buscarPorId(id);
    if (!ponto) {
      throw new NotFoundException('Ponto de coleta não encontrado');
    }
    return ponto;
  }

  // So a ONG que criou o ponto (ou um admin) pode administra-lo
  private garantirPermissao(
    ponto: PontoColetaCompleto,
    usuario: UsuarioAutenticado,
  ) {
    const ehDono = ponto.criadoPor === usuario.id;
    const ehAdmin = usuario.papel === PapelUsuario.ADMIN;

    if (!ehDono && !ehAdmin) {
      throw new ForbiddenException(
        'Você só pode gerenciar os pontos de coleta da sua ONG',
      );
    }
  }
}
