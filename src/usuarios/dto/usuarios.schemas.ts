import { z } from 'zod';
import { PapelUsuario } from '@prisma/client';

export const atualizarPerfilSchema = z
  .object({
    nomeCompleto: z
      .string()
      .min(2, 'O nome deve ter pelo menos 2 caracteres')
      .optional(),
    telefone: z
      .string()
      .min(8, 'Telefone inválido')
      .max(20, 'Telefone inválido')
      .nullable()
      .optional(),
    avatarUrl: z.string().url('URL do avatar inválida').nullable().optional(),
    senhaAtual: z.string().min(1).optional(),
    novaSenha: z
      .string()
      .min(6, 'A nova senha deve ter pelo menos 6 caracteres')
      .optional(),
  })
  // Trocar a senha exige confirmar a senha atual
  .refine((dados) => !dados.novaSenha || !!dados.senhaAtual, {
    message: 'Informe a senha atual para definir uma nova senha',
    path: ['senhaAtual'],
  });

export const listarUsuariosSchema = z.object({
  papel: z.nativeEnum(PapelUsuario).optional(),
  busca: z.string().trim().min(1).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export const alterarPapelSchema = z.object({
  papel: z.nativeEnum(PapelUsuario),
});

export type AtualizarPerfilDto = z.infer<typeof atualizarPerfilSchema>;
export type ListarUsuariosDto = z.infer<typeof listarUsuariosSchema>;
export type AlterarPapelDto = z.infer<typeof alterarPapelSchema>;
