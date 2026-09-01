import { GamificacaoUsuario, PapelUsuario, Usuario } from '@prisma/client';

export type UsuarioComGamificacao = Usuario & {
  gamificacao: GamificacaoUsuario | null;
};

export type CriarUsuarioData = {
  nomeCompleto: string;
  email: string;
  senhaHash: string;
  telefone?: string | null;
  papel: PapelUsuario;
};

export type AtualizarUsuarioData = Partial<{
  nomeCompleto: string;
  telefone: string | null;
  avatarUrl: string | null;
  senhaHash: string;
  papel: PapelUsuario;
}>;

export type ListarUsuariosFiltros = {
  papel?: PapelUsuario;
  busca?: string;
  pagina: number;
  porPagina: number;
};

// Contrato de persistencia de usuarios (Dependency Inversion): os services
// dependem desta abstracao, nunca do Prisma direto.
export abstract class UsuariosRepository {
  abstract criar(dados: CriarUsuarioData): Promise<UsuarioComGamificacao>;
  abstract buscarPorId(id: string): Promise<UsuarioComGamificacao | null>;
  abstract buscarPorEmail(email: string): Promise<UsuarioComGamificacao | null>;
  abstract atualizar(
    id: string,
    dados: AtualizarUsuarioData,
  ): Promise<UsuarioComGamificacao>;
  abstract incrementarTokenVersion(id: string): Promise<void>;
  abstract listar(
    filtros: ListarUsuariosFiltros,
  ): Promise<{ itens: UsuarioComGamificacao[]; total: number }>;
}
