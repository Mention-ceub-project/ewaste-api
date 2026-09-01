import {
  Endereco,
  Entrega,
  EntregaMaterial,
  Material,
  PontoColeta,
  StatusEntrega,
  TipoEntrega,
} from '@prisma/client';

export type EntregaCompleta = Entrega & {
  materiais: (EntregaMaterial & { material: Material })[];
  pontoColeta: PontoColeta | null;
  endereco: Endereco | null;
  usuario: {
    id: string;
    nomeCompleto: string;
    email: string;
    telefone: string | null;
  };
};

export type ItemEntregaData = {
  materialId: string;
  quantidade: number;
  pesoKg: number;
};

export type CriarEntregaData = {
  usuarioId: string;
  tipoEntrega: TipoEntrega;
  pontoColetaId?: string | null;
  enderecoEntregaId?: string | null;
  observacao?: string | null;
  fotoUrl?: string | null;
  dataEntrega?: Date | null;
  // Snapshots calculados no momento do registro
  pontosGerados: number;
  co2Evitado: number;
  aguaEconomizada: number;
  energiaEconomizada: number;
  itens: ItemEntregaData[];
};

export type AtualizarStatusData = {
  status: StatusEntrega;
  confirmadoPor?: string | null;
  confirmadoEm?: Date | null;
};

export type ListarEntregasFiltros = {
  usuarioId?: string;
  pontosColetaIds?: string[];
  status?: StatusEntrega;
  tipoEntrega?: TipoEntrega;
  pagina: number;
  porPagina: number;
};

// Contrato de persistencia das entregas (descartes)
export abstract class EntregasRepository {
  abstract criar(dados: CriarEntregaData): Promise<EntregaCompleta>;
  abstract buscarPorId(id: string): Promise<EntregaCompleta | null>;
  abstract listar(
    filtros: ListarEntregasFiltros,
  ): Promise<{ itens: EntregaCompleta[]; total: number }>;
  abstract atualizarStatus(
    id: string,
    dados: AtualizarStatusData,
  ): Promise<EntregaCompleta>;
}
