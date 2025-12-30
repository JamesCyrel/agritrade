import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static files from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });
  // Also serve /assets path specifically
  app.useStaticAssets(join(__dirname, '..', 'public', 'assets'), {
    prefix: '/assets/',
  });

  app.enableCors({
    origin: true,
    credentials: true,
  }); // Allow frontend to call backend with credentials
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
