import { z } from 'zod';
import { PapelUsuario } from '@prisma/client';

export const registrarSchema = z.object({
  nomeCompleto: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  telefone: z.string().min(8, 'Telefone inválido').max(20).optional(),
  papel: z.literal(PapelUsuario.DESCARTADOR).default(PapelUsuario.DESCARTADOR),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
});

export type RegistrarDto = z.infer<typeof registrarSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
