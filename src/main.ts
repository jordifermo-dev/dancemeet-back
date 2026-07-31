import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import { i18nValidationErrorFactory } from 'nestjs-i18n';
import { AppModule } from './app.module';
// import { connectMongoose, seedReferenceData } from './config/mongoose.config';
import { connectMongoose } from './config/mongoose.config';
import { initFirebaseAdmin } from './config/firebase-admin.config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  await connectMongoose();
  initFirebaseAdmin();
  // await seedReferenceData();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Register the global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Default Express JSON limit (100kb) is too small for base64-encoded photo
  // uploads (profile/event images) - see UploadController.
  app.use(json({ limit: '10mb' }));

  // Validate & sanitize every incoming request body/query/params against the DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: i18nValidationErrorFactory,
    }),
  );

  // Enable CORS - restricted to an explicit allowlist rather than '*', since
  // this API sits behind Firebase auth and shouldn't accept credentialed
  // requests from an arbitrary origin. Covers both local dev servers (`ng
  // serve` and `ionic serve` use different default ports) and the native
  // Capacitor webview; set CORS_ORIGINS (comma-separated) to override this
  // list once there's a real deployed frontend domain.
  const defaultDevOrigins = [
    'http://localhost:8100',
    'http://localhost:4200',
    'capacitor://localhost',
    'http://localhost',
  ];
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : defaultDevOrigins;
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    DanceMeet API Server                     ║
╠════════════════════════════════════════════════════════════╣
║                                                             ║
║  🚀 Server running on: http://localhost:${port}
║  📚 Database: DanceMeetDB                                   ║
║                                                             ║
║  Available Endpoints:                                       ║
║  - POST   /api/users                    (Create user)       ║
║  - GET    /api/users                    (Get all users)     ║
║  - GET    /api/users/:id                (Get user by ID)    ║
║  - PUT    /api/users/:id                (Update user)       ║
║  - DELETE /api/users/:id                (Delete user)       ║
║                                                             ║
║  - POST   /api/events                   (Create event)      ║
║  - GET    /api/events                   (Get all events)    ║
║  - GET    /api/events/:id               (Get event by ID)   ║
║  - PUT    /api/events/:id               (Update event)      ║
║  - DELETE /api/events/:id               (Delete event)      ║
║                                                             ║
║  - POST   /api/disciplines              (Create discipline) ║
║  - GET    /api/disciplines              (Get all)           ║
║  - GET    /api/disciplines/:id          (Get by ID)         ║
║  - PUT    /api/disciplines/:id          (Update)            ║
║  - DELETE /api/disciplines/:id          (Delete)            ║
║                                                             ║
║  - POST   /api/event-types              (Create type)       ║
║  - GET    /api/event-types              (Get all)           ║
║  - GET    /api/event-types/:id          (Get by ID)         ║
║  - PUT    /api/event-types/:id          (Update)            ║
║  - DELETE /api/event-types/:id          (Delete)            ║
║                                                             ║
║  - POST   /api/favorites                (Add favorite)      ║
║  - GET    /api/favorites                (Get all)           ║
║  - GET    /api/favorites/user/:userId   (User's favorites)  ║
║  - DELETE /api/favorites/:id            (Remove favorite)   ║
║                                                             ║
║  - POST   /api/followers                (Follow user)       ║
║  - GET    /api/followers                (Get all)           ║
║  - GET    /api/followers/user/:userId   (Get followers)     ║
║  - DELETE /api/followers/:id            (Unfollow)          ║
║                                                             ║
╚════════════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
