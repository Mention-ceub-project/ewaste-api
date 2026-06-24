import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

// Valida o body contra um schema Zod e retorna os dados ja tipados
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Erro de validação',
        errors: result.error.flatten().fieldErrors,
      });
    }

    return result.data;
  }
}
