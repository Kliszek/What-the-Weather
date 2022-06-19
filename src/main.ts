import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('What the Weather?')
    .setDescription('A simple weather app written in NestJS')
    .setVersion('0.0.2')
    .addTag('Weather', 'Get weather broadcast based on your IP')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/api', app, document);

  //I provided hostname, so the request body contains IPv4 and not IPv6
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
