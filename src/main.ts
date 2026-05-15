import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { json, Request, Response, urlencoded } from 'express';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use((req, res, next) => {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // for uploading
  app.use(urlencoded({ limit: '1024mb', extended: true }));
  app.use(json({ limit: '1024mb' }));
  const uploadPath = process.env.UPLOAD_PATH || 'uploads';
  app.useStaticAssets(join(process.cwd(), '..', uploadPath), {
    prefix: '/api/uploads/',
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    },
  });
  app.use(
    '/api/checkout/callback',
    rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    '/api/checkout/b2pay/callback',
    rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.use(
    '/api/checkout',
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // for rate limit
  if (process.env.NODE_ENV !== 'development') {
    app.use(
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 300, // limit each IP to 100 requests per windowMs
      }),
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(
    helmet({
      referrerPolicy: { policy: 'origin-when-cross-origin' },
    }),
  ); // Adds security headers
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin === 'https://smgcheats.com' ||
        origin.endsWith('.smgcheats.com') ||
        origin === 'http://localhost:3000' ||
        origin === 'http://localhost:3001'
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization,x-audit-password',
  });
  await app.listen(process.env.PORT || 4000, '0.0.0.0');
}
bootstrap();
