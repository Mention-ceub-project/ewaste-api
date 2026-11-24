import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({
  nome: z.string().min(2, 'Nome curto'),
  pagina: z.coerce.number().default(1),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('devolve os dados já convertidos e com os valores padrão', () => {
    expect(pipe.transform({ nome: 'Maria' })).toEqual({ nome: 'Maria', pagina: 1 });
    expect(pipe.transform({ nome: 'Maria', pagina: '3' })).toEqual({ nome: 'Maria', pagina: 3 });
  });

  it('lança 400 com os erros agrupados por campo', () => {
    try {
      pipe.transform({ nome: 'M' });
      expect.unreachable('o pipe deveria ter recusado o payload');
    } catch (erro) {
      expect(erro).toBeInstanceOf(BadRequestException);
      expect((erro as BadRequestException).getResponse()).toEqual({
        message: 'Erro de validação',
        errors: { nome: ['Nome curto'] },
      });
    }
  });
});
