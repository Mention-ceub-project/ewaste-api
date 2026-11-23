import { describe, expect, it } from 'vitest';
import { Material, Prisma } from '@prisma/client';
import { CalculoDescarteService } from './calculo-descarte.service';

function material(dados: {
  id: string;
  pontosPorKg: number;
  nivelToxicidade: number;
  co2PorKg?: number;
  aguaPorKg?: number;
  energiaPorKg?: number;
}): Material {
  return {
    id: dados.id,
    nome: dados.id,
    descricao: null,
    icone: null,
    pontosPorKg: dados.pontosPorKg,
    nivelToxicidade: dados.nivelToxicidade,
    co2PorKg: new Prisma.Decimal(dados.co2PorKg ?? 0),
    aguaPorKg: new Prisma.Decimal(dados.aguaPorKg ?? 0),
    energiaPorKg: new Prisma.Decimal(dados.energiaPorKg ?? 0),
    ativo: true,
    dataCriacao: new Date(),
  };
}

// Mesmos fatores do seed
const PILHAS = material({ id: 'pilhas', pontosPorKg: 240, nivelToxicidade: 5, co2PorKg: 1.1, aguaPorKg: 32, energiaPorKg: 4.8 });
const COMPUTADOR = material({ id: 'computador', pontosPorKg: 70, nivelToxicidade: 3, co2PorKg: 0.53, aguaPorKg: 14.5, energiaPorKg: 2.2 });

describe('CalculoDescarteService', () => {
  const calculo = new CalculoDescarteService();

  it('aplica o bônus de 15% por nível de toxicidade acima de 1', () => {
    // 1 kg × 240 pts/kg × (1 + 4 × 0,15) = 384
    const resultado = calculo.calcular([{ materialId: 'pilhas', quantidade: 1, pesoKg: 1 }], [PILHAS]);

    expect(resultado).toEqual({
      pontosGerados: 384,
      co2Evitado: 1.1,
      aguaEconomizada: 32,
      energiaEconomizada: 4.8,
      pesoTotalKg: 1,
    });
  });

  it('não dá bônus para material de toxicidade 1', () => {
    const papel = material({ id: 'baixa', pontosPorKg: 100, nivelToxicidade: 1 });

    const resultado = calculo.calcular([{ materialId: 'baixa', quantidade: 1, pesoKg: 2 }], [papel]);

    expect(resultado.pontosGerados).toBe(200);
  });

  it('soma pontos e impacto de vários itens da mesma entrega', () => {
    // Pilhas: 384 · Computador: 5 × 70 × 1,3 = 455
    const resultado = calculo.calcular(
      [
        { materialId: 'pilhas', quantidade: 2, pesoKg: 1 },
        { materialId: 'computador', quantidade: 1, pesoKg: 5 },
      ],
      [PILHAS, COMPUTADOR],
    );

    expect(resultado.pontosGerados).toBe(839);
    expect(resultado.pesoTotalKg).toBe(6);
    expect(resultado.co2Evitado).toBe(3.75); // 1,1 + 5 × 0,53
    expect(resultado.aguaEconomizada).toBe(104.5); // 32 + 5 × 14,5
    expect(resultado.energiaEconomizada).toBe(15.8); // 4,8 + 5 × 2,2
  });

  it('arredonda o impacto em três casas decimais', () => {
    const resultado = calculo.calcular([{ materialId: 'computador', quantidade: 1, pesoKg: 0.333 }], [COMPUTADOR]);

    expect(resultado.co2Evitado).toBe(0.176); // 0,333 × 0,53 = 0,17649
    expect(resultado.pesoTotalKg).toBe(0.333);
  });

  it('ignora itens cujo material não foi carregado', () => {
    const resultado = calculo.calcular(
      [
        { materialId: 'pilhas', quantidade: 1, pesoKg: 1 },
        { materialId: 'desconhecido', quantidade: 1, pesoKg: 10 },
      ],
      [PILHAS],
    );

    expect(resultado.pontosGerados).toBe(384);
    expect(resultado.pesoTotalKg).toBe(1);
  });
});
