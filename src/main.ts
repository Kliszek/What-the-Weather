import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //I provided hostname, so the request body contains IPv4 and not IPv6
  await app.listen(3000, '0.0.0.0');
}
bootstrap();
