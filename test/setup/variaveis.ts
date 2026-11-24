import { urlDoBancoDeTeste } from './banco-de-teste';

// Roda em cada worker antes dos arquivos de teste. As variáveis definidas aqui
// têm prioridade sobre o .env: o ConfigModule e o Prisma não sobrescrevem o que
// já está em process.env. Assim a API de teste nunca enxerga as URLs do .env.
const url = urlDoBancoDeTeste();

process.env.DATABASE_URL = url;
process.env.DIRECT_URL = url;
process.env.JWT_SECRET = 'segredo-usado-somente-nos-testes';
process.env.JWT_EXPIRES = '1h';
process.env.NODE_ENV = 'test';
delete process.env.RENDER;
