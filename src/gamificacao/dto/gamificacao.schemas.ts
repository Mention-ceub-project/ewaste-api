import { z } from 'zod';

export const listarHistoricoSchema = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export const rankingSchema = z.object({
  limite: z.coerce.number().int().positive().max(100).default(10),
});

export type ListarHistoricoDto = z.infer<typeof listarHistoricoSchema>;
export type RankingDto = z.infer<typeof rankingSchema>;
