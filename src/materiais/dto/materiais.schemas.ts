import { z } from 'zod';

export const criarMaterialSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  descricao: z.string().max(500).nullable().optional(),
  icone: z.string().max(80).nullable().optional(),
  pontosPorKg: z.number().int().min(0).default(0),
  nivelToxicidade: z
    .number()
    .int()
    .min(1, 'A toxicidade vai de 1 a 5')
    .max(5, 'A toxicidade vai de 1 a 5')
    .default(1),
  co2PorKg: z.number().min(0).default(0),
  aguaPorKg: z.number().min(0).default(0),
  energiaPorKg: z.number().min(0).default(0),
});

export const atualizarMaterialSchema = criarMaterialSchema
  .partial()
  .extend({ ativo: z.boolean().optional() });

export const listarMateriaisSchema = z.object({
  // Por padrao o app so quer os materiais ativos
  ativo: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  busca: z.string().trim().min(1).optional(),
});

export type CriarMaterialDto = z.infer<typeof criarMaterialSchema>;
export type AtualizarMaterialDto = z.infer<typeof atualizarMaterialSchema>;
export type ListarMateriaisDto = z.infer<typeof listarMateriaisSchema>;
