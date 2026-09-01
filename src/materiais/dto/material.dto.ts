import { Material } from '@prisma/client';
import { paraNumero } from '../../common/utils/decimal.util';

// Converte os Decimal do Prisma em number antes de sair na resposta JSON
export type MaterialDto = {
  id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  pontosPorKg: number;
  nivelToxicidade: number;
  co2PorKg: number;
  aguaPorKg: number;
  energiaPorKg: number;
  ativo: boolean;
};

export function paraMaterialDto(material: Material): MaterialDto {
  return {
    id: material.id,
    nome: material.nome,
    descricao: material.descricao,
    icone: material.icone,
    pontosPorKg: material.pontosPorKg,
    nivelToxicidade: material.nivelToxicidade,
    co2PorKg: paraNumero(material.co2PorKg),
    aguaPorKg: paraNumero(material.aguaPorKg),
    energiaPorKg: paraNumero(material.energiaPorKg),
    ativo: material.ativo,
  };
}
