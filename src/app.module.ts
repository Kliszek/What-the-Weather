import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeolocationModule } from './geolocation/geolocation.module';

@Module({
  imports: [
    GeolocationModule,
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.STAGE}`],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
