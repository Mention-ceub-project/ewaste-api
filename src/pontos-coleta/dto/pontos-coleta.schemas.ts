import { z } from 'zod';

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

export const criarPontoColetaSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  descricao: z.string().max(500).nullable().optional(),
  responsavel: z.string().max(120).nullable().optional(),
  telefoneContato: z.string().min(8).max(20).nullable().optional(),
  emailContato: z.string().email('Email de contato inválido').nullable().optional(),
  rua: z.string().min(2, 'Informe a rua'),
  numero: z.string().min(1, 'Informe o número'),
  bairro: z.string().min(2, 'Informe o bairro'),
  cidade: z.string().min(2, 'Informe a cidade'),
  estado: z.string().length(2, 'Use a sigla do estado (ex.: DF)'),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  latitude,
  longitude,
  horarioFuncionamento: z.string().max(200).nullable().optional(),
  materiaisIds: z.array(z.string().uuid()).optional(),
});

export const atualizarPontoColetaSchema = criarPontoColetaSchema
  .partial()
  .extend({ ativo: z.boolean().optional() });

export const definirMateriaisSchema = z.object({
  materiaisIds: z.array(z.string().uuid()),
});

export const listarPontosSchema = z
  .object({
    ativo: z
      .enum(['true', 'false'])
      .transform((valor) => valor === 'true')
      .optional(),
    cidade: z.string().trim().min(2).optional(),
    estado: z.string().trim().length(2).optional(),
    materialId: z.string().uuid().optional(),
    busca: z.string().trim().min(1).optional(),
    // Quando o app manda a posicao, a resposta traz a distancia e vem ordenada
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    raioKm: z.coerce.number().positive().max(500).optional(),
    // ONG lista apenas os pontos que ela mesma criou
    meus: z
      .enum(['true', 'false'])
      .transform((valor) => valor === 'true')
      .optional(),
  })
  .refine(
    (dados) =>
      (dados.latitude === undefined) === (dados.longitude === undefined),
    { message: 'Informe latitude e longitude juntas', path: ['latitude'] },
  );

export type CriarPontoColetaDto = z.infer<typeof criarPontoColetaSchema>;
export type AtualizarPontoColetaDto = z.infer<typeof atualizarPontoColetaSchema>;
export type DefinirMateriaisDto = z.infer<typeof definirMateriaisSchema>;
export type ListarPontosDto = z.infer<typeof listarPontosSchema>;
