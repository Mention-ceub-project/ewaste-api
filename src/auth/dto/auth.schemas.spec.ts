import { describe, expect, it } from 'vitest';
import { loginSchema, registrarSchema } from './auth.schemas';

const CADASTRO = { nomeCompleto: 'Maria Teste', email: 'maria.teste@email.com', senha: 'teste123' };

describe('registrarSchema', () => {
  it('usa DESCARTADOR como papel padrão', () => {
    expect(registrarSchema.parse(CADASTRO).papel).toBe('DESCARTADOR');
  });

  it.each(['MEMBRO_ONG', 'ADMIN'])('não permite escolher o papel %s no cadastro público', (papel) => {
    expect(registrarSchema.safeParse({ ...CADASTRO, papel }).success).toBe(false);
  });

  it.each([
    ['12345', false], // 5 caracteres: abaixo do mínimo
    ['123456', true], // 6 caracteres: limite aceito
  ])('senha "%s" → válida: %s', (senha, valido) => {
    expect(registrarSchema.safeParse({ ...CADASTRO, senha }).success).toBe(valido);
  });

  it.each(['maria', 'maria@', '@email.com'])('recusa o e-mail inválido "%s"', (email) => {
    expect(registrarSchema.safeParse({ ...CADASTRO, email }).success).toBe(false);
  });

  it('exige nome com pelo menos 2 caracteres', () => {
    expect(registrarSchema.safeParse({ ...CADASTRO, nomeCompleto: 'M' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('exige a senha', () => {
    const resultado = loginSchema.safeParse({ email: 'maria.teste@email.com', senha: '' });

    expect(resultado.success).toBe(false);
  });
});
