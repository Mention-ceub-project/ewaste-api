import { PapelUsuario, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/**
 * Popula o banco de desenvolvimento com o catalogo de materiais e alguns
 * pontos de coleta do DF, para o app ter o que mostrar.
 *
 * Rodar com:  npx ts-node prisma/seed.ts
 *
 * E idempotente: rodar de novo atualiza os registros em vez de duplicar.
 */

const prisma = new PrismaClient();

const MATERIAIS = [
  {
    nome: 'Computador',
    descricao: 'Desktops, notebooks, placas e fontes.',
    icone: 'hardware-chip',
    pontosPorKg: 70,
    nivelToxicidade: 3,
    co2PorKg: 0.53,
    aguaPorKg: 14.5,
    energiaPorKg: 2.2,
  },
  {
    nome: 'Pilhas',
    descricao: 'Pilhas e baterias de uso domestico.',
    icone: 'battery-half',
    pontosPorKg: 240,
    nivelToxicidade: 5,
    co2PorKg: 1.1,
    aguaPorKg: 32,
    energiaPorKg: 4.8,
  },
  {
    nome: 'Celular',
    descricao: 'Smartphones, carregadores e fones.',
    icone: 'phone-portrait',
    pontosPorKg: 120,
    nivelToxicidade: 4,
    co2PorKg: 0.9,
    aguaPorKg: 26,
    energiaPorKg: 3.4,
  },
  {
    nome: 'Videogame',
    descricao: 'Consoles, controles e acessorios.',
    icone: 'game-controller',
    pontosPorKg: 85,
    nivelToxicidade: 3,
    co2PorKg: 0.6,
    aguaPorKg: 16,
    energiaPorKg: 2.5,
  },
  {
    nome: 'Mouse',
    descricao: 'Mouses, teclados e perifericos leves.',
    icone: 'ellipse-outline',
    pontosPorKg: 40,
    nivelToxicidade: 2,
    co2PorKg: 0.4,
    aguaPorKg: 9,
    energiaPorKg: 1.3,
  },
  {
    nome: 'Monitor',
    descricao: 'Monitores e televisores de LCD/LED.',
    icone: 'tv-outline',
    pontosPorKg: 60,
    nivelToxicidade: 4,
    co2PorKg: 0.75,
    aguaPorKg: 20,
    energiaPorKg: 3,
  },
];

const PONTOS = [
  {
    nome: 'ONG Recicla DF',
    descricao:
      'Coleta de eletronicos em geral. Nao recebe lampadas fluorescentes nem tubos de TV antigos.',
    responsavel: 'Marina Alves',
    telefoneContato: '(61) 3322-1100',
    emailContato: 'contato@recicladf.org',
    rua: 'SCS Quadra 2, Bloco C',
    numero: '120',
    bairro: 'Asa Sul',
    cidade: 'Brasilia',
    estado: 'DF',
    cep: '70302-000',
    latitude: -15.798_2,
    longitude: -47.885_4,
    horarioFuncionamento: 'Seg a sex, 8h as 18h',
    materiais: ['Computador', 'Pilhas', 'Celular', 'Videogame'],
  },
  {
    nome: 'Coleta Verde Taguatinga',
    descricao: 'Ponto de bairro focado em pilhas, baterias e celulares.',
    responsavel: 'Joao Prado',
    telefoneContato: '(61) 3451-7788',
    emailContato: 'coletaverde@taguatinga.org',
    rua: 'QNL 2, Conjunto B',
    numero: '15',
    bairro: 'Taguatinga Norte',
    cidade: 'Brasilia',
    estado: 'DF',
    cep: '72150-520',
    latitude: -15.834_1,
    longitude: -48.055_9,
    horarioFuncionamento: 'Seg a sab, 9h as 14h',
    materiais: ['Pilhas', 'Celular', 'Mouse'],
  },
  {
    nome: 'EcoPonto Ceilandia',
    descricao: 'Recebe volumosos mediante agendamento pelo telefone.',
    responsavel: 'Rita Nogueira',
    telefoneContato: '(61) 3372-9040',
    emailContato: 'ecoponto@ceilandia.df.gov.br',
    rua: 'QNM 18, Area Especial',
    numero: '4',
    bairro: 'Ceilandia Sul',
    cidade: 'Brasilia',
    estado: 'DF',
    cep: '72215-180',
    latitude: -15.823_7,
    longitude: -48.110_3,
    horarioFuncionamento: 'Seg a sex, 8h as 17h',
    materiais: ['Computador', 'Monitor', 'Pilhas', 'Mouse'],
  },
];

async function main() {
  // Usuario da ONG dono dos pontos de coleta (PontoColeta.criadoPor e obrigatorio).
  const senhaHash = await bcrypt.hash('ong123456', 10);

  const ong = await prisma.usuario.upsert({
    where: { email: 'ong@recicladf.org' },
    update: {},
    create: {
      nomeCompleto: 'Equipe Recicla DF',
      email: 'ong@recicladf.org',
      senhaHash,
      papel: PapelUsuario.MEMBRO_ONG,
      gamificacao: { create: {} },
    },
  });

  console.log(`ONG: ${ong.email}`);

  const materiaisPorNome = new Map<string, string>();

  for (const material of MATERIAIS) {
    const registro = await prisma.material.upsert({
      where: { nome: material.nome },
      update: material,
      create: material,
    });
    materiaisPorNome.set(registro.nome, registro.id);
  }

  console.log(`Materiais: ${materiaisPorNome.size}`);

  for (const { materiais, ...ponto } of PONTOS) {
    const existente = await prisma.pontoColeta.findFirst({
      where: { nome: ponto.nome },
    });

    const registro = existente
      ? await prisma.pontoColeta.update({
          where: { id: existente.id },
          data: ponto,
        })
      : await prisma.pontoColeta.create({
          data: { ...ponto, criadoPor: ong.id },
        });

    // Substitui a lista de materiais aceitos pelo ponto.
    await prisma.pontoMaterial.deleteMany({ where: { pontoId: registro.id } });
    await prisma.pontoMaterial.createMany({
      data: materiais
        .map((nome) => materiaisPorNome.get(nome))
        .filter((id): id is string => Boolean(id))
        .map((materialId) => ({ pontoId: registro.id, materialId })),
    });

    console.log(`Ponto: ${registro.nome} (${materiais.length} materiais)`);
  }
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
