import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Libera o acesso do app React Native (de outra origem/IP)
  app.enableCors({
    origin: true, // reflete a origem que chamou (ok para desenvolvimento)
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  // 0.0.0.0 garante que o celular na mesma rede consiga acessar
  await app.listen(port, '0.0.0.0');
  console.log(`API rodando em http://localhost:${port}`);
}
bootstrap();
