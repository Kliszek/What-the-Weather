import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeolocationModule } from './geolocation/geolocation.module';
import { WeatherModule } from './weather/weather.module';
import { ApplicationModule } from './application/application.module';
import { configValidationSchema } from './config.schema';
import { CacheLayerModule } from './cache-layer/cache-layer.module';

@Module({
  imports: [
    GeolocationModule,
    ConfigModule.forRoot({
      envFilePath: [`.env.${process.env.STAGE}`],
      cache: true,
      validationSchema: configValidationSchema,
    }),
    WeatherModule,
    ApplicationModule,
    CacheLayerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
