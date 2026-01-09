import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase body size limit for image uploads (base64 encoded images can be large)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Serve static files from public directory
  // Use process.cwd() to get project root (works in both dev and prod)
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/',
  });
  // Also serve /assets path specifically
  app.useStaticAssets(join(process.cwd(), 'public', 'assets'), {
    prefix: '/assets/',
  });

  app.enableCors({
    origin: true,
    credentials: true,
  }); // Allow frontend to call backend with credentials
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
