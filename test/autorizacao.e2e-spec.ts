import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContextoDeTeste, criarApp, limparBanco } from './helpers/app';
import { comToken, criarCenario, entrar } from './helpers/cenario';

// RF4 – Controle de acesso por perfil e RQ3 – Privacidade dos dados pessoais
describe('Autorização por perfil', () => {
  let ctx: ContextoDeTeste;
  let cenario: Awaited<ReturnType<typeof criarCenario>>;
  let tokenMaria: string;
  let tokenOng: string;
  let tokenOutraOng: string;
  let tokenAdmin: string;
  let idMaria: string;

  beforeAll(async () => {
    ctx = await criarApp();
    await limparBanco(ctx.prisma);
    cenario = await criarCenario(ctx.prisma);

    const cadastro = await ctx
      .http()
      .post('/auth/register')
      .send({ nomeCompleto: 'Maria Teste', email: 'maria.teste@email.com', senha: 'teste123' })
      .expect(201);
    tokenMaria = cadastro.body.accessToken;
    idMaria = cadastro.body.usuario.id;
    tokenOng = await entrar(ctx, 'ong@recicladf.org');
    tokenOutraOng = await entrar(ctx, 'joao.ong@email.com');
    tokenAdmin = await entrar(ctx, 'admin@ewaste.dev');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('rotas protegidas', () => {
    it.each([
      ['GET', '/materiais'],
      ['GET', '/entregas'],
      ['GET', '/gamificacao/me'],
      ['GET', '/auth/me'],
    ])('%s %s exige autenticação (401)', async (_metodo, rota) => {
      await ctx.http().get(rota).expect(401);
    });

    it('um token inválido é recusado (401)', async () => {
      await ctx.http().get('/auth/me').set(comToken('token.invalido.qualquer')).expect(401);
    });

    it('um identificador que não é UUID é recusado antes da regra de negócio (400)', async () => {
      await ctx.http().patch('/entregas/nao-e-uuid/confirmar').set(comToken(tokenOng)).expect(400);
    });
  });

  describe('CT 020 – Cadastro de material: permissões', () => {
    const novoMaterial = { nome: 'Teclado', pontosPorKg: 30, nivelToxicidade: 2 };

    it('o descartador não pode cadastrar material (403)', async () => {
      const resposta = await ctx.http().post('/materiais').set(comToken(tokenMaria)).send(novoMaterial).expect(403);

      expect(resposta.body.message).toBe('Você não tem permissão para acessar este recurso');
    });

    it('a ONG não pode cadastrar material (403)', async () => {
      await ctx.http().post('/materiais').set(comToken(tokenOng)).send(novoMaterial).expect(403);
    });

    it('o admin cadastra material (201)', async () => {
      const resposta = await ctx.http().post('/materiais').set(comToken(tokenAdmin)).send(novoMaterial).expect(201);

      expect(resposta.body).toMatchObject({ nome: 'Teclado', ativo: true });
    });
  });

  describe('CT 024 – Cadastro de ponto de coleta: permissões', () => {
    it('o descartador não pode criar ponto de coleta (403)', async () => {
      await ctx.http().post('/pontos-coleta').set(comToken(tokenMaria)).send({}).expect(403);
    });
  });

  describe('CT 025 – ONG tenta editar ponto de outra ONG', () => {
    it('uma ONG não pode editar o ponto de outra ONG (403)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/pontos-coleta/${cenario.pontos.reciclaDf}`)
        .set(comToken(tokenOutraOng))
        .send({ horarioFuncionamento: 'Fechado' })
        .expect(403);

      expect(resposta.body.message).toBe('Você só pode gerenciar os pontos de coleta da sua ONG');
    });

    it('o ponto não é alterado pela tentativa', async () => {
      const ponto = await ctx.prisma.pontoColeta.findUnique({ where: { id: cenario.pontos.reciclaDf } });

      expect(ponto?.horarioFuncionamento).not.toBe('Fechado');
    });

    it('a ONG dona edita o próprio ponto (200)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/pontos-coleta/${cenario.pontos.reciclaDf}`)
        .set(comToken(tokenOng))
        .send({ horarioFuncionamento: 'Seg a sex, 8h às 18h' })
        .expect(200);

      expect(resposta.body.horarioFuncionamento).toBe('Seg a sex, 8h às 18h');
    });
  });

  describe('CT 018 – Consulta de usuário por ID restrita ao admin', () => {
    it('a ONG não consulta usuários por id (403)', async () => {
      await ctx.http().get(`/usuarios/${idMaria}`).set(comToken(tokenOng)).expect(403);
    });

    it('o descartador não consulta usuários por id (403)', async () => {
      await ctx.http().get(`/usuarios/${idMaria}`).set(comToken(tokenMaria)).expect(403);
    });

    it('o admin consulta usuários por id (200), sem expor a senha', async () => {
      const resposta = await ctx.http().get(`/usuarios/${idMaria}`).set(comToken(tokenAdmin)).expect(200);

      expect(resposta.body).toMatchObject({ email: 'maria.teste@email.com' });
      expect(resposta.body).not.toHaveProperty('senhaHash');
    });
  });

  describe('CT 017 – Promoção de usuário a ONG pelo administrador', () => {
    it('a ONG não pode promover usuários (403)', async () => {
      await ctx
        .http()
        .patch(`/usuarios/${idMaria}/papel`)
        .set(comToken(tokenOng))
        .send({ papel: 'MEMBRO_ONG' })
        .expect(403);
    });

    it('o admin promove o descartador a membro de ONG (200)', async () => {
      const resposta = await ctx
        .http()
        .patch(`/usuarios/${idMaria}/papel`)
        .set(comToken(tokenAdmin))
        .send({ papel: 'MEMBRO_ONG' })
        .expect(200);

      expect(resposta.body.papel).toBe('MEMBRO_ONG');
    });

    it('com o novo papel, o usuário passa a acessar a fila de entregas da ONG', async () => {
      await ctx.http().get('/entregas/pendentes').set(comToken(tokenMaria)).expect(200);
    });
  });
});
