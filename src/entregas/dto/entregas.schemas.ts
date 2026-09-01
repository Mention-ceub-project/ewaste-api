import { z } from 'zod';
import { StatusEntrega, TipoEntrega } from '@prisma/client';

const itemEntregaSchema = z.object({
  materialId: z.string().uuid('Material inválido'),
  quantidade: z.number().int().positive('A quantidade deve ser maior que zero'),
  pesoKg: z
    .number()
    .positive('O peso deve ser maior que zero')
    .max(1000, 'Peso acima do limite por item (1000 kg)'),
});

export const criarEntregaSchema = z
  .object({
    tipoEntrega: z.nativeEnum(TipoEntrega),
    pontoColetaId: z.string().uuid().optional(),
    enderecoEntregaId: z.string().uuid().optional(),
    observacao: z.string().max(500).nullable().optional(),
    fotoUrl: z.string().url('URL da foto inválida').nullable().optional(),
    // Agendamento da coleta (opcional)
    dataEntrega: z.coerce.date().optional(),
    itens: z
      .array(itemEntregaSchema)
      .min(1, 'Informe pelo menos um material'),
  })
  // Entrega em ponto de coleta exige o ponto; em domicilio exige o endereco
  .refine(
    (dados) =>
      dados.tipoEntrega !== TipoEntrega.PONTO_COLETA || !!dados.pontoColetaId,
    {
      message: 'Informe o ponto de coleta',
      path: ['pontoColetaId'],
    },
  )
  .refine(
    (dados) =>
      dados.tipoEntrega !== TipoEntrega.DOMICILIO || !!dados.enderecoEntregaId,
    {
      message: 'Informe o endereço de coleta',
      path: ['enderecoEntregaId'],
    },
  );

export const listarEntregasSchema = z.object({
  status: z.nativeEnum(StatusEntrega).optional(),
  tipoEntrega: z.nativeEnum(TipoEntrega).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export const confirmarEntregaSchema = z.object({
  observacao: z.string().max(500).optional(),
});

export type CriarEntregaDto = z.infer<typeof criarEntregaSchema>;
export type ListarEntregasDto = z.infer<typeof listarEntregasSchema>;
export type ConfirmarEntregaDto = z.infer<typeof confirmarEntregaSchema>;
