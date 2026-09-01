import { z } from 'zod';

export const criarEnderecoSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  logradouro: z.string().min(2, 'Informe o logradouro'),
  numero: z.string().min(1, 'Informe o número'),
  complemento: z.string().max(120).nullable().optional(),
  bairro: z.string().min(2, 'Informe o bairro'),
  cidade: z.string().min(2, 'Informe a cidade'),
  estado: z.string().length(2, 'Use a sigla do estado (ex.: DF)'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const atualizarEnderecoSchema = criarEnderecoSchema.partial();

export type CriarEnderecoDto = z.infer<typeof criarEnderecoSchema>;
export type AtualizarEnderecoDto = z.infer<typeof atualizarEnderecoSchema>;
