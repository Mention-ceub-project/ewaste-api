import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContextoDeTeste, criarApp, limparBanco } from './helpers/app';
import { comToken } from './helpers/cenario';

const MARIA = { nomeCompleto: 'Maria Teste', email: 'maria.teste@email.com', senha: 'teste123' };

describe('Autenticação', () => {
  let ctx: ContextoDeTeste;

  beforeAll(async () => {
    ctx = await criarApp();
    await limparBanco(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('CT 001 – Cadastro de descartador', () => {
    it('cria a conta como DESCARTADOR, com a gamificação zerada, e já devolve o token', async () => {
      const resposta = await ctx.http().post('/auth/register').send(MARIA).expect(201);

      expect(resposta.body.accessToken).toEqual(expect.any(String));
      expect(resposta.body.usuario).toMatchObject({
        nomeCompleto: 'Maria Teste',
        email: 'maria.teste@email.com',
        papel: 'DESCARTADOR',
        pontosTotais: 0,
        nivel: 1,
        totalEntregas: 0,
      });
      expect(resposta.body.usuario).not.toHaveProperty('senhaHash');
    });

    it('o token devolvido no cadastro já dá acesso ao perfil', async () => {
      const { body } = await ctx.http().post('/auth/login').send({ email: MARIA.email, senha: MARIA.senha }).expect(200);

      const perfil = await ctx.http().get('/auth/me').set(comToken(body.accessToken)).expect(200);

      expect(perfil.body).toMatchObject({ email: MARIA.email, papel: 'DESCARTADOR' });
    });

    it('recusa um e-mail já cadastrado (409)', async () => {
      const resposta = await ctx.http().post('/auth/register').send(MARIA).expect(409);

      expect(resposta.body.message).toBe('Este email já está cadastrado');
    });

    it('não permite escolher o papel de ONG no cadastro público (400)', async () => {
      await ctx
        .http()
        .post('/auth/register')
        .send({ ...MARIA, email: 'quer.ser.ong@email.com', papel: 'MEMBRO_ONG' })
        .expect(400);

      const criado = await ctx.prisma.usuario.findUnique({ where: { email: 'quer.ser.ong@email.com' } });
      expect(criado).toBeNull();
    });

    it('valida o e-mail e o tamanho mínimo da senha (400)', async () => {
      const resposta = await ctx
        .http()
        .post('/auth/register')
        .send({ nomeCompleto: 'Teste', email: 'email-invalido', senha: '123' })
        .expect(400);

      expect(resposta.body.message).toBe('Erro de validação');
      expect(resposta.body.errors.email).toContain('Email inválido');
      expect(resposta.body.errors.senha).toContain('A senha deve ter pelo menos 6 caracteres');
    });
  });

  describe('CT 002 – Login com senha inválida', () => {
    it('responde 401 "Credenciais inválidas" para a senha errada', async () => {
      const resposta = await ctx
        .http()
        .post('/auth/login')
        .send({ email: MARIA.email, senha: 'senhaErrada1' })
        .expect(401);

      expect(resposta.body.message).toBe('Credenciais inválidas');
      expect(resposta.body).not.toHaveProperty('accessToken');
    });

    it('usa a mesma mensagem para um e-mail não cadastrado', async () => {
      const resposta = await ctx
        .http()
        .post('/auth/login')
        .send({ email: 'nao.existe@email.com', senha: 'senhaErrada1' })
        .expect(401);

      expect(resposta.body.message).toBe('Credenciais inválidas');
    });
  });

  describe('CT 013 – Uso do token após o logout', () => {
    it('o token emitido antes do logout deixa de valer', async () => {
      const { body } = await ctx.http().post('/auth/login').send({ email: MARIA.email, senha: MARIA.senha }).expect(200);
      const token = body.accessToken;

      await ctx.http().get('/auth/me').set(comToken(token)).expect(200);

      const logout = await ctx.http().post('/auth/logout').set(comToken(token)).expect(200);
      expect(logout.body).toEqual({ message: 'Logout realizado com sucesso' });

      const depois = await ctx.http().get('/auth/me').set(comToken(token)).expect(401);
      expect(depois.body.message).toBe('Sessão inválida ou expirada');
    });

    it('um novo login depois do logout funciona normalmente', async () => {
      const { body } = await ctx.http().post('/auth/login').send({ email: MARIA.email, senha: MARIA.senha }).expect(200);

      await ctx.http().get('/auth/me').set(comToken(body.accessToken)).expect(200);
    });
  });
});
