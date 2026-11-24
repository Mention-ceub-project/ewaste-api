import { execSync } from 'node:child_process';
import { urlDoBancoDeTeste } from './banco-de-teste';

// Roda uma vez antes de todos os testes de integração: apaga o banco de teste
// (criando-o se ainda não existir) e aplica todas as migrations do projeto.
export default function prepararBancoDeTeste() {
  const url = urlDoBancoDeTeste();

  try {
    execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    });
  } catch (erro) {
    const saida = (erro as { stderr?: Buffer; stdout?: Buffer });
    throw new Error(
      'Não foi possível preparar o banco de teste. O PostgreSQL do docker-compose está rodando?\n' +
        `${saida.stdout?.toString() ?? ''}${saida.stderr?.toString() ?? ''}`,
    );
  }
}
