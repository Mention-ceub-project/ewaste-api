import { PapelUsuario } from '@prisma/client';
import { UsuarioComGamificacao } from '../repositories/usuarios.repository';

// Formato publico do usuario: nunca expoe senhaHash nem tokenVersion
export type UsuarioDto = {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone: string | null;
  papel: PapelUsuario;
  avatarUrl: string | null;
  pontosTotais: number;
  nivel: number;
  totalEntregas: number;
  dataCriacao: Date;
};

export function paraUsuarioDto(usuario: UsuarioComGamificacao): UsuarioDto {
  return {
    id: usuario.id,
    nomeCompleto: usuario.nomeCompleto,
    email: usuario.email,
    telefone: usuario.telefone,
    papel: usuario.papel,
    avatarUrl: usuario.avatarUrl,
    pontosTotais: usuario.gamificacao?.pontosTotais ?? 0,
    nivel: usuario.gamificacao?.nivel ?? 1,
    totalEntregas: usuario.gamificacao?.totalEntregas ?? 0,
    dataCriacao: usuario.dataCriacao,
  };
}
