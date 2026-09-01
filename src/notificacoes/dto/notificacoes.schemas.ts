import { z } from 'zod';

export const listarNotificacoesSchema = z.object({
  lida: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export type ListarNotificacoesDto = z.infer<typeof listarNotificacoesSchema>;
