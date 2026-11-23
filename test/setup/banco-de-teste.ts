// Banco usado pelos testes de integração: um banco separado no mesmo PostgreSQL
// do docker-compose. Para usar outro, defina TEST_DATABASE_URL.
const URL_PADRAO =
  'postgresql://postgres:postgres@127.0.0.1:5432/ewaste_test?schema=public';

const HOSTS_LOCAIS = ['127.0.0.1', 'localhost', '[::1]'];

// Os testes apagam e recriam o banco inteiro. Esta trava impede que isso
// aconteça em qualquer banco que não seja local e explicitamente de teste —
// em especial, no banco de produção do Neon.
export function garantirBancoDeTeste(url: string): void {
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    throw new Error('URL do banco de teste inválida.');
  }

  const nomeDoBanco = decodeURIComponent(endereco.pathname.replace(/^\//, ''));
  const ehLocal = HOSTS_LOCAIS.includes(endereco.hostname);

  if (!ehLocal || !nomeDoBanco.endsWith('_test')) {
    throw new Error(
      `Recusando rodar os testes no banco "${endereco.hostname}/${nomeDoBanco}". ` +
        'Use um banco local cujo nome termine em _test.',
    );
  }
}

export function urlDoBancoDeTeste(): string {
  const url = process.env.TEST_DATABASE_URL ?? URL_PADRAO;
  garantirBancoDeTeste(url);
  return url;
}
