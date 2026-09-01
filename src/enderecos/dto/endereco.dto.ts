import { Endereco } from '@prisma/client';
import { paraNumeroOuNulo } from '../../common/utils/decimal.util';

export type EnderecoDto = {
  id: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  dataCriacao: Date;
};

export function paraEnderecoDto(endereco: Endereco): EnderecoDto {
  return {
    id: endereco.id,
    cep: endereco.cep,
    logradouro: endereco.logradouro,
    numero: endereco.numero,
    complemento: endereco.complemento,
    bairro: endereco.bairro,
    cidade: endereco.cidade,
    estado: endereco.estado,
    latitude: paraNumeroOuNulo(endereco.latitude),
    longitude: paraNumeroOuNulo(endereco.longitude),
    dataCriacao: endereco.dataCriacao,
  };
}
