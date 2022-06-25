import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GeolocationModule } from './geolocation/geolocation.module';
import { WeatherModule } from './weather/weather.module';
import { ApplicationModule } from './application/application.module';
import { configValidationSchema } from './config.schema';
import { CacheLayerModule } from './cache-layer/cache-layer.module';
import { ThrottlerModule } from '@nestjs/throttler';

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
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get('THROTTLER_TTL'),
        limit: configService.get('THROTTLER_LIMIT'),
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
