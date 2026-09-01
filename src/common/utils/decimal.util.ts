import { Prisma } from '@prisma/client';

// O Prisma devolve colunas `numeric` como Decimal, que vira string no JSON.
// Estes helpers normalizam para number na fronteira da API (DTOs) e nos calculos.
export function paraNumero(valor: Prisma.Decimal | number | null): number {
  if (valor === null || valor === undefined) return 0;
  return typeof valor === 'number' ? valor : valor.toNumber();
}

export function paraNumeroOuNulo(
  valor: Prisma.Decimal | number | null,
): number | null {
  if (valor === null || valor === undefined) return null;
  return typeof valor === 'number' ? valor : valor.toNumber();
}

// Arredonda para `casas` decimais evitando o ruido do ponto flutuante
export function arredondar(valor: number, casas = 3): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}
