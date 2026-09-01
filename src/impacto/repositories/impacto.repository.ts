export type TotaisImpacto = {
  totalEntregas: number;
  pesoTotalKg: number;
  co2Evitado: number;
  aguaEconomizada: number;
  energiaEconomizada: number;
  pontosGerados: number;
};

export type EntregaResumida = {
  dataCriacao: Date;
  co2Evitado: number;
  aguaEconomizada: number;
  energiaEconomizada: number;
};

export type ImpactoPorMaterial = {
  materialId: string;
  nome: string;
  icone: string | null;
  pesoKg: number;
  itens: number;
};

// Consultas analiticas do painel de impacto.
// `usuarioId` opcional: sem ele, os numeros sao da plataforma inteira (admin).
export abstract class ImpactoRepository {
  abstract obterTotais(usuarioId?: string): Promise<TotaisImpacto>;
  abstract listarEntregasDesde(
    inicio: Date,
    usuarioId?: string,
  ): Promise<EntregaResumida[]>;
  abstract agruparPorMaterial(
    usuarioId?: string,
    limite?: number,
  ): Promise<ImpactoPorMaterial[]>;
}
