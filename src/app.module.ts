import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeolocationModule } from './geolocation/geolocation.module';
import { WeatherModule } from './weather/weather.module';
import { ApplicationModule } from './application/application.module';

@Module({
  imports: [
    GeolocationModule,
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.STAGE}`],
    }),
    WeatherModule,
    ApplicationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
