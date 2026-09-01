import { PipeTransform, BadRequestException } from '@nestjs/common';
import { TypeOf, ZodTypeAny } from 'zod';

// Valida o payload contra um schema Zod e retorna os dados ja tipados.
// Use no parametro para nao afetar os outros (@Body(new ZodValidationPipe(x))).
export class ZodValidationPipe<TSchema extends ZodTypeAny>
  implements PipeTransform<unknown, TypeOf<TSchema>>
{
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): TypeOf<TSchema> {
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
