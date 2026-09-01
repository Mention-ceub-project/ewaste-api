import { z } from 'zod';

export const painelImpactoSchema = z.object({
  // Quantidade de meses do grafico de evolucao
  meses: z.coerce.number().int().min(1).max(24).default(6),
});

export type PainelImpactoDto = z.infer<typeof painelImpactoSchema>;
