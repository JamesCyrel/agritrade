import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  }); // Allow frontend to call backend with credentials
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
