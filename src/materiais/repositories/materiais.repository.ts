import { Material } from '@prisma/client';

export type CriarMaterialData = {
  nome: string;
  descricao?: string | null;
  icone?: string | null;
  pontosPorKg: number;
  nivelToxicidade: number;
  co2PorKg: number;
  aguaPorKg: number;
  energiaPorKg: number;
};

export type AtualizarMaterialData = Partial<CriarMaterialData> & {
  ativo?: boolean;
};

export type ListarMateriaisFiltros = {
  ativo?: boolean;
  busca?: string;
};

// Contrato de persistencia do catalogo de materiais
export abstract class MateriaisRepository {
  abstract criar(dados: CriarMaterialData): Promise<Material>;
  abstract buscarPorId(id: string): Promise<Material | null>;
  abstract buscarPorNome(nome: string): Promise<Material | null>;
  // Usado pelas entregas para carregar os fatores de todos os itens de uma vez
  abstract buscarPorIds(ids: string[]): Promise<Material[]>;
  abstract listar(filtros: ListarMateriaisFiltros): Promise<Material[]>;
  abstract atualizar(
    id: string,
    dados: AtualizarMaterialData,
  ): Promise<Material>;
}
