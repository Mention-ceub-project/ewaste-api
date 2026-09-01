import { paraNumero } from '../../common/utils/decimal.util';
import { distanciaEmKm } from '../../common/utils/geo.util';
import { MaterialDto, paraMaterialDto } from '../../materiais/dto/material.dto';
import { PontoColetaCompleto } from '../repositories/pontos-coleta.repository';

export type PontoColetaDto = {
  id: string;
  nome: string;
  descricao: string | null;
  responsavel: string | null;
  telefoneContato: string | null;
  emailContato: string | null;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  latitude: number;
  longitude: number;
  horarioFuncionamento: string | null;
  ativo: boolean;
  criadoPor: string;
  materiaisAceitos: MaterialDto[];
  // Presente apenas quando o app envia a posicao do usuario na busca
  distanciaKm?: number;
};

export type Coordenada = { latitude: number; longitude: number };

export function paraPontoColetaDto(
  ponto: PontoColetaCompleto,
  origem?: Coordenada,
): PontoColetaDto {
  const latitude = paraNumero(ponto.latitude);
  const longitude = paraNumero(ponto.longitude);

  return {
    id: ponto.id,
    nome: ponto.nome,
    descricao: ponto.descricao,
    responsavel: ponto.responsavel,
    telefoneContato: ponto.telefoneContato,
    emailContato: ponto.emailContato,
    endereco: {
      rua: ponto.rua,
      numero: ponto.numero,
      bairro: ponto.bairro,
      cidade: ponto.cidade,
      estado: ponto.estado,
      cep: ponto.cep,
    },
    latitude,
    longitude,
    horarioFuncionamento: ponto.horarioFuncionamento,
    ativo: ponto.ativo,
    criadoPor: ponto.criadoPor,
    materiaisAceitos: ponto.materiaisAceitos.map((item) =>
      paraMaterialDto(item.material),
    ),
    ...(origem
      ? {
          distanciaKm: distanciaEmKm(
            origem.latitude,
            origem.longitude,
            latitude,
            longitude,
          ),
        }
      : {}),
  };
}
