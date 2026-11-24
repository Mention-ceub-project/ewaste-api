import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PapelUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsuarioComGamificacao } from '../usuarios/repositories/usuarios.repository';

const SEGREDO = 'segredo-do-teste-unitario';

function usuario(dados: Partial<UsuarioComGamificacao> = {}): UsuarioComGamificacao {
  return {
    id: 'u1',
    nomeCompleto: 'Maria Teste',
    email: 'maria.teste@email.com',
    senhaHash: '',
    telefone: null,
    papel: PapelUsuario.DESCARTADOR,
    avatarUrl: null,
    tokenVersion: 0,
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
    gamificacao: null,
    ...dados,
  };
}

describe('AuthService', () => {
  let usuarios: {
    buscarPorEmail: ReturnType<typeof vi.fn>;
    criar: ReturnType<typeof vi.fn>;
    incrementarTokenVersion: ReturnType<typeof vi.fn>;
  };
  let jwt: JwtService;
  let servico: AuthService;

  beforeEach(() => {
    usuarios = { buscarPorEmail: vi.fn(), criar: vi.fn(), incrementarTokenVersion: vi.fn() };
    jwt = new JwtService({});
    const config = { getOrThrow: () => SEGREDO, get: () => '1h' } as unknown as ConfigService;
    servico = new AuthService(usuarios as never, jwt, config);
  });

  describe('registrar', () => {
    const dto = { nomeCompleto: 'Maria Teste', email: 'maria.teste@email.com', senha: 'teste123', papel: PapelUsuario.DESCARTADOR };

    it('recusa e-mail já cadastrado', async () => {
      usuarios.buscarPorEmail.mockResolvedValue(usuario());

      await expect(servico.registrar(dto)).rejects.toThrow(new ConflictException('Este email já está cadastrado'));
      expect(usuarios.criar).not.toHaveBeenCalled();
    });

    it('grava a senha como hash bcrypt e cria sempre como DESCARTADOR', async () => {
      usuarios.buscarPorEmail.mockResolvedValue(null);
      usuarios.criar.mockImplementation(async (dados) => usuario({ senhaHash: dados.senhaHash }));

      await servico.registrar(dto);

      const dados = usuarios.criar.mock.calls[0][0];
      expect(dados.papel).toBe(PapelUsuario.DESCARTADOR);
      expect(dados.senhaHash).not.toBe('teste123');
      await expect(bcrypt.compare('teste123', dados.senhaHash)).resolves.toBe(true);
    });

    it('devolve um token com o id, o papel e a versão do token do usuário', async () => {
      usuarios.buscarPorEmail.mockResolvedValue(null);
      usuarios.criar.mockResolvedValue(usuario({ tokenVersion: 3 }));

      const resposta = await servico.registrar(dto);
      const payload = await jwt.verifyAsync(resposta.accessToken, { secret: SEGREDO });

      expect(payload).toMatchObject({ sub: 'u1', papel: PapelUsuario.DESCARTADOR, tokenVersion: 3 });
      expect(resposta.usuario).not.toHaveProperty('senhaHash');
      expect(resposta.usuario).toMatchObject({ pontosTotais: 0, nivel: 1 });
    });
  });

  describe('login', () => {
    it('usa a mesma mensagem para e-mail inexistente e senha errada', async () => {
      const senhaHash = await bcrypt.hash('teste123', 4);

      usuarios.buscarPorEmail.mockResolvedValueOnce(null);
      await expect(servico.login({ email: 'nao@existe.com', senha: 'teste123' })).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas'),
      );

      usuarios.buscarPorEmail.mockResolvedValueOnce(usuario({ senhaHash }));
      await expect(servico.login({ email: 'maria.teste@email.com', senha: 'errada' })).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas'),
      );
    });

    it('autentica com a senha correta', async () => {
      usuarios.buscarPorEmail.mockResolvedValue(usuario({ senhaHash: await bcrypt.hash('teste123', 4) }));

      const resposta = await servico.login({ email: 'maria.teste@email.com', senha: 'teste123' });

      expect(resposta.accessToken).toEqual(expect.any(String));
    });
  });

  describe('validade do token', () => {
    it('usa 7 dias quando JWT_EXPIRES não está configurado', async () => {
      const semValidade = { getOrThrow: () => SEGREDO, get: () => undefined } as unknown as ConfigService;
      const servicoSemValidade = new AuthService(usuarios as never, jwt, semValidade);
      usuarios.buscarPorEmail.mockResolvedValue(usuario({ senhaHash: await bcrypt.hash('teste123', 4) }));

      const { accessToken } = await servicoSemValidade.login({ email: 'maria.teste@email.com', senha: 'teste123' });
      const payload = await jwt.verifyAsync(accessToken, { secret: SEGREDO });

      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('logout', () => {
    it('incrementa a versão do token para invalidar as sessões abertas', async () => {
      await expect(servico.logout('u1')).resolves.toEqual({ message: 'Logout realizado com sucesso' });
      expect(usuarios.incrementarTokenVersion).toHaveBeenCalledWith('u1');
    });
  });
});
