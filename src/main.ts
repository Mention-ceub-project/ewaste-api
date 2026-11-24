import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origensPermitidas = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);

  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? true : origensPermitidas,
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  // 0.0.0.0 garante que o celular na mesma rede consiga acessar
  await app.listen(port, '0.0.0.0');
  console.log(`API rodando em http://localhost:${port}`);
}
bootstrap();
