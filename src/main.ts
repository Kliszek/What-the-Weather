import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Main', { timestamp: true });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost',
  });
  app.use(helmet());

  //Setting up the Swagger OpenAPI
  const config = new DocumentBuilder()
    .setTitle('What the Weather?')
    .setDescription(
      'This is a simple weather application, that will tell you the current weather conditions in your location based on your IP address.',
    )
    .setVersion('1.0.0')
    .addTag('Weather', 'Get weather forecast based on your IP')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/api', app, document);

  //I provided hostname, so the request body contains IPv4 and not IPv6
  const portNumber: number = +process.env.PORT || 3000;
  logger.log(`Application listening on port ${portNumber}`);
  await app.listen(portNumber, '0.0.0.0');
}
bootstrap();
