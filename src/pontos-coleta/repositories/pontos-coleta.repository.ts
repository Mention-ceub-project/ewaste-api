import { Material, PontoColeta, PontoMaterial } from '@prisma/client';

export type PontoColetaCompleto = PontoColeta & {
  materiaisAceitos: (PontoMaterial & { material: Material })[];
};

export type CriarPontoColetaData = {
  nome: string;
  descricao?: string | null;
  responsavel?: string | null;
  telefoneContato?: string | null;
  emailContato?: string | null;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number;
  longitude: number;
  horarioFuncionamento?: string | null;
  criadoPor: string;
  materiaisIds?: string[];
};

export type AtualizarPontoColetaData = Partial<
  Omit<CriarPontoColetaData, 'criadoPor' | 'materiaisIds'>
> & { ativo?: boolean };

export type ListarPontosFiltros = {
  ativo?: boolean;
  cidade?: string;
  estado?: string;
  materialId?: string;
  criadoPor?: string;
  busca?: string;
};

export type MetricasPonto = {
  totalEntregas: number;
  entregasPendentes: number;
  entregasColetadas: number;
  pesoTotalKg: number;
  co2EvitadoKg: number;
};

// Contrato de persistencia dos pontos de coleta mantidos pelas ONGs
export abstract class PontosColetaRepository {
  abstract criar(dados: CriarPontoColetaData): Promise<PontoColetaCompleto>;
  abstract buscarPorId(id: string): Promise<PontoColetaCompleto | null>;
  abstract listar(filtros: ListarPontosFiltros): Promise<PontoColetaCompleto[]>;
  abstract atualizar(
    id: string,
    dados: AtualizarPontoColetaData,
  ): Promise<PontoColetaCompleto>;
  // Substitui a lista inteira de materiais aceitos pelo ponto
  abstract definirMateriais(
    pontoId: string,
    materiaisIds: string[],
  ): Promise<PontoColetaCompleto>;
  abstract obterMetricas(pontoId: string): Promise<MetricasPonto>;
}
