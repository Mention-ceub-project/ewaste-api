import { Injectable } from '@nestjs/common';
import { Material } from '@prisma/client';
import { arredondar, paraNumero } from '../../common/utils/decimal.util';
import { ItemEntregaData } from '../repositories/entregas.repository';

export type ResultadoCalculo = {
  pontosGerados: number;
  co2Evitado: number;
  aguaEconomizada: number;
  energiaEconomizada: number;
  pesoTotalKg: number;
};

// Cada nivel de toxicidade acima de 1 aumenta a pontuacao em 15%:
// descartar o que polui mais vale mais pontos.
const BONUS_POR_NIVEL_TOXICIDADE = 0.15;

// Responsabilidade unica: transformar itens + fatores do material nos
// snapshots de pontuacao e impacto gravados na entrega.
@Injectable()
export class CalculoDescarteService {
  calcular(
    itens: ItemEntregaData[],
    materiais: Material[],
  ): ResultadoCalculo {
    const porId = new Map(materiais.map((material) => [material.id, material]));

    const total: ResultadoCalculo = {
      pontosGerados: 0,
      co2Evitado: 0,
      aguaEconomizada: 0,
      energiaEconomizada: 0,
      pesoTotalKg: 0,
    };

    for (const item of itens) {
      const material = porId.get(item.materialId);
      if (!material) continue;

      const peso = item.pesoKg;
      const multiplicador =
        1 + (material.nivelToxicidade - 1) * BONUS_POR_NIVEL_TOXICIDADE;

      total.pontosGerados += Math.round(
        peso * material.pontosPorKg * multiplicador,
      );
      total.co2Evitado += peso * paraNumero(material.co2PorKg);
      total.aguaEconomizada += peso * paraNumero(material.aguaPorKg);
      total.energiaEconomizada += peso * paraNumero(material.energiaPorKg);
      total.pesoTotalKg += peso;
    }

    return {
      pontosGerados: total.pontosGerados,
      co2Evitado: arredondar(total.co2Evitado),
      aguaEconomizada: arredondar(total.aguaEconomizada),
      energiaEconomizada: arredondar(total.energiaEconomizada),
      pesoTotalKg: arredondar(total.pesoTotalKg),
    };
  }
}
