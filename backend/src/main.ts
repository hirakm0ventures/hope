import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
  const allowedOrigins = new Set([frontendUrl]);

  try {
    const loopbackVariant = new URL(frontendUrl);
    if (loopbackVariant.hostname === 'localhost') {
      loopbackVariant.hostname = '127.0.0.1';
      allowedOrigins.add(loopbackVariant.toString());
    } else if (loopbackVariant.hostname === '127.0.0.1') {
      loopbackVariant.hostname = 'localhost';
      allowedOrigins.add(loopbackVariant.toString());
    }
  } catch {
    // Keep the explicitly configured origin if URL parsing fails.
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
void bootstrap();
