import { PapelUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ContextoDeTeste } from './app';

export const SENHA_PADRAO = 'senha-de-teste-123';

// Mesmos fatores e pontos de coleta do prisma/seed.ts, para os resultados
// esperados baterem com os do documento de Casos de Teste.
const MATERIAIS = {
  computador: { nome: 'Computador', pontosPorKg: 70, nivelToxicidade: 3, co2PorKg: 0.53, aguaPorKg: 14.5, energiaPorKg: 2.2 },
  pilhas: { nome: 'Pilhas', pontosPorKg: 240, nivelToxicidade: 5, co2PorKg: 1.1, aguaPorKg: 32, energiaPorKg: 4.8 },
  celular: { nome: 'Celular', pontosPorKg: 120, nivelToxicidade: 4, co2PorKg: 0.9, aguaPorKg: 26, energiaPorKg: 3.4 },
  mouse: { nome: 'Mouse', pontosPorKg: 40, nivelToxicidade: 2, co2PorKg: 0.4, aguaPorKg: 9, energiaPorKg: 1.3 },
  monitor: { nome: 'Monitor', pontosPorKg: 60, nivelToxicidade: 4, co2PorKg: 0.75, aguaPorKg: 20, energiaPorKg: 3 },
};

type ChaveMaterial = keyof typeof MATERIAIS;

const ENDERECO_BASE = { cidade: 'Brasilia', estado: 'DF' };

async function criarUsuario(
  prisma: PrismaService,
  dados: { nomeCompleto: string; email: string; papel: PapelUsuario },
) {
  // Custo baixo de propósito: o login compara o hash do mesmo jeito
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 4);
  return prisma.usuario.create({
    data: { ...dados, senhaHash, gamificacao: { create: {} } },
  });
}

export async function criarCenario(prisma: PrismaService) {
  const materiais = {} as Record<ChaveMaterial, string>;
  for (const [chave, dados] of Object.entries(MATERIAIS)) {
    const material = await prisma.material.create({ data: dados });
    materiais[chave as ChaveMaterial] = material.id;
  }

  const ong = await criarUsuario(prisma, { nomeCompleto: 'Equipe Recicla DF', email: 'ong@recicladf.org', papel: PapelUsuario.MEMBRO_ONG });
  // ONG promovida pelo admin, mas sem nenhum ponto de coleta
  const outraOng = await criarUsuario(prisma, { nomeCompleto: 'João ONG Teste', email: 'joao.ong@email.com', papel: PapelUsuario.MEMBRO_ONG });
  const admin = await criarUsuario(prisma, { nomeCompleto: 'Administração E-Waste', email: 'admin@ewaste.dev', papel: PapelUsuario.ADMIN });

  const criarPonto = (nome: string, extra: object, aceitos: ChaveMaterial[]) =>
    prisma.pontoColeta.create({
      data: {
        nome,
        ...ENDERECO_BASE,
        ...extra,
        criadoPor: ong.id,
        materiaisAceitos: { create: aceitos.map((chave) => ({ materialId: materiais[chave] })) },
      } as never,
    });

  const reciclaDf = await criarPonto(
    'ONG Recicla DF',
    { rua: 'SCS Quadra 2, Bloco C', numero: '120', bairro: 'Asa Sul', cep: '70302-000', latitude: -15.7982, longitude: -47.8854 },
    ['computador', 'pilhas', 'celular'],
  );
  const taguatinga = await criarPonto(
    'Coleta Verde Taguatinga',
    { rua: 'QNL 2, Conjunto B', numero: '15', bairro: 'Taguatinga Norte', cep: '72150-520', latitude: -15.8341, longitude: -48.0559 },
    ['pilhas', 'celular', 'mouse'],
  );

  return {
    materiais,
    pontos: { reciclaDf: reciclaDf.id, taguatinga: taguatinga.id },
    usuarios: { ong, outraOng, admin },
  };
}

export async function entrar(
  ctx: ContextoDeTeste,
  email: string,
  senha = SENHA_PADRAO,
): Promise<string> {
  const resposta = await ctx.http().post('/auth/login').send({ email, senha }).expect(200);
  return resposta.body.accessToken;
}

export function comToken(token: string) {
  return { Authorization: `Bearer ${token}` };
}
