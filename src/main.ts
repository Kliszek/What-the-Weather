import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('What the Weather?')
    .setDescription(
      'This is a simple weather application, that will tell you the current weather conditions in your location based on your IP address.',
    )
    .setVersion('0.1.2')
    .addTag('Weather', 'Get weather broadcast based on your IP')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/api', app, document);

  //I provided hostname, so the request body contains IPv4 and not IPv6
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
