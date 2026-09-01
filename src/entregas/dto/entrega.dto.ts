import { StatusEntrega, TipoEntrega } from '@prisma/client';
import { arredondar, paraNumero } from '../../common/utils/decimal.util';
import { EntregaCompleta } from '../repositories/entregas.repository';

export type ItemEntregaDto = {
  materialId: string;
  nome: string;
  icone: string | null;
  quantidade: number;
  pesoKg: number;
};

export type EntregaDto = {
  id: string;
  tipoEntrega: TipoEntrega;
  status: StatusEntrega;
  observacao: string | null;
  fotoUrl: string | null;
  pesoTotalKg: number;
  pontosGerados: number;
  impacto: {
    co2Evitado: number;
    aguaEconomizada: number;
    energiaEconomizada: number;
  };
  itens: ItemEntregaDto[];
  descartador: {
    id: string;
    nomeCompleto: string;
    email: string;
    telefone: string | null;
  };
  pontoColeta: {
    id: string;
    nome: string;
    endereco: string;
  } | null;
  enderecoEntrega: {
    id: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  } | null;
  confirmadoPor: string | null;
  confirmadoEm: Date | null;
  dataEntrega: Date | null;
  dataCriacao: Date;
};

export function paraEntregaDto(entrega: EntregaCompleta): EntregaDto {
  const itens = entrega.materiais.map((item) => ({
    materialId: item.materialId,
    nome: item.material.nome,
    icone: item.material.icone,
    quantidade: item.quantidade,
    pesoKg: paraNumero(item.pesoKg),
  }));

  return {
    id: entrega.id,
    tipoEntrega: entrega.tipoEntrega,
    status: entrega.status,
    observacao: entrega.observacao,
    fotoUrl: entrega.fotoUrl,
    pesoTotalKg: arredondar(
      itens.reduce((soma, item) => soma + item.pesoKg, 0),
    ),
    pontosGerados: entrega.pontosGerados,
    impacto: {
      co2Evitado: paraNumero(entrega.co2Evitado),
      aguaEconomizada: paraNumero(entrega.aguaEconomizada),
      energiaEconomizada: paraNumero(entrega.energiaEconomizada),
    },
    itens,
    descartador: entrega.usuario,
    pontoColeta: entrega.pontoColeta
      ? {
          id: entrega.pontoColeta.id,
          nome: entrega.pontoColeta.nome,
          endereco: `${entrega.pontoColeta.rua}, ${entrega.pontoColeta.numero} - ${entrega.pontoColeta.bairro}, ${entrega.pontoColeta.cidade}/${entrega.pontoColeta.estado}`,
        }
      : null,
    enderecoEntrega: entrega.endereco
      ? {
          id: entrega.endereco.id,
          logradouro: entrega.endereco.logradouro,
          numero: entrega.endereco.numero,
          bairro: entrega.endereco.bairro,
          cidade: entrega.endereco.cidade,
          estado: entrega.endereco.estado,
          cep: entrega.endereco.cep,
        }
      : null,
    confirmadoPor: entrega.confirmadoPor,
    confirmadoEm: entrega.confirmadoEm,
    dataEntrega: entrega.dataEntrega,
    dataCriacao: entrega.dataCriacao,
  };
}
