import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Testes unitários: ficam ao lado do código (src/**/*.spec.ts) e não usam banco.
// O SWC substitui o esbuild porque o NestJS depende dos metadados de decorators
// (emitDecoratorMetadata), que o esbuild não gera.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/**/*.module.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
