import { describe, expect, it } from 'vitest';
import { criarEntregaSchema, recusarEntregaSchema } from './entregas.schemas';

const ID_PONTO = '11111111-1111-4111-8111-111111111111';
const ID_MATERIAL = '22222222-2222-4222-8222-222222222222';
const ID_ENDERECO = '33333333-3333-4333-8333-333333333333';

function descarte(item: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return {
    tipoEntrega: 'PONTO_COLETA',
    pontoColetaId: ID_PONTO,
    itens: [{ materialId: ID_MATERIAL, quantidade: 1, pesoKg: 1, ...item }],
    ...extra,
  };
}

function mensagens(resultado: ReturnType<typeof criarEntregaSchema.safeParse>) {
  return resultado.success ? [] : resultado.error.issues.map((issue) => issue.message);
}

describe('criarEntregaSchema', () => {
  describe('peso do item — análise de valor limite', () => {
    it.each([
      [-1, false],
      [0, false], // limite inferior: o peso precisa ser maior que zero
      [0.1, true],
      [1000, true], // limite superior aceito
      [1000.1, false],
    ])('peso %d kg → válido: %s', (pesoKg, valido) => {
      expect(criarEntregaSchema.safeParse(descarte({ pesoKg })).success).toBe(valido);
    });

    it('explica o motivo quando o peso é zero', () => {
      const resultado = criarEntregaSchema.safeParse(descarte({ pesoKg: 0 }));

      expect(mensagens(resultado)).toContain('O peso deve ser maior que zero');
    });

    it('recusa peso que não é número (classe inválida de tipo)', () => {
      expect(criarEntregaSchema.safeParse(descarte({ pesoKg: 'dois' })).success).toBe(false);
    });
  });

  describe('quantidade do item', () => {
    it.each([
      [0, false],
      [1.5, false], // precisa ser inteira
      [1, true],
    ])('quantidade %d → válida: %s', (quantidade, valido) => {
      expect(criarEntregaSchema.safeParse(descarte({ quantidade })).success).toBe(valido);
    });
  });

  describe('destino da entrega', () => {
    it('entrega em ponto de coleta exige o ponto', () => {
      const resultado = criarEntregaSchema.safeParse(descarte({}, { pontoColetaId: undefined }));

      expect(mensagens(resultado)).toContain('Informe o ponto de coleta');
    });

    it('entrega em domicílio exige o endereço', () => {
      const resultado = criarEntregaSchema.safeParse({
        tipoEntrega: 'DOMICILIO',
        itens: [{ materialId: ID_MATERIAL, quantidade: 1, pesoKg: 1 }],
      });

      expect(mensagens(resultado)).toContain('Informe o endereço de coleta');
    });

    it('aceita entrega em domicílio com endereço', () => {
      const resultado = criarEntregaSchema.safeParse({
        tipoEntrega: 'DOMICILIO',
        enderecoEntregaId: ID_ENDERECO,
        itens: [{ materialId: ID_MATERIAL, quantidade: 1, pesoKg: 1 }],
      });

      expect(resultado.success).toBe(true);
    });

    it('exige pelo menos um material', () => {
      const resultado = criarEntregaSchema.safeParse({ ...descarte(), itens: [] });

      expect(mensagens(resultado)).toContain('Informe pelo menos um material');
    });
  });
});

describe('recusarEntregaSchema', () => {
  it.each([
    ['', false],
    ['   ', false], // espaços em branco não contam como motivo
    ['a'.repeat(501), false],
    ['O item não foi entregue no prazo combinado', true],
  ])('motivo "%s" → válido: %s', (motivo, valido) => {
    expect(recusarEntregaSchema.safeParse({ motivo }).success).toBe(valido);
  });

  it('remove espaços nas pontas do motivo', () => {
    expect(recusarEntregaSchema.parse({ motivo: '  Não compareceu  ' })).toEqual({ motivo: 'Não compareceu' });
  });
});
