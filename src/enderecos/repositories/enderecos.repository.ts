import { Endereco } from '@prisma/client';

export type CriarEnderecoData = {
  usuarioId: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type AtualizarEnderecoData = Partial<
  Omit<CriarEnderecoData, 'usuarioId'>
>;

// Contrato de persistencia dos enderecos de coleta em domicilio
export abstract class EnderecosRepository {
  abstract criar(dados: CriarEnderecoData): Promise<Endereco>;
  abstract buscarPorId(id: string): Promise<Endereco | null>;
  abstract listarPorUsuario(usuarioId: string): Promise<Endereco[]>;
  abstract atualizar(
    id: string,
    dados: AtualizarEnderecoData,
  ): Promise<Endereco>;
  abstract remover(id: string): Promise<void>;
  // Um endereco usado em alguma entrega nao pode ser apagado
  abstract contarEntregas(enderecoId: string): Promise<number>;
}
