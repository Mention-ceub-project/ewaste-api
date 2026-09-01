import { Injectable } from '@nestjs/common';
import { arredondar } from '../common/utils/decimal.util';
import { ImpactoRepository } from './repositories/impacto.repository';

export type PontoGrafico = {
  mes: string; // AAAA-MM
  co2Evitado: number;
  aguaEconomizada: number;
  energiaEconomizada: number;
  entregas: number;
};

@Injectable()
export class ImpactoService {
  constructor(private readonly impacto: ImpactoRepository) {}

  // Painel do usuario (CO2, agua, energia) com evolucao mensal e top materiais
  async verPainel(usuarioId: string, meses: number) {
    return this.montarPainel(meses, usuarioId);
  }

  // Mesmo painel considerando a plataforma inteira (uso administrativo)
  async verPainelGeral(meses: number) {
    return this.montarPainel(meses);
  }

  private async montarPainel(meses: number, usuarioId?: string) {
    const inicio = this.inicioDaSerie(meses);

    const [totais, entregas, porMaterial] = await Promise.all([
      this.impacto.obterTotais(usuarioId),
      this.impacto.listarEntregasDesde(inicio, usuarioId),
      this.impacto.agruparPorMaterial(usuarioId),
    ]);

    return {
      totais,
      evolucaoMensal: this.montarSerie(entregas, meses),
      porMaterial,
    };
  }

  private inicioDaSerie(meses: number): Date {
    const agora = new Date();
    return new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - (meses - 1), 1),
    );
  }

  private montarSerie(
    entregas: {
      dataCriacao: Date;
      co2Evitado: number;
      aguaEconomizada: number;
      energiaEconomizada: number;
    }[],
    meses: number,
  ): PontoGrafico[] {
    // Todos os meses do periodo entram no grafico, mesmo os sem descarte
    const serie = new Map<string, PontoGrafico>();
    const agora = new Date();

    for (let i = meses - 1; i >= 0; i--) {
      const data = new Date(
        Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 1),
      );
      const chave = this.chaveMes(data);
      serie.set(chave, {
        mes: chave,
        co2Evitado: 0,
        aguaEconomizada: 0,
        energiaEconomizada: 0,
        entregas: 0,
      });
    }

    for (const entrega of entregas) {
      const ponto = serie.get(this.chaveMes(entrega.dataCriacao));
      if (!ponto) continue;

      ponto.co2Evitado += entrega.co2Evitado;
      ponto.aguaEconomizada += entrega.aguaEconomizada;
      ponto.energiaEconomizada += entrega.energiaEconomizada;
      ponto.entregas += 1;
    }

    return [...serie.values()].map((ponto) => ({
      ...ponto,
      co2Evitado: arredondar(ponto.co2Evitado),
      aguaEconomizada: arredondar(ponto.aguaEconomizada),
      energiaEconomizada: arredondar(ponto.energiaEconomizada),
    }));
  }

  private chaveMes(data: Date): string {
    const mes = `${data.getUTCMonth() + 1}`.padStart(2, '0');
    return `${data.getUTCFullYear()}-${mes}`;
  }
}
