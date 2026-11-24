import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Testes de integração: sobem a API inteira e usam um banco PostgreSQL de teste,
// recriado do zero a cada execução (ver test/setup).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    globalSetup: ['test/setup/global-setup.ts'],
    setupFiles: ['test/setup/variaveis.ts'],
    // Os arquivos compartilham o mesmo banco, então rodam um de cada vez
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
